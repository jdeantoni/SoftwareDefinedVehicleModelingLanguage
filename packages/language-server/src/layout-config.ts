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

import { LayoutOptions } from 'elkjs';
import { DefaultLayoutConfigurator } from 'sprotty-elk/lib/elk-layout.js';
import { SGraph, SModelIndex, SNode, SPort } from 'sprotty-protocol';

export class SdvmlLayoutConfigurator extends DefaultLayoutConfigurator {

    protected override graphOptions(sgraph: SGraph, index: SModelIndex): LayoutOptions {
        return {
            'org.eclipse.elk.direction': 'RIGHT',
            'org.eclipse.elk.spacing.nodeNode': '40.0',
            'org.eclipse.elk.layered.spacing.edgeNodeBetweenLayers': '60.0',
            "org.eclipse.elk.spacing.componentComponent": "40.0"
        };
    }

    protected override nodeOptions(snode: SNode, index: SModelIndex): LayoutOptions {
        return {
            'org.eclipse.elk.portConstraints': 'FIXED_SIDE',
            'org.eclipse.elk.portAlignment.north': 'CENTER',
            'org.eclipse.elk.portAlignment.default': 'CENTER' // optional fallback
        };
    }

    portSideMap = new Map<string, 'WEST' | 'EAST' | 'NORTH' | 'SOUTH'>([
    ['input', 'WEST'],
    ['output', 'EAST'],
    ['vss', 'NORTH']
    ]);

    protected override portOptions(sport: SPort, index: SModelIndex): LayoutOptions {
        let side = this.portSideMap.get((sport as any).direction);
        if (side === undefined){
            side = 'SOUTH'
        }
        return {
            'org.eclipse.elk.port.side': side,
            'org.eclipse.elk.port.borderOffset': '-4.0'
        };
    }
}
