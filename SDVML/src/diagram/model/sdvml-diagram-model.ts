import { AnyObject, Dimension, hasArrayProp, hasObjectProp, hasStringProp, Point } from '@eclipse-glsp/server'
import { MD5 } from 'object-hash'
import { Signal, Model, isSensor, isActuator, Sensor, Actuator, Component, VSS } from '../../language/generated/ast.js'


export interface SDVMLNode{
	id: string
	parent?: Signal | Component | Model

	position?: Point
	size?: Dimension
}

export interface SDVMLDiagram {
	id: string
	vss: VSSNode
	components: ComponentNode[]
}

export interface VSSNode extends SDVMLNode{
	sensorSignals: SensorSignalNode[]
	actuatorSignals: ActuatorSignalNode[]
}
export function issdvmlDiagram(object: object | undefined): object is SDVMLDiagram {
	return AnyObject.is(object) && hasStringProp(object, 'id') && hasArrayProp(object, 'nodes')
}

export interface SensorSignalNode extends SDVMLNode {
	name:string
}

export interface ComponentNode extends SDVMLNode {
	name:string
}

export interface ActuatorSignalNode extends SDVMLNode{
	name:string
}

export function isEntryNode(object: object | undefined): object is SensorSignalNode {
	return AnyObject.is(object) && hasStringProp(object, 'id') && hasObjectProp(object, 'position')
}

export function generateModelFromAST(model: Model, existingDiagram: SDVMLDiagram): SDVMLDiagram {
	const vssNode: VSSNode = createVSSNode(model.vss,existingDiagram)
	const componentNodes : ComponentNode[] = model.components.flatMap((comp) => createDiagramComponentNodes(comp, existingDiagram))
	return {
		id: 'sdvml', //this needSignalntNodes]
		vss:vssNode,
		components : [...componentNodes]
	}
}

function createVSSNode(vss: VSS, existingDiagram: SDVMLDiagram): VSSNode {
	const sensorSignalsNodes : SensorSignalNode[] = vss.signals.filter(sig => isSensor(sig)).flatMap((sig) => createDiagramSensorSignalNodes(sig as Sensor, existingDiagram))
	const actuatorSignalsNodes : ActuatorSignalNode []= vss.signals.filter(sig => isActuator(sig)).flatMap((sig) => createDiagramActuatorSignalNodes(sig as Actuator, existingDiagram))
	return {
		id: 'vss', //this needSignalntNodes]
		sensorSignals: [...sensorSignalsNodes],
		actuatorSignals: [...actuatorSignalsNodes],
		parent: vss.$container
	}

}

function createDiagramSensorSignalNodes(rootNode: Sensor, existingDiagram: SDVMLDiagram): SensorSignalNode [] {
	const diagramNode = createSensorDiagramNode(rootNode, existingDiagram)
	let nodes: SensorSignalNode[] = [diagramNode]
	return nodes
}

function createDiagramComponentNodes(rootNode: Component, existingDiagram: SDVMLDiagram): ComponentNode [] {
	const diagramNode = createComponentNode(rootNode, existingDiagram)
	let nodes: SensorSignalNode[] = [diagramNode]
	return nodes
}

function createDiagramActuatorSignalNodes(rootNode: Actuator, existingDiagram: SDVMLDiagram): ActuatorSignalNode [] {
	const diagramNode = createActuatorDiagramNode(rootNode, existingDiagram)
	let nodes: ActuatorSignalNode[] = [diagramNode]
	return nodes
}

function createSensorDiagramNode(rootNode: Signal, existingDiagram: SDVMLDiagram): SensorSignalNode {
	const rootNodeHash = MD5(rootNode)
		let existingNode: SensorSignalNode | undefined
		if (existingDiagram) {
			existingDiagram.vss.sensorSignals.forEach((node) => {
				if (node.id == rootNode.name) {
					existingNode = node
				}
			})
		}

		if (existingNode) {
			return {
				id: rootNodeHash,
				name:existingNode.name,
				parent: rootNode,
				position: existingNode.position,
				size: existingNode.size,
			}
		}
	

	return {
		id: rootNodeHash,
		name:rootNode.name,
		parent: rootNode,
		position: {
			x: 100,
			y: 50,
		},
		size: {
			height: 10,
			width: 10
		},
	}
}

function createActuatorDiagramNode(rootNode: Signal, existingDiagram: SDVMLDiagram): ActuatorSignalNode {
	const rootNodeHash = MD5(rootNode)
		let existingNode: ActuatorSignalNode | undefined
		if (existingDiagram) {
			existingDiagram.vss.actuatorSignals.forEach((node) => {
				if (node.id == rootNode.name) {
					existingNode = node
				}
			})
		}

		if (existingNode) {
			return {
				id: rootNodeHash,
				name:existingNode.name,
				parent: rootNode,
				position: existingNode.position,
				size: existingNode.size,
			}
		}
	

	return {
		id: rootNodeHash,
		name:rootNode.name,
		parent: rootNode,
		position: {
			x: 500,
			y: 50,
		},
		size: {
			height: 10,
			width: 10
		},
	}
}

function createComponentNode(rootNode: Component, existingDiagram: SDVMLDiagram): ComponentNode {
	const rootNodeHash = MD5(rootNode)
		let existingNode: ComponentNode | undefined
		if (existingDiagram) {
			existingDiagram.vss.sensorSignals.forEach((node) => {
				if (node.id == rootNode.name) {
					existingNode = node
				}
			})
		}

		if (existingNode) {
			return {
				id: rootNodeHash,
				name:existingNode.name,
				parent: rootNode,
				position: existingNode.position,
				size: existingNode.size,
			}
		}
	

	return {
		id: rootNodeHash,
		name:rootNode.name,
		parent: rootNode,
		position: {
			x: 300,
			y: 10,
		},
		size: {
			height: 10,
			width: 10
		},
	}
}
