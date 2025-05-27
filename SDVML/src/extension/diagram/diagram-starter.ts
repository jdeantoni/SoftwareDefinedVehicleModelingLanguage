import 'reflect-metadata'
import { LogLevel, ServerModule, createAppModule } from '@eclipse-glsp/server/node.js'
import { GlspVscodeConnector, NodeGlspVscodeServer, configureDefaultCommands } from '@eclipse-glsp/vscode-integration/node.js'
import { ContainerModule } from 'inversify'
import * as vscode from 'vscode'
import { configureELKLayoutModule } from '@eclipse-glsp/layout-elk'
import { SdvmlDiagramModule } from '../../diagram/sdvml-diagram-module.js'
import SDVMLEditorProvider from './sdvml-editor-provider.js'
import { LayoutConfigurator } from './LayoutConfigurator.js'



export async function startDiagram(context: vscode.ExtensionContext): Promise<void> {
	console.debug("export async function startDiagram(context: vscode.ExtensionContext): Promise<void> {")
	const diagramServer = new NodeGlspVscodeServer({
		clientId: 'glsp.sdvml',
		clientName: 'sdvmlDiagramClient',
		serverModules: createServerModules(),
	})

	// Initialize GLSP-VSCode connector with server wrapper
	const glspVscodeConnector = new GlspVscodeConnector({
		server: diagramServer,
		logging: true,
	})

	const sdvmlDiagramEditorProvider = vscode.window.registerCustomEditorProvider(
		'sdvml.glspDiagram',
		new SDVMLEditorProvider(context, glspVscodeConnector),
		{
			webviewOptions: { retainContextWhenHidden: true },
			supportsMultipleEditorsPerDocument: false,
		},
	)
	// console.debug((sdvmlDiagramEditorProvider))

	context.subscriptions.push(diagramServer, glspVscodeConnector, sdvmlDiagramEditorProvider)
	diagramServer.start()

	configureDefaultCommands({ extensionContext: context, connector: glspVscodeConnector, diagramPrefix: 'sdvml' })
}

function createServerModules(): ContainerModule[] {
	const appModule = createAppModule({ logLevel: LogLevel.debug, fileLog: false, consoleLog: true })
	const elkLayoutModule = configureELKLayoutModule({ 
		algorithms: ['layered'],
		layoutConfigurator: LayoutConfigurator
	})
	const sdvmlDiagramModule = new SdvmlDiagramModule()
	const mainModule = new ServerModule().configureDiagramModule(sdvmlDiagramModule, elkLayoutModule)
	return [appModule, mainModule]
} 


