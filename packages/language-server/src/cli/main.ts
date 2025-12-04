import type { Model } from '../generated/ast.js';
import chalk from 'chalk';
import { Command } from 'commander';
import { SdvmlLanguageMetaData } from '../generated/module.js';
import { createSdvmlServices } from '../sdvml-module.js';
import { extractAstNode, extractDestinationAndName } from './cli-util.js';
import { Context, generateFunctionalChainSegments, generateFunctionalChainSpec, generateIFScript, generateMRTCCSLSpec } from './generator.js';
// import {workspace} from "vscode";
import { NodeFileSystem } from 'langium/node';
// import * as url from 'node:url';
import * as fsAsync from 'node:fs/promises';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { spawn } from 'node:child_process';
import { Progress, CancellationToken, Disposable } from "vscode";


const gnuTemplate = `
clear
reset
set border 3
set datafile separator ','

set output sprintf("%s.svg", filename)
set terminal svg size 1000,500 enhanced font "Helvetica,20" background rgb "white"
set datafile missing NaN
set datafile columnheaders

# Each bar is half the (visual) width of its x-range.
set boxwidth 0.5 relative
set style data histograms
set style histogram rowstacked
set style fill solid 1.0

# set ylabel "probability"

print(filename);
stats filename name "D" nooutput

# set nokey
unset border

plot for [j=2:D_columns] filename using j title sprintf("missed %i", j);
`

async function overrideFileIfChanged(path: string, content: string): Promise<void> {
    const text = await fs.promises.readFile(path).catch(error => undefined);
    if (text !== undefined && text.toString() === content) {
        return
    } else {
        await fs.promises.writeFile(path, content)
    }
}

interface NinjaRule {
    name: string
    command: string
    implicitDependencies: string[]
}

interface NinjaBuildInstruction {
    rule: NinjaRule
    inputs: string[]
    outputs: string[]
    vars?: Map<string, string>
}

interface Group {
    name: string
    artifacts: string[]
}

function renderRule(rule: NinjaRule): string {
    return `rule ${rule.name}
    command = ${rule.command}
`
}

function renderBuildInstruction(instruction: NinjaBuildInstruction): string {
    let { rule, inputs, outputs, vars } = instruction;
    let main = `build ${outputs.join(" ")} : ${rule.name} ${inputs.join(" ")}`;
    let implicits = ((rule.implicitDependencies.length != 0) ? " | " + rule.implicitDependencies.join(" ") : "");
    let additional_variables = (vars !== undefined) ? Array.from(vars, ([key, value]) => `${key}=${value}`).join("\n") : "";
    return main + implicits + additional_variables
}

function renderDefaultGroup(defaultGroup: Group): string {
    return `build ${defaultGroup.name}: phony ${defaultGroup.artifacts.join(" ")}
default ${defaultGroup.name}`
}

function renderBuildFile(rules: NinjaRule[], instructions: NinjaBuildInstruction[], groups: Group[]): string {
    return [...rules.map(renderRule), ...instructions.map(renderBuildInstruction), ...groups.map(renderDefaultGroup), ""].join("\n")
}

export const generateAction = async (
    fileName: string,
    opts: GenerateOptions,
    progress: Progress<{ increment: number, message?: string | undefined }>,
    token: CancellationToken,
): Promise<void> => {
    const services = createSdvmlServices(NodeFileSystem).sdvml;
    let model = await extractAstNode<Model>(fileName, services);

    let config = {
        traces: 10,
        steps: 100000,
        horizon: 10000,
        scale: 0.001
    }

    progress.report({ increment: 0, message: "generation" });

    const context = new Context(model);
    const data = extractDestinationAndName(fileName, opts.destination);

    // All paths
    const buildDir = path.join(data.destination, data.name);
    await fs.promises.mkdir(buildDir, { recursive: true });
    let mrtccslLocation = opts.mrtccslPath ? `cd ${opts.mrtccslPath};` : "";
    const ifFilePath = path.join(buildDir, "model.if");
    const mrtccslFilePath = path.join(buildDir, "spec.mrtccsl");
    const chainsSpecFilePath = path.join(buildDir, "chains");

    progress.report({ increment: 1, message: "IF model" });
    if (token.isCancellationRequested) {
        return
    }

    const generatedModel = generateIFScript(model, context);
    await overrideFileIfChanged(ifFilePath, generatedModel);

    progress.report({ increment: 4, message: "MRTCCSL specification" });
    if (token.isCancellationRequested) {
        return
    }


    const specification = generateMRTCCSLSpec(context);
    await overrideFileIfChanged(mrtccslFilePath, specification);

    progress.report({ increment: 4, message: "functional chains" });
    if (token.isCancellationRequested) {
        return
    }

    const chainsString: string = model.chains.reduce((acc: string, chain) => {
        acc += generateFunctionalChainSpec(chain, context) + "\n";
        return acc
    }, "");
    await overrideFileIfChanged(chainsSpecFilePath, chainsString);

    console.log(
        chalk.green(`IF, MRTCCSL and functional chain artifacts generated successfully: ${ifFilePath}`)
    );


    progress.report({ increment: 1, message: "building" });
    if (token.isCancellationRequested) {
        return
    }

    let simulationRule = <NinjaRule>{
        name: "simulation",
        command: `${mrtccslLocation}eval $$(opam env); ${mrtccslLocation ? "cd $$OLDPWD;" : ""} OCAMLRUNPARAM=b ccsl+ simulate $in -o ./ --traces=${config.traces} --steps=${config.steps} --horizon=${config.horizon}`,
        implicitDependencies: []
    };
    let reactionRule = <NinjaRule>{
        name: "reaction-time",
        command: `${mrtccslLocation}eval $$(opam env); ${mrtccslLocation ? "cd $$OLDPWD;" : ""} OCAMLRUNPARAM=b ccsl+ reaction -s earliest --scale=${config.scale} -c $in -o ./`,
        implicitDependencies: []
    };
    let compileImageRule = <NinjaRule>{
        name: "compile_image",
        command: `unset GTK_PATH; gnuplot -e "filename='$in'" template.gnu`,
        implicitDependencies: ["template.gnu"]
    };
    let compileTCADPRule = <NinjaRule>{
        name: "convert_trace",
        command: `${mrtccslLocation}eval $$(opam env); ${mrtccslLocation ? "cd $$OLDPWD;" : ""} OCAMLRUNPARAM=b ccsl+ trace convert native csl --microstep=spec.mrtccsl --discretize=near --scale=${config.scale} $in -o $out`,
        implicitDependencies: ["spec.mrtccsl"]
    };

    let buildInstructions = []

    let traceFiles = Array(config.traces).fill("error").map((value, index) => `${index}.trace`);
    buildInstructions.push({ rule: simulationRule, inputs: ["spec.mrtccsl"], outputs: traceFiles });
    let tcadpFiles: string[] = [];
    buildInstructions.push(...Array(config.traces).fill("error").map((value, index) => {
        let traceFile = `${index}.trace`;
        let tcadpFile = `trace/t${index + 1}.txt`;
        tcadpFiles.push(tcadpFile);
        return <NinjaBuildInstruction>{
            rule: compileTCADPRule,
            inputs: [traceFile],
            outputs: [tcadpFile]
        }
    }));


    let reactionStats = model.chains.flatMap(
        chain =>
            generateFunctionalChainSegments(chain, context)
                .map(file => [chain.name, file])
    ).map(([chainName, filename]) => `${chainName}/categorized/${filename}.histogram.csv`);

    buildInstructions.push({ rule: reactionRule, inputs: ["chains", ...traceFiles], outputs: reactionStats });

    for (let file of reactionStats) {
        buildInstructions.push({ rule: compileImageRule, inputs: [file], outputs: [file + ".svg"] });
    }
    let images = reactionStats.map(file => file + ".svg");
    const ninjafile = renderBuildFile([simulationRule, reactionRule, compileImageRule, compileTCADPRule], buildInstructions, [{ name: "images", artifacts: images }, { name: "tcadp", artifacts: tcadpFiles }]);

    await overrideFileIfChanged(path.join(buildDir, "template.gnu"), gnuTemplate);
    await overrideFileIfChanged(path.join(buildDir, "build.ninja"), ninjafile);

    let process = spawn("bash", ["-c", `cd ${buildDir};ninja`]);
    console.log(`bash -c "cd ${buildDir};ninja"`);

    token.onCancellationRequested(() => process.kill());
    for await (const chunk of process.stdout) {
        // console.log(chunk.toString());

        let matches: string[] = [...chunk.toString().matchAll(/\[(\d+)\/(\d+)\]/gm)];
        if (matches.length > 0) {
            const last = matches[matches.length - 1];
            const totalSteps = parseInt(last[2]);
            const processedSteps = matches.length;
            progress.report({ message: "building " + last[0], increment: processedSteps * 90 / totalSteps })
        }
    }

    progress.report({ increment: 100, message: "finished" });
};

export type GenerateOptions = {
    destination?: string;
    mrtccslPath?: string | null | undefined
};

const __dirname = path.resolve(); // was: url.fileURLToPath(new URL('.', import.meta.url));

const packagePath = path.resolve(__dirname, '..', '..', 'package.json');

export function main(): void {
    const program = new Command();
    fsAsync.readFile(packagePath, 'utf-8').then(packageContent => {
        program.version(JSON.parse(packageContent).version);
    });
    const fileExtensions = SdvmlLanguageMetaData.fileExtensions.join(', ');
    program
        .command('generate')
        .argument(
            '<file>',
            `source file (possible file extensions: ${fileExtensions})`
        )
        .option(
            '-d, --destination <dir>',
            'destination directory of generating'
        )
        .description('generates ROS 2 code and package')
        .action((file, dest) => { generateAction(file, { destination: dest }, { report: (_) => { } }, { isCancellationRequested: false, onCancellationRequested: (listener) => new Disposable(() => { }) }) });

    program.parse(process.argv);
}
