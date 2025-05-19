import { startLanguageServer } from 'langium/lsp';
import { NodeFileSystem } from 'langium/node';
import {
    createConnection,
    ProposedFeatures,
} from 'vscode-languageserver/node.js';
import { createSdvmlServices } from './sdvml-module.js';
import { addDiagramHandler, addDiagramSelectionHandler, addHoverPopupHandler, addTextSelectionHandler } from 'langium-sprotty';


// import { ModelServerVisualBuilder } from '../extension/sprottyHelper.js';
// import {SNode, SModelRoot, RequestBoundsAction} from 'sprotty-protocol';
// import * as vscode from 'vscode';


// Create a connection to the client
const connection = createConnection(ProposedFeatures.all);

// Inject the shared services and language-specific services
const { shared, Sdvml } = createSdvmlServices({ connection, ...NodeFileSystem });

// Start the language server with the shared services
startLanguageServer(shared);
    
addDiagramHandler(connection, shared);

addDiagramSelectionHandler(Sdvml);
addTextSelectionHandler(Sdvml, { fitToScreen: 'none' });
addHoverPopupHandler(Sdvml);
