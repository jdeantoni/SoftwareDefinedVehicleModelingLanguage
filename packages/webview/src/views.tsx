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

/** @jsx svg */
import { injectable } from "inversify";
import { VNode } from "snabbdom";
import {
  RenderingContext,
  svg,
  IView,
  SPortImpl,
  RectangularNodeView,
  IViewArgs,
  SNodeImpl,
  SShapeElementImpl /*SLabelView, SLabelImpl, isEdgeLayoutable*/,
  PolylineEdgeView,
  SEdgeImpl
} from "sprotty";
import { Hoverable, Selectable } from "sprotty-protocol";


@injectable()
export class SdvmlSignalNodeView extends RectangularNodeView {
  public override render(
    node: Readonly<SShapeElementImpl & Hoverable & Selectable>,
    context: RenderingContext,
    args?: IViewArgs
  ): VNode | undefined {
    if (!this.isVisible(node, context)) {
      return undefined;
    }
    return (
      <g>
        <rect
          class-sprotty-node={node instanceof SNodeImpl}
          class-sprotty-port={node instanceof SPortImpl}
          class-mouseover={node.hoverFeedback}
          class-selected={node.selected}
          class-vss-node={node instanceof SNodeImpl}
          x="0"
          y="0"
          width={Math.max(node.size.width, 0)}
          height={Math.max(node.size.height, 0)}
        ></rect>
        {context.renderChildren(node)}
      </g>
    );
  }
}

@injectable()
export class SdvmlServiceNodeView extends RectangularNodeView {
  public override render(
    node: Readonly<SShapeElementImpl & Hoverable & Selectable>,
    context: RenderingContext,
    args?: IViewArgs
  ): VNode | undefined {
    if (!this.isVisible(node, context)) {
      return undefined;
    }
    // const parent = node.parent as SShapeElementImpl | undefined;
    // const width = parent?.size?.width ?? 100;
    return (
      <g>
        <rect
          class-sprotty-node={node instanceof SNodeImpl}
          class-sprotty-port={node instanceof SPortImpl}
          class-mouseover={node.hoverFeedback}
          class-selected={node.selected}
          class-node-service={node instanceof SNodeImpl}
          x="0"
          y="0"
          width={Math.max(node.size.width, 0)}
          height={Math.max(node.size.height, 0)}
        ></rect>
        {context.renderChildren(node)}
      </g>
    );
  }
}

@injectable()
export class SdvmlLabelNodeView extends RectangularNodeView {
  public override render(
    node: Readonly<SShapeElementImpl & Hoverable & Selectable>,
    context: RenderingContext,
    args?: IViewArgs
  ): VNode | undefined {
    if (!this.isVisible(node, context)) {
      return undefined;
    }
    const parent = node.parent as SShapeElementImpl | undefined;
    const width = parent?.size?.width ?? 100;
    return (
      <g>
        <rect
          class-sprotty-node={node instanceof SNodeImpl}
          class-sprotty-port={node instanceof SPortImpl}
          class-mouseover={node.hoverFeedback}
          class-selected={node.selected}
          class-node-label={node instanceof SNodeImpl}
          x="0"
          y="0"
          width={Math.max(width - 12 * 2, 0)}
          height={Math.max(node.size.height, 0)}
        ></rect>
        {context.renderChildren(node)}
      </g>
    );
  }
}

@injectable()
export class SdvmlVSSNodeView extends RectangularNodeView {
  public override render(
    node: Readonly<SShapeElementImpl & Hoverable & Selectable>,
    context: RenderingContext,
    args?: IViewArgs
  ): VNode | undefined {
    if (!this.isVisible(node, context)) {
      return undefined;
    }
    return (
      <g>
        <rect
          class-sprotty-node={node instanceof SNodeImpl}
          class-sprotty-port={node instanceof SPortImpl}
          class-mouseover={node.hoverFeedback}
          class-selected={node.selected}
          class-vss-container={node instanceof SNodeImpl}
          x="0"
          y="0"
          width={Math.max(node.size.width, 0)}
          height={Math.max(node.size.height, 0)}
        ></rect>
        {context.renderChildren(node)}
      </g>
    );
  }
}

@injectable()
export class TriangleButtonView implements IView {
  render(model: SPortImpl, context: RenderingContext): VNode {
    return (
      <path
        d="M 0,0 L 8,4 L 0,8 Z"
        class-sprotty-port={model instanceof SPortImpl}
        class-selected={model.selected}
      />
    );
  }
}

@injectable()
export class DownTriangleButtonView implements IView {
  render(model: SPortImpl, context: RenderingContext): VNode {
    return <path d="M 0,0 L 4,8 L 8,0 Z" />;
  }
}

@injectable()
export class InvisibleTriangleView implements IView {
  render(model: SPortImpl, context: RenderingContext): VNode {
    return <path d="M 0,0 L 0,0 L 0,0 Z" />;
  }
}

@injectable()
export class TopTriangleButtonView implements IView {
  render(model: SPortImpl, context: RenderingContext): VNode {
    return <path d="M 0,8 L 4,0 L 8,8 Z" />;
  }
}

export class StraightEdgeView extends PolylineEdgeView {
  override render(
    edge: Readonly<SEdgeImpl>,
    context: RenderingContext
  ): VNode | undefined {

    if (edge.routerKind === 'manhattan') return super.render(edge, context); // optional fallback

     const route = this.edgeRouterRegistry.route(edge);
    if (!route || route.length < 2) return undefined;

    const start = route[0];
    const end = route[route.length - 1];
    return <g class-sprotty-edge={true} class-fc-edge={true}>
        <line
          x1={start.x}
          y1={start.y}
          x2={end.x}
          y2={end.y}
        />
      </g>
  }
}
