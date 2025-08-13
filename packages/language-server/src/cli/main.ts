import type { Model } from '../generated/ast.js';
import chalk from 'chalk';
import { Command } from 'commander';
import { SdvmlLanguageMetaData } from '../generated/module.js';
import { createSdvmlServices } from '../sdvml-module.js';
import { extractAstNode, extractDestinationAndName } from './cli-util.js';
import { generateIFScript, makeContext } from './generator.js';
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
        const data = extractDestinationAndName(fileName, opts.destination);
        const resPath = path.join(data.destination, 'IF')
        fs.mkdirSync(resPath, { recursive: true });
        const generatedFilePath = `${path.join(resPath, data.name)}.if`;

        const context = makeContext(model);
        const generatedModel = generateIFScript(
            model, context
        );

        fs.writeFileSync(generatedFilePath, generatedModel);

        console.log(
            context
        );

        console.log(
            chalk.green(`IF code generated successfully: ${generatedFilePath}`)
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
