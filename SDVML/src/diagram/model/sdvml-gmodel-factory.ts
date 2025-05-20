import { GGraph, GLabel, GModelFactory, GNode } from '@eclipse-glsp/server'
import { inject, injectable } from 'inversify'
import {  SignalNode } from './sdvml-diagram-model.js'
import { sdvmlModelState } from './sdvml-model-state.js'

@injectable()
export class sdvmlGModelFactory implements GModelFactory {
	@inject(sdvmlModelState)
	protected modelState!: sdvmlModelState

	createModel(): void {
		const sdvml = this.modelState.sourceModel
		this.modelState.index.indexsdvml(sdvml)
		const graphNodes = [...sdvml.nodes.flatMap((entry) => this.generateNode(entry))]
		const newRoot = GGraph.builder() //
			.id('sdvml')
			.addChildren(graphNodes)
			.build()
		this.modelState.updateRoot(newRoot)
	}

	protected generateNode(entry: SignalNode): GNode {
		const sourceNode = entry.sourceNode

		const builder = GNode.builder().type('node:entry').id(entry.id).layout('vbox').position(entry.position)

		let nodeSize = entry.size

		if (!nodeSize) {
			nodeSize = {
				width:  100,
				height: 100,
			}
		}

		builder.size(nodeSize)
		builder.addLayoutOptions({ prefWidth: nodeSize.width, prefHeight: nodeSize.height, hAlign: 'center', vAlign: 'center' })


		builder
			.add(
				GLabel.builder()
					.text(sourceNode?.name.toString() ?? '')
					.id(`${entry.id}_label`)
					.build(),
			).add(
				GLabel.builder()
					.text(sourceNode?.name ?? '')
					.id(`${entry.id}_description_label`)
					.build(),
			)

		return builder.build()
	}
}
