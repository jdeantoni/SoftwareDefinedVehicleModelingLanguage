import { GModelIndex } from '@eclipse-glsp/server'
import { injectable } from 'inversify'
import { SignalNode, sdvmlDiagram } from './sdvml-diagram-model'

@injectable()
export class sdvmlModelIndex extends GModelIndex {
	protected idToEntryNodeElements = new Map<string, SignalNode>()

	indexsdvml(sdvml: sdvmlDiagram | undefined): void {
		this.idToEntryNodeElements.clear()
		for (const element of sdvml?.nodes ?? []) {
			this.idToEntryNodeElements.set(element.id, element)
		}
	}

	findEntryNode(id: string): SignalNode | undefined {
		return this.idToEntryNodeElements.get(id)
	}
}
