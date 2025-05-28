import { MD5 } from 'object-hash';
import { isSensor, isActuator } from '../../language/generated/ast.js';
import { boundsFeature, connectableFeature, deletableFeature, fadeFeature, hoverFeedbackFeature, layoutContainerFeature, moveFeature, nameFeature, popupFeature, RectangularNode, selectFeature } from '@eclipse-glsp/client';
class SDVMLNode extends RectangularNode {
}
SDVMLNode.DEFAULT_FEATURES = [
    connectableFeature,
    deletableFeature,
    selectFeature,
    boundsFeature,
    moveFeature,
    layoutContainerFeature,
    fadeFeature,
    hoverFeedbackFeature,
    popupFeature,
    nameFeature
];
export { SDVMLNode };
export class SDVMLDiagram extends SDVMLNode {
}
export function isSdvmlDiagram(element) {
    return element instanceof SDVMLDiagram || false;
}
export class VSSNode extends SDVMLNode {
}
export function isVSSNode(element) {
    return element instanceof isVSSNode || false;
}
export class SensorSignalNode extends SDVMLNode {
}
export function isSensorSignalNode(element) {
    return element instanceof SensorSignalNode || false;
}
export class ComponentNode extends SDVMLNode {
}
export function isComponentNode(element) {
    return element instanceof ComponentNode || false;
}
export class ActuatorSignalNode extends SDVMLNode {
}
export function isActuatorSignalNode(element) {
    return element instanceof ActuatorSignalNode || false;
}
let sensorSignalNodes = [];
let actuatorSignalNodes = [];
export function generateModelFromAST(model, existingDiagram) {
    const vssNode = createVSSNode(model.vss, existingDiagram);
    const componentNodes = model.components.flatMap((comp) => createComponentNodes(comp, existingDiagram));
    let diagNode = new SDVMLDiagram();
    diagNode.id = 'sdvml';
    diagNode.vss = vssNode;
    diagNode.components = componentNodes;
    return diagNode;
}
function createVSSNode(vss, existingDiagram) {
    sensorSignalNodes = vss.signals.filter(sig => isSensor(sig)).flatMap((sig) => createSensorSignalNodes(sig, existingDiagram));
    actuatorSignalNodes = vss.signals.filter(sig => isActuator(sig)).flatMap((sig) => createActuatorSignalNodes(sig, existingDiagram));
    let res = new VSSNode();
    res.id = 'vss'; //this needSignalntNodes]
    res.sensorSignals = [...sensorSignalNodes];
    res.actuatorSignals = [...actuatorSignalNodes];
    return res;
}
function createSensorSignalNodes(rootNode, existingDiagram) {
    const rootNodeHash = MD5(rootNode);
    let existingNode;
    if (existingDiagram) {
        existingDiagram.vss.sensorSignals.forEach((node) => {
            if (node.id == rootNode.name) {
                existingNode = node;
            }
        });
    }
    let res = new SensorSignalNode();
    if (existingNode) {
        res.id = rootNodeHash;
        res.name = existingNode.name;
        res.position = existingNode.position;
        res.size = existingNode.size;
        return res;
    }
    res.id = rootNodeHash;
    res.name = rootNode.name;
    res.position = { x: 100, y: 50 };
    res.size = { height: 30, width: 100 };
    return res;
}
function createActuatorSignalNodes(rootNode, existingDiagram) {
    const rootNodeHash = MD5(rootNode);
    let existingNode;
    if (existingDiagram) {
        existingDiagram.vss.actuatorSignals.forEach((node) => {
            if (node.id == rootNode.name) {
                existingNode = node;
            }
        });
    }
    let res = new ActuatorSignalNode;
    if (existingNode) {
        res.id = rootNodeHash;
        res.name = existingNode.name;
        res.position = existingNode.position;
        res.size = existingNode.size;
        return res;
    }
    res.id = rootNodeHash;
    res.name = rootNode.name;
    res.position = { x: 500, y: 50 };
    res.size = { height: 30, width: 100 };
    return res;
}
function createComponentNodes(rootNode, existingDiagram) {
    const rootNodeHash = MD5(rootNode);
    let existingNode;
    if (existingDiagram) {
        existingDiagram.components.forEach((node) => {
            if (node.id == rootNode.name) {
                existingNode = node;
            }
        });
    }
    let res = new ComponentNode();
    if (existingNode) {
        res.id = rootNodeHash;
        res.name = existingNode.name;
        res.position = existingNode.position;
        res.size = existingNode.size;
        res.subscribers = existingNode.subscribers;
        res.publishers = existingNode.publishers;
        return res;
    }
    res.id = rootNodeHash;
    res.name = rootNode.name;
    res.position = { x: 300, y: 10 };
    res.size = { height: 30, width: 100 };
    res.subscribers = sensorSignalNodes.filter(s => rootNode.subscribers.find(sn => sn.name == s.name) != undefined);
    res.publishers = actuatorSignalNodes.filter(s => rootNode.publishers.find(sn => sn.name == s.name) != undefined);
    return res;
}
//# sourceMappingURL=sdvml-diagram-model.js.map