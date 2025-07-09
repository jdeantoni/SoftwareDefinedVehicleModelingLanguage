import { MD5 } from 'object-hash'
import { Signal, Model, isSensor, isActuator, Sensor, Actuator, Component, VSS } from '../../language/generated/ast.js'
import { boundsFeature, connectableFeature, deletableFeature, fadeFeature, GModelElement, hoverFeedbackFeature, layoutableChildFeature, layoutContainerFeature, moveFeature, nameFeature, popupFeature, RectangularNode, resizeFeature, selectFeature } from '@eclipse-glsp/client'





export class SDVMLNode extends RectangularNode {
	static override readonly DEFAULT_FEATURES = [
		connectableFeature,
		deletableFeature,
		selectFeature,
		boundsFeature,
		moveFeature,
		layoutContainerFeature,
		fadeFeature,
		hoverFeedbackFeature,
		popupFeature,
		nameFeature,
		resizeFeature,
		layoutableChildFeature
		];
	
}
export class SDVMLDiagram extends SDVMLNode {
	vss: VSSNode
	components: ComponentNode[]
}

export function isSdvmlDiagram(element: GModelElement): element is GModelElement {
	return element instanceof SDVMLDiagram || false;
}

export class VSSNode extends SDVMLNode{
	sensorSignals: SensorSignalNode[]
	actuatorSignals: ActuatorSignalNode[]
}

export function isVSSNode(element: GModelElement): element is GModelElement {
	return element instanceof isVSSNode || false;
}

export class SensorSignalNode extends SDVMLNode {
	name:string
}

export function isSensorSignalNode(element: GModelElement): element is GModelElement {
	return element instanceof SensorSignalNode || false;
}

export class PortNode extends SDVMLNode {
	topic:SensorSignalNode|ActuatorSignalNode
}

export class ComponentNode extends SDVMLNode {
	name:string
	subscribers: PortNode[]
	publishers: PortNode[]
}

export function isComponentNode(element: GModelElement): element is GModelElement {
	return element instanceof ComponentNode || false;
}

export class ActuatorSignalNode extends SDVMLNode{
	name:string
}

export function isActuatorSignalNode(element: GModelElement): element is GModelElement {
	return element instanceof ActuatorSignalNode || false;
}



let sensorSignalNodes : SensorSignalNode[] = []
let actuatorSignalNodes : SensorSignalNode[] = []


export function generateModelFromAST(model: Model, existingDiagram: SDVMLDiagram): SDVMLDiagram {
	const vssNode: VSSNode = createVSSNode(model.vss,existingDiagram)
	const componentNodes : ComponentNode[] = model.components.flatMap((comp) => createComponentNodes(comp, existingDiagram))
	let diagNode : SDVMLDiagram = new SDVMLDiagram()
	diagNode.id = 'sdvml'
	diagNode.vss=vssNode
	diagNode.components = componentNodes
	return diagNode
}

function createVSSNode(vss: VSS, existingDiagram: SDVMLDiagram): VSSNode {
	sensorSignalNodes = vss.signals.filter(sig => isSensor(sig)).flatMap((sig) => createSensorSignalNodes(sig as Sensor, existingDiagram))
	actuatorSignalNodes= vss.signals.filter(sig => isActuator(sig)).flatMap((sig) => createActuatorSignalNodes(sig as Actuator, existingDiagram))
	let res : VSSNode = new VSSNode()
	res.id = 'vss' //this needSignalntNodes]
	res.sensorSignals = [...sensorSignalNodes]
	res.actuatorSignals= [...actuatorSignalNodes]
	return res
}



function createSensorSignalNodes(rootNode: Signal, existingDiagram: SDVMLDiagram): SensorSignalNode {
	const rootNodeHash = MD5(rootNode)
		let existingNode: SensorSignalNode | undefined
		if (existingDiagram) {
			existingDiagram.vss.sensorSignals.forEach((node) => {
				if (node.id == rootNode.name) {
					existingNode = node
				}
			})
		}
	
	let res : SensorSignalNode = new SensorSignalNode()
		if (existingNode) {
			res.id = rootNodeHash
			res.name = existingNode.name
			res.position = existingNode.position
			res.size = existingNode.size
			return res
		}
	

	res.id = rootNodeHash
	res.name =rootNode.name
	res.position = {x: 100,	y: 50}
	res.size = {height: 30,	width: 100}
	return res
}

function createActuatorSignalNodes(rootNode: Signal, existingDiagram: SDVMLDiagram): ActuatorSignalNode {
	const rootNodeHash = MD5(rootNode)
		let existingNode: ActuatorSignalNode | undefined
		if (existingDiagram) {
			existingDiagram.vss.actuatorSignals.forEach((node) => {
				if (node.id == rootNode.name) {
					existingNode = node
				}
			})
		}
	
	let res : ActuatorSignalNode = new ActuatorSignalNode
		if (existingNode) {
			res.id = rootNodeHash
			res.name = existingNode.name
			res.position = existingNode.position
			res.size = existingNode.size
			return res
		}
	

	res.id = rootNodeHash
	res.name = rootNode.name
	res.position = {x: 500,	y: 50}
	res.size = {height: 30,	width: 100}
	return res
}

function createComponentNodes(rootNode: Component, existingDiagram: SDVMLDiagram): ComponentNode {
	const rootNodeHash = MD5(rootNode)
		let existingNode: ComponentNode | undefined
		if (existingDiagram) {
			existingDiagram.components.forEach((node) => {
				if (node.id == rootNode.name) {
					existingNode = node
				}
			})
		}

		let res : ComponentNode = new ComponentNode()
		if (existingNode) {
			res.id = rootNodeHash
			res.name = existingNode.name
			res.position = existingNode.position
			res.size = existingNode.size
			res.subscribers = existingNode.subscribers
			res.publishers = existingNode.publishers
			return res
		}
	

	res.id = rootNodeHash
	res.name = rootNode.name
	res.position = {x: 300, y: 10}
	res.size = {	height: 30,	width: 100}
	res.subscribers = []
	for (let rp of rootNode.subscribers){
		let p : PortNode = new PortNode()
		p.topic = sensorSignalNodes.find(s => s.name == rp.name)
		if (p.topic == undefined){
			console.error("sensorSig not found for "+rp.name)//+" in "+sensorSignalNodes.map(ssn => ssn.name))
		}
		p.id = res.id+"_"+p.topic.id
		res.subscribers.push(p)
	}
	res.publishers = []
	for (let rp of rootNode.publishers){
		let p : PortNode = new PortNode()
		p.topic = actuatorSignalNodes.find(s => s.name == rp.name)
		if (p.topic == undefined){
			console.error("actuatorSig not found for "+rp.name)
		}
		p.id = res.id+"_"+p.topic.id
		res.publishers.push(p)
	}
	return res
}
