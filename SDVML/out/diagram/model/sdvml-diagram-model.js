import { AnyObject, hasArrayProp, hasObjectProp, hasStringProp } from '@eclipse-glsp/server';
import { MD5 } from 'object-hash';
import { isSensor, isActuator } from '../../language/generated/ast.js';
export function issdvmlDiagram(object) {
    return AnyObject.is(object) && hasStringProp(object, 'id') && hasArrayProp(object, 'nodes');
}
export function isEntryNode(object) {
    return AnyObject.is(object) && hasStringProp(object, 'id') && hasObjectProp(object, 'position');
}
let sensorSignalNodes = [];
let actuatorSignalNodes = [];
export function generateModelFromAST(model, existingDiagram) {
    const vssNode = createVSSNode(model.vss, existingDiagram);
    const componentNodes = model.components.flatMap((comp) => createDiagramComponentNodes(comp, existingDiagram));
    return {
        id: 'sdvml',
        vss: vssNode,
        components: [...componentNodes]
    };
}
function createVSSNode(vss, existingDiagram) {
    sensorSignalNodes = vss.signals.filter(sig => isSensor(sig)).flatMap((sig) => createDiagramSensorSignalNodes(sig, existingDiagram));
    actuatorSignalNodes = vss.signals.filter(sig => isActuator(sig)).flatMap((sig) => createDiagramActuatorSignalNodes(sig, existingDiagram));
    return {
        id: 'vss',
        sensorSignals: [...sensorSignalNodes],
        actuatorSignals: [...actuatorSignalNodes],
        parent: vss.$container
    };
}
function createDiagramSensorSignalNodes(rootNode, existingDiagram) {
    const sensorNode = createSensorDiagramNode(rootNode, existingDiagram);
    let nodes = [sensorNode];
    return nodes;
}
function createDiagramComponentNodes(rootNode, existingDiagram) {
    const compNode = createComponentNode(rootNode, existingDiagram);
    // console.error("subscribers: "+compNode.subscribers.map(s => s.name))
    let nodes = [compNode];
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
        existingDiagram.vss.sensorSignals.forEach((node) => {
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
        existingDiagram.vss.actuatorSignals.forEach((node) => {
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
        existingDiagram.components.forEach((node) => {
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
            subscribers: existingNode.subscribers,
            publishers: existingNode.publishers
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
        subscribers: sensorSignalNodes.filter(s => rootNode.subscribers.find(sn => sn.name == s.name) != undefined),
        publishers: actuatorSignalNodes.filter(s => rootNode.publishers.find(sn => sn.name == s.name) != undefined)
    };
}
//# sourceMappingURL=sdvml-diagram-model.js.map