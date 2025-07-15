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

import { GeneratorContext, LangiumDiagramGenerator } from 'langium-sprotty';
import { /*SEdge,*/ EdgeLayoutable, SCompartment, SEdge, SLabel, SModelRoot, SNode, SPort/*, EdgeLayoutable*/ } from 'sprotty-protocol';
import { Signal, Component, Model, isSensor, VSS } from './generated/ast.js';

export class SdvmlDiagramGenerator extends LangiumDiagramGenerator {

    protected generateRoot(args: GeneratorContext<Model>): SModelRoot {
        const { document } = args;
        const sdvmlModel = document.parseResult.value;
        const graph = {
            type: 'graph',
            id: sdvmlModel.name ?? 'root',
            children: [
                ...sdvmlModel.components.map(c => this.generateComponent(c, args)),
                // ...this.generateVSS(sdvmlModel.vss, args),
                ...sdvmlModel.vss.signals.flatMap(s => this.generateSignal(s, args)),
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
            layout: "stack",
            layoutOptions: {
                paddingTop: 10.0,
                paddingBottom: 10.0,
                paddingLeft: 10.0,
                paddingRight: 10.0
            }
        };
        for (let pub of comp.publishers){
            const pubId = idCache.uniqueId((pub.sigName != undefined)? pub.sigName : ((pub.sigRef != undefined)&&(pub.sigRef.ref != undefined)? pub.sigRef?.ref?.name:"undefined"), pub);
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
                    direction : 'output',
                    layout: "stack",
                    layoutOptions: {
                        paddingTop: 10.0,
                        paddingBottom: 10.0,
                        paddingLeft: 10.0,
                        paddingRight: 10.0
                    }
                }
            )
        }

        for (let sub of comp.subscribers){
            const subId = idCache.uniqueId((sub.sigName != undefined)? sub.sigName : (sub.sigRef != undefined)&&(sub.sigRef.ref != undefined)? sub.sigRef?.ref?.name:"undefined", sub);
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
                    direction : 'input',
                    layout: "stack",
                    layoutOptions: {
                        paddingTop: 10.0,
                        paddingBottom: 10.0,
                        paddingLeft: 10.0,
                        paddingRight: 10.0
                    }
                }
            )
        }

        this.traceProvider.trace(node, comp);
        this.markerProvider.addDiagnosticMarker(node, comp, ctx);
        return node;
    }


 protected generateVSS(vss: VSS, ctx: GeneratorContext<Model>): SNode[] {
        const { idCache } = ctx;
        const nodeIdSensor = idCache.uniqueId("VSS_sensor");
        const nodeSensor = <SCompartment>{
            type: 'node:vss-container',
            id: nodeIdSensor,
            children: [
                <SLabel>{
                    type: 'label',
                    id: idCache.uniqueId(nodeIdSensor + '.label'),
                    text: "VSS_sensors"
                }
            ] as (SLabel | SNode)[],
            layoutOptions: {
                paddingTop: 100.0,
                paddingBottom: 100.0,
                paddingLeft: 100.0,
                paddingRight: 100.0
            }
        };
        const nodeIdActuator = idCache.uniqueId("VSS_sensor");
        const nodeActuator = <SCompartment>{
            type: 'node:vss-container',
            id: nodeIdActuator,
            children: [
                <SLabel>{
                    type: 'label',
                    id: idCache.uniqueId(nodeIdActuator + '.label'),
                    text: "VSS_actuators"
                }
            ] as (SLabel | SNode)[],
            layoutOptions: {
                paddingTop: 100.0,
                paddingBottom: 100.0,
                paddingLeft: 100.0,
                paddingRight: 100.0
            }
        };
        for (let sig of vss.signals){
            if (isSensor(sig)){
                nodeSensor.children?.push( this.generateSignal(sig,ctx))
            }else{
                nodeActuator.children?.push( this.generateSignal(sig,ctx))
            }
        }

        this.traceProvider.trace(nodeSensor, vss);
        this.markerProvider.addDiagnosticMarker(nodeSensor, vss, ctx);
        return [nodeSensor,nodeActuator];
    }


     protected generateSignal(sig: Signal, ctx: GeneratorContext<Model>): SNode {
        const { idCache } = ctx;
        const nodeId = idCache.uniqueId(sig.name, sig);
        // console.error(`#############  ${sig.name}:${nodeId}   -- ${idCache.getId(sig)}`)
        const sigType = isSensor(sig)? "output" : "input";
        const node = {
            type: 'node:vss-node',
            id: nodeId,
            children: [
                <SLabel>{
                    type: 'label',
                    id: idCache.uniqueId(nodeId + '.label'),
                    text: sig.name
                },
                <SPort>{
                    type: "port",
                    id: idCache.uniqueId(nodeId + '_port',sig),
                    direction: sigType,
                    layout: "stack",
                    layoutOptions: {
                        paddingTop: 10.0,
                        paddingBottom: 10.0,
                        paddingLeft: 10.0,
                        paddingRight: 10.0
                    }
                }
            ],
            layout: "stack",
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

            // console.error(`#   #   # ${sub.sigName}: ${comp.$container.components.flatMap(c => c.publishers).filter(p => p.sigName == sub.sigName).flatMap( s => s.sigName).join(',')}: ${sub.sigRef?.ref?.name}`)
            let sourceSig = (sub.sigName != undefined)
                                    ? comp.$container.components.flatMap(c => c.publishers).filter(p => p.sigName == sub.sigName)[0]
                                    : sub.sigRef?.ref

            const sourceId = idCache.getId(sourceSig);
            // console.error(`#~~~~~~~~ ${sourceSig}:${sourceSig?.$type} = ${sourceId}  -> target = ${targetId}`)
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
                        text: (sub.sigName != undefined)? sub.sigName : sub.sigRef?.ref?.name
                    }
                ],
                layout: "stack"
            };
            this.traceProvider.trace(edge, sub);
            this.markerProvider.addDiagnosticMarker(edge, sub, ctx);
            res.push(edge);
        }

        for (let pub of comp.publishers){
            const sourceId = idCache.getId(pub);
            if (pub.sigName == undefined){
                let targetSig = pub.sigRef?.ref

                const targetId = idCache.getId(targetSig);

                // console.error(`~~~~~~~~ source = ${sourceId}  -> target = ${targetId}`)

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
                    ],
                    layout: "stack"
                };
                this.traceProvider.trace(edge, pub);
                this.markerProvider.addDiagnosticMarker(edge, pub, ctx);
                res.push(edge);
            }
        }

        return res;
    }

}
