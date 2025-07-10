/********************************************************************************
 * Copyright (c) 2021 TypeFox and others.
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

import { GeneratorContext, LangiumDiagramGenerator } from 'langium-sprotty';
import { /*SEdge,*/ SLabel, SModelRoot, SNode, SPort/*, EdgeLayoutable*/ } from 'sprotty-protocol';
import { Signal, Component, Model } from './generated/ast.js';

export class SdvmlDiagramGenerator extends LangiumDiagramGenerator {

    protected generateRoot(args: GeneratorContext<Model>): SModelRoot {
        const { document } = args;
        const sdvmlModel = document.parseResult.value;
        const graph = {
            type: 'graph',
            id: sdvmlModel.name ?? 'root',
            children: [
                ...sdvmlModel.components.map(s => this.generateComponent(s, args)),
                ...sdvmlModel.signals.map(s => this.generateSignal(s, args)),
                // ...sm.states.flatMap(s => s.transitions).map(t => this.generateEdge(t, args))
            ]
        };
        this.traceProvider.trace(graph, sdvmlModel);
        return graph;
    }

    protected generateComponent(comp: Component, ctx: GeneratorContext<Model>): SNode {
        const { idCache } = ctx;
        const nodeId = idCache.uniqueId(comp.name, comp);
        const node = {
            type: 'node',
            id: nodeId,
            children: [
                <SLabel>{
                    type: 'label',
                    id: idCache.uniqueId(nodeId + '.label'),
                    text: comp.name
                },
                <SPort>{
                    type: 'port',
                    id: idCache.uniqueId(nodeId + '.newTransition')
                }
            ],
            layout: 'stack',
            layoutOptions: {
                paddingTop: 10.0,
                paddingBottom: 10.0,
                paddingLeft: 10.0,
                paddingRight: 10.0
            }
        };
        this.traceProvider.trace(node, comp);
        this.markerProvider.addDiagnosticMarker(node, comp, ctx);
        return node;
    }

     protected generateSignal(sig: Signal, ctx: GeneratorContext<Model>): SNode {
        const { idCache } = ctx;
        const nodeId = idCache.uniqueId(sig.name, sig);
        const node = {
            type: 'node',
            id: nodeId,
            children: [
                <SLabel>{
                    type: 'label',
                    id: idCache.uniqueId(nodeId + '.label'),
                    text: sig.name
                },
                <SPort>{
                    type: 'port',
                    id: idCache.uniqueId(nodeId + '.newTransition')
                }
            ],
            layout: 'stack',
            layoutOptions: {
                paddingTop: 10.0,
                paddingBottom: 10.0,
                paddingLeft: 10.0,
                paddingRight: 10.0
            }
        };
        this.traceProvider.trace(node, sig);
        this.markerProvider.addDiagnosticMarker(node, sig, ctx);
        return node;
    }

    // protected generateEdge(transition: Transition, ctx: GeneratorContext<StateMachine>): SEdge {
    //     const { idCache } = ctx;
    //     const sourceId = idCache.getId(transition.$container);
    //     const targetId = idCache.getId(transition.state?.ref);
    //     const edgeId = idCache.uniqueId(`${sourceId}:${transition.event?.ref?.name}:${targetId}`, transition);
    //     const edge = {
    //         type: 'edge',
    //         id: edgeId,
    //         sourceId: sourceId!,
    //         targetId: targetId!,
    //         children: [
    //             <SLabel & EdgeLayoutable>{
    //                 type: 'label:xref',
    //                 id: idCache.uniqueId(edgeId + '.label'),
    //                 text: transition.event?.ref?.name
    //             }
    //         ]
    //     };
    //     this.traceProvider.trace(edge, transition);
    //     this.markerProvider.addDiagnosticMarker(edge, transition, ctx);
    //     return edge;
    // }

}
