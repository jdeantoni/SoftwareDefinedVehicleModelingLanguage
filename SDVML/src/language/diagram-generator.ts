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
import { SGraph, SLabel, SModelRoot, SNode, SPort } from 'sprotty-protocol';
import { Model, Signal, Component } from './generated/ast.js';
//   import { KNode } from '@kieler/klighd-interactive/lib/constraint-classes.js'
//  import { SKNode } from '@kieler/klighd-core/lib/skgraph-models.js';


export class SdvDiagramGenerator extends LangiumDiagramGenerator {

    protected generateRoot(ctx: GeneratorContext<Model>): SModelRoot {
        
        // const { document } = ctx;
        // const sm = document.parseResult.value;
        // const { idCache } = ctx;
        // const nodeId = idCache.uniqueId(sm.name, sm);
        // const label: SLabel = {
        //     type: 'label',
        //     id: idCache.uniqueId(nodeId + '.label'),
        //     text: sm.name
        // };
        // const n : KNode = new KNode();
        // n.id="zaza"
        // n.type="node"
  const root: SGraph = {
    type: 'graph',
    id: '$root',
    children: []
   
  };

  const node: SNode = {
    type: 'node',
    id: 'node1',
    
    children: [],
   
  };

  root.children.push(node);

  


        // this.traceProvider.trace(graph, sm);
        console.debug("graph: "+root)
        return root;
    }

    protected generateSignal(sig: Signal, ctx: GeneratorContext<Model>): SNode {
        const { idCache } = ctx;
        const nodeId = idCache.uniqueId(sig.name, sig);
        const label: SLabel = {
            type: 'label',
            id: idCache.uniqueId(nodeId + '.label'),
            text: sig.name
        };
        this.traceProvider.trace(label, sig, 'name');
        const node = {
            type: 'node',
            id: nodeId,
            children: [
                label,
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

    // protected generateComponent(component: Component, ctx: GeneratorContext<Model>): SEdge {
    //     const { idCache } = ctx;
    //     const sourceId = idCache.getId(component.$container);
    //     const targetId = idCache.getId(component.state?.ref);
    //     const edgeId = idCache.uniqueId(`${sourceId}:${component.event?.ref?.name}:${targetId}`, component);
    //     const label: SLabel = {
    //         type: 'label:xref',
    //         id: idCache.uniqueId(edgeId + '.label'),
    //         text: component.name
    //     }
    //     this.traceProvider.trace(label, component, 'event');
    //     const edge = {
    //         type: 'edge',
    //         id: edgeId,
    //         sourceId: sourceId!,
    //         targetId: targetId!,
    //         children: [
    //             label
    //         ]
    //     };
    //     this.traceProvider.trace(edge, component);
    //     this.markerProvider.addDiagnosticMarker(edge, component, ctx);
    //     return edge;
    // }

      protected generateComponent(comp: Component, ctx: GeneratorContext<Model>): SNode {
        const { idCache } = ctx;
        const nodeId = idCache.uniqueId(comp.name, comp);
        // const label: SLabel = {
        //     type: 'label',
        //     id: idCache.uniqueId(nodeId + '.label'),
        //     text: comp.name
        // };
        // this.traceProvider.trace(label, comp, 'name');
        const node = {
            parent:ctx,
            type: 'node',
            id: nodeId,
            children: [
                // label,
                // <SPort>{
                //     type: 'port',
                //     id: idCache.uniqueId(nodeId + '.newTransition')
                // }
            ]//,
            // layout: 'stack',
            // layoutOptions: {
            //     paddingTop: 10.0,
            //     paddingBottom: 10.0,
            //     paddingLeft: 10.0,
            //     paddingRight: 10.0
            // }
        };
        // this.traceProvider.trace(node, sig);
        this.markerProvider.addDiagnosticMarker(node, comp, ctx);
        return node;
    }

}
