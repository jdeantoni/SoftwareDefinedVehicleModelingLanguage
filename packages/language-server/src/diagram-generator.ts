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
import { /*SEdge,*/ EdgeLayoutable, SCompartment, SEdge, SLabel, SModelRoot, SNode, SPort, SModelElement/*, EdgeLayoutable*/ } from 'sprotty-protocol';
import { Signal, Component, Model, isSensor, VSS, Sensor, Actuator, isPeriodicTriggering, Service, FunctionalChain, isService } from './generated/ast.js';
import {  Context, makeServiceName, getPublishingSignal, getSubscriptionSignal } from './cli/generator.js';

// export interface ExpandableNode extends SNode {
//     type: 'expandable-node'
//     expanded: boolean
//     children?: SNode[]
// }


const defaultLayout = {
    paddingTop: 10.0,
    paddingBottom: 10.0,
    paddingLeft: 10.0,
    paddingRight: 10.0
}

export class SdvmlDiagramGenerator extends LangiumDiagramGenerator {

    protected generateRoot(args: GeneratorContext<Model>): SModelRoot {
        const { document } = args;
        const sdvmlModel = document.parseResult.value;
        let context = new Context(sdvmlModel);
        const graph = {
            type: 'graph',
            id: sdvmlModel.name ?? 'root',
            children: [
                ...sdvmlModel.components.flatMap(c => this.generateComponent(c, args, context)),
                // ...this.generateVSS(sdvmlModel.vss, args),
                ...sdvmlModel.vss.signals.flatMap(s => this.generateSignal(s, args)),
                ...sdvmlModel.components.flatMap(c => this.generateEdge(c, args)),
                ...sdvmlModel.chains.flatMap(c => this.generateFCEdge(c, args))
            ]
        };
        this.traceProvider.trace(graph, sdvmlModel);
        return graph;
    }

    protected generateComponent(comp: Component, ctx: GeneratorContext<Model>, model: Context): (SNode | SEdge)[] {
        const { idCache } = ctx;
        const nodeId = idCache.uniqueId(comp.name, comp);
        const componentName = comp.name;

        const componentNode = {
            type: 'node',
            id: nodeId,
            children: [
                <SNode>{
                    type: 'node:node-label',
                    id: idCache.uniqueId(nodeId + '.label'),
                    children: [
                        <SLabel>{
                            type: 'label',
                            id: idCache.uniqueId(nodeId + '.label.label'),
                            text: comp.name
                        }],
                    layout: "vbox",
                    layoutOptions: {
                        ...defaultLayout,
                        resizeContainer: true,
                        hAlign: 'center'
                    }
                }
            ] as (SLabel | SPort | SNode)[],
            layout: "vbox",
            layoutOptions: {
                ...defaultLayout,
                resizeContainer: true
            }
        };
        for (let local_signal of comp.signals) {
            const componentPortID = local_signal.name;
            componentNode.children.push(
                <SPort>{
                    type: 'port',
                    id: componentPortID,
                    direction: 'output',
                    layout: "stack",
                    layoutOptions: defaultLayout
                }
            )
        }

        const localSignals = new Map();
        for (let s of comp.signals) {
            localSignals.set(s.name, []);
        }
        const edgesToSignals = [];

        const outPorts = new Set();
        const inPorts = new Set();
        for (let service of comp.services) {
            const serviceName = makeServiceName(comp, service);
            for (let pub of service.publishers) {
                const signalName = getPublishingSignal(serviceName, pub);
                if (!localSignals.has(signalName)) {
                    outPorts.add(signalName);
                } else {
                    localSignals.get(signalName).push(serviceName);
                }
            }
            for (let sub of service.subscribers) {
                const signalName = getSubscriptionSignal(serviceName, sub);
                if (!localSignals.has(signalName)) {
                    inPorts.add(signalName);
                }
            }
        }

        for (let signal of outPorts) {
            const componentPortID = componentName + "." + signal;
            componentNode.children.push(
                <SPort>{
                    type: 'port',
                    id: componentPortID,
                    direction: 'output',
                    layout: "stack",
                    layoutOptions: defaultLayout
                }
            );
            edgesToSignals.push(
                <SEdge>{
                    type: 'edge',
                    id: `${componentPortID}_to_${signal}`,
                    sourceId: componentPortID,
                    targetId: signal,
                    layout: "stack"
                }
            );
        }

        for (let signal of inPorts) {
            const componentPortID = componentName + "." + signal;
            console.error(signal);
            componentNode.children.push(
                <SPort>{
                    type: 'port',
                    id: componentPortID,
                    direction: 'input',
                    layout: "stack",
                    layoutOptions: defaultLayout
                }
            );
            edgesToSignals.push(
                <SEdge>{
                    type: 'edge',
                    id: `${signal}_to_${componentPortID}`,
                    sourceId: signal,
                    targetId: componentPortID,
                    layout: "stack"
                }
            );
        }
        for (let service of comp.services) {
            const serviceName = makeServiceName(comp, service);
            const serId = idCache.uniqueId(serviceName, service)
            const serviceNode = <SNode>{
                type: "node:node-service",
                id: serId,
                children: [
                    <SLabel>{
                        type: 'label',
                        id: idCache.uniqueId(serId + '.label'),
                        text: service.name
                    },
                ],
                layout: "vbox",
                layoutOptions: {
                    ...defaultLayout,
                    resizeContainer: true,
                    hAlign: 'center'
                }
            };
            this.traceProvider.trace(serviceNode, service);
            this.markerProvider.addDiagnosticMarker(serviceNode, service, ctx);
            serviceNode.children = [...serviceNode.children ? serviceNode.children : [], ...this.getServiceLabel(service, serId, ctx)];

            for (let pub of service.publishers) {
                const signalName = getPublishingSignal(serviceName, pub);
                const servicePortID = idCache.uniqueId(serviceName + "." + signalName);
                const componentPortID = componentName + "." + signalName;
                serviceNode.children.push(
                    <SPort>{
                        type: 'port',
                        id: servicePortID,
                        direction: 'output',
                        layout: "stack",
                        layoutOptions: defaultLayout
                    }
                )
                if (localSignals.has(signalName)) {
                    componentNode.children.push(
                        <SEdge>{
                            type: 'edge',
                            id: `${servicePortID}_to_${signalName}`,
                            sourceId: servicePortID,
                            targetId: signalName,
                            layout: "stack"
                        }
                    );
                } else {
                    componentNode.children.push(
                        <SEdge>{
                            type: 'edge',
                            id: `${servicePortID}_to_${componentPortID}`,
                            sourceId: servicePortID,
                            targetId: componentPortID,
                            layout: "stack"
                        }
                    );
                }
            }
            for (let sub of service.subscribers) {
                const signalName = getSubscriptionSignal(serviceName, sub);
                const servicePortID = idCache.uniqueId(serviceName + "." + signalName);
                const componentPortID = componentName + "." + signalName;
                serviceNode.children.push(
                    <SPort>{
                        type: 'port',
                        id: servicePortID,
                        direction: 'input',
                        layout: "stack",
                        layoutOptions: defaultLayout
                    }
                )
                if (localSignals.has(signalName)) {
                    for (let provider of localSignals.get(signalName)) {
                        componentNode.children.push(
                            <SEdge>{
                                type: 'edge',
                                id: `${componentPortID}_to_${servicePortID}`,
                                sourceId: provider + "." + signalName,
                                targetId: servicePortID,
                                layout: "stack"
                            }
                        );
                    }
                } else {
                    componentNode.children.push(
                        <SEdge>{
                            type: 'edge',
                            id: `${componentPortID}_to_${servicePortID}`,
                            sourceId: componentPortID,
                            targetId: servicePortID,
                            layout: "stack"
                        }
                    );
                }
            }
            componentNode.children.push(serviceNode);
        }

        this.traceProvider.trace(componentNode, comp);
        this.markerProvider.addDiagnosticMarker(componentNode, comp, ctx);

        return [componentNode, ...edgesToSignals];
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
        const nodeIdActuator = idCache.uniqueId("VSS_actuator");
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
        for (let sig of vss.signals) {
            if (isSensor(sig)) {
                nodeSensor.children?.push(this.generateSignal(sig, ctx))
            } else {
                nodeActuator.children?.push(this.generateSignal(sig, ctx))
            }
        }

        this.traceProvider.trace(nodeSensor, vss);
        this.markerProvider.addDiagnosticMarker(nodeSensor, vss, ctx);
        return [nodeSensor, nodeActuator];
    }

    protected getSensorLabel(sig: Sensor, nodeId: string, ctx: GeneratorContext<Model>): SLabel[] {
        const { idCache } = ctx;
        let res: SLabel[] = [
            <SLabel>{
                type: "label:values",
                id: idCache.uniqueId(nodeId + '.values1'),
                text: "DL:" + sig.dl.mean.value + "+/-" + sig.dl.stdDev.value + "ms"
            },
            <SLabel>{
                type: "label:values",
                id: idCache.uniqueId(nodeId + '.values2'),
                text: "SSP:" + sig.ssp.mean.value + "+/-" + sig.ssp.stdDev.value + "ms"
            }
        ];
        return res;
    }

    protected getActuatorLabel(sig: Actuator, nodeId: string, ctx: GeneratorContext<Model>): SLabel[] {
        const { idCache } = ctx;
        let res: SLabel[] = [
            <SLabel>{
                type: "label:values",
                id: idCache.uniqueId(nodeId + '.values1'),
                text: "DL:" + sig.ad.mean.value + "+/-" + sig.ad.stdDev.value + "ms"
            }
        ];
        if (isPeriodicTriggering(sig.trigRule)) {
            res.push(<SLabel>{
                type: "label:values",
                id: idCache.uniqueId(nodeId + '.values2'),
                text: "AP:" + sig.trigRule.period.mean.value + "+/-" + sig.trigRule.period.stdDev.value + "ms"
            });
        }

        return res;
    }

    protected getServiceLabel(service: Service, nodeId: string, ctx: GeneratorContext<Model>): SModelElement[] {
        const { idCache } = ctx;
        let res: SLabel[] = [
            <SLabel>{
                type: "label:values",
                id: idCache.uniqueId(nodeId + '.values1'),
                text: "ET:" + service.execTime.mean.value + "+/-" + service.execTime.stdDev.value + "ms"
            }
        ]
        if (isPeriodicTriggering(service.trigRule)) {
            res.push(<SLabel>{
                type: "label:values",
                id: idCache.uniqueId(nodeId + '.values2'),
                text: "AP:" + service.trigRule.period.mean.value + "+/-" + service.trigRule.period.stdDev.value + "ms"
            });
        } else {
            const trigger = service.trigRule.trigger;
            if (trigger != undefined) {
                res.push(<SLabel>{
                    type: "label:values",
                    id: idCache.uniqueId(nodeId + '.values2'),
                    text: "triggered on:" + (trigger.ref?.appSignal?.ref?.name ?? trigger.ref?.sensorSignal?.ref?.name)
                });
            }
        }
        return res;
    }

    protected generateSignal(sig: Signal, ctx: GeneratorContext<Model>): SNode {
        const { idCache } = ctx;
        const nodeId = idCache.uniqueId(sig.name, sig);
        // console.error(`#############  ${sig.name}:${nodeId}   -- ${idCache.getId(sig)}`)
        //  :"(AD:"+sig.ad.mean+"+/-"+sig.ad.stdDev+"ms\n:"+sig.trigRule.$type+")";
        const sigType = isSensor(sig) ? "output" : "input";
        const node = <SNode>{
            type: 'node:vss-node',
            id: nodeId + ".container",
            children: [
                <SLabel>{
                    type: 'label',
                    id: idCache.uniqueId(nodeId + '.label'),
                    text: sig.name
                },
                <SPort>{
                    type: "port",
                    id: sig.name,
                    direction: sigType,
                    layout: "stack",
                    layoutOptions: defaultLayout
                }
            ],
            layout: "vbox",
            layoutOptions: defaultLayout
        };
        if (isSensor(sig)) {
            node.children = [...node.children ? node.children : [], ...this.getSensorLabel(sig, nodeId, ctx)]
        } else {
            node.children = [...node.children ? node.children : [], ...this.getActuatorLabel(sig, nodeId, ctx)]
        }
        this.traceProvider.trace(node, sig);
        this.markerProvider.addDiagnosticMarker(node, sig, ctx);
        return node;
    }

    protected generateEdge(comp: Component, ctx: GeneratorContext<Model>): SEdge[] {
        const { idCache } = ctx;
        const res: SEdge[] = []
        for (let sub of comp.services.flatMap(s => s.subscribers)) {
            const targetId = idCache.getId(sub);

            // console.error(`#   #   # ${sub.sigName}: ${comp.$container.components.flatMap(c => c.publishers).filter(p => p.sigName == sub.sigName).flatMap( s => s.sigName).join(',')}: ${sub.sigRef?.ref?.name}`)
            let sourceSig = sub.appSignal?.ref ?? sub.sensorSignal?.ref

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
                        text: sub.appSignal?.ref?.name ?? sub.sensorSignal?.ref?.name
                    }
                ],
                layout: "stack"
            };
            this.traceProvider.trace(edge, sub);
            this.markerProvider.addDiagnosticMarker(edge, sub, ctx);
            res.push(edge);
        }

        for (let pub of comp.services.flatMap(s => s.publishers)) {
            const sourceId = idCache.getId(pub);
            let targetSignal = pub.appSignal?.ref ?? pub.actuatorSignal?.ref;

            const targetId = idCache.getId(targetSignal);

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
                        text: targetSignal?.name
                    }
                ],
                layout: "stack"
            };
            this.traceProvider.trace(edge, pub);
            this.markerProvider.addDiagnosticMarker(edge, pub, ctx);
            res.push(edge);

        }

        return res;
    }


    protected generateFCEdge(fc: FunctionalChain, ctx: GeneratorContext<Model>): SEdge[] {
        const { idCache } = ctx;
        const res: SEdge[] = []

        let prevParticipant = fc.participants[0];
        if (prevParticipant.ref == undefined) {
            console.error("in creation of functional chain diagram, a participant is badly referenced");
            return res;
        }
        for (let participant of fc.participants.slice(1)) {
            if (participant.ref == undefined) {
                console.error("in creation of functional chain diagram, a participant is badly referenced");
                return res;
            }
            let sourceId = idCache.getId(prevParticipant.ref);
            let targetId = idCache.getId(participant.ref);

            if (isService(prevParticipant.ref)) {
                sourceId = idCache.getId(participant.ref) + "_in";
            }

            if (isService(participant.ref)) {
                targetId = idCache.getId(prevParticipant.ref) + "_in";
            }

            // console.error(`#~~~~~~~~ from ${prevParticipant.ref?.name}  -> target = ${participant.ref.name}`)
            const edgeId = idCache.uniqueId(`${sourceId}_to_${targetId}`, undefined);
            const edge = {
                type: 'edge:fc-edge',
                id: edgeId,
                sourceId: sourceId!,
                targetId: targetId!,
                layout: "stack"
            };
            this.traceProvider.trace(edge, participant.ref);
            this.markerProvider.addDiagnosticMarker(edge, participant.ref, ctx);
            res.push(edge);
            prevParticipant = participant
        }


        return res;
    }

}
