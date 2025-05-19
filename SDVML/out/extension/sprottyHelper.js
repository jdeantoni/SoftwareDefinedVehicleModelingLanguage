export class ModelServerVisualBuilder {
    static createModelRoot(id, nodes, edges) {
        return {
            type: 'graph',
            id: id,
            children: [
                ...nodes,
                ...edges
            ]
        };
    }
    static createNode(title, id, attributes) {
        const attributeElements = attributes.map((value, index) => ({
            type: 'label:attribute',
            id: `node-${id}-comp-comp-attr${index}`,
            text: `${value.name} = ${value.value}`
        }));
        return {
            type: 'node:class',
            id: `node-${id}`,
            layout: 'vbox',
            children: [
                {
                    type: 'comp:header',
                    id: `node-${id}-comp-header`,
                    layout: 'hbox',
                    layoutOptions: {
                        hAlign: "center",
                        hGap: 10,
                        resizeContainer: true
                    },
                    children: [
                        {
                            type: 'label:id',
                            id: `node-${id}-comp-header-id`,
                            text: `${id}`,
                        },
                        {
                            type: 'label:name',
                            id: `node-${id}-comp-header-name`,
                            text: `${title}`
                        }
                    ]
                },
                {
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
        };
    }
    static createEdge(edgeLabel, fromId, toId) {
        const edgeId = `${fromId}-${edgeLabel}-${toId}`;
        return {
            type: 'edge',
            id: `${edgeId}`,
            sourceId: `node-${fromId}`,
            targetId: `node-${toId}`,
            routerKind: 'manhattan',
            children: [
                {
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
        };
    }
}
//# sourceMappingURL=sprottyHelper.js.map