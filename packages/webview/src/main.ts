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
import 'reflect-metadata';
import 'sprotty-vscode-webview/css/sprotty-vscode.css';

import { Container } from 'inversify';
import { HoverMouseListener, SModelElementImpl, configureModelElement } from 'sprotty';
import { SprottyDiagramIdentifier } from 'sprotty-vscode-webview';
import { SprottyLspEditStarter } from 'sprotty-vscode-webview/lib/lsp/editing';
import { createSdvmlDiagramContainer } from './di.config';
import { PaletteButtonView } from './html-views';
import { PaletteButton } from 'sprotty-vscode-webview/lib/lsp/editing';
import { Action} from 'sprotty-protocol/lib/actions';


export class SdvmlSprottyStarter extends SprottyLspEditStarter {

    protected override createContainer(diagramIdentifier: SprottyDiagramIdentifier) {
        return createSdvmlDiagramContainer(diagramIdentifier.clientId, CustomHoverListener);
    }

    protected override addVscodeBindings(container: Container, diagramIdentifier: SprottyDiagramIdentifier): void {
        super.addVscodeBindings(container, diagramIdentifier);
        configureModelElement(container, 'button:create', PaletteButton, PaletteButtonView);
    }
}

let sdvmlSprottyStarter = new SdvmlSprottyStarter();
sdvmlSprottyStarter.start();






const tooltip = document.createElement('div');
tooltip.innerHTML = "innerHTML"
tooltip.style.position = 'fixed';
tooltip.style.display = 'none';
tooltip.style.zIndex = '1000';
tooltip.style.pointerEvents = 'none';
tooltip.style.background = 'white';
tooltip.style.border = '1px solid #ccc';
tooltip.style.padding = '4px';
tooltip.style.boxShadow = '0px 0px 6px rgba(0,0,0,0.2)';
document.body.appendChild(tooltip);

// window.addEventListener('message', event => {
//     const msg = event.data;
//     // console.error("~~~~> packages/webview/src/main.ts: message="+JSON.stringify(msg))
//     // console.error("\t1:received image"+msg.result.image)
//     if (msg.result != undefined && msg.result.image != undefined){//'image-result') {
//         tooltip.innerHTML = `<img src=${msg.result.image} width="200" />`; //../picts/stats.png
//         tooltip.style.left = `${msg.result.position.x + 10}px`;
//         tooltip.style.top = `${msg.result.position.y + 10}px`;
//         tooltip.style.display = 'block';
//      } else if (msg.type === 'hide-image') {
//          tooltip.style.display = 'none';
//     }
// });

import { GetImageRequest } from './sdvml-messages'

export class CustomHoverListener extends HoverMouseListener {
    override mouseOver(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        // Send message to VS Code extension (via the webview)
        // console.error("~~~~> packages/webview/src/main.ts:"+event+"   "+target.root.id)
        if (target.id == target.root.id){
            return []
        }
        sdvmlSprottyStarter.messenger.sendRequest<{ elementId: string; position: { x: number; y: number } },  // Params
                                                { image: string; position: { x: number; y: number } }>       // Response
            (GetImageRequest ,
            { type: 'extension' }    ,
            {
                elementId: target.id,
                position: { x: event.clientX, y: event.clientY }
            }).then(response => {
                if(response.image){
                    const { image, position } = response;
                    tooltip.innerHTML = `<img src="${image}" width="50" />`;
                    tooltip.style.left = `${position.x + 10}px`;
                    tooltip.style.top = `${position.y + 10}px`;
                    tooltip.style.display = 'block';
                }else{
                    tooltip.style.display = 'none';
                }
            });
        return [];
    }


    // // Send request
    // sdvmlSprottyStarter.vscodeApi.postMessage({
    //     id: 'some-unique-id26081980',
    //     type: 'get-image',
    //     payload: {
    //         elementId: target.id,
    //         position: {
    //             x: event.clientX,
    //             y: event.clientY
    //         }
    //     }
    // });
    // return [];

    // }

    override mouseOut(target: SModelElementImpl, event: MouseEvent): (Action | Promise<Action>)[] {
        tooltip.style.display = 'none';
        return [];
    }
}

