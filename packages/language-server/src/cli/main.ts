import type { Model } from '../generated/ast.js';
import { Command } from 'commander';
import { SdvmlLanguageMetaData } from '../generated/module.js';
import { createSdvmlServices } from '../sdvml-module.js';
import { extractAstNode, extractDestinationAndName } from './cli-util.js';
import { Context, generateMRTCCSLSpec, generateMicrostepOrder, generateNetworkDeclaration, generateTaskCSV } from './generator.js';
// import {workspace} from "vscode";
import { NodeFileSystem } from 'langium/node';
// import * as url from 'node:url';
import * as fsAsync from 'node:fs/promises';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { spawn } from 'node:child_process';
import { Progress, CancellationToken, Disposable } from "vscode";


const gnuTemplate = `
set datafile separator ","
set terminal svg enhanced size 2000 500 font "Times,11" background rgb 'white'
set output "/dev/stdout"
set xrange[0:]
plot "/dev/stdin" using 1:2 smooth unique w linespoints pt 7;
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
    name: string;
    artifacts: string[];
    byDefault: boolean;
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

function renderGroup(g: Group): string {
    const buildLine = `build ${g.name}: phony ${g.artifacts.join(" ")}`;
    if (g.byDefault) {
        return `${buildLine}\ndefault ${g.name}`
    } else {
        return buildLine
    }
}

function renderBuildFile(rules: NinjaRule[], instructions: NinjaBuildInstruction[], groups: Group[]): string {
    return [...rules.map(renderRule), ...instructions.map(renderBuildInstruction), ...groups.map(renderGroup), ""].join("\n")
}

export async function generateAction(
    fileName: string,
    opts: GenerateOptions,
    progress: Progress<{ increment: number, message?: string | undefined }>,
    token: CancellationToken,
): Promise<void> {
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
    // const ifFilePath = path.join(buildDir, "model.if");
    const mrtccslFilePath = path.join(buildDir, "spec.mrtccsl");
    const tasksFilePath = path.join(buildDir, "tasks.csv");
    const reactionsDir = path.join(buildDir, "reaction");
    const networkFilePath = path.join(buildDir, "network.sexp");
    const microstepPath = path.join(buildDir, "microstep.sexp");
    const traceDir = path.join(buildDir, "traces");

    progress.report({ increment: 1, message: "IF model" });
    if (token.isCancellationRequested) {
        return
    }

    // const generatedModel = generateIFScript(model, context);
    // await overrideFileIfChanged(ifFilePath, generatedModel);

    progress.report({ increment: 4, message: "MRTCCSL specification" });
    if (token.isCancellationRequested) {
        return
    }


    const specification = generateMRTCCSLSpec(context);
    await overrideFileIfChanged(mrtccslFilePath, specification);
    const tasksDescription = generateTaskCSV(context);
    await overrideFileIfChanged(tasksFilePath, tasksDescription);

    progress.report({ increment: 4, message: "functional chains" });
    if (token.isCancellationRequested) {
        return
    }

    let [chainFiles, networkDeclaration] = generateNetworkDeclaration(model.chains, context);
    await overrideFileIfChanged(networkFilePath, networkDeclaration);
    let microstepOrder = generateMicrostepOrder(context);
    await overrideFileIfChanged(microstepPath, microstepOrder); // TODO: for now, for reactions, we don't really care about the same step order

    progress.report({ increment: 1, message: "building" });
    if (token.isCancellationRequested) {
        return
    }

    const useMRTCCSL = `${mrtccslLocation}eval $$(opam env); ${mrtccslLocation ? "cd $$OLDPWD;" : ""} OCAMLRUNPARAM=b `;
    let simulationRule = <NinjaRule>{
        name: "simulation",
        command: `${useMRTCCSL} ccsl+ simulate $in -o ${traceDir} --traces=${config.traces} --steps=${config.steps} --horizon=${config.horizon}`,
        implicitDependencies: []
    };
    let reactionRule = <NinjaRule>{
        name: "reaction_time",
        command: `${useMRTCCSL} ccsl+ reaction2 --scale=${config.scale} $in -o ${reactionsDir}`,
        implicitDependencies: []
    };
    let compileImageRule = <NinjaRule>{
        name: "compile_image",
        command: `unset GTK_PATH; cat $in | gnuplot template.gnu > $out`,
        implicitDependencies: ["template.gnu"]
    };
    let compileTCADPRule = <NinjaRule>{
        name: "convert_trace",
        command: `${useMRTCCSL} ccsl+ trace convert native csl --microstep=spec.mrtccsl --discretize=near --scale=${config.scale} $in -o $out`,
        implicitDependencies: ["spec.mrtccsl"]
    };
    let convertSVGBOBRule = <NinjaRule>{
        name: "convert_svg_bob",
        command: `${useMRTCCSL} ccsl+ trace convert native svgbob --vertical --tasks=${tasksFilePath} $in -o $out`,
        implicitDependencies: [tasksFilePath]
    };
    let compiledSVGBOBRule = <NinjaRule>{
        name: "compile_svg_bob",
        command: `svgbob_cli $in -o $out`,
        implicitDependencies: []
    };

    let buildInstructions = []

    let traceFiles = Array(config.traces).fill("error").map((_, index) => `${traceDir}/${index}.trace`);
    buildInstructions.push({ rule: simulationRule, inputs: ["spec.mrtccsl"], outputs: traceFiles });
    let tcadpFiles: string[] = [];
    let svgbobFiles: string[] = [];
    let compiledSvgbobFiles: string[] = [];
    buildInstructions.push(...Array(config.traces).fill("error").flatMap((value, index) => {
        let traceFile = `${traceDir}/${index}.trace`;
        let tcadpFile = `${traceDir}/cadp/t${index + 1}.txt`;
        let bobFile = `${traceDir}/visualize/${index}.svgbob`;
        let compiledBobFile = `${traceDir}/visualize/${index}.svgbob.svg`;
        tcadpFiles.push(tcadpFile);
        svgbobFiles.push(bobFile);
        compiledSvgbobFiles.push(compiledBobFile)
        return [
            <NinjaBuildInstruction>{
                rule: compileTCADPRule,
                inputs: [traceFile],
                outputs: [tcadpFile]
            },
            <NinjaBuildInstruction>{
                rule: convertSVGBOBRule,
                inputs: [traceFile],
                outputs: [bobFile]
            },
            <NinjaBuildInstruction>{
                rule: compiledSVGBOBRule,
                inputs: [bobFile],
                outputs: [compiledBobFile]
            },
        ]
    }));

    let reactionStats = chainFiles.flatMap(c => [`${reactionsDir}/${c}/weighted/full/histogram.csv`, `${reactionsDir}/${c}/weighted/reduced/histogram.csv`, `${reactionsDir}/${c}/weighted/without/histogram.csv`]);

    buildInstructions.push({ rule: reactionRule, inputs: [networkFilePath, microstepPath, ...traceFiles], outputs: reactionStats });

    for (let file of reactionStats) {
        buildInstructions.push({ rule: compileImageRule, inputs: [file], outputs: [file + ".svg"] });
    }
    let images = reactionStats.map(file => file + ".svg");


    const groups = [
        { name: "images", artifacts: images, byDefault: true },
        { name: "tcadp", artifacts: tcadpFiles, byDefault: false },
        { name: "svgbob", artifacts: svgbobFiles, byDefault: false },
        { name: "svgbob_compiled", artifacts: compiledSvgbobFiles, byDefault: false },
    ];
    const ninjafile = renderBuildFile([simulationRule, reactionRule, compileImageRule, compileTCADPRule, convertSVGBOBRule, compiledSVGBOBRule], buildInstructions, groups);

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
