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
    /*ManhattanEdgeRouter, */PolylineEdgeRouter, RectangularNode,
    SEdgeImpl, SLabelImpl, SNodeImpl, SRoutableElementImpl
} from 'sprotty';
import { EdgePlacement } from 'sprotty-protocol';

// import type { Point } from 'sprotty-protocol';

export class SdvmlEdge extends SEdgeImpl {
    override routerKind = PolylineEdgeRouter.KIND;
    override targetAnchorCorrection = Math.sqrt(5);
}

export class SdvmlFCEdge extends SEdgeImpl {
    override routerKind = PolylineEdgeRouter.KIND;
    override targetAnchorCorrection = Math.sqrt(5);
}

export class SdvmlEdgeLabel extends SLabelImpl {
    override edgePlacement = <EdgePlacement> {
        rotate: true,
        position: 0
    };
}

export class ConnectableNode extends SNodeImpl {
//   override canConnect(routable: SRoutableElementImpl, role: string) {
//         return true;
//     }

//  public getAnchor(referencePoint: Point, refId?: string): Point {
//     return {
//       x: this.position.x + this.size.width / 2,
//       y: this.position.y + this.size.height / 2
//     };
//   }
}

export class SdvmlNode extends RectangularNode {
    override canConnect(routable: SRoutableElementImpl, role: string) {
        return true;
    }
}

// export class CreateTransitionPort extends RectangularPort implements CreatingOnDrag {
//     createAction(id: string): Action {
//         const edge: SEdge = {
//             id,
//             type: 'edge',
//             sourceId: this.parent.id,
//             targetId: this.id
//         };
//         return CreateElementAction.create(edge, { containerId: this.root.id });
//     }
// }
