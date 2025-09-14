import type { Model } from '../generated/ast.js';
import chalk from 'chalk';
import { Command } from 'commander';
import { SdvmlLanguageMetaData } from '../generated/module.js';
import { createSdvmlServices } from '../sdvml-module.js';
import { extractAstNode, extractDestinationAndName } from './cli-util.js';
import { Context, generateFunctionalChainSpec, generateIFScript, generateMRTCCSLSpec } from './generator.js';
// import {workspace} from "vscode";
import { NodeFileSystem } from 'langium/node';
// import * as url from 'node:url';
import * as fsAsync from 'node:fs/promises';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';





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
        set terminal svg size 400,300 enhanced font "Helvetica,20"
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

        set nokey
        unset border
        unset xtics
        unset ytics

        plot filename using 2:xtic(1);
`
}

export const generateAction = async (
    fileName: string,
    opts: GenerateOptions
): Promise<void> => {
    const services = createSdvmlServices(NodeFileSystem).sdvml;
    extractAstNode<Model>(fileName, services).then(model => {
        const context = new Context(model);
        const data = extractDestinationAndName(fileName, opts.destination);

        const resIFPath = path.join(data.destination, 'IF')
        fs.mkdirSync(resIFPath, { recursive: true });
        const ifFilePath = `${path.join(resIFPath, data.name)}.if`;

        const generatedModel = generateIFScript(model, context);
        fs.writeFileSync(ifFilePath, generatedModel);

        const resMRTCCSLPath = path.join(data.destination, 'MRTCCSL');
        fs.mkdirSync(resMRTCCSLPath, { recursive: true });
        const mrtccslFilePath = `${path.join(resMRTCCSLPath, data.name)}.mrtccsl`;

        const specification = generateMRTCCSLSpec(model, context);
        fs.writeFileSync(mrtccslFilePath, specification);

        const fcFilePath = `${path.join(resMRTCCSLPath, data.name)}.chains`;
        const chainsString = model.chains.reduce((acc, chain) => { acc += generateFunctionalChainSpec(chain, context) + "\n"; return acc }, "");
        fs.writeFileSync(fcFilePath, chainsString);

        console.log(
            chalk.green(`IF, MRTCCSL and functional chain artifacts generated successfully: ${ifFilePath}`)
        );

        // workspace.getConfiguration("sdvml-extension-langium");
        // let pathToMrtccsl = settings.get("mrtccsl");
        const pathToMrtccsl = "/home/ptokarie/code/mrtccsl"
        console.log(
            chalk.green(`MRTCCSL path: ${pathToMrtccsl}`)
        );
        const resultPath = path.join(data.destination, 'results');
        let commandPrefix = pathToMrtccsl ? `cd ${pathToMrtccsl}; eval \\$(opam env);` : "";
        let command = `${commandPrefix} OCAMLRUNPARAM=b simulate ${mrtccslFilePath} -o ${resultPath} -fc ${fcFilePath} -bob -cadp -tcadp --scale 0.0001 --traces 10 --steps 10000 --horizon 10000`;
        console.log(chalk.green(command));
        console.log(execSync(`bash -c "${command}"`).toString());

        let gnuplotFolder = fs.mkdtempSync('gnus');
        let specResults = path.join(resultPath, data.name) + ".mrtccsl/";
        let files = fs.readdirSync(specResults);
        console.log(files);
        for (let file of files) {
            if (file.endsWith(".csv")) {
                let scriptFilename = `${path.join(gnuplotFolder, file)}.gnu`;
                fs.writeFileSync(scriptFilename, makeGNUPlotScript(path.join(specResults, file)));
                let command = `bash -c "unset GTK_PATH; gnuplot ${scriptFilename}"`
                console.log(command);
                console.log(execSync(command).toString());
            }
        }
    });
};

export type GenerateOptions = {
    destination?: string;
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
        .action(generateAction);

    program.parse(process.argv);
}
