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
		const vssBuilder = GNode.builder().type('node:vssnode').id(sdvml.vss.id)
							    .layout('hbox')//.position({x:0,y:300})
								.addCssClass("vssnode")
		vssBuilder.addChildren(sensorSigNodes).addChildren(actuatorSigNodes)
		vssBuilder.addChildren(GNode.builder().addChildren(GLabel.builder()
					.text("VSS")
					.id(`VSS_label`)
					.addCssClass("label")
					.build()).build())
		vssBuilder.size(700,100)
		const vssNode = vssBuilder.build()

		const compNodes = [...sdvml.components.flatMap((comp) => this.generateComponentNode(comp))]

		
		const newRoot = GGraph.builder() //
			.id('sdvml')
			.addChildren(vssNode).addChildren(compNodes)
			//.addLayoutOption("elk.hierarchyHandling", "INCLUDE_CHILDREN")
			//.addLayoutOption("elk.partitioning.activate", false)
			.addLayoutOption("elk.edgeRouting", "ORTHOGONAL")
			.addLayoutOption("elk.layered.mergeEdges", "false")
			.addLayoutOption("elk.layered.spacing.nodeNodeBetweenLayers", "150")
			.addLayoutOption("elk.spacing.nodeNode", "150")
			.addLayoutOption("elk.spacing.edgeNode", "150")
			.addLayoutOption("elk.portConstraints", "FIXED_SIDE")

			// .addChildren(myEdge)
			// .size(500, 500)
			.build()
		// for (var c of newRoot.children){
		// 	console.error(">>>>> model children size: "+c.id+" ->"+(c as GNode).size.height+";"+(c as GNode).size.width)
		// }
		// console.error((JSON.stringify(newRoot,getCircularReplacer(), 2)))
		this.modelState.updateRoot(newRoot)
	}

	protected generateSensorNode(sensorSigNode: SensorSignalNode): GNode {
		const builder = GNode.builder().type('node:sensorsignalnode').id(sensorSigNode.id).layout('vbox')//.position(sensorSigNode.position)
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
					.text((sensorSigNode.name.toString() ?? '')+": VSS")
					.id(`${sensorSigNode.id}_label`)
					.addCssClass("label")
					.build()
			)

		builder.addCssClass('sensorsignalnode')
		.addArgs(ArgsUtil.cornerRadius(3))
		const res = builder.build();
		this.elementNameToNode.set(sensorSigNode.name,res)
		return res
	}

	protected generateActuatorNode(actuatorSigNode: ActuatorSignalNode): GNode {

		const builder = GNode.builder().type("node:actuatorsignalnode").id(actuatorSigNode.id).layout('vbox')//.position(actuatorSigNode.position)
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
					.text((actuatorSigNode.name.toString() ?? '')+": VSS")
					.id(`${actuatorSigNode.id}_label`)
					.addCssClass("label")
					.build()
			)
		
		builder.addCssClass('actuatorsignalnode');
		const res = builder.build();
		this.elementNameToNode.set(actuatorSigNode.name,res)
		return res
	}

	protected generateComponentNode(compNode: ComponentNode): GNode {
		const builder = GNode.builder()
							.type('node:componentnode')
							.id(compNode.id)
							.layout('hbox')
							.addLayoutOption("elk.portConstraints", "FIXED_SIDE")
							.addLayoutOption("elk.direction", "RIGHT")
							.addLayoutOption("elk.spacing.portPort", 20)
							//.position(compNode.position)
		let nodeSize = compNode.size

		if (!nodeSize) {
			nodeSize = {
				width:  150,
				height: 30,
			}
		}

		builder.size(nodeSize)
		builder.addLayoutOptions({ prefWidth: nodeSize.width, prefHeight: nodeSize.height, hAlign: 'center', vAlign: 'center' })
		builder
			.add(
				GLabel.builder()
					.text((compNode.name.toString() ?? '')+": Comp")
					.id(`${compNode.id}_label`)
					.addCssClass("label")
					.build()
			)

		builder.addCssClass('componentnode');

		let subNameToPortNode: Map<string,GPort> = new Map()
		
		for (let sub of compNode.subscribers){
			// console.error(">>>> compPos "+compNode.position.x+";"+compNode.position.y)
			const inPort: GPort = GPort.builder()
				.id("port"+sub.id) // Unique ID, perhaps derived from parent node ID
				.type('node:inport')
				.addLayoutOption('port.side', "WEST")
				// .addLayoutOption("hAlign", "left")
				.size(10, 10)         
				// .position(compNode.position.x+compNode.size.width-1, compNode.position.y)
				.addCssClass('inport')
				.build();
			subNameToPortNode.set(sub.topic.name,inPort)
			builder.add(inPort)
			// console.error(">>>> inpotPos "+inPort.id+" \n\t"+inPort.position.x+";"+inPort.position.y)

		}

		let pubNameToPortNode: Map<string,GPort> = new Map()
		for (let pub of compNode.publishers){
			const outPort: GPort = GPort.builder()
				.id("port"+pub.id) // Unique ID, perhaps derived from parent node ID
				.type('node:outport')
				.size(10, 10)         // Example: 10x10px square port
				.addCssClass('outport')
				.addLayoutOption('port.side', "EAST")
				.build();
			pubNameToPortNode.set(pub.topic.name,outPort)
			builder.addChildren(outPort)
		}


		for (let sub of compNode.subscribers){
			const myEdge = GEdge.builder()
				.id('edge_'+sub.topic.name)
				.type('edge:pushsub') // Or another edge type
				.source(this.elementNameToNode.get(sub.topic.name)) // Connects from the output port
				.target(subNameToPortNode.get(sub.topic.name)) // Connects to another node's input port
				.addCssClass('pushsub')
				.addCssClass('sprotty-edge')
				.addCssClass('arrow')
				.build();
			builder.addChildren(myEdge)
		}

		for (let pub of compNode.publishers){
			const myEdge = GEdge.builder()
				.id('edge_'+pub.topic.name)
				.type('edge:pushsub') // Or another edge type
				.source(pubNameToPortNode.get(pub.topic.name)) // Connects from the output port
				.target(this.elementNameToNode.get(pub.topic.name)) // Connects to another node's input port
				.addCssClass('pushsub')
				.addCssClass('sprotty-edge')
				.addCssClass('arrow')
				.build();
			builder.addChildren(myEdge)
		}


		const res = builder.build();
		// console.error(">>> component children: "+res.children.map(c => c.type))
		
		//this.elementNameToNode.set(compNode.name,res)
		return res
	}
}


// Define a replacer function for safe JSON.stringify
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