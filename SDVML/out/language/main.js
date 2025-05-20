import { startLanguageServer } from 'langium/lsp';
import { NodeFileSystem } from 'langium/node';
import { createConnection, NotificationType, ProposedFeatures, } from 'vscode-languageserver/node.js';
import { createSdvmlServices } from './sdvml-module.js';
import { DocumentState, URI } from 'langium';
// Create a connection to the client
const connection = createConnection(ProposedFeatures.all);
// Inject the shared services and language-specific services
const { shared, Sdvml } = createSdvmlServices(Object.assign({ connection }, NodeFileSystem));
// Start the language server with the shared services
startLanguageServer(shared);
console.debug("language/main.ts");
connection.onRequest('modelRequest', async (params) => {
    console.debug("connection.onRequest(\'modelRequest\', async (params) => {");
    const uri = URI.parse(params.uri);
    let entryDocument = shared.workspace.LangiumDocuments.getDocument(uri);
    if (!entryDocument) {
        await shared.workspace.DocumentBuilder.update([uri], []);
        entryDocument = shared.workspace.LangiumDocuments.getDocument(uri);
    }
    if (entryDocument) {
        const jsonSerializer = Sdvml.serializer.JsonSerializer;
        connection.sendNotification(new NotificationType('node/DocumentChangeOnRequestToSDVMLDiagram'), {
            uri: [entryDocument.uri.toString(true)],
            content: [jsonSerializer.serialize(entryDocument.parseResult.value)],
        });
    }
});
// Send a notification with the serialized AST after every document change
const sdvmlSerializer = Sdvml.serializer.JsonSerializer;
shared.workspace.DocumentBuilder.onBuildPhase(DocumentState.Validated, (documents) => {
    const sdvmlDocuments = shared.workspace.LangiumDocuments.all.filter((doc) => doc.uri.toString().endsWith('.sdvml'));
    const sdvmlUris = sdvmlDocuments.map((doc) => doc.uri.toString(true)).toArray();
    const sdvmlContent = sdvmlDocuments.map((doc) => sdvmlSerializer.serialize(doc.parseResult.value)).toArray();
    console.debug("connection.sendNotification(new NotificationType<DocumentChange>(\'node/DocumentChangeToSDVMLDiagram\'), {");
    connection.sendNotification(new NotificationType('node/DocumentChangeToSDVMLDiagram'), {
        uri: sdvmlUris,
        content: sdvmlContent,
    });
});
//# sourceMappingURL=main.js.map