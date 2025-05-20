var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { EditorContextService, isViewport, RequestModelAction, SetModelAction, SetViewportAction, UpdateModelAction, } from '@eclipse-glsp/client';
import { inject, injectable } from 'inversify';
import { ReloadModelAction } from './reload-model-action.js';
export let ReloadModelActionHandler = class ReloadModelActionHandler {
    handle(action) {
        if (ReloadModelAction.is(action)) {
            if (this.editorContext) {
                const root = this.editorContext.modelRoot;
                if (isViewport(root)) {
                    this.cachedViewport = { scroll: root.scroll, zoom: root.zoom };
                }
                return RequestModelAction.create({ options: action.options });
            }
        }
        else if ((SetModelAction.is(action) || UpdateModelAction.is(action)) && this.cachedViewport) {
            const viewport = this.cachedViewport;
            this.cachedViewport = undefined;
            return SetViewportAction.create(action.newRoot.id, viewport, {
                animate: false,
            });
        }
    }
};
__decorate([
    inject(EditorContextService),
    __metadata("design:type", EditorContextService)
], ReloadModelActionHandler.prototype, "editorContext", void 0);
ReloadModelActionHandler = __decorate([
    injectable()
], ReloadModelActionHandler);
//# sourceMappingURL=reload-model-action-handler.js.map