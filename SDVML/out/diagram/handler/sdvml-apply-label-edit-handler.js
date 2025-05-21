var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ApplyLabelEditOperation } from '@eclipse-glsp/protocol';
import { GLSPServerError, JsonOperationHandler } from '@eclipse-glsp/server/node.js';
import { inject, injectable } from 'inversify';
import { SDVMLModelState } from '../model/sdvml-model-state.js';
import { getLanguageClient } from '../../extension/main.js';
import { createAndSendCodeAction, createCodeActionParams } from './sdvml-code-action-utils.js';
let sdvmlApplyLabelEditHandler = class sdvmlApplyLabelEditHandler extends JsonOperationHandler {
    constructor() {
        super(...arguments);
        this.operationType = ApplyLabelEditOperation.KIND;
    }
    createCommand(operation) {
        const languageClient = getLanguageClient();
        return this.commandOf(() => {
            var _a;
            const index = this.modelState.index;
            // Retrieve the parent node of the label that should be edited
            const labelElement = index.get(operation.labelId);
            const entryGNode = labelElement.parent;
            if (entryGNode && this.modelState.sourceUri) {
                const entryNode = index.findEntryNode(entryGNode.id);
                if (!entryNode) {
                    throw new GLSPServerError(`Could not retrieve the parent node for the label with id ${operation.labelId}`);
                }
                const codeActionParams = createCodeActionParams('editDescription', this.modelState.sourceUri, {
                    objectIdentifier: (_a = entryNode.parent) === null || _a === void 0 ? void 0 : _a.name,
                    newValue: `'${operation.text}'`,
                });
                return createAndSendCodeAction(languageClient, codeActionParams);
            }
        });
    }
};
__decorate([
    inject(SDVMLModelState),
    __metadata("design:type", SDVMLModelState)
], sdvmlApplyLabelEditHandler.prototype, "modelState", void 0);
sdvmlApplyLabelEditHandler = __decorate([
    injectable()
], sdvmlApplyLabelEditHandler);
export { sdvmlApplyLabelEditHandler };
//# sourceMappingURL=sdvml-apply-label-edit-handler.js.map