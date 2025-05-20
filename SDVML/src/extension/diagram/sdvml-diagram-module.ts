import {
	ConsoleLogger,
	ContainerConfiguration,
	LogLevel,
	RoundedCornerNodeView,
	TYPES,
	configureActionHandler,
	configureDefaultModelElements,
	initializeDiagramContainer,
} from '@eclipse-glsp/client'
import {
	configureModelElement,
	DefaultTypes,
	editLabelFeature,
	GLabel,
	GLabelView,
	GNode,
	SetModelAction,
	UpdateModelAction,
} from '@eclipse-glsp/sprotty'
import 'balloon-css/balloon.min.css'
import { Container, ContainerModule } from 'inversify'
import { ReloadModelActionHandler } from './actions/reload-model-action-handler.js'
import { ReloadModelAction } from './actions/reload-model-action.js'

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const sdvmlDiagramModule = new ContainerModule((bind: any, unbind: any, isBound: any, rebind: any) => {
	rebind(TYPES.ILogger).to(ConsoleLogger).inSingletonScope()
	rebind(TYPES.LogLevel).toConstantValue(LogLevel.warn)
	const context = { bind, unbind, isBound, rebind }
	configureDefaultModelElements(context)

	bind(ReloadModelActionHandler).toSelf().inSingletonScope()
	configureActionHandler(context, ReloadModelAction.KIND, ReloadModelActionHandler)
	configureActionHandler(context, SetModelAction.KIND, ReloadModelActionHandler)
	configureActionHandler(context, UpdateModelAction.KIND, ReloadModelActionHandler)

	configureModelElement(context, 'node:entry', GNode, RoundedCornerNodeView)
	configureModelElement(context, DefaultTypes.LABEL, GLabel, GLabelView, { enable: [editLabelFeature] })
})

export function initializesdvmlDiagramContainer(container: Container, ...containerConfiguration: ContainerConfiguration): Container {
	return initializeDiagramContainer(container, sdvmlDiagramModule, ...containerConfiguration)
}
