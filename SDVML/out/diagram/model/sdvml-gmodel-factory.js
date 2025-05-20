var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { GGraph, GLabel, GNode } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { sdvmlModelState } from './sdvml-model-state.js';
export let sdvmlGModelFactory = class sdvmlGModelFactory {
    createModel() {
        const sdvml = this.modelState.sourceModel;
        this.modelState.index.indexsdvml(sdvml);
        const graphNodes = [...sdvml.nodes.flatMap((entry) => this.generateNode(entry))];
        const newRoot = GGraph.builder() //
            .id('sdvml')
            .addChildren(graphNodes)
            .build();
        this.modelState.updateRoot(newRoot);
    }
    generateNode(entry) {
        var _a, _b;
        const sourceNode = entry.sourceNode;
        const builder = GNode.builder().type('node:entry').id(entry.id).layout('vbox').position(entry.position);
        let nodeSize = entry.size;
        if (!nodeSize) {
            nodeSize = {
                width: 100,
                height: 100,
            };
        }
        builder.size(nodeSize);
        builder.addLayoutOptions({ prefWidth: nodeSize.width, prefHeight: nodeSize.height, hAlign: 'center', vAlign: 'center' });
        builder
            .add(GLabel.builder()
            .text((_a = sourceNode === null || sourceNode === void 0 ? void 0 : sourceNode.name.toString()) !== null && _a !== void 0 ? _a : '')
            .id(`${entry.id}_label`)
            .build()).add(GLabel.builder()
            .text((_b = sourceNode === null || sourceNode === void 0 ? void 0 : sourceNode.name) !== null && _b !== void 0 ? _b : '')
            .id(`${entry.id}_description_label`)
            .build());
        return builder.build();
    }
};
__decorate([
    inject(sdvmlModelState),
    __metadata("design:type", sdvmlModelState)
], sdvmlGModelFactory.prototype, "modelState", void 0);
sdvmlGModelFactory = __decorate([
    injectable()
], sdvmlGModelFactory);
//# sourceMappingURL=sdvml-gmodel-factory.js.map