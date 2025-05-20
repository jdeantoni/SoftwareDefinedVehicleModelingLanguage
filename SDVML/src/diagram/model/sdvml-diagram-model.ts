import { AnyObject, Dimension, hasArrayProp, hasObjectProp, hasStringProp, Point } from '@eclipse-glsp/server'
import { MD5 } from 'object-hash'
import { Signal, Model } from '../../language/generated/ast.js'

export interface sdvmlDiagram {
	id: string
	nodes: SignalNode[]
}

export function issdvmlDiagram(object: object | undefined): object is sdvmlDiagram {
	return AnyObject.is(object) && hasStringProp(object, 'id') && hasArrayProp(object, 'nodes')
}

export interface SignalNode {
	id: string
	sourceNode?: Signal
	position: Point
	sourceNodeName?: number
	size?: Dimension
}

export function isEntryNode(object: object | undefined): object is SignalNode {
	return AnyObject.is(object) && hasStringProp(object, 'id') && hasObjectProp(object, 'position')
}

export function generateModelFromAST(model: Model, existingDiagram: sdvmlDiagram): sdvmlDiagram {
	const nodes = model.signals.flatMap((sig) => createDiagramNodes(sig, existingDiagram))
	return {
		id: 'sdvml', //this needs to change in order to load the persistence? or maybe it doesn't
		nodes: [...nodes],
	}
}

function createDiagramNodes(rootNode: Signal, existingDiagram: sdvmlDiagram): SignalNode [] {
	const diagramNode = createDiagramNode(rootNode, existingDiagram)

	let nodes: SignalNode[] = [diagramNode]

	return nodes
}

function createDiagramNode(rootNode: Signal, existingDiagram: sdvmlDiagram): SignalNode {
	const rootNodeHash = MD5(rootNode)
		let existingNode: SignalNode | undefined
		if (existingDiagram) {
			existingDiagram.nodes.forEach((node) => {
				if (node.id == rootNode.name) {
					existingNode = node
				}
			})
		}

		if (existingNode) {
			return {
				id: rootNodeHash,
				sourceNode: rootNode,
				position: existingNode.position,
				size: existingNode.size,
			}
		}
	

	return {
		id: rootNodeHash,
		sourceNode: rootNode,
		position: {
			x: 300,
			y: 50,
		},
	}
}
