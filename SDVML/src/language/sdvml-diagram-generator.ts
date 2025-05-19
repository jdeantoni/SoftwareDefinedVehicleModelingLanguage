// // src/language/your-language-diagram-generator.ts
// import { AstNode } from 'langium';
// import { SetModelAction } from '@eclipse-glsp/protocol'; // ou types KLighD spécifiques si différents
// import {} from '@eclipse-glsp/sprotty';
// import {} from 'vscode-k'
// import { LangiumServices } from 'langium/lsp';
// //DiagramRoot, SModelRoot, SNode, SEdge
// // Assurez-vous d'avoir les types KLighD/Sprotty pertinents installés
// // npm install --save-dev @eclipse-glsp/protocol

// export class YourLanguageDiagramGenerator {
//     protected readonly services: LangiumServices;

//     constructor(services: LangiumServices) {
//         this.services = services;
//     }

//     generateDiagram(model: AstNode): DiagramRoot { // Ou SModelRoot si vous utilisez GLSP/Sprotty plus directement
//         const diagramRoot: DiagramRoot = {
//             type: 'graph', // Ou un type spécifique à votre diagramme
//             id: 'root',
//             children: [],
//             // Autres propriétés KLighD/Sprotty
//         };

//         // Parcourir l'AST et créer les nœuds et arêtes KLighD
//         // Exemple très simple: Chaque déclaration dans votre AST devient un nœud
//         if (model.$type === 'Model') { // Remplacez 'Model' par le type de votre règle d'entrée
//             for (const element of model.elements) { // Supposons que 'elements' est une propriété de votre règle d'entrée
//                 if (element.$type === 'MyNodeDeclaration') { // Remplacez par vos types d'AST
//                     const node: SNode = {
//                         id: this.services.workspace.AstNodeDescriptionProvider.getQualifiedName(element), // Ou utilisez un autre identifiant unique
//                         type: 'node',
//                         children: [],
//                         properties: {
//                             name: element.name, // Supposons que vos nœuds ont une propriété 'name'
//                             // Ajoutez d'autres propriétés visuelles si nécessaire
//                         }
//                     };
//                     diagramRoot.children.push(node);
//                 } else if (element.$type === 'MyEdgeDeclaration') {
//                     // Supposons que vos arêtes ont une source et une cible
//                     const edge: SEdge = {
//                         id: this.services.workspace.AstNodeDescriptionProvider.getQualifiedName(element),
//                         type: 'edge',
//                         sourceId: this.services.workspace.AstNodeDescriptionProvider.getQualifiedName(element.source),
//                         targetId: this.services.workspace.AstNodeDescriptionProvider.getQualifiedName(element.target),
//                         // Ajoutez d'autres propriétés visuelles si nécessaire
//                     };
//                     diagramRoot.children.push(edge);
//                 }
//             }
//         }

//         return diagramRoot;
//     }
// }