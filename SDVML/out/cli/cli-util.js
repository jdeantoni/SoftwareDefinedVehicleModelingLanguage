import chalk from 'chalk';
import * as path from 'node:path';
import * as fs from 'node:fs';
import { URI } from 'langium';
export async function extractDocument(fileName, services) {
    var _a;
    const extensions = services.LanguageMetaData.fileExtensions;
    if (!extensions.includes(path.extname(fileName))) {
        console.error(chalk.yellow(`Please choose a file with one of these extensions: ${extensions}.`));
        process.exit(1);
    }
    if (!fs.existsSync(fileName)) {
        console.error(chalk.red(`File ${fileName} does not exist.`));
        process.exit(1);
    }
    const document = await services.shared.workspace.LangiumDocuments.getOrCreateDocument(URI.file(path.resolve(fileName)));
    await services.shared.workspace.DocumentBuilder.build([document], {
        validation: true,
    });
    const validationErrors = ((_a = document.diagnostics) !== null && _a !== void 0 ? _a : []).filter((e) => e.severity === 1);
    if (validationErrors.length > 0) {
        console.error(chalk.red('There are validation errors:'));
        for (const validationError of validationErrors) {
            console.error(chalk.red(`line ${validationError.range.start.line + 1}: ${validationError.message} [${document.textDocument.getText(validationError.range)}]`));
        }
        process.exit(1);
    }
    return document;
}
export async function extractAstNode(fileName, services) {
    var _a;
    return (_a = (await extractDocument(fileName, services)).parseResult) === null || _a === void 0 ? void 0 : _a.value;
}
export function extractDestinationAndName(filePath, destination) {
    filePath = path
        .basename(filePath, path.extname(filePath))
        .replace(/[.-]/g, '');
    return {
        destination: destination !== null && destination !== void 0 ? destination : path.join(path.dirname(filePath), 'generated'),
        name: path.basename(filePath),
    };
}
export function camelCaseToSnakeCase(str) {
    return str
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .toLowerCase()
        .replace(/-/g, '_');
}
//# sourceMappingURL=cli-util.js.map