import { RoundedCornerNodeView } from '@eclipse-glsp/client';
export class SensorSignalNodeView extends RoundedCornerNodeView {
    render(node, context) {
        const vnode = super.render(node, context);
        if (vnode === undefined) {
            // console.error(`in ./src/diagram/view/CustomNodeViews/SensorSignalNodeView/render(${node.id}): vnode is undefined`)
            return vnode;
            // throw `in ./src/diagram/view/CustomNodeViews/SensorSignalNodeView/render(${node.id}): vnode is undefined`
        }
        // // Add a CSS class based on a node type or custom logic
        return vnode;
    }
}
//# sourceMappingURL=CustomNodeViews.js.map