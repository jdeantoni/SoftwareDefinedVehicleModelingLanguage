import 'reflect-metadata'

import { ContainerConfiguration } from '@eclipse-glsp/client'
import { GLSPStarter } from '@eclipse-glsp/vscode-integration-webview'
import '@eclipse-glsp/vscode-integration-webview/css/glsp-vscode.css'
import { Container } from 'inversify'
import { initializesdvmlDiagramContainer } from '../extension/diagram/sdvml-diagram-module'

class sdvmlStarter extends GLSPStarter {
	createContainer(...containerConfiguration: ContainerConfiguration): Container {
		return initializesdvmlDiagramContainer(new Container(), ...containerConfiguration)
	}
}

export function launchsdvmlDiagram(): void {
	new sdvmlStarter()
}
