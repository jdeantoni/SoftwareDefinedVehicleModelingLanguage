import { GlspEditorProvider } from '@eclipse-glsp/vscode-integration';
import * as vscode from 'vscode';
import { getLanguageClient } from '../main.js';
import { ReloadModelAction } from './actions/reload-model-action.js';
export default class SDVMLEditorProvider extends GlspEditorProvider {
    constructor(extensionContext, glspVscodeConnector) {
        console.debug("constructing SDVMLEditorProvider");
        super(glspVscodeConnector);
        this.extensionContext = extensionContext;
        this.glspVscodeConnector = glspVscodeConnector;
        this.diagramType = 'sdvml-diagram';
        this.needsReload = false;
    }
    setUpWebview(_document, webviewPanel, _token, clientId) {
        const webview = webviewPanel.webview;
        const extensionUri = this.extensionContext.extensionUri;
        const webviewScriptSourceUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'webview.js'));
        const webviewCSSUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'webview.css'));
        const codiconsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'out', 'codicon.css'));
        getLanguageClient().onNotification('node/DocumentChangeToSDVMLDiagram', () => {
            if (!webviewPanel.visible) {
                this.needsReload = true;
            }
            else {
                const reloadModelAction = ReloadModelAction.create({
                    diagramType: clientId,
                    sourceUri: _document.uri.toString(),
                });
                this.glspVscodeConnector.dispatchAction(reloadModelAction, clientId);
            }
        });
        webviewPanel.onDidChangeViewState((e) => {
            var _a;
            if (((_a = e.webviewPanel) === null || _a === void 0 ? void 0 : _a.visible) && this.needsReload) {
                const reloadModelAction = ReloadModelAction.create({
                    diagramType: clientId,
                    sourceUri: _document.uri.toString(),
                });
                this.glspVscodeConnector.dispatchAction(reloadModelAction, clientId);
                this.needsReload = false;
            }
        });
        webviewPanel.webview.options = {
            enableScripts: true,
        };
        webviewPanel.webview.html = `
             <!DOCTYPE html>
             <html lang="en">
                 <head>
                     <meta charset="UTF-8">
                     <meta name="viewport" content="width=device-width, height=device-height">
                     <meta http-equiv="Content-Security-Policy" content="
                 default-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval';
                 ">
                 <link href="${codiconsUri}" rel="stylesheet" />
				 <link href="${webviewCSSUri}" rel="stylesheet" />

                 </head>
                 <body>
                     <div id="${clientId}_container" style="height: 100%;"></div>
                     <script src="${webviewScriptSourceUri}"></script>
                 </body>
             </html>`;
    }
}
//# sourceMappingURL=sdvml-editor-provider.js.map