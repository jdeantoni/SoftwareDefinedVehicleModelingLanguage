/********************************************************************************
 * Copyright (c) 2022 EclipseSource and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied:
 * -- GNU General Public License, version 2 with the GNU Classpath Exception
 * which is available at https://www.gnu.org/software/classpath/license.html
 * -- MIT License which is available at https://opensource.org/license/mit.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0 OR MIT
 ********************************************************************************/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ChangeBoundsOperation, GNode, GPort, JsonOperationHandler } from '@eclipse-glsp/server';
import { inject, injectable } from 'inversify';
import { SDVMLModelState } from '../model/sdvml-model-state';
let NodeChangeBoundsHandler = class NodeChangeBoundsHandler extends JsonOperationHandler {
    constructor() {
        super(...arguments);
        this.operationType = ChangeBoundsOperation.KIND;
    }
    createCommand(operation) {
        return this.commandOf(() => {
            operation.newBounds.forEach(element => this.changeElementBounds(element.elementId, element.newSize, element.newPosition));
        });
    }
    changeElementBounds(elementId, newSize, newPosition) {
        console.error(">> change bounds:" + elementId + "  " + newPosition);
        const index = this.modelState.index;
        const node = index.findByClass(elementId, GNode);
        let nodeShape = undefined;
        if (node instanceof GPort) {
            console.error(">>>> port change bound");
            nodeShape = node ? index.findNode("port" + node.id) : undefined;
        }
        else {
            console.error(">>>> node change bound");
            nodeShape = node ? index.findNode(node.id) : undefined;
        }
        if (nodeShape) {
            nodeShape.size = newSize;
            if (newPosition) {
                nodeShape.position = newPosition;
            }
        }
        else {
            console.error('no way to change bound of undefined:' + elementId);
        }
    }
};
__decorate([
    inject(SDVMLModelState),
    __metadata("design:type", SDVMLModelState)
], NodeChangeBoundsHandler.prototype, "modelState", void 0);
NodeChangeBoundsHandler = __decorate([
    injectable()
], NodeChangeBoundsHandler);
export { NodeChangeBoundsHandler };
//# sourceMappingURL=sdvml-change-bounds-handlers.js.map