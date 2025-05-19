import {SCompartment, SEdge, SLabel, SModelRoot, SNode, EdgeLayoutable} from "sprotty-protocol";

interface NodeAttribute {
    name: string;
    value: string;
}

export class ModelServerVisualBuilder {
    public static createModelRoot(id: string, nodes: SNode[], edges: SEdge[]): SModelRoot {
        return <SModelRoot>{
            type: 'graph',
            id: id,
            children: [
                ...nodes,
                ...edges
            ]
        }
    }

    public static createNode(title: string, id: string, attributes: NodeAttribute[]): SNode {
        const attributeElements = attributes.map((value, index) =>
            <SLabel>{
                type: 'label:attribute',
                id: `node-${id}-comp-comp-attr${index}`,
                text: `${value.name} = ${value.value}`
            });

        return <SNode>{
            type: 'node:class',
            id: `node-${id}`,
            layout: 'vbox',
            children: [
                <SCompartment>{
                    type: 'comp:header',
                    id: `node-${id}-comp-header`,
                    layout: 'hbox',
                    layoutOptions: {
                        hAlign: "center",
                        hGap: 10,
                        resizeContainer: true
                    },
                    children: [
                        <SLabel>{
                            type: 'label:id',
                            id: `node-${id}-comp-header-id`,
                            text: `${id}`,
                        },
                        <SLabel>{
                            type: 'label:name',
                            id: `node-${id}-comp-header-name`,
                            text: `${title}`
                        }
                    ]
                },
                <SCompartment>{
                    type: 'comp:comp',
                    id: `node-${id}-comp-comp`,
                    layout: 'vbox',
                    layoutOptions: {
                        hAlign: 'left',
                        paddingTop: 15,
                        resizeContainer: true
                    },
                    children: attributeElements
                }
            ]
        }
    }

    public static createEdge(edgeLabel: string, fromId: string, toId: string): SEdge {
        const edgeId = `${fromId}-${edgeLabel}-${toId}`;
        return <SEdge>{
            type: 'edge',
            id: `${edgeId}`,
            sourceId: `node-${fromId}`,
            targetId: `node-${toId}`,
            routerKind: 'manhattan',
            children: [
                <SLabel & EdgeLayoutable>{
                    type: 'label:xref',
                    id: `${edgeId}.label`,
                    text: `${edgeLabel}`,
                    edgePlacement: {
                        side: "on",
                        offset: 20,
                        position: 0.5,
                        rotate: false
                    }
                }
            ]
        }
    }


}