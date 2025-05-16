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
                accept('warning', 'Component name should start with a Majuscule.', {
                    node: comp,
                    property: 'name',
                });
            }
        }
    }
}
//# sourceMappingURL=sdvml-validator.js.map