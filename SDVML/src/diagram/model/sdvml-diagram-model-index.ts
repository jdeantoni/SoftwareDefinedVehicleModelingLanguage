import { GModelIndex } from '@eclipse-glsp/server'
import { injectable } from 'inversify'
import { SDVMLNode, SDVMLDiagram } from './sdvml-diagram-model'

@injectable()
export class sdvmlModelIndex extends GModelIndex {
	protected idToSDVMLNodeElements = new Map<string, SDVMLNode>()

	indexsdvml(sdvml: SDVMLDiagram | undefined): void {
		this.idToSDVMLNodeElements.clear()
		for (const element of sdvml?.sensorSignals ?? []) {
			this.idToSDVMLNodeElements.set(element.id, element)
		}
	}

	findEntryNode(id: string): SDVMLNode | undefined {
		return this.idToSDVMLNodeElements.get(id)
	}
}
