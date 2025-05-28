import { GModelIndex } from '@eclipse-glsp/server'
import { injectable } from 'inversify'
import { SDVMLNode, SDVMLDiagram } from './sdvml-diagram-model'

@injectable()
export class sdvmlModelIndex extends GModelIndex {
	protected idToSDVMLNodeElements = new Map<string, SDVMLNode>()

	indexsdvml(sdvml: SDVMLDiagram | undefined): void {
		this.idToSDVMLNodeElements.clear()
		for (const element of sdvml?.vss.sensorSignals ?? []) {
			this.idToSDVMLNodeElements.set(element.id, element)
		}
		for (const element of sdvml?.vss.actuatorSignals ?? []) {
			this.idToSDVMLNodeElements.set(element.id, element)
		}
		for (const element of sdvml?.components ?? []) {
			for(const sub of element.subscribers){
				this.idToSDVMLNodeElements.set("port"+sub.id, sub)
			}
			for(const pub of element.publishers){
				this.idToSDVMLNodeElements.set("port"+pub.id, pub)
			}
			this.idToSDVMLNodeElements.set(element.id, element)
		}
		this.idToSDVMLNodeElements.set("vss", sdvml?.vss)
	}

	findNode(id: string): SDVMLNode | undefined {
		return this.idToSDVMLNodeElements.get(id)
	}
}
