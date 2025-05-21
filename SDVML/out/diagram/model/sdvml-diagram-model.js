import { AnyObject, hasArrayProp, hasObjectProp, hasStringProp } from '@eclipse-glsp/server';
import { MD5 } from 'object-hash';
import { isSensor, isActuator } from '../../language/generated/ast.js';
export function issdvmlDiagram(object) {
    return AnyObject.is(object) && hasStringProp(object, 'id') && hasArrayProp(object, 'nodes');
}
export function isEntryNode(object) {
    return AnyObject.is(object) && hasStringProp(object, 'id') && hasObjectProp(object, 'position');
}
export function generateModelFromAST(model, existingDiagram) {
    const sensorSignalsNodes = model.signals.filter(sig => isSensor(sig)).flatMap((sig) => createDiagramSensorSignalNodes(sig, existingDiagram));
    const actuatorSignalsNodes = model.signals.filter(sig => isActuator(sig)).flatMap((sig) => createDiagramActuatorSignalNodes(sig, existingDiagram));
    const componentNodes = model.components.flatMap((comp) => createDiagramComponentNodes(comp, existingDiagram));
    return {
        id: 'sdvml',
        sensorSignals: [...sensorSignalsNodes],
        actuatorSignals: [...actuatorSignalsNodes],
        components: [...componentNodes]
    };
}
function createDiagramSensorSignalNodes(rootNode, existingDiagram) {
    const diagramNode = createSensorDiagramNode(rootNode, existingDiagram);
    let nodes = [diagramNode];
    return nodes;
}
function createDiagramComponentNodes(rootNode, existingDiagram) {
    const diagramNode = createComponentNode(rootNode, existingDiagram);
    let nodes = [diagramNode];
    return nodes;
}
function createDiagramActuatorSignalNodes(rootNode, existingDiagram) {
    const diagramNode = createActuatorDiagramNode(rootNode, existingDiagram);
    let nodes = [diagramNode];
    return nodes;
}
function createSensorDiagramNode(rootNode, existingDiagram) {
    const rootNodeHash = MD5(rootNode);
    let existingNode;
    if (existingDiagram) {
        existingDiagram.sensorSignals.forEach((node) => {
            if (node.id == rootNode.name) {
                existingNode = node;
            }
        });
    }
    if (existingNode) {
        return {
            id: rootNodeHash,
            name: existingNode.name,
            parent: rootNode,
            position: existingNode.position,
            size: existingNode.size,
        };
    }
    return {
        id: rootNodeHash,
        name: rootNode.name,
        parent: rootNode,
        position: {
            x: 100,
            y: 50,
        },
        size: {
            height: 10,
            width: 10
        },
    };
}
function createActuatorDiagramNode(rootNode, existingDiagram) {
    const rootNodeHash = MD5(rootNode);
    let existingNode;
    if (existingDiagram) {
        existingDiagram.actuatorSignals.forEach((node) => {
            if (node.id == rootNode.name) {
                existingNode = node;
            }
        });
    }
    if (existingNode) {
        return {
            id: rootNodeHash,
            name: existingNode.name,
            parent: rootNode,
            position: existingNode.position,
            size: existingNode.size,
        };
    }
    return {
        id: rootNodeHash,
        name: rootNode.name,
        parent: rootNode,
        position: {
            x: 500,
            y: 50,
        },
        size: {
            height: 10,
            width: 10
        },
    };
}
function createComponentNode(rootNode, existingDiagram) {
    const rootNodeHash = MD5(rootNode);
    let existingNode;
    if (existingDiagram) {
        existingDiagram.sensorSignals.forEach((node) => {
            if (node.id == rootNode.name) {
                existingNode = node;
            }
        });
    }
    if (existingNode) {
        return {
            id: rootNodeHash,
            name: existingNode.name,
            parent: rootNode,
            position: existingNode.position,
            size: existingNode.size,
        };
    }
    return {
        id: rootNodeHash,
        name: rootNode.name,
        parent: rootNode,
        position: {
            x: 300,
            y: 10,
        },
        size: {
            height: 10,
            width: 10
        },
    };
}
//# sourceMappingURL=sdvml-diagram-model.js.map