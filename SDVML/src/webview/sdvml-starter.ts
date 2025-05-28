import 'reflect-metadata'

import { ContainerConfiguration } from '@eclipse-glsp/client'
import { GLSPStarter } from '@eclipse-glsp/vscode-integration-webview'
import '@eclipse-glsp/vscode-integration-webview/css/glsp-vscode.css'
import { Container } from 'inversify'
import { initializesdvmlDiagramContainer } from '../extension/diagram/sdvml-diagram-module'

class SDVMLStarter extends GLSPStarter {
	createContainer(...containerConfiguration: ContainerConfiguration): Container {
		let container = initializesdvmlDiagramContainer(new Container(), ...containerConfiguration)
		return container
	}
}

export function launchSDVMLDiagram(): void {
	new SDVMLStarter()
}
