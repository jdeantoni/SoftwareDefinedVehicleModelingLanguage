var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { GModelIndex } from '@eclipse-glsp/server';
import { injectable } from 'inversify';
export let sdvmlModelIndex = class sdvmlModelIndex extends GModelIndex {
    constructor() {
        super(...arguments);
        this.idToEntryNodeElements = new Map();
    }
    indexsdvml(sdvml) {
        var _a;
        this.idToEntryNodeElements.clear();
        for (const element of (_a = sdvml === null || sdvml === void 0 ? void 0 : sdvml.nodes) !== null && _a !== void 0 ? _a : []) {
            this.idToEntryNodeElements.set(element.id, element);
        }
    }
    findEntryNode(id) {
        return this.idToEntryNodeElements.get(id);
    }
};
sdvmlModelIndex = __decorate([
    injectable()
], sdvmlModelIndex);
//# sourceMappingURL=sdvml-diagram-model-index.js.map