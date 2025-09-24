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
import { execSync, spawn } from 'node:child_process';
import { Progress, CancellationToken, Disposable } from "vscode";
import { setTimeout } from 'node:timers/promises';




const __dirname = path.resolve(); // was: url.fileURLToPath(new URL('.', import.meta.url));

const packagePath = path.resolve(__dirname, '..', '..', 'package.json');

function makeGNUPlotScript(filename: string): string {
    return `
        clear
        reset
        set border 3
        set datafile separator ','

        filename = "${filename}"
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
}

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

export const generateAction = async (
    fileName: string,
    opts: GenerateOptions,
    progress: Progress<{ increment: number, message?: string | undefined }>,
    token: CancellationToken,
): Promise<void> => {
    const services = createSdvmlServices(NodeFileSystem).sdvml;
    let model = await extractAstNode<Model>(fileName, services);

    let buildrules = ""

    progress.report({ increment: 0, message: "preparation" });
    await setTimeout(100);
    const context = new Context(model);
    const data = extractDestinationAndName(fileName, opts.destination);

    progress.report({ increment: 10, message: "IF model" });
    if (token.isCancellationRequested) {
        return
    }
    await setTimeout(100); // TODO: remove this... bad thing, replace with checkboxes if possible

    const resIFPath = path.join(data.destination, 'IF')
    fs.mkdirSync(resIFPath, { recursive: true });
    const ifFilePath = `${path.join(resIFPath, data.name)}.if`;

    const generatedModel = generateIFScript(model, context);
    await fs.promises.writeFile(ifFilePath, generatedModel);

    progress.report({ increment: 10, message: "MRTCCSL specification" });
    if (token.isCancellationRequested) {
        return
    }
    await setTimeout(100);

    const resMRTCCSLPath = path.join(data.destination, 'MRTCCSL');
    fs.mkdirSync(resMRTCCSLPath, { recursive: true });
    const mrtccslFilePath = `${path.join(resMRTCCSLPath, data.name)}.mrtccsl`;

    const specification = generateMRTCCSLSpec(model, context);
    await fs.promises.writeFile(mrtccslFilePath, specification);

    progress.report({ increment: 10, message: "functional chains" });
    if (token.isCancellationRequested) {
        return
    }
    await setTimeout(100);

    const fcFilePath = `${path.join(resMRTCCSLPath, data.name)}.chains`;
    const chainsString: string = model.chains.reduce((acc: string, chain) => {
        acc += generateFunctionalChainSpec(chain, context) + "\n";
        return acc
    }, "");
    await fs.promises.writeFile(fcFilePath, chainsString);

    console.log(
        chalk.green(`IF, MRTCCSL and functional chain artifacts generated successfully: ${ifFilePath}`)
    );


    progress.report({ increment: 10, message: "simulating" });
    if (token.isCancellationRequested) {
        return
    }
    await setTimeout(100);

    const resultPath = path.join(data.destination, 'results');
    let mrtccslLocation = opts.mrtccslPath ? `cd ${opts.mrtccslPath};` : "";
    let command = `${mrtccslLocation}eval \\$(opam env); OCAMLRUNPARAM=b simulate ${mrtccslFilePath} -o ${resultPath} -fc ${fcFilePath} -bob -cadp -tcadp --scale 0.0001 --traces 10 --steps 10000 --horizon 10000`;
    console.log(chalk.green(command));
    console.log(execSync(`bash -c "${command}"`).toString());

    let chain_pairs = model.chains.flatMap(chain => generateFunctionalChainSegments(chain, context)).map(filename => filename + "_reaction_time_hist.csv")
    buildrules += `
build ${chain_pairs.join(" ")} : simulation
    spec = ${mrtccslFilePath}
    chain = ${fcFilePath}
`

    progress.report({ increment: 10, message: "processing images" });
    if (token.isCancellationRequested) {
        return
    }
    await setTimeout(100);

    let specResults = path.join(resultPath, data.name) + ".mrtccsl/";
    let files = await fs.promises.readdir(specResults);
    console.log(files);

    for (let file of files) {
        if (file.endsWith(".csv")) {
            let scriptFilename = `${path.join(specResults, file)}.gnu`;
            await fs.promises.writeFile(scriptFilename, makeGNUPlotScript(path.join(specResults, file)));
            let command = `bash -c "unset GTK_PATH; gnuplot ${scriptFilename}"`
            console.log(command);
            console.log(execSync(command).toString());
            buildrules += `
build ${file}.svg : compile_image ${file} | template.gnu
default ${file}.svg
`

            if (token.isCancellationRequested) {
                return
            }

        }
    }

    const ninjafile = `
rule simulation
    command = ${mrtccslLocation}eval $$(opam env); OCAMLRUNPARAM=b simulate $spec -o ./ -fc $chain -bob -cadp -tcadp --scale 0.0001 --traces 10 --steps 10000 --horizon 10000

rule compile_image
    command = unset GTK_PATH; gnuplot -e "filename='$in'" template.gnu
${buildrules}
`
    await fs.promises.writeFile(path.join(specResults, "template.gnu"), gnuTemplate);
    await fs.promises.writeFile(path.join(specResults, "build.ninja"), ninjafile);

    // let process = spawn("bash", ["-c", `cd ${specResults};ninja`]);
    // console.log(`bash -c "cd ${specResults};ninja"`);
    // for await (const chunk of process.stdout) {
    //     // console.log(chunk.toString());

    //     let matches: string[] = [...chunk.toString().matchAll(/\[(\d+)\/(\d+)\]/gm)];
    //     if (matches.length > 0) {
    //         const last = matches[matches.length - 1];
    //         const totalSteps = parseInt(last[2]);
    //         const processedSteps = matches.length;
    //         console.log(matches.map(m => m[0]));
    //         progress.report({ message: last[0], increment: processedSteps * 100 / totalSteps })
    //     }
    // }

    progress.report({ increment: 50, message: "finished" });
    await setTimeout(100);
};

export type GenerateOptions = {
    destination?: string;
    mrtccslPath?: string | null | undefined
};

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
