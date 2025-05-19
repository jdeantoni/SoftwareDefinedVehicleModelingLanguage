// import { ModelServerVisualBuilder } from '../extension/sprottyHelper.js';
// import {SNode, SModelRoot, RequestBoundsAction} from 'sprotty-protocol';
// import * as vscode from 'vscode';
// import 'vscode/localExtensionHost';
/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.SdvmlValidator;
    const checks = {
        Component: validator.checkComponentNameStartsWithCapital,
    };
    registry.register(checks, validator);
}
/**
 * Implementation of custom validations.
 */
export class SdvmlValidator {
    checkComponentNameStartsWithCapital(comp, accept) {
        if (comp.name) {
            const firstChar = comp.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                //     MAY BE REGISTER TO DOCUMENT UPDATE AND ADD THIS HERE
                // // - action: a valid Sprotty action that is sent to open diagram views.
                // var moduri = comp.$document?.uri.toString();
                // moduri = moduri==undefined?"zaza":moduri;
                // console.debug(("the model uri: " +moduri))
                // var node:SNode = ModelServerVisualBuilder.createNode(moduri,"toto",[]);
                // var graph:SModelRoot = ModelServerVisualBuilder.createModelRoot("titi", [node], []);
                // console.debug("smodel:"+JSON.stringify(graph));
                // vscode.commands.executeCommand("klighd-vscode.dispatchAction", RequestBoundsAction.create(graph))
                accept('warning', 'Component name should start with a Majuscule.', {
                    node: comp,
                    property: 'name',
                });
            }
        }
    }
}
//# sourceMappingURL=sdvml-validator.js.map