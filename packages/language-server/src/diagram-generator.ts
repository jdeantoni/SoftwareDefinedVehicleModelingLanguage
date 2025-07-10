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
import { /*SEdge,*/ EdgeLayoutable, SEdge, SLabel, SModelRoot, SNode, SPort/*, EdgeLayoutable*/ } from 'sprotty-protocol';
import { Signal, Component, Model, isSensor } from './generated/ast.js';

export class SdvmlDiagramGenerator extends LangiumDiagramGenerator {

    protected generateRoot(args: GeneratorContext<Model>): SModelRoot {
        const { document } = args;
        const sdvmlModel = document.parseResult.value;
        const graph = {
            type: 'graph',
            id: sdvmlModel.name ?? 'root',
            children: [
                ...sdvmlModel.components.map(c => this.generateComponent(c, args)),
                ...sdvmlModel.signals.map(s => this.generateSignal(s, args)),
                 ...sdvmlModel.components.flatMap(c => this.generateEdge(c, args))
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
                }
            ] as (SLabel | SPort)[],
            layout: 'stack',
            layoutOptions: {
                paddingTop: 10.0,
                paddingBottom: 10.0,
                paddingLeft: 10.0,
                paddingRight: 10.0
            }
        };
        for (let pub of comp.publishers){
            const pubId = idCache.uniqueId(pub.name, pub);
            node.children.push(
                <SPort>{
                    type: 'port',
                    id: pubId,
                    // children: [
                    //     <SLabel>{
                    //         type: 'label',
                    //         id: idCache.uniqueId(pubId + '.label'),
                    //         text: pub.name
                    //     }
                    // ],
                    direction : 'output'
                }
            )
        }

        for (let sub of comp.subscribers){
            const subId = idCache.uniqueId(sub.name, sub);
            node.children.push(
                <SPort>{
                    type: 'port',
                    id: subId,
                    // children: [
                    //     <SLabel>{
                    //         type: 'label',
                    //         id: idCache.uniqueId(subId + '.label'),
                    //         text: sub.name
                    //     }
                    // ],
                    direction : 'input'
                }
            )
        }

        this.traceProvider.trace(node, comp);
        this.markerProvider.addDiagnosticMarker(node, comp, ctx);
        return node;
    }

     protected generateSignal(sig: Signal, ctx: GeneratorContext<Model>): SNode {
        const { idCache } = ctx;
        const nodeId = idCache.uniqueId(sig.name, sig);
        const sigType = isSensor(sig)? "sensor-port" : "actuator-port";
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
                    type: sigType,
                    id: idCache.uniqueId(nodeId + '.port'),
                    direction: "vss"
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

    protected generateEdge(comp: Component, ctx: GeneratorContext<Model>): SEdge[] {
        const { idCache } = ctx;
        const res: SEdge[] = []
        for (let sub of comp.subscribers){
            const targetId = idCache.getId(sub);

            const sourceSig = comp.$container.signals.filter(s => s.name == sub.name)[0]
            const sourceId = idCache.getId(sourceSig);
            console.error(`~~~~ sourceId=${sourceId}     targetId=${targetId}`)
            const edgeId = idCache.uniqueId(`${sourceId}_to_${targetId}`, undefined);
            const edge = {
                type: 'edge',
                id: edgeId,
                sourceId: sourceId!,
                targetId: targetId!,
                children: [
                    <SLabel & EdgeLayoutable>{
                        type: 'label:xref',
                        id: idCache.uniqueId(edgeId + '.label'),
                        text: sub.name
                    }
                ]
            };
            this.traceProvider.trace(edge, sub);
            this.markerProvider.addDiagnosticMarker(edge, sub, ctx);
            res.push(edge);
        }

        for (let pub of comp.publishers){
            const sourceId = idCache.getId(pub);

            const targetSig = comp.$container.signals.filter(s => s.name == pub.name)[0]
            const targetId = idCache.getId(targetSig);
            console.error(`~~~~ sourceId=${sourceId}     targetId=${targetId}`)
            const edgeId = idCache.uniqueId(`${sourceId}_to_${targetId}`, undefined);
            const edge = {
                type: 'edge',
                id: edgeId,
                sourceId: sourceId!,
                targetId: targetId!,
                children: [
                    <SLabel & EdgeLayoutable>{
                        type: 'label:xref',
                        id: idCache.uniqueId(edgeId + '.label'),
                        text: pub.name
                    }
                ]
            };
            this.traceProvider.trace(edge, pub);
            this.markerProvider.addDiagnosticMarker(edge, pub, ctx);
            res.push(edge);
        }

        return res;
    }

}
