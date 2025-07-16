/********************************************************************************
 * Copyright (c) 2025 Université Côte d'Azur and others.

 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/

import '../css/diagram.css';
import 'sprotty/css/sprotty.css';

import { Container, ContainerModule } from 'inversify';
import {
    configureCommand, configureModelElement, ConsoleLogger, CreateElementCommand, HtmlRootImpl,
    HtmlRootView, LogLevel, ManhattanEdgeRouter, overrideViewerOptions, PreRenderedElementImpl,
    PreRenderedView, RectangularNodeView, SGraphView, SLabelView, SModelRootImpl,
    SRoutingHandleImpl, SRoutingHandleView, TYPES, loadDefaultModules, SGraphImpl, SLabelImpl,
    hoverFeedbackFeature, popupFeature, /*creatingOnDragFeature,*/ editLabelFeature, labelEditUiModule,
    editFeature,
    RectangularPort,
    JumpingPolylineEdgeView
} from 'sprotty';
import { CustomRouter } from './custom-edge-router';
import { SdvmlEdge, SdvmlNode } from './model';
import { DownTriangleButtonView, SdvmlLabelNodeView, SdvmlServiceNodeView, SdvmlSignalNodeView, /*SdvmlVSSNodeView,*/ TopTriangleButtonView, TriangleButtonView } from './views';

import { HoverMouseListener } from 'sprotty';
import { CustomHoverListener } from './main';



type CustomHoverListenerType = new () => CustomHoverListener;

export function createSdvmlDiagramContainer(widgetId: string, customHoverListener:CustomHoverListenerType): Container {
    const container = new Container();
    loadDefaultModules(container, { exclude: [ labelEditUiModule ] });

        const sdvmlDiagramModule = new ContainerModule((bind, unbind, isBound, rebind) => {
        rebind(TYPES.ILogger).to(ConsoleLogger).inSingletonScope();
        rebind(TYPES.LogLevel).toConstantValue(LogLevel.warn);
        rebind(ManhattanEdgeRouter).to(CustomRouter).inSingletonScope();
        rebind(HoverMouseListener).to(customHoverListener).inSingletonScope();


        const context = { bind, unbind, isBound, rebind };
        configureModelElement(context, 'graph', SGraphImpl, SGraphView, {
            enable: [hoverFeedbackFeature, popupFeature]
        });
        configureModelElement(context, 'node', SdvmlNode, RectangularNodeView);
        configureModelElement(context, 'node:node-label', SdvmlNode, SdvmlLabelNodeView);
        configureModelElement(context, 'node:node-service', SdvmlNode, SdvmlServiceNodeView);
        configureModelElement(context, 'label', SLabelImpl, SLabelView, {
            enable: [editLabelFeature]
        });
        configureModelElement(context, 'label:values', SLabelImpl, SLabelView);
        configureModelElement(context, 'label:xref', SLabelImpl, SLabelView, {
            enable: [editLabelFeature]
        });
        configureModelElement(context, 'edge', SdvmlEdge, JumpingPolylineEdgeView, {
            enable: [editFeature]
        });
        configureModelElement(context, 'html', HtmlRootImpl, HtmlRootView);
        configureModelElement(context, 'pre-rendered', PreRenderedElementImpl, PreRenderedView);
        configureModelElement(context, 'palette', SModelRootImpl, HtmlRootView);
        configureModelElement(context, 'routing-point', SRoutingHandleImpl, SRoutingHandleView);
        configureModelElement(context, 'volatile-routing-point', SRoutingHandleImpl, SRoutingHandleView);
        configureModelElement(context, 'port', RectangularPort, TriangleButtonView);
        configureModelElement(context, 'actuator-port', RectangularPort, DownTriangleButtonView);
        configureModelElement(context, 'sensor-port', RectangularPort, TopTriangleButtonView);
        configureModelElement(context, 'node:vss-node', SdvmlNode, SdvmlSignalNodeView);
        // configureModelElement(context, 'node:vss-container', SdvmlNode, SdvmlVSSNodeView);


        configureCommand(context, CreateElementCommand);
    });


    container.load(sdvmlDiagramModule);
    overrideViewerOptions(container, {
        needsClientLayout: true,
        needsServerLayout: true,
        baseDiv: widgetId,
        hiddenDiv: widgetId + '_hidden'
    });
    return container;
}
