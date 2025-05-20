var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { AbstractJsonModelStorage, ActionDispatcher } from '@eclipse-glsp/server/node.js';
import { inject } from 'inversify';
import { generateModelFromAST } from './sdvml-diagram-model.js';
import { getLanguageClient } from '../../extension/main.js';
import { sdvmlModelState } from './sdvml-model-state.js';
export class sdvmlModelStorage extends AbstractJsonModelStorage {
    constructor() {
        super();
    }
    loadSourceModel() {
        const languageClient = getLanguageClient();
        if (this.modelState.sourceUri) {
            // Otherwise nothing to load...
            return new Promise((resolve, reject) => {
                languageClient.sendRequest('modelRequest', { uri: this.modelState.sourceUri });
                languageClient.onNotification('node/DocumentChangeOnRequestToSDVMLDiagram', async (documentChange) => {
                    for (const uri of documentChange.uri) {
                        const index = documentChange.uri.indexOf(uri);
                        if (uri === this.modelState.sourceUri) {
                            const content = documentChange.content[index];
                            if (content != null) {
                                const sdvml = JSON.parse(content);
                                this.modelState.updateSourceModel(generateModelFromAST(sdvml, this.modelState.sourceModel));
                                resolve();
                                return;
                            }
                        }
                    }
                    reject(new Error('Cannot resolve diagram document'));
                });
            });
        }
    }
    saveSourceModel() { }
}
__decorate([
    inject(sdvmlModelState),
    __metadata("design:type", sdvmlModelState)
], sdvmlModelStorage.prototype, "modelState", void 0);
__decorate([
    inject(ActionDispatcher),
    __metadata("design:type", Object)
], sdvmlModelStorage.prototype, "actionDispatcher", void 0);
//# sourceMappingURL=sdvml-model-storage.js.map