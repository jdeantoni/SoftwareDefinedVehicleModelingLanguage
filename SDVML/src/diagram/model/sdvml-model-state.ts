import { DefaultModelState, JsonModelState } from '@eclipse-glsp/server'
import { inject, injectable } from 'inversify'
import { SDVMLDiagram } from './sdvml-diagram-model.js'
import { sdvmlModelIndex } from './sdvml-diagram-model-index.js'

@injectable()
export class SDVMLModelState extends DefaultModelState implements JsonModelState<SDVMLDiagram> {
	@inject(sdvmlModelIndex)
	override readonly index!: sdvmlModelIndex
	protected _sdvml!: SDVMLDiagram

	get sourceModel(): SDVMLDiagram {
		return this._sdvml
	}

	updateSourceModel(sdvml: SDVMLDiagram): void {
		this._sdvml = sdvml
		this.index.indexsdvml(sdvml)
	}
}
