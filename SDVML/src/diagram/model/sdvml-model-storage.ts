import { AbstractJsonModelStorage, ActionDispatcher, MaybePromise } from '@eclipse-glsp/server/node.js'
import { inject } from 'inversify'
import {generateModelFromAST } from './sdvml-diagram-model.js'
import { getLanguageClient } from '../../extension/main.js'
import { sdvmlModelState } from './sdvml-model-state.js'
import { DocumentChange } from '../../language/main.js'

export class sdvmlModelStorage extends AbstractJsonModelStorage {
	@inject(sdvmlModelState)
	protected override modelState!: sdvmlModelState

	@inject(ActionDispatcher)
	protected actionDispatcher!: ActionDispatcher

	constructor() {
		super()
	}

	loadSourceModel(): MaybePromise<void> {
		const languageClient = getLanguageClient()
		if (this.modelState.sourceUri) {
			// Otherwise nothing to load...
			return new Promise((resolve, reject) => {
				languageClient.sendRequest('modelRequest', { uri: this.modelState.sourceUri })
				languageClient.onNotification('node/DocumentChangeOnRequestToSDVMLDiagram', async (documentChange: DocumentChange) => {
					for (const uri of documentChange.uri) {
						const index = documentChange.uri.indexOf(uri)
						if (uri === this.modelState.sourceUri) {
							const content = documentChange.content[index]
							if (content != null) {
								const sdvml = JSON.parse(content)
									this.modelState.updateSourceModel(generateModelFromAST(sdvml, this.modelState.sourceModel))
									resolve()
									return
							}
						}
					}
					reject(new Error('Cannot resolve diagram document'))
				})
			})
		}
	}

	saveSourceModel(): MaybePromise<void> {}
}
