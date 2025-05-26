// // import { VNode } from "snabbdom";
// import {
//   // EdgePadding,
//     GEdge,
//     IViewArgs,
//     Point,
//     PolylineEdgeView,
//     // RenderingContext,
//     // angleOfPoint,
//     // svg, toDegrees
// } from '@eclipse-glsp/client';
// import { injectable } from 'inversify';
// // import React from 'react';
// // import ReactDOM from 'react-dom';


// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// // const JSX = { createElement: svg };

// @injectable()
// export class CustomEdgeView extends PolylineEdgeView {
//       /*
//      * The goal of this method is to render a BPMN edge supporting rounded corners.
//      */
//     // protected override renderLine(edge: GEdge, segments: Point[], context: RenderingContext, args?: IViewArgs): VNode {
//     //   JSX;
//     //     var path = this.createPathForSegments(edge, segments, args, true);
//     //     var vnode: any = <path class-sprotty-edge={true} class-line={true} d={path} />;
//     //     return vnode;
//     // }

//     /**
//      * This method adds the additionals for a BPMN Edge.
//      *
//      * For sequenceFlow and messageFlow edges we render an arrow at the end of the edge.
//      * For conditional sequenceFlows we also render the 'default' conditional symbol (/)
//      *
//      * Finally the method adds a padding that makes it easier to grab the line with the mouse.
//      * The 'edgePadding' is an optional argument for GEdge and is added by the BPMNGModelFactory
//      * from the Server.
//      *
//      * (See: https://github.com/eclipse-glsp/glsp-client/blob/e7dec9bd52b9688a7a23005c
//      * 3f7de652d0e85923/packages/client/src/views/gedge-view.tsx#L52
//      *
//      * @param edge
//      * @param segments
//      * @param context
//      * @returns
//      */
//     // protected override renderAdditionals(edge: GEdge, segments: Point[], context: RenderingContext): VNode[] {
//     //     const additionals = super.renderAdditionals(edge, segments, context);
//     //     const endP1 = segments[segments.length - 2];
//     //     const endP2 = segments[segments.length - 1];


//     //     // arrow depends on the type of the BPMNEdge
//     //         const arrow: any = (
//     //             <path
//     //                 class-sprotty-edge={true}
//     //                 class-arrow={true}
//     //                 d='M 1,0 L 14,-4 L 14,4 Z'
//     //                 transform={`rotate(${toDegrees(angleOfPoint({ x: endP1.x - endP2.x, y: endP1.y - endP2.y }))}
//     //                 ${endP2.x} ${endP2.y}) translate(${endP2.x} ${endP2.y}
//     //             )`}
//     //             />
//     //         );

            

            
//     //        additionals.push(arrow);
        

//     // //     // Add the edge padding (added by the BPMNGModelFactory)
//     // //     // const edgePadding = EdgePadding.from(edge);
//     // //     // if (edgePadding) {
//     // //     //     additionals.push(this.renderEdgePadding(edge, segments, edgePadding));
//     // //     // }
//     //     return additionals;
//     // }

//     // /**
//     //  * Additional path with transparent border to support edge padding feature.
//     //  *
//     //  * @param segments
//     //  * @param padding
//     //  * @returns
//     //  */
//     // protected renderEdgePadding(edge: GEdge, segments: Point[], padding: number, args?: IViewArgs): VNode {
//     //     return (
//     //         <path
//     //             class-mouse-handle
//     //             d={this.createPathForSegments(edge, segments, args, false)}
//     //             style-stroke-width={padding * 2}
//     //             style-stroke='transparent'
//     //             style-stroke-dasharray='none'
//     //             style-stroke-dashoffset='0'
//     //         />
//     //     );
//     // }

//     /**
//      * This helper method renders the SVG path for an BPMN Edge. An edge can have multiple routing points.
//      * In addition this method renders 'rounded' corners typical for BPMN.
//      *
//      * To render rounded corners we compute always the next segment to decide the corner angle.
//      *
//      * The method also supports the Sprotty Intersection feature. This renders an intersection if the edge
//      * crosses another edge.
//      *
//      * @param edge
//      * @param segments
//      * @param args
//      * @returns
//      */
//     protected createPathForSegments(edge: GEdge, segments: Point[], args?: IViewArgs, addIntersectionPoints?: boolean): string {
//         let path = '';
//         // let radius = 10;
//         let radius = 10;
//         for (let i = 0; i < segments.length; i++) {
//             const p = segments[i];
//             // start point?
//             if (i === 0) {
//                 path = `M ${p.x},${p.y}`;
//             }
       
//             // render a line with rounded corners...
//             if (i > 0) {
//                 // compute the direction of the next line...
//                 if (i < segments.length - 1) {
//                     const plast = segments[i - 1];
//                     const pnext = segments[i + 1];
//                     // render lines ending with rounded corners...
//                     // right-down  ↴
//                     radius = this.computeMaxRadius(p, plast, pnext);
//                     if (plast.x < p.x && p.y < pnext.y) {
//                         path += ` L ${p.x - radius},${p.y}  Q ${p.x},${p.y} ${p.x},${p.y + radius}`;
//                         // down-right  ↳
//                     } else if (plast.y < p.y && p.x < pnext.x) {
//                         path += ` L ${p.x},${p.y - radius}  Q ${p.x},${p.y} ${p.x + radius},${p.y}`;
//                         // right-up  _↑
//                     } else if (plast.x < p.x && p.y > pnext.y) {
//                         path += ` L ${p.x - radius},${p.y}  Q ${p.x},${p.y} ${p.x},${p.y - radius}`;
//                         // up-right  ↱
//                     } else if (plast.y > p.y && p.x < pnext.x) {
//                         path += ` L ${p.x},${p.y + radius}  Q ${p.x},${p.y} ${p.x + radius},${p.y}`;
//                         // down-left  ↲
//                     } else if (plast.y < p.y && p.x > pnext.x) {
//                         path += ` L ${p.x},${p.y - radius}  Q ${p.x},${p.y} ${p.x - radius},${p.y}`;
//                         // left-down  ↓-
//                     } else if (plast.x > p.x && p.y < pnext.y) {
//                         path += ` L ${p.x + radius},${p.y}  Q ${p.x},${p.y} ${p.x},${p.y + radius}`;
//                         // up-left  ↰
//                     } else if (plast.y > p.y && p.x > pnext.x) {
//                         path += ` L ${p.x},${p.y + radius}  Q ${p.x},${p.y} ${p.x - radius},${p.y}`;
//                         // left-up ↑_
//                     } else if (plast.x > p.x && p.y > pnext.y) {
//                         path += ` L ${p.x + radius},${p.y}  Q ${p.x},${p.y} ${p.x},${p.y - radius}`;
//                     } else {
//                         // default
//                         path += ` L ${p.x},${p.y}`;
//                     }
//                 } else {
//                     // default behavior
//                     path += ` L ${p.x},${p.y}`;
//                 }
//             }
//         }
//         return path;
//     }

//     /**
//      * Helper method to compute the maximum possible radius.
//      * If two points are very close the radius need to be reduced
//      */
//     protected computeMaxRadius(pCurrent: Point, pLast: Point, pNext: Point): number {
//         let radius = 10;
//         const dRef = 0.5;
//         // verify last point
//         let xDif = Math.abs(pCurrent.x - pLast.x);
//         let yDif = Math.abs(pCurrent.y - pLast.y);
//         if (xDif > 0 && xDif <= 20) {
//             radius = xDif * dRef;
//             return radius;
//         }
//         if (yDif > 0 && yDif <= 20) {
//             radius = yDif * dRef;
//             return radius;
//         }
//         // verify next point
//         xDif = Math.abs(pCurrent.x - pNext.x);
//         yDif = Math.abs(pCurrent.y - pNext.y);
//         if (xDif > 0 && xDif <= 20) {
//             radius = xDif * dRef;
//             return radius;
//         }
//         if (yDif > 0 && yDif <= 20) {
//             radius = yDif * dRef;
//             return radius;
//         }
//         // default
//         return radius;
//     }
// }


