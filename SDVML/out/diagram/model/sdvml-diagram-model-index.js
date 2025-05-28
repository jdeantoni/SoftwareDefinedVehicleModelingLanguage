var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { GModelIndex } from '@eclipse-glsp/server';
import { injectable } from 'inversify';
let sdvmlModelIndex = class sdvmlModelIndex extends GModelIndex {
    constructor() {
        super(...arguments);
        this.idToSDVMLNodeElements = new Map();
    }
    indexsdvml(sdvml) {
        var _a, _b, _c;
        this.idToSDVMLNodeElements.clear();
        for (const element of (_a = sdvml === null || sdvml === void 0 ? void 0 : sdvml.vss.sensorSignals) !== null && _a !== void 0 ? _a : []) {
            this.idToSDVMLNodeElements.set(element.id, element);
        }
        for (const element of (_b = sdvml === null || sdvml === void 0 ? void 0 : sdvml.vss.actuatorSignals) !== null && _b !== void 0 ? _b : []) {
            this.idToSDVMLNodeElements.set(element.id, element);
        }
        for (const element of (_c = sdvml === null || sdvml === void 0 ? void 0 : sdvml.components) !== null && _c !== void 0 ? _c : []) {
            for (const sub of element.subscribers) {
                this.idToSDVMLNodeElements.set("port" + sub.id, sub);
            }
            for (const pub of element.publishers) {
                this.idToSDVMLNodeElements.set("port" + pub.id, pub);
            }
            this.idToSDVMLNodeElements.set(element.id, element);
        }
        this.idToSDVMLNodeElements.set("vss", sdvml === null || sdvml === void 0 ? void 0 : sdvml.vss);
    }
    findNode(id) {
        return this.idToSDVMLNodeElements.get(id);
    }
};
sdvmlModelIndex = __decorate([
    injectable()
], sdvmlModelIndex);
export { sdvmlModelIndex };
//# sourceMappingURL=sdvml-diagram-model-index.js.map