var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ArgsUtil, GGraph, GLabel, GNode, GPort } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { SDVMLModelState } from './sdvml-model-state.js';
let sdvmlGModelFactory = class sdvmlGModelFactory {
    constructor() {
        this.elementNameToId = new Map();
    }
    createModel() {
        const sdvml = this.modelState.sourceModel;
        this.modelState.index.indexsdvml(sdvml);
        const sensorSigNodes = [...sdvml.vss.sensorSignals.flatMap((ssn) => this.generateSensorNode(ssn))];
        const actuatorSigNodes = [...sdvml.vss.actuatorSignals.flatMap((asn) => this.generateActuatorNode(asn))];
        const vssBuilder = GNode.builder().type('node:vss').id(sdvml.vss.id).layout('vbox').position({ x: 0, y: 0 });
        vssBuilder.addChildren(sensorSigNodes).addChildren(actuatorSigNodes);
        vssBuilder.size(500, 100);
        const vssNode = vssBuilder.build();
        const compNodes = [...sdvml.components.flatMap((comp) => this.generateComponentNode(comp))];
        // console.error("test elem ID ")
        // this.elementNameToId.forEach((value, key) => {
        // 	console.error(`${key}: ${value}`);
        // });
        // const myEdge = GEdge.builder()
        // 	.id('edge1')
        // 	.type('edge:pushsub') // Or another edge type
        // 	.source(compNodes[0]) // Connects from the output port
        // 	.target(actuatorSigNodes[0]) // Connects to another node's input port
        // 	  .addRoutingPoint(0, 100)
        //       .addCssClass('pushsub')
        // 	  .addCssClass('sprotty-edge')
        // 	  .addCssClass('arrow')
        // 	.build();
        const newRoot = GGraph.builder() //
            .id('sdvml')
            .addChildren(vssNode).addChildren(compNodes)
            // .addChildren(myEdge)
            .size(500, 500)
            .build();
        // for (var c of newRoot.children){
        // 	console.error(">>>>> model children size: "+c.id+" ->"+(c as GNode).size.height+";"+(c as GNode).size.width)
        // }
        // console.error((JSON.stringify(newRoot,getCircularReplacer(), 2)))
        this.modelState.updateRoot(newRoot);
    }
    generateSensorNode(sensorSigNode) {
        var _a;
        const sourceNode = sensorSigNode.parent;
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
            .text(((_a = sourceNode === null || sourceNode === void 0 ? void 0 : sourceNode.name.toString()) !== null && _a !== void 0 ? _a : '') + ": VSS")
            .id(`${sensorSigNode.id}_label`)
            .build());
        builder.addCssClass('sensorsignalnode')
            .addArgs(ArgsUtil.cornerRadius(3));
        const res = builder.build();
        this.elementNameToId.set(sensorSigNode.name, res.id);
        return res;
    }
    generateActuatorNode(actuatorSigNode) {
        var _a;
        const sourceNode = actuatorSigNode.parent;
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
            .text(((_a = sourceNode === null || sourceNode === void 0 ? void 0 : sourceNode.name.toString()) !== null && _a !== void 0 ? _a : '') + ": VSS")
            .id(`${actuatorSigNode.id}_label`)
            .build());
        builder.addCssClass('actuatorsignalnode');
        const res = builder.build();
        this.elementNameToId.set(actuatorSigNode.name, res.id);
        return res;
    }
    generateComponentNode(compNode) {
        var _a;
        const sourceNode = compNode.parent;
        const builder = GNode.builder().type('node:componentnode').id(compNode.id).layout('vbox').position(compNode.position);
        let nodeSize = compNode.size;
        if (!nodeSize) {
            nodeSize = {
                width: 150,
                height: 80,
            };
        }
        builder.size(nodeSize);
        builder.addLayoutOptions({ prefWidth: nodeSize.width, prefHeight: nodeSize.height, hAlign: 'center', vAlign: 'center' });
        builder
            .add(GLabel.builder()
            .text(((_a = sourceNode === null || sourceNode === void 0 ? void 0 : sourceNode.name.toString()) !== null && _a !== void 0 ? _a : '') + ": Comp")
            .id(`${compNode.id}_label`)
            .build());
        builder.addCssClass('componentnode');
        const inPort = GPort.builder()
            .id('myNode_inPort1') // Unique ID, perhaps derived from parent node ID
            .type('node:inport')
            .size(10, 10) // Example: 10x10px square port
            .addCssClass('inport')
            .build();
        builder.addChildren(inPort);
        const res = builder.build();
        this.elementNameToId.set(compNode.name, res.id);
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
//# sourceMappingURL=sdvml-gmodel-factory.js.map