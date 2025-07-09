// sdvml-language/src/language/sdvml-diagram-generator.ts (or src/diagram/sdvml-diagram-generator.ts)
import { GeneratorContext, LangiumDiagramGenerator, LangiumSprottyServices } from 'langium-sprotty';
import { SModelRoot, SNode, /*SEdge,*/ SLabel } from 'sprotty-protocol';
import { Model, Component,  Subscriber, Publisher } from '../language/generated/ast.js'; // Adjust path to your generated AST
import { AstNode } from 'langium';

export class SdvmlDiagramGenerator extends LangiumDiagramGenerator {

    constructor(services: LangiumSprottyServices) {
        super(services);
    }

    protected generateRoot(context: GeneratorContext<AstNode> ): SModelRoot | Promise<SModelRoot> {
       
        const model = context.document.parseResult.value as Model;
        const root: SModelRoot = {
            type: 'graph',
            id: 'sdvml-diagram',
            children: []
        };

        // Map Components to SNodes
        model.components.forEach((component : Component) => {
            const node: SNode = {
                id: component.name, // Unique ID for the node
                type: 'component', // Custom type for styling in Sprotty frontend
                children: [
                    {
                        id: `${component.name}_label`,
                        type: 'label',
                        text: component.name,
                        cssClasses: ['node-label']
                    } as SLabel
                ]
            };
            root.children?.push(node);

            // Add interfaces as child nodes or labels within components
            component.subscribers.forEach((subscriber:Subscriber) => {
                const interfaceNode: SNode = <SNode>{
                    id: component.name+'_'+subscriber.name,
                    type: 'interface',
                    parent: node.id,
                    children: [
                        {
                            id: `${subscriber.name}_label`,
                            type: 'label',
                            text: subscriber.name,
                            cssClasses: ['interface-label']
                        } as SLabel
                    ]
                };
                node.children?.push(interfaceNode);
            });

                    // Add interfaces as child nodes or labels within components
            component.publishers.forEach((publisher:Publisher) => {
                const interfaceNode: SNode = <SNode>{
                    id: component.name+'_'+publisher.name,
                    type: 'interface',
                    parent: node.id,
                    children: [
                        {
                            id: `${publisher.name}_label`,
                            type: 'label',
                            text: publisher.name,
                            cssClasses: ['interface-label']
                        } as SLabel
                    ]
                };
                node.children?.push(interfaceNode);
            });
        });

        // Add DataElements as SNodes
        model.signals.forEach(signal => {
            const node: SNode = {
                id: signal.name,
                type: 'dataElement',
                children: [
                    {
                        id: `${signal.name}_label`,
                        type: 'label',
                        text: signal.name,
                        cssClasses: ['data-element-label']
                    } as SLabel
                ]
            };
            root.children?.push(node);
        });

        // // Add Services as SNodes (or maybe combine with components depending on your desired visualization)
        // model.services.forEach(service => {
        //     const node: SNode = {
        //         id: this.services.workspace.AstNodeLocator.get(service),
        //         type: 'service',
        //         children: [
        //             {
        //                 id: `${service.name}_label`,
        //                 type: 'label',
        //                 text: service.name,
        //                 cssClasses: 'service-label'
        //             } as SLabel
        //         ]
        //     };
        //     root.children.push(node);
        // });


        // Add edges for relationships (e.g., component-to-component dependencies, service-to-interface usage)
        // model.components.forEach(sourceComponent => {
        //     sourceComponent.dependencies.forEach(dependencyRef => {
        //         const targetComponent = dependencyRef.ref;
        //         if (targetComponent) {
        //             const edge: SEdge = {
        //                 id: `${sourceComponent.name}_to_${targetComponent.name}_dependency`,
        //                 type: 'dependency-edge', // Custom type for styling
        //                 sourceId: this.services.workspace.AstNodeLocator.get(sourceComponent),
        //                 targetId: this.services.workspace.AstNodeLocator.get(targetComponent),
        //                 children: [
        //                     {
        //                         id: `${sourceComponent.name}_to_${targetComponent.name}_dependency_label`,
        //                         type: 'label',
        //                         text: 'depends on',
        //                         cssClasses: 'edge-label'
        //                     } as SLabel
        //                 ]
        //             };
        //             root.children.push(edge);
        //         }
        //     });

        // Example: Service using an interface (assuming your grammar supports this)
        // You'll need to adapt this based on how services interact with interfaces in your SDVML grammar
        // model.services.forEach(service => {
        //     service.usedInterfaces.forEach(interfaceRef => {
        //         const targetInterface = interfaceRef.ref;
        //         if (targetInterface) {
        //             const owningComponent = (targetInterface.$container as Component); // Assuming interface is directly contained in a component
        //             if (owningComponent) {
        //                 const edge: SEdge = {
        //                     id: `${service.name}_uses_${targetInterface.name}`,
        //                     type: 'uses-interface-edge',
        //                     sourceId: this.services.workspace.AstNodeLocator.get(service),
        //                     targetId: this.services.workspace.AstNodeLocator.get(targetInterface),
        //                     children: [
        //                         {
        //                             id: `${service.name}_uses_${targetInterface.name}_label`,
        //                             type: 'label',
        //                             text: 'uses',
        //                             cssClasses: 'edge-label'
        //                         } as SLabel
        //                     ]
        //                 };
        //                 root.children.push(edge);
        //             }
        //         }
        //     });
        // });

        return root;
    }
}