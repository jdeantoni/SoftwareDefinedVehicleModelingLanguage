var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { injectable } from 'inversify';
import { GlspElkLayoutEngine } from '@eclipse-glsp/layout-elk';
let DebugLayoutEngine = class DebugLayoutEngine extends GlspElkLayoutEngine {
    async layout(...args) {
        var _a;
        const result = await super.layout();
        // You can cast and inspect the input graph here if needed:
        const graph = (_a = args[0]) === null || _a === void 0 ? void 0 : _a.graph;
        if (graph === null || graph === void 0 ? void 0 : graph.layoutOptions) {
            console.log('🎯 Layout options at runtime:', graph.layoutOptions);
        }
        else {
            console.warn('⚠️ Could not inspect layout graph.');
        }
        return result;
    }
};
DebugLayoutEngine = __decorate([
    injectable()
], DebugLayoutEngine);
export { DebugLayoutEngine };
//# sourceMappingURL=DebugElkLayout.js.map