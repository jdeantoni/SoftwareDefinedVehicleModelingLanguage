import { ConsoleLogger, GEdge, GEdgeView, LogLevel, RoundedCornerNodeView, TYPES, configureActionHandler, configureDefaultModelElements, initializeDiagramContainer, } from '@eclipse-glsp/client';
import { configureModelElement, DefaultTypes, editLabelFeature, GLabel, GLabelView, GNode, GRoutingHandle, GRoutingHandleView, RectangularNodeView, SetModelAction, UpdateModelAction, } from '@eclipse-glsp/sprotty';
import 'balloon-css/balloon.min.css';
import { ContainerModule } from 'inversify';
import { ReloadModelActionHandler } from './actions/reload-model-action-handler.js';
import { ReloadModelAction } from './actions/reload-model-action.js';
import { SensorSignalNodeView } from '../../diagram/view/CustomNodeViews.js';
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const sdvmlDiagramModule = new ContainerModule((bind, unbind, isBound, rebind) => {
    rebind(TYPES.ILogger).to(ConsoleLogger).inSingletonScope();
    rebind(TYPES.LogLevel).toConstantValue(LogLevel.warn);
    const context = { bind, unbind, isBound, rebind };
    configureDefaultModelElements(context);
    bind(ReloadModelActionHandler).toSelf().inSingletonScope();
    configureActionHandler(context, ReloadModelAction.KIND, ReloadModelActionHandler);
    configureActionHandler(context, SetModelAction.KIND, ReloadModelActionHandler);
    configureActionHandler(context, UpdateModelAction.KIND, ReloadModelActionHandler);
    configureModelElement(context, DefaultTypes.ROUTING_POINT, GRoutingHandle, GRoutingHandleView);
    configureModelElement(context, DefaultTypes.EDGE, GEdge, GEdgeView);
    configureModelElement(context, 'node:componentnode', GNode, RectangularNodeView);
    configureModelElement(context, 'node:inport', GNode, RectangularNodeView);
    configureModelElement(context, 'node:sensorsignalnode', GNode, SensorSignalNodeView);
    configureModelElement(context, 'node:actuatorsignalnode', GNode, RoundedCornerNodeView);
    configureModelElement(context, DefaultTypes.LABEL, GLabel, GLabelView, { enable: [editLabelFeature] });
});
export function initializesdvmlDiagramContainer(container, ...containerConfiguration) {
    return initializeDiagramContainer(container, sdvmlDiagramModule, ...containerConfiguration);
}
//# sourceMappingURL=sdvml-diagram-module.js.map