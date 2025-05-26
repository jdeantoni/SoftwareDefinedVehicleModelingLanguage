import { AstReflection, GrammarUtils, IndexManager, LangiumDocument, MaybePromise } from "langium";
import { CodeActionProvider, LangiumServices } from "langium/lsp";
import { CodeActionParams, CancellationToken, Command, CodeAction, Range, CodeActionKind } from "vscode-languageserver";
import { Signal, Model } from "./generated/ast";

export type CommonEditAction = {
	actionIdentifier: string
	objectIdentifier: string
	newValue: string | number
	oldValue: string
	rowObjectIdentifier?: string
}

export class SdvmlCodeActionProvider implements CodeActionProvider {
    protected readonly reflection: AstReflection
	protected readonly indexManager: IndexManager

	constructor(services: LangiumServices) {
		this.reflection = services.shared.AstReflection
		this.indexManager = services.shared.workspace.IndexManager
	}

    getCodeActions(document: LangiumDocument, params: CodeActionParams, cancelToken?: CancellationToken): MaybePromise<Array<Command | CodeAction> | undefined> {
		if (params.context.only) {
			return params.context.only.map((only) => this.createSourceActions(document, params, only)).filter((ca) => ca) as (Command | CodeAction)[]
		}
        return undefined
    }

    createSourceActions(document: LangiumDocument, params: CodeActionParams, only: string): Command | CodeAction | undefined {
		const rootAst = document.parseResult.value as Model
		const uri = document.uri.toString(true)
		const data = params.context.diagnostics[0].data
		switch (only) {
            case 'editId':
				return this.editAction('Edit Entry Id', rootAst.vss.signals, 'id', uri, data)
			case 'editDescription':
				return this.editAction('Edit Entry Description', rootAst.vss.signals, 'description', uri, data)
			default:
				return undefined
        }
    }

    
	private editAction(codeActionTitle: string, objectList: Signal[], propertyString: string, uri: string, data: CommonEditAction) {
		const object = objectList.find((value) => value.name === data.objectIdentifier)
		const editCst = GrammarUtils.findNodeForProperty(object?.$cstNode, propertyString)
		let newValue = String(data.newValue)
		let range: undefined | Range = undefined
        if (!editCst?.range) {
            return undefined
        }
        range = editCst?.range

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
		}

		return CodeAction.create(codeActionTitle, workspaceEdit, CodeActionKind.Source)
	}

}