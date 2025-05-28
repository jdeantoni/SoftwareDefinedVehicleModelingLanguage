var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ArgsUtil, GGraph, GLabel, GNode, GEdge, GPort } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { SDVMLModelState } from './sdvml-model-state.js';
let sdvmlGModelFactory = class sdvmlGModelFactory {
    constructor() {
        this.elementNameToNode = new Map();
    }
    createModel() {
        const sdvml = this.modelState.sourceModel;
        this.modelState.index.indexsdvml(sdvml);
        const sensorSigNodes = [...sdvml.vss.sensorSignals.flatMap((ssn) => this.generateSensorNode(ssn))];
        const actuatorSigNodes = [...sdvml.vss.actuatorSignals.flatMap((asn) => this.generateActuatorNode(asn))];
        const vssBuilder = GNode.builder().type('node:vssnode').id(sdvml.vss.id)
            .layout('hbox').position({ x: 0, y: 300 })
            .addCssClass("vssnode");
        vssBuilder.addChildren(sensorSigNodes).addChildren(actuatorSigNodes);
        vssBuilder.addChildren(GNode.builder().addChildren(GLabel.builder()
            .text("VSS")
            .id(`VSS_label`)
            .addCssClass("label")
            .build()).build());
        vssBuilder.size(700, 100);
        const vssNode = vssBuilder.build();
        const compNodes = [...sdvml.components.flatMap((comp) => this.generateComponentNode(comp))];
        // console.error("test elem ID ")
        // this.elementNameToId.forEach((value, key) => {
        // 	console.error(`${key}: ${value}`);
        // });
        const newRoot = GGraph.builder() //
            .id('sdvml')
            .addChildren(vssNode).addChildren(compNodes)
            .addLayoutOption("elk.hierarchyHandling", "INCLUDE_CHILDREN")
            .addLayoutOption("elk.partitioning.activate", false)
            .addLayoutOption("elk.edgeRouting", "POLYLINE")
            .addLayoutOption("elk.layered.mergeEdges", false)
            .addLayoutOption("elk.layered.spacing.nodeNodeBetweenLayers", 50)
            .addLayoutOption("elk.spacing.nodeNode", 50)
            .addLayoutOption("elk.spacing.edgeNode", 50)
            .addLayoutOption("elk.portConstraints", "FIXED_SIDE")
            // .addChildren(myEdge)
            // .size(500, 500)
            .build();
        // for (var c of newRoot.children){
        // 	console.error(">>>>> model children size: "+c.id+" ->"+(c as GNode).size.height+";"+(c as GNode).size.width)
        // }
        // console.error((JSON.stringify(newRoot,getCircularReplacer(), 2)))
        this.modelState.updateRoot(newRoot);
    }
    generateSensorNode(sensorSigNode) {
        var _a;
        const builder = GNode.builder().type('node:sensorsignalnode').id(sensorSigNode.id).layout('vbox').position(sensorSigNode.position);
        let nodeSize = sensorSigNode.size;
        if (!nodeSize) {
            nodeSize = {
                width: 100,
                height: 60,
            };
        }
        builder.size(nodeSize);
        builder.addLayoutOptions({ prefWidth: nodeSize.width, prefHeight: nodeSize.height, hAlign: 'center', vAlign: 'left' });
        builder
            .add(GLabel.builder()
            .text(((_a = sensorSigNode.name.toString()) !== null && _a !== void 0 ? _a : '') + ": VSS")
            .id(`${sensorSigNode.id}_label`)
            .addCssClass("label")
            .build());
        builder.addCssClass('sensorsignalnode')
            .addArgs(ArgsUtil.cornerRadius(3));
        const res = builder.build();
        this.elementNameToNode.set(sensorSigNode.name, res);
        return res;
    }
    generateActuatorNode(actuatorSigNode) {
        var _a;
        const builder = GNode.builder().type("node:actuatorsignalnode").id(actuatorSigNode.id).layout('vbox').position(actuatorSigNode.position);
        let nodeSize = actuatorSigNode.size;
        // console.error("nodeSize="+nodeSize?.height)
        if (!nodeSize) {
            nodeSize = {
                width: 100,
                height: 60,
            };
        }
        builder.size(nodeSize);
        builder.addLayoutOptions({ prefWidth: nodeSize.width, prefHeight: nodeSize.height, hAlign: 'center', vAlign: 'right' });
        builder
            .add(GLabel.builder()
            .text(((_a = actuatorSigNode.name.toString()) !== null && _a !== void 0 ? _a : '') + ": VSS")
            .id(`${actuatorSigNode.id}_label`)
            .addCssClass("label")
            .build());
        builder.addCssClass('actuatorsignalnode');
        const res = builder.build();
        this.elementNameToNode.set(actuatorSigNode.name, res);
        return res;
    }
    generateComponentNode(compNode) {
        var _a;
        const builder = GNode.builder()
            .type('node:componentnode')
            .id(compNode.id)
            .layout('hbox')
            .addLayoutOption("elk.portConstraints", "FIXED_SIDE")
            .addLayoutOption("elk.direction", "RIGHT")
            .addLayoutOption("elk.portAlignment.east", "CENTER")
            .addLayoutOption("elk.algorithm", "org.eclipse.elk.layered")
            .addLayoutOption("elk.spacing.port", 10)
            .position(compNode.position);
        let nodeSize = compNode.size;
        if (!nodeSize) {
            nodeSize = {
                width: 150,
                height: 30,
            };
        }
        builder.size(nodeSize);
        builder.addLayoutOptions({ prefWidth: nodeSize.width, prefHeight: nodeSize.height, hAlign: 'center', vAlign: 'center' });
        builder
            .add(GLabel.builder()
            .text(((_a = compNode.name.toString()) !== null && _a !== void 0 ? _a : '') + ": Comp")
            .id(`${compNode.id}_label`)
            .addCssClass("label")
            .build());
        builder.addCssClass('componentnode');
        let subNameToPortNode = new Map();
        for (let sub of compNode.subscribers) {
            // console.error(">>>> id "+sub.id)
            const inPort = GPort.builder()
                .id("port" + sub.id) // Unique ID, perhaps derived from parent node ID
                .type('node:inport')
                .addLayoutOption('port.side', "EAST")
                .addLayoutOption("hAlign", "right")
                .size(10, 10)
                .addCssClass('inport')
                .build();
            subNameToPortNode.set(sub.name, inPort);
            builder.add(inPort);
        }
        let pubNameToPortNode = new Map();
        for (let pub of compNode.publishers) {
            const outPort = GPort.builder()
                .id("port" + pub.id) // Unique ID, perhaps derived from parent node ID
                .type('node:outport')
                .size(10, 10) // Example: 10x10px square port
                .addCssClass('outport')
                .addLayoutOption('port.side', "EAST")
                .build();
            pubNameToPortNode.set(pub.name, outPort);
            builder.addChildren(outPort);
        }
        for (let sub of compNode.subscribers) {
            const myEdge = GEdge.builder()
                .id('edge_' + sub.name)
                .type('edge:pushsub') // Or another edge type
                .source(this.elementNameToNode.get(sub.name)) // Connects from the output port
                .target(subNameToPortNode.get(sub.name)) // Connects to another node's input port
                .addCssClass('pushsub')
                .addCssClass('sprotty-edge')
                .addCssClass('arrow')
                .build();
            builder.addChildren(myEdge);
        }
        for (let pub of compNode.publishers) {
            const myEdge = GEdge.builder()
                .id('edge_' + pub.name)
                .type('edge:pushsub') // Or another edge type
                .source(pubNameToPortNode.get(pub.name)) // Connects from the output port
                .target(this.elementNameToNode.get(pub.name)) // Connects to another node's input port
                .addCssClass('pushsub')
                .addCssClass('sprotty-edge')
                .addCssClass('arrow')
                .build();
            builder.addChildren(myEdge);
        }
        const res = builder.build();
        // console.error(">>> component children: "+res.children.map(c => c.type))
        //this.elementNameToNode.set(compNode.name,res)
        return res;
    }
};
__decorate([
    inject(SDVMLModelState),
    __metadata("design:type", SDVMLModelState)
], sdvmlGModelFactory.prototype, "modelState", void 0);
sdvmlGModelFactory = __decorate([
    injectable()
], sdvmlGModelFactory);
export { sdvmlGModelFactory };
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
//# sourceMappingURL=sdvml-gmodel-factory.js.map