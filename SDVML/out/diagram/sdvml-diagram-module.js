var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { CompoundOperationHandler, DiagramModule, } from '@eclipse-glsp/server/node.js';
import { injectable } from 'inversify';
import { sdvmlDiagramConfiguration } from './sdvml-diagram-configuration.js';
import { sdvmlModelState } from './model/sdvml-model-state.js';
import { sdvmlModelStorage } from './model/sdvml-model-storage.js';
import { sdvmlGModelFactory } from './model/sdvml-gmodel-factory.js';
import { sdvmlModelIndex } from './model/sdvml-diagram-model-index.js';
import { sdvmlApplyLabelEditHandler } from './handler/sdvml-apply-label-edit-handler.js';
export let SdvmlDiagramModule = class SdvmlDiagramModule extends DiagramModule {
    constructor() {
        super(...arguments);
        this.diagramType = 'sdvml-diagram';
    }
    bindDiagramConfiguration() {
        console.debug("1");
        return sdvmlDiagramConfiguration;
    }
    bindSourceModelStorage() {
        console.debug("2");
        return sdvmlModelStorage;
    }
    bindModelState() {
        console.debug("3");
        return { service: sdvmlModelState };
    }
    bindGModelFactory() {
        console.debug("4");
        return sdvmlGModelFactory;
    }
    configureActionHandlers(binding) {
        console.debug("5");
        super.configureActionHandlers(binding);
    }
    configureOperationHandlers(binding) {
        console.debug("6");
        binding.add(sdvmlApplyLabelEditHandler);
        binding.add(CompoundOperationHandler);
    }
    bindGModelIndex() {
        console.debug("7");
        this.context.bind(sdvmlModelIndex).toSelf().inSingletonScope();
        return { service: sdvmlModelIndex };
    }
};
SdvmlDiagramModule = __decorate([
    injectable()
], SdvmlDiagramModule);
//# sourceMappingURL=sdvml-diagram-module.js.map