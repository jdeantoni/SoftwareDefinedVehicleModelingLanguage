import { AnyObject, hasArrayProp, hasObjectProp, hasStringProp } from '@eclipse-glsp/server';
import { MD5 } from 'object-hash';
export function issdvmlDiagram(object) {
    return AnyObject.is(object) && hasStringProp(object, 'id') && hasArrayProp(object, 'nodes');
}
export function isEntryNode(object) {
    return AnyObject.is(object) && hasStringProp(object, 'id') && hasObjectProp(object, 'position');
}
export function generateModelFromAST(model, existingDiagram) {
    const nodes = model.signals.flatMap((sig) => createDiagramNodes(sig, existingDiagram));
    return {
        id: 'sdvml',
        nodes: [...nodes],
    };
}
function createDiagramNodes(rootNode, existingDiagram) {
    const diagramNode = createDiagramNode(rootNode, existingDiagram);
    let nodes = [diagramNode];
    return nodes;
}
function createDiagramNode(rootNode, existingDiagram) {
    const rootNodeHash = MD5(rootNode);
    let existingNode;
    if (existingDiagram) {
        existingDiagram.nodes.forEach((node) => {
            if (node.id == rootNode.name) {
                existingNode = node;
            }
        });
    }
    if (existingNode) {
        return {
            id: rootNodeHash,
            sourceNode: rootNode,
            position: existingNode.position,
            size: existingNode.size,
        };
    }
    return {
        id: rootNodeHash,
        sourceNode: rootNode,
        position: {
            x: 300,
            y: 50,
        },
    };
}
//# sourceMappingURL=sdvml-diagram-model.js.map