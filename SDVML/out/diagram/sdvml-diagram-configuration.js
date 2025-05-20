var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { getDefaultMapping, ServerLayoutKind } from "@eclipse-glsp/server";
import { injectable } from "inversify";
export let sdvmlDiagramConfiguration = class sdvmlDiagramConfiguration {
    constructor() {
        this.layoutKind = ServerLayoutKind.MANUAL;
        this.needsClientLayout = true;
        this.animatedUpdate = true;
    }
    get typeMapping() {
        const defaultMappings = getDefaultMapping();
        return defaultMappings;
    }
    get shapeTypeHints() {
        return [
            {
                elementTypeId: 'node:entry',
                deletable: true,
                reparentable: false,
                repositionable: true,
                resizable: true,
            },
        ];
    }
    get edgeTypeHints() {
        return [];
    }
};
sdvmlDiagramConfiguration = __decorate([
    injectable()
], sdvmlDiagramConfiguration);
//# sourceMappingURL=sdvml-diagram-configuration.js.map