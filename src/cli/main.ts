import type { Model } from '../language/generated/ast.js';
import chalk from 'chalk';
import { Command } from 'commander';
import { SdvmlLanguageMetaData } from '../language/generated/module.js';
import { createSdvmlServices } from '../language/sdvml-module.js';
import { extractAstNode } from './cli-util.js';
import { generateIFScript } from './generator.js';
import { NodeFileSystem } from 'langium/node';
import * as url from 'node:url';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

const packagePath = path.resolve(__dirname, '..', '..', 'package.json');
const packageContent = await fs.readFile(packagePath, 'utf-8');

export const generateAction = async (
    fileName: string,
    opts: GenerateOptions
): Promise<void> => {
    const services = createSdvmlServices(NodeFileSystem).Sdvml;
    const model = await extractAstNode<Model>(fileName, services);
    const generatedFilePath = generateIFScript(
        model,
        fileName,
        opts.destination
    );
    console.log(
        chalk.green(`IF code generated successfully: ${generatedFilePath}`)
    );
};

export type GenerateOptions = {
    destination?: string;
};

export default function (): void {
    const program = new Command();

    program.version(JSON.parse(packageContent).version);

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
