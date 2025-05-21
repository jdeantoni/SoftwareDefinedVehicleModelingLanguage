import { RenderingContext, GNode, RoundedCornerNodeView } from '@eclipse-glsp/client';
import { VNode } from 'snabbdom';


export class SensorSignalNodeView extends RoundedCornerNodeView {
  override render(node: GNode, context: RenderingContext): VNode | undefined {

    const vnode = super.render(node, context);
    if (vnode === undefined){
        // console.error(`in ./src/diagram/view/CustomNodeViews/SensorSignalNodeView/render(${node.id}): vnode is undefined`)
        return vnode
        // throw `in ./src/diagram/view/CustomNodeViews/SensorSignalNodeView/render(${node.id}): vnode is undefined`
    }
    // // Add a CSS class based on a node type or custom logic
    return vnode;
  }

  
}
