import type { Model } from '../generated/ast.js';
import chalk from 'chalk';
import { Command } from 'commander';
import { SdvmlLanguageMetaData } from '../generated/module.js';
import { createSdvmlServices } from '../sdvml-module.js';
import { extractAstNode, extractDestinationAndName } from './cli-util.js';
import { Context, generateFunctionalChainSpec, generateIFScript, generateMRTCCSLSpec } from './generator.js';
import { NodeFileSystem } from 'langium/node';
// import * as url from 'node:url';
import * as fsAsync from 'node:fs/promises';
import * as path from 'node:path';
import * as fs from 'node:fs';





const __dirname = path.resolve(); // was: url.fileURLToPath(new URL('.', import.meta.url));

const packagePath = path.resolve(__dirname, '..', '..', 'package.json');




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
