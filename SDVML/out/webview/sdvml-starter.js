import 'reflect-metadata';
import { GLSPStarter } from '@eclipse-glsp/vscode-integration-webview';
import '@eclipse-glsp/vscode-integration-webview/css/glsp-vscode.css';
import { Container } from 'inversify';
import { initializesdvmlDiagramContainer } from '../extension/diagram/sdvml-diagram-module';
class SDVMLStarter extends GLSPStarter {
    createContainer(...containerConfiguration) {
        return initializesdvmlDiagramContainer(new Container(), ...containerConfiguration);
    }
}
export function launchSDVMLDiagram() {
    new SDVMLStarter();
}
//# sourceMappingURL=sdvml-starter.js.map