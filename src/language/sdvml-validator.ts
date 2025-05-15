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
