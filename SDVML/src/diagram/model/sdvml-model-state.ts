import { DefaultModelState, JsonModelState } from '@eclipse-glsp/server'
import { inject, injectable } from 'inversify'
import { sdvmlDiagram } from './sdvml-diagram-model.js'
import { sdvmlModelIndex } from './sdvml-diagram-model-index.js'

@injectable()
export class sdvmlModelState extends DefaultModelState implements JsonModelState<sdvmlDiagram> {
	@inject(sdvmlModelIndex)
	override readonly index!: sdvmlModelIndex
	protected _sdvml!: sdvmlDiagram

	get sourceModel(): sdvmlDiagram {
		return this._sdvml
	}

	updateSourceModel(sdvml: sdvmlDiagram): void {
		this._sdvml = sdvml
		this.index.indexsdvml(sdvml)
	}
}
