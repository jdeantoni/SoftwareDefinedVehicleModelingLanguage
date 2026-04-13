import { LangiumDocument, MaybePromise } from "langium";
import { CodeLensProvider } from "langium/lsp";
import { CancellationToken, CodeLens, CodeLensParams, Command } from "vscode-languageserver";
import { Model } from "./generated/ast.js";
import { SdvmlServices } from "./sdvml-module.js";
import path from "path";
import { existsSync } from "fs";
import { Context, generateChainLinks } from "./cli/generator.js";


interface FilePathData {
    destination: string;
    name: string;
}
export function extractDestinationAndName(
    filePath: string,
    destination: string | undefined
): FilePathData {
    filePath = path
        .basename(filePath, path.extname(filePath))
        .replace(/[.-]/g, '');
    return {
        destination:
            destination ?? path.join(path.dirname(filePath), 'generated'),
        name: path.basename(filePath),
    };
}
export class HistogramShowProvider implements CodeLensProvider {
    constructor(services: SdvmlServices) {

    }
    provideCodeLens(document: LangiumDocument<Model>, params: CodeLensParams, cancelToken?: CancellationToken | undefined): MaybePromise<CodeLens[] | undefined> {
        let model = document.parseResult.value;
        let ctx = new Context(model);

        let filePath = document.uri.fsPath;
        let destination = filePath.slice(0, filePath.lastIndexOf('/')) + "/generated/";
        let info = extractDestinationAndName(filePath, destination);

        let lens = [];
        for (let c of model.chains) {
            let file = `${info.destination}/${info.name}/reaction/${c.name}/weighted/without/histogram.csv`;
            if (existsSync(file)) {
                let links = generateChainLinks(c, ctx);

                let reaction_lens = <CodeLens>{
                    range: c.$cstNode!.range,
                    command: <Command>{
                        title: "Reaction distribution",
                        command: "sdvml.showHistogram",
                        arguments: [file, links]
                    }
                };
                lens.push(reaction_lens);
            }
        };
        for (let c of model.components) {
            for (let s of c.services) {
                let file = `${info.destination}/${info.name}/reaction/${c.name}_${s.name}_monitor/weighted/without/histogram.csv`;
                if (s.resource !== undefined && existsSync(file)) {
                    let reaction_lens = <CodeLens>{
                        range: s.resource.$refNode?.astNode.$cstNode?.range,
                        command: <Command>{
                            title: "Scheduling distribution",
                            command: "sdvml.showHistogram",
                            arguments: [file]
                        }
                    };
                    lens.push(reaction_lens);
                }
            }
        }
        return lens;
    }
}