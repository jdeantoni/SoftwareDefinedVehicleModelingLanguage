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

import type { ValidationAcceptor, ValidationChecks } from 'langium';
import type { Component, SdvmlAstType } from './generated/ast.js';
import type { SdvmlServices } from './sdvml-module.js';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: SdvmlServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.SdvmlValidator;
    const checks: ValidationChecks<SdvmlAstType> = {
        Component: validator.checkComponentNameStartsWithCapital,
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class SdvmlValidator {
    checkComponentNameStartsWithCapital(comp: Component, accept: ValidationAcceptor): void {
        if (comp.name) {
            const firstChar = comp.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Component name should start with a Majuscule.', {
                    node: comp,
                    property: 'name',
                });
            }
        }
    }
}
