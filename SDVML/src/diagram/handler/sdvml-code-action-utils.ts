import * as vscode from 'vscode'
import { CodeAction, TextDocumentIdentifier, CodeActionTriggerKind, DocumentUri, TextDocumentEdit } from 'vscode-languageserver-types'
import { CodeActionParams, LanguageClient } from 'vscode-languageclient/node.js'
import { GLSPServerError, MaybePromise } from '@eclipse-glsp/server'

export function createAndSendCodeAction(languageClient: LanguageClient, params: CodeActionParams): MaybePromise<void> {
	return languageClient.sendRequest('textDocument/codeAction', params).then(
		(res: CodeAction[] | unknown) => {
			if (res instanceof Array) {
				res.forEach((codeAction) => {
					if (!CodeAction.is(codeAction)) {
						return
					}

					if (codeAction.edit) {
						if (codeAction.edit.documentChanges) {
							codeAction.edit.documentChanges.forEach((change) => {
								if (TextDocumentEdit.is(change)) {
									const uri = vscode.Uri.parse(change.textDocument.uri)
									const edit = new vscode.WorkspaceEdit()
									change.edits.forEach((textDocumentEdit) => {
										const start = new vscode.Position(textDocumentEdit.range.start.line, textDocumentEdit.range.start.character)
										if (textDocumentEdit.range.start != textDocumentEdit.range.end) {
											const end = new vscode.Position(textDocumentEdit.range.end.line, textDocumentEdit.range.end.character)
											const range = new vscode.Range(start, end)
											edit.replace(uri, range, textDocumentEdit.newText)
										} else {
											edit.insert(uri, start, textDocumentEdit.newText)
										}
									})

									vscode.workspace.applyEdit(edit).then((value) => {
										console.log(value)
									})
								}
							})
						}
					}
				})
			}
		},
		(reason: Error) => {
			throw new GLSPServerError(reason.message)
		},
	)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createCodeActionParams(type: string, documentUri: DocumentUri, data: any): CodeActionParams {
	return {
		textDocument: TextDocumentIdentifier.create(documentUri),
		range: {
			start: {
				character: 0,
				line: 0,
			},
			end: {
				character: 0,
				line: 0,
			},
		},
		context: {
			triggerKind: CodeActionTriggerKind.Invoked,
			only: [type],
			diagnostics: [
				{
					message: 'synthetic',
					range: {
						start: {
							character: 0,
							line: 0,
						},
						end: {
							character: 0,
							line: 0,
						},
					},
					data: data,
				},
			],
		},
	}
}
