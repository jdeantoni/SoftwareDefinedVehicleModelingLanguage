import * as vscode from 'vscode';
import * as path from 'node:path';
import { LanguageClient, TransportKind } from 'vscode-languageclient/node.js';
// import { SetModelAction} from '@eclipse-glsp/protocol';
// import {RequestBoundsAction, SModelRoot, SNode} from "sprotty-protocol";
// import { ModelServerVisualBuilder } from './sprottyHelper.js';
let client;
// This function is called when the extension is activated.
export function activate(context) {
    client = startLanguageClient(context);
}
// This function is called when the extension is deactivated.
export function deactivate() {
    if (client) {
        return client.stop();
    }
    return undefined;
}
function startLanguageClient(context) {
    const serverModule = context.asAbsolutePath(path.join('out', 'language', 'main.cjs'));
    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging.
    // By setting `process.env.DEBUG_BREAK` to a truthy value, the language server will wait until a debugger is attached.
    const debugOptions = {
        execArgv: [
            '--nolazy',
            `--inspect${process.env.DEBUG_BREAK ? '-brk' : ''}=${process.env.DEBUG_SOCKET || '6009'}`,
        ],
    };
    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: {
            module: serverModule,
            transport: TransportKind.ipc,
            options: debugOptions,
        },
    };
    // Options to control the language client
    const clientOptions = {
        documentSelector: [{ scheme: '*', language: 'sdvml' }],
    };
    // Create the language client and start the client.
    const client = new LanguageClient('SDVML Language Server', serverOptions, clientOptions, true);
    vscode.commands.executeCommand('klighd-vscode.setLanguageClient', client, ['sdvml']);
    //     vscode.commands.executeCommand("klighd-vscode.addActionHandler", "klighd:open", async (args: any) => {
    //     console.log("klighD:open handler")
    //     const uri = vscode.Uri.parse(args.sourceUri);
    //     const doc = await vscode.workspace.openTextDocument(uri);
    //     const content = doc.getText();
    //     // Call your Python backend — e.g., via HTTP fetch or WebSocket
    //     const response = await fetch('http://localhost:5007/diagram', {
    //       method: 'POST',
    //       body: JSON.stringify({ text: content }),
    //       headers: { 'Content-Type': 'application/json' }
    //     });
    //     const diagram = await response.json();
    //     // Must return a diagram in KlighD JSON format
    //     return diagram;
    //   });
    // eslint-disable-next-line no-console
    console.debug('Starting SDVM Language Server...');
    // Start the client. This will also launch the server
    client.start();
    return client;
}
// type ActionHandler = (action: { kind: string }) => Promise<void>
// // - kind: the action kind that should be intercepted by the handler
// // - handler: the action handler that is called for the provided action type.
// vscode.commands.executeCommand("klighd-vscode.addActionHandler", kind: string, handler: ActionHandler);
//# sourceMappingURL=main.js.map