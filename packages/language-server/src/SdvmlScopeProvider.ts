/********************************************************************************
 * Copyright (c) 2025 Université Côte d'Azur and others.

 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import {
    DefaultScopeProvider,
    ReferenceInfo,
    EMPTY_SCOPE,
    AstNode,
    Scope
} from 'langium';
import { injectable } from 'inversify';
import { Model, isSubscriber, isPublisher, isModel, isActuator, isSensor, isFunctionalChain, isEventTriggering } from './generated/ast.js';

@injectable()
export class SdvmlScopeProvider extends DefaultScopeProvider {

    override getScope(context: ReferenceInfo): Scope {
        const { container, property } = context;

        if (isPublisher(container)) {
            const model = this.findRootModel(container);
            if (!model?.vss) return EMPTY_SCOPE;
            if (property === 'actuatorSignal') {
                const actuators = model.vss.signals.filter(isActuator);
                return this.createScopeForNodes(actuators);

            } else if (property === 'appSignal') {
                const signals = model.components.flatMap(c => c.signals);
                return this.createScopeForNodes(signals);
            }
        }

        if (isSubscriber(container)) {
            const model = this.findRootModel(container);
            if (!model?.vss) return EMPTY_SCOPE;
            if (property === 'sensorSignal') {
                const sensors = model.vss.signals.filter(isSensor);
                return this.createScopeForNodes(sensors);
            }
            else if (property === 'appSignal') {
                const signals = model.components.flatMap(c => c.signals);
                return this.createScopeForNodes(signals);
            }
        }

        if (isEventTriggering(container)) {
            const model = this.findRootModel(container);
            if (!model?.vss) return EMPTY_SCOPE;

            if (property === "trigger") {
                const subscribedSignals = model.components.flatMap(c => c.services.flatMap(s => s.subscribers.map((sub) => {
                    const newsub = { ...sub, name: sub.appSignal?.ref?.name ?? sub.sensorSignal?.ref?.name! };
                    return newsub
                }
                )));
                return this.createScopeForNodes(subscribedSignals);
            }

        }

        if (isFunctionalChain(container)) {
            const model = this.findRootModel(container);
            if (!model?.vss) return EMPTY_SCOPE;

            const fcParticipants = [
                ...model.vss.signals,
                ...model.components.flatMap(c => c.services.flatMap(s => s.publishers)),
                ...model.components.flatMap(c => c.services.flatMap(s => s.subscribers)),
                ...model.components.flatMap(c => c.signals),
                ...model.components.flatMap(c => c.services),
            ]
            return this.createScopeForNodes(fcParticipants);
        }

        return super.getScope(context);
    }

    private findRootModel(node: AstNode): Model {

        if (isModel(node)) {
            return node as Model
        }
        if (node.$container == undefined) {
            throw "SdvmlScopeProvide:getScope() -> no Model root found !"
        }
        return this.findRootModel(node.$container)
    }
}
