import { ArgsUtil, GEdge, GGraph, GLabel, GModelFactory, GNode, GPort } from '@eclipse-glsp/server'
import { inject, injectable } from 'inversify'
import {  ActuatorSignalNode, ComponentNode, SensorSignalNode } from './sdvml-diagram-model.js'
import { SDVMLModelState } from './sdvml-model-state.js'


@injectable()
export class sdvmlGModelFactory implements GModelFactory {
	@inject(SDVMLModelState)
	protected modelState!: SDVMLModelState
	protected elementNameToId = new Map<string,string>()
	createModel(): void {
		const sdvml = this.modelState.sourceModel
		this.modelState.index.indexsdvml(sdvml)
		const sensorSigNodes = [...sdvml.sensorSignals.flatMap((ssn) => this.generateSensorNode(ssn))]
		const actuatorSigNodes = [...sdvml.actuatorSignals.flatMap((asn) => this.generateActuatorNode(asn))]
		const compNodes = [...sdvml.components.flatMap((comp) => this.generateComponentNode(comp))]
		console.error("test elem ID ")
		this.elementNameToId.forEach((value, key) => {
			console.error(`${key}: ${value}`);
		});
		const myEdge = GEdge.builder()
			.id('edge1')
			.type('edge') // Or another edge type
			.source(compNodes[0]) // Connects from the output port
			.target(actuatorSigNodes[0]) // Connects to another node's input port
			  .addRoutingPoint(0, 100)
			.build();
		
		const newRoot = GGraph.builder() //
			.id('sdvml')
			.addChildren(actuatorSigNodes).addChildren(sensorSigNodes).addChildren(compNodes)
			.addChildren(myEdge)
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
		this.elementNameToId.set(sensorSigNode.name,res.id)
		return res
	}

	protected generateActuatorNode(actuatorSigNode: ActuatorSignalNode): GNode {
		const sourceNode = actuatorSigNode.parent

		const builder = GNode.builder().type('node:actuatorsignalnode').id(actuatorSigNode.id).layout('vbox').position(actuatorSigNode.position)

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
		
		builder.addCssClass('node:actuatorsignalnode');
		const res = builder.build();
		this.elementNameToId.set(actuatorSigNode.name,res.id)
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

		builder.addCssClass('node:componentnode');

		const inPort: GPort = GPort.builder()
			.id('myNode_inPort1') // Unique ID, perhaps derived from parent node ID
			.size(10, 10)         // Example: 10x10px square port
			.addCssClass('inport')
			.build();


		builder.addChildren(inPort)


		const res = builder.build();
		this.elementNameToId.set(compNode.name,res.id)
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