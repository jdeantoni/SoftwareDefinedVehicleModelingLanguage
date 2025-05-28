import { ApplyLabelEditOperation } from '@eclipse-glsp/protocol'
import { Command, GLSPServerError, JsonOperationHandler, MaybePromise } from '@eclipse-glsp/server/node.js'
import { inject, injectable } from 'inversify'
import { SDVMLModelState } from '../model/sdvml-model-state.js'
import { getLanguageClient } from '../../extension/main.js'
import { createAndSendCodeAction, createCodeActionParams } from './sdvml-code-action-utils.js'

@injectable()
export class sdvmlApplyLabelEditHandler extends JsonOperationHandler {
	readonly operationType = ApplyLabelEditOperation.KIND

	@inject(SDVMLModelState)
	protected override readonly modelState!: SDVMLModelState

	override createCommand(operation: ApplyLabelEditOperation): MaybePromise<Command | undefined> {
		const languageClient = getLanguageClient()
		return this.commandOf(() => {
			const index = this.modelState.index
			// Retrieve the parent node of the label that should be edited
			const labelElement = index.get(operation.labelId)
			const entryGNode = labelElement.parent
			if (entryGNode && this.modelState.sourceUri) {
				const entryNode = index.findNode(entryGNode.id)
				if (!entryNode) {
					throw new GLSPServerError(`Could not retrieve the parent node for the label with id ${operation.labelId}`)
				}

				const codeActionParams = createCodeActionParams('editDescription', this.modelState.sourceUri, {
					objectIdentifier: entryNode.parent?.id,
					newValue: `'${operation.text}'`,
				})

				return createAndSendCodeAction(languageClient, codeActionParams)
			}
		})
	}
}
