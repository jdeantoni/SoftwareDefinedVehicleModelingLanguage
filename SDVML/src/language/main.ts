import { startLanguageServer } from 'langium/lsp';
import { NodeFileSystem } from 'langium/node';
import {
    createConnection,
    ProposedFeatures,
} from 'vscode-languageserver/node.js';
import { createSdvmlServices } from './sdvml-module.js';

import { addDiagramHandler } from 'langium-sprotty'; // NEW IMPORT

// Create a connection to the client
const connection = createConnection(ProposedFeatures.all);

// Inject the shared services and language-specific services
const { shared } = createSdvmlServices({ connection, ...NodeFileSystem });

// NEW: Add the diagram handler
addDiagramHandler(connection, shared);

// Start the language server with the shared services
startLanguageServer(shared);
