/********************************************************************************
 * Copyright (c) 2025 Université Côte d'Azur and others.

 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import * as path from 'path';
import {
    SprottyDiagramIdentifier, WebviewContainer, createFileUri,
    registerDefaultCommands, registerLspEditCommands, registerTextEditorSync
} from 'sprotty-vscode';
import { LspSprottyEditorProvider, LspSprottyViewProvider, LspWebviewPanelManager } from 'sprotty-vscode/lib/lsp';
import * as vscode from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { Messenger } from 'vscode-messenger';
import { GetImageRequest } from './sdvml-messages.js'


let languageClient: LanguageClient;


// const GetImageRequest = new RequestType<
//     { elementId: string; position: { x: number; y: number } }, // request
//     { image: string; position: { x: number; y: number } },     // response
//     void                                                      // error (not used)
// >('get-image');


function sdvmlCreateWebviewHtml(identifier: SprottyDiagramIdentifier, container: WebviewContainer,
    options: { scriptUri: vscode.Uri, cssUri?: vscode.Uri, title?: string; }): string {
    const transformUri = (uri: vscode.Uri) => container.webview.asWebviewUri(uri).toString();
    return `<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, height=device-height">
        ${options.title ? `<title>${options.title}</title>` : ''}
        ${options.cssUri ? `<link rel="stylesheet" type="text/css" href="${transformUri(options.cssUri)}" />` : ''}
        <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' data:; script-src ${container.webview.cspSource}; style-src 'unsafe-inline' ${container.webview.cspSource};">
    </head>
    <body>
        <div id="${identifier.clientId}_container" style="height: 100%;"></div>
        <script src="${transformUri(options.scriptUri)}"></script>
    </body>
</html>`;
}

export function activate(context: vscode.ExtensionContext) {
    const cliPath = context.asAbsolutePath('pack/language-server/src/cli/main.cjs');
    const { generateAction, GenerateOptions } = require(cliPath);


    const diagramMode = process.env.DIAGRAM_MODE || 'panel';
    if (!['panel', 'editor', 'view'].includes(diagramMode)) {
        throw new Error("The environment variable 'DIAGRAM_MODE' must be set to 'panel', 'editor' or 'view'.");
    }

    languageClient = createLanguageClient(context);
    const extensionPath = context.extensionUri.fsPath;
    const localResourceRoots = [createFileUri(extensionPath, 'pack', 'diagram')];

    const createWebviewHtml = (identifier: SprottyDiagramIdentifier, container: WebviewContainer) =>
        sdvmlCreateWebviewHtml(identifier, container, {
            scriptUri: createFileUri(extensionPath, 'pack', 'diagram', 'main.js'),
            cssUri: createFileUri(extensionPath, 'pack', 'diagram', 'main.css')
        });



    if (diagramMode === 'panel') {
        // Set up webview panel manager for freestyle webviews
        // console.error("~~~~> packages/extension/src/sdvml-extension.ts:Panel mode")
        const webviewPanelManager = new LspWebviewPanelManager({
            extensionUri: context.extensionUri,
            defaultDiagramType: 'sdvml',
            languageClient,
            supportedFileExtensions: ['.sdvml'],
            localResourceRoots,
            createWebviewHtml
        });

        webviewPanelManager.options.createWebviewHtml
        webviewPanelManager.messenger.onRequest(
            GetImageRequest,
            async (message: { elementId: string; position: { x: number; y: number } }) => {
                // console.error("~~~~> packages/extension/src/sdvml-extension.ts:" + message.elementId)
                const image = await getImageForElement(message.elementId);
                return {
                    image,
                    position: message.position
                };
            }
        );

        registerDefaultCommands(webviewPanelManager, context, { extensionPrefix: 'sdvml' });
        registerLspEditCommands(webviewPanelManager, context, { extensionPrefix: 'sdvml' });
    }

    if (diagramMode === 'editor') {
        // Set up webview editor associated with file type
        console.error("~~~~> packages/extension/src/sdvml-extension.ts:Editor mode")
        const webviewEditorProvider = new LspSprottyEditorProvider({
            extensionUri: context.extensionUri,
            viewType: 'sdvml',
            languageClient,
            supportedFileExtensions: ['.sdvml'],
            localResourceRoots,
            createWebviewHtml
        });

        webviewEditorProvider.messenger.onRequest(
            GetImageRequest,
            async (message: { elementId: string; position: { x: number; y: number } }) => {
                // console.error("~~~~> packages/extension/src/sdvml-extension.ts:" + message.elementId)
                const image = await getImageForElement(message.elementId);
                return {
                    image,
                    position: message.position
                };
            }
        );


        context.subscriptions.push(
            vscode.window.registerCustomEditorProvider('sdvml', webviewEditorProvider, {
                webviewOptions: { retainContextWhenHidden: true }
            })
        );
        registerDefaultCommands(webviewEditorProvider, context, { extensionPrefix: 'sdvml' });
        registerLspEditCommands(webviewEditorProvider, context, { extensionPrefix: 'sdvml' });

    }

    if (diagramMode === 'view') {
        // Set up webview view shown in the side panel
        console.error("~~~~> packages/extension/src/sdvml-extension.ts:View mode")
        const webviewViewProvider = new LspSprottyViewProvider({
            extensionUri: context.extensionUri,
            viewType: 'sdvml',
            languageClient,
            supportedFileExtensions: ['.sdvml'],
            openActiveEditor: true,
            messenger: new Messenger({ ignoreHiddenViews: false }),
            localResourceRoots,
            createWebviewHtml
        });

        webviewViewProvider.messenger.onRequest(
            GetImageRequest,
            async (message: { elementId: string; position: { x: number; y: number } }) => {
                // console.error("~~~~> packages/extension/src/sdvml-extension.ts:" + message.elementId)
                const img = await getImageForElement(message.elementId);
                return {
                    image: img,
                    position: message.position
                };
            }
        );

        context.subscriptions.push(
            vscode.window.registerWebviewViewProvider('sdvml', webviewViewProvider, {
                webviewOptions: { retainContextWhenHidden: true }
            })
        );
        registerDefaultCommands(webviewViewProvider, context, { extensionPrefix: 'sdvml' });
        registerTextEditorSync(webviewViewProvider, context);
    }

    context.subscriptions.push(vscode.commands.registerCommand('sdvml.generateCode', () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active SDVML file.');
            return;
        }

        const document = editor.document;
        const filePath = document.uri.fsPath;

        vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: "Analysis", cancellable: true }, async (progress, token) => {
            const mrtccslPath = vscode.workspace.getConfiguration().get('mrtccsl');
            let opts = {
                destination: filePath.slice(0, filePath.lastIndexOf('/')) + "/generated/",
                mrtccslPath
            }
            console.error("~~~~~~~> generate path", opts.destination)
            try {
                await generateAction(filePath, opts, progress, token);
            } catch (error) {
                vscode.window.showErrorMessage("" + error);
            }
        });
    }));

    context.subscriptions.push(
        vscode.commands.registerCommand("sdvml.showHistogram", (args: unknown) => {

        })
    )
}

function createLanguageClient(context: vscode.ExtensionContext): LanguageClient {
    const serverModule = context.asAbsolutePath(path.join('pack', 'language-server', 'src', 'main.cjs'));
    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging.
    // By setting `process.env.DEBUG_BREAK` to a truthy value, the language server will wait until a debugger is attached.
    const debugOptions = { execArgv: ['--nolazy', `--inspect${process.env.DEBUG_BREAK ? '-brk' : ''}=${process.env.DEBUG_SOCKET || '6009'}`] };

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
    };

    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*.sm');
    context.subscriptions.push(fileSystemWatcher);

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'sdvml' }],
        synchronize: {
            // Notify the server about file changes to files contained in the workspace
            fileEvents: fileSystemWatcher
        }
    };

    // Create the language client and start the client.
    const languageClient = new LanguageClient(
        'sdvml',
        'Sdvml',
        serverOptions,
        clientOptions
    );

    // Start the client. This will also launch the server
    languageClient.start();
    return languageClient;
}

export async function deactivate(): Promise<void> {
    if (languageClient) {
        await languageClient.stop();
    }
}


import * as fs from 'fs';

function getImageForElement(elementId: any): Promise<string> {
    const imagePath = path.join(__dirname, '../media', '', 'icon.png'); // adjust since should retrieve images computed by Pavlo and Irman
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    // console.log("here it is :-/ "+base64Image)
    return Promise.resolve(`data:image/png;base64,${base64Image}`);
}

