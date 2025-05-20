import { GrammarUtils } from "langium";
import { CodeAction, CodeActionKind } from "vscode-languageserver";
export class SdvmlCodeActionProvider {
    constructor(services) {
        this.reflection = services.shared.AstReflection;
        this.indexManager = services.shared.workspace.IndexManager;
    }
    getCodeActions(document, params, cancelToken) {
        if (params.context.only) {
            return params.context.only.map((only) => this.createSourceActions(document, params, only)).filter((ca) => ca);
        }
        return undefined;
    }
    createSourceActions(document, params, only) {
        const rootAst = document.parseResult.value;
        const uri = document.uri.toString(true);
        const data = params.context.diagnostics[0].data;
        switch (only) {
            case 'editId':
                return this.editAction('Edit Entry Id', rootAst.signals, 'id', uri, data);
            case 'editDescription':
                return this.editAction('Edit Entry Description', rootAst.signals, 'description', uri, data);
            default:
                return undefined;
        }
    }
    editAction(codeActionTitle, objectList, propertyString, uri, data) {
        const object = objectList.find((value) => value.name === data.objectIdentifier);
        const editCst = GrammarUtils.findNodeForProperty(object === null || object === void 0 ? void 0 : object.$cstNode, propertyString);
        let newValue = String(data.newValue);
        let range = undefined;
        if (!(editCst === null || editCst === void 0 ? void 0 : editCst.range)) {
            return undefined;
        }
        range = editCst === null || editCst === void 0 ? void 0 : editCst.range;
        const workspaceEdit = {
            documentChanges: [
                {
                    textDocument: {
                        version: null,
                        uri: uri,
                    },
                    edits: [
                        {
                            range: range,
                            newText: newValue,
                        },
                    ],
                },
            ],
        };
        return CodeAction.create(codeActionTitle, workspaceEdit, CodeActionKind.Source);
    }
}
//# sourceMappingURL=sdvml-code-actions.js.map