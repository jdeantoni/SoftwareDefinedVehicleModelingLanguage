import { ArgsUtil, GGraph, GLabel, GModelFactory, GNode, GEdge, GPort } from '@eclipse-glsp/server'
import { inject, injectable } from 'inversify'
import {  ActuatorSignalNode, ComponentNode, SensorSignalNode } from './sdvml-diagram-model.js'
import { SDVMLModelState } from './sdvml-model-state.js'



@injectable()
export class sdvmlGModelFactory implements GModelFactory {
	@inject(SDVMLModelState)
	protected modelState!: SDVMLModelState
	protected elementNameToNode = new Map<string,GNode>()
	createModel(): void {
		const sdvml = this.modelState.sourceModel
		this.modelState.index.indexsdvml(sdvml)
		const sensorSigNodes = [...sdvml.vss.sensorSignals.flatMap((ssn) => this.generateSensorNode(ssn))]
		const actuatorSigNodes = [...sdvml.vss.actuatorSignals.flatMap((asn) => this.generateActuatorNode(asn))]
		const vssBuilder = GNode.builder().type('node:vss').id(sdvml.vss.id).layout('vbox').addLayoutOption("hAlign", "center").addLayoutOption("minWidth", "700").position({x:0,y:0})
		vssBuilder.addChildren(sensorSigNodes).addChildren(actuatorSigNodes)
		vssBuilder.size(500,100)
		const vssNode = vssBuilder.build()

		const compNodes = [...sdvml.components.flatMap((comp) => this.generateComponentNode(comp))]
		// console.error("test elem ID ")
		// this.elementNameToId.forEach((value, key) => {
		// 	console.error(`${key}: ${value}`);
		// });
		
		
		const newRoot = GGraph.builder() //
			.id('sdvml')
			.addChildren(vssNode).addChildren(compNodes)
			// .addChildren(myEdge)
			.size(500, 500)
			.build()
		// for (var c of newRoot.children){
		// 	console.error(">>>>> model children size: "+c.id+" ->"+(c as GNode).size.height+";"+(c as GNode).size.width)
		// }
		// console.error((JSON.stringify(newRoot,getCircularReplacer(), 2)))
		this.modelState.updateRoot(newRoot)
	}

	protected generateSensorNode(sensorSigNode: SensorSignalNode): GNode {
		const sourceNode = sensorSigNode.parent
		const builder = GNode.builder().type('node:sensorsignalnode').id(sensorSigNode.id).layout('vbox').position(sensorSigNode.position)
		let nodeSize = sensorSigNode.size

		if (!nodeSize) {
			nodeSize = {
				width:  100,
				height: 60,
			}
		}

		builder.size(nodeSize)
		builder.addLayoutOptions({ prefWidth: nodeSize.width, prefHeight: nodeSize.height, hAlign: 'center', vAlign: 'left' })
		builder
			.add(
				GLabel.builder()
					.text((sourceNode?.name.toString() ?? '')+": VSS")
					.id(`${sensorSigNode.id}_label`)
					.build(),
			)

		builder.addCssClass('sensorsignalnode')
		.addArgs(ArgsUtil.cornerRadius(3))
		const res = builder.build();
		this.elementNameToNode.set(sensorSigNode.name,res)
		return res
	}

	protected generateActuatorNode(actuatorSigNode: ActuatorSignalNode): GNode {
		const sourceNode = actuatorSigNode.parent

		const builder = GNode.builder().type("node:actuatorsignalnode").id(actuatorSigNode.id).layout('vbox').position(actuatorSigNode.position)
		let nodeSize = actuatorSigNode.size
		// console.error("nodeSize="+nodeSize?.height)
		if (!nodeSize) {
			nodeSize = {
				width:  100,
				height: 60,
			}
		}

		builder.size(nodeSize)
		builder.addLayoutOptions({ prefWidth: nodeSize.width, prefHeight: nodeSize.height, hAlign: 'center', vAlign: 'right' })


		builder
			.add(
				GLabel.builder()
					.text((sourceNode?.name.toString() ?? '')+": VSS")
					.id(`${actuatorSigNode.id}_label`)
					.build(),
			)
		
		builder.addCssClass('actuatorsignalnode');
		const res = builder.build();
		this.elementNameToNode.set(actuatorSigNode.name,res)
		return res
	}

	protected generateComponentNode(compNode: ComponentNode): GNode {
		const sourceNode = compNode.parent
		const builder = GNode.builder().type('node:componentnode').id(compNode.id).layout('vbox').position(compNode.position)
		let nodeSize = compNode.size

		if (!nodeSize) {
			nodeSize = {
				width:  150,
				height: 80,
			}
		}

		builder.size(nodeSize)
		builder.addLayoutOptions({ prefWidth: nodeSize.width, prefHeight: nodeSize.height, hAlign: 'center', vAlign: 'center' })
		builder
			.add(
				GLabel.builder()
					.text((sourceNode?.name.toString() ?? '')+": Comp")
					.id(`${compNode.id}_label`)
					.build(),
			)

		builder.addCssClass('componentnode');

		let subNameToPortNode: Map<string,GPort> = new Map()
		for (let sub of compNode.subscribers){
			const inPort: GPort = GPort.builder()
				.id(compNode.name+'_'+sub.name) // Unique ID, perhaps derived from parent node ID
				.type('node:inport')
				.size(10, 10)         // Example: 10x10px square port
				.addCssClass('inport')
				.build();
			subNameToPortNode.set(sub.name,inPort)
			builder.addChildren(inPort)
		}

		let pubNameToPortNode: Map<string,GPort> = new Map()
		for (let pub of compNode.publishers){
			const outPort: GPort = GPort.builder()
				.id(compNode.name+'_'+pub.name) // Unique ID, perhaps derived from parent node ID
				.type('node:outport')
				.size(10, 10)         // Example: 10x10px square port
				.addCssClass('outport')
				.build();
			pubNameToPortNode.set(pub.name,outPort)
			builder.addChildren(outPort)
		}


		for (let sub of compNode.subscribers){
			const myEdge = GEdge.builder()
				.id('edge_'+sub.name)
				.type('edge:pushsub') // Or another edge type
				.source(this.elementNameToNode.get(sub.name)) // Connects from the output port
				.target(subNameToPortNode.get(sub.name)) // Connects to another node's input port
				.addRoutingPoint(0, 100)
				.addCssClass('pushsub')
				.addCssClass('sprotty-edge')
				.addCssClass('arrow')
				.build();
			builder.addChildren(myEdge)
		}

		for (let pub of compNode.publishers){
			const myEdge = GEdge.builder()
				.id('edge_'+pub.name)
				.type('edge:pushsub') // Or another edge type
				.source(pubNameToPortNode.get(pub.name)) // Connects from the output port
				.target(this.elementNameToNode.get(pub.name)) // Connects to another node's input port
				.addRoutingPoint(0, 100)
				.addCssClass('pushsub')
				.addCssClass('sprotty-edge')
				.addCssClass('arrow')
				.build();
			builder.addChildren(myEdge)
		}


		const res = builder.build();
		//this.elementNameToNode.set(compNode.name,res)
		return res
	}
}


// // Define a replacer function for safe JSON.stringify
// function getCircularReplacer() {
//   const seen = new WeakSet();
//   return (key: string, value: any) => {
//     if (typeof value === 'object' && value !== null) {
//       if (seen.has(value)) {
//         return '[Circular]';
//       }
//       seen.add(value);
//       if (typeof value === 'function') {
//         return '[Function]';
//       }
//     }
//     return value;
//   };
// }