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
import { SEdge, SLabel, SModelRoot, SNode, SPort, SModelElement } from 'sprotty-protocol';
import { Signal, Component, Model, isSensor, Sensor, Actuator, isPeriodicTriggering, Service } from './generated/ast.js';
import { Context, makeServiceName, getPublishingSignal, getSubscriptionSignal } from './cli/generator.js';


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
                // ...sdvmlModel.chains.flatMap(c => this.generateFCEdge(c, args, context))
            ]
        };
        this.traceProvider.trace(graph, sdvmlModel);
        return graph;
    }

    protected generateComponent(comp: Component, ctx: GeneratorContext<Model>, model: Context): (SNode | SEdge)[] {
        const { idCache } = ctx;
        const componentName = comp.name;

        const componentNode = {
            type: 'node',
            id: componentName,
            children: [
                <SNode>{
                    type: 'node:node-label',
                    id: componentName + ".label",
                    children: [
                        <SLabel>{
                            type: 'label',
                            id: idCache.uniqueId(componentName + '.label.label'),
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
            const serviceNode = <SNode>{
                type: "node:node-service",
                id: serviceName,
                children: [
                    <SLabel>{
                        type: 'label',
                        id: idCache.uniqueId(serviceName + '.label'),
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
            serviceNode.children = [...serviceNode.children ? serviceNode.children : [], ...this.getServiceLabel(service, serviceName, ctx)];

            for (let pub of service.publishers) {
                const signalName = getPublishingSignal(serviceName, pub);
                const servicePortID = serviceName + "." + signalName;
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
                const servicePortID = serviceName + "." + signalName;
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
            if (trigger?.ref !== undefined) {
                res.push(<SLabel>{
                    type: "label:values",
                    id: idCache.uniqueId(nodeId + '.values2'),
                    text: "triggered on:" + (trigger.ref?.appSignal?.ref?.name ?? trigger.ref?.sensorSignal?.ref?.name ?? "self")
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

    // protected generateFCEdge(fc: FunctionalChain, ctx: GeneratorContext<Model>, model: Context): SNode[] {
    //     let filePath = ctx.document.uri.path.replace("vscode-webview://", "");
    //     filePath = filePath.slice(filePath.indexOf("/"), filePath.lastIndexOf('/'));
    //     let results = `${filePath}/generated/results/${path.basename(ctx.document.uri.path).replace(".sdvml", ".mrtccsl")}/`;

    //     var previous: string | undefined = undefined;
    //     const participantNames = fc.participants.map((participant: Reference<FCParticipant>): [string, boolean] => {
    //         if (participant.ref?.$type == "Sensor" || participant.ref?.$type == "Actuator") {
    //             return [participant.ref.name, true];
    //         } else {
    //             const service = participant.ref;
    //             const component = service?.$container;
    //             return [makeServiceName(component!, service!), false];
    //         }
    //     });
    //     const pairs = participantNames.flatMap(([qualifiedName, vss]): [string, string, boolean, boolean, boolean][] => {
    //         const serviceEventPairs: [string, string, boolean, boolean, boolean][] = [[qualifiedName, qualifiedName, true, false, vss]];
    //         if (previous != undefined) {
    //             serviceEventPairs.push([previous, qualifiedName, false, false, vss])
    //         }
    //         previous = qualifiedName;
    //         return serviceEventPairs;
    //     });
    //     // Add full chain too
    //     let first = participantNames[0];
    //     let last = participantNames[participantNames.length - 1];
    //     pairs.push([first[0], last[0], true, true, true]);

    //     const reactions = [];
    //     const chainLinks = [];
    //     const guideEdges = [];
    //     console.error(pairs);
    //     for (let [start, finish, runnable, wholeChain, vss] of pairs) {
    //         let id = runnable ? `${fc.name}_${start}_START_${finish}_FINISH` : `${fc.name}_${start}_FINISH_${finish}_START`;;
    //         let reactionId = `${id}.reaction`;
    //         let chainLinkId = `${id}.highlight`;

    //         if (!wholeChain && !runnable) {
    //             chainLinks.push(
    //                 <SEdge>{
    //                     type: 'edge:fc-edge',
    //                     id: chainLinkId,
    //                     sourceId: start,
    //                     targetId: finish,
    //                     layout: "stack"
    //                 }
    //             );
    //         }
    //         try {
    //             const imageBuffer = fs.readFileSync(path.join(results, `${id}_reaction_time_hist.csv.svg`));
    //             const image = imageBuffer.toString().replace(/<svg(.|\n)*?>/gmi, "").replace(/<\?xml(.*)>/, "").replace(/<title>.*<\/title>/, "").replace(/<desc>.*<\/desc>/, "").replace("<g id=\"gnuplot_canvas\">", "").replace("<\/g>\n<\/svg>", "").replace(/xlink:href/g, "href");

    //             reactions.push(<SNode>{
    //                 type: "node",
    //                 id: reactionId + ".container",
    //                 size: { height: 50, width: 50 },
    //                 children: [
    //                     <SLabel>{
    //                         type: "label",
    //                         id: reactionId + ".description",
    //                         text: `${start} ~> ${finish}`,
    //                     },
    //                     <SNode>{
    //                         type: "pre-rendered",
    //                         id: reactionId,
    //                         code: `<g transform="scale(0.2)">${image}</g>`,
    //                         size: { height: 50, width: 50 },
    //                         layout: "stack",
    //                         layoutOptions: {
    //                             resizeContainer: false
    //                         }
    //                     }
    //                 ]
    //             });
    //             if (runnable) {
    //                 var signalId = (model.servicesToSignals.get(finish) ?? []).pop(); // TODO: need to pick the port that leads to next runnable
    //             } else {
    //                 var signalId = (model.runnableInputs.get(finish) ?? []).pop();
    //             }
    //             if (vss && runnable) {
    //                 var portId = finish + ".container";
    //             } else if (vss && !runnable) {
    //                 var portId = finish;
    //             }
    //             else if (signalId && !wholeChain) {
    //                 var portId = `${finish}.${signalId}`;
    //             } else {
    //                 var portId = finish; // for actuators that do not have outputs
    //             }
    //             guideEdges.push(
    //                 <SEdge>{
    //                     type: 'edge:fc-guide',
    //                     id: `${reactionId}_to_${portId}`,
    //                     sourceId: reactionId + ".container",
    //                     targetId: portId,
    //                     layout: "stack"
    //                 }
    //             );
    //         } catch (e) {
    //             continue
    //         }
    //     }

    //     // console.log(guideEdges);
    //     // const chainNode = <SNode>{
    //     //     type: "node:chain",
    //     //     id: "chain" + fc.name,
    //     //     layout: "hbox",
    //     //     children: [
    //     //         <SLabel>{
    //     //             type: "label",
    //     //             id: fc.name + ".description",
    //     //             text: fc.name,
    //     //         }, ...reactions],
    //     //     layoutOptions: {
    //     //         ...defaultLayout,
    //     //         hAlign: "left",
    //     //         vAlign: "top",
    //     //         resizeContainer: true,
    //     //     },
    //     // };
    //     // return [chainNode, ...chainLinks, ...guideEdges];
    //     return chainLinks;
    // }
}