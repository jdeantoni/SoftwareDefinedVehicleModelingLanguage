import { type Module, inject } from 'langium';
import {
    createDefaultModule,
    createDefaultSharedModule,
    type DefaultSharedModuleContext,
    type LangiumServices,
    type LangiumSharedServices,
    type PartialLangiumServices,
} from 'langium/lsp';
import {
    SdvmlGeneratedModule,
    SdvmlGeneratedSharedModule,
} from './generated/module.js';
import {
    SdvmlValidator,
    registerValidationChecks,
} from './sdvml-validator.js';

/**
 * Declaration of custom services - add your own service classes here.
 */
export type SdvmlAddedServices = {
    validation: {
        SdvmlValidator: SdvmlValidator;
    };
};

/**
 * Union of Langium default services and your custom services - use this as constructor parameter
 * of custom service classes.
 */
export type SdvmlServices = LangiumServices & SdvmlAddedServices;

/**
 * Dependency injection module that overrides Langium default services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services, while the custom services must be fully specified.
 */
export const SdvmlModule: Module<
    SdvmlServices,
    PartialLangiumServices & SdvmlAddedServices
> = {
    validation: {
        SdvmlValidator: () => new SdvmlValidator(),
    },
};

/**
 * Create the full set of services required by Langium.
 *
 * First inject the shared services by merging two modules:
 *  - Langium default shared services
 *  - Services generated by langium-cli
 *
 * Then inject the language-specific services by merging three modules:
 *  - Langium default language-specific services
 *  - Services generated by langium-cli
 *  - Services specified in this file
 *
 * @param context Optional module context with the LSP connection
 * @returns An object wrapping the shared services and the language-specific services
 */
export function createSdvmlServices(context: DefaultSharedModuleContext): {
    shared: LangiumSharedServices;
    Sdvml: SdvmlServices;
} {
    const shared = inject(
        createDefaultSharedModule(context),
        SdvmlGeneratedSharedModule
    );
    const Sdvml = inject(
        createDefaultModule({ shared }),
        SdvmlGeneratedModule,
        SdvmlModule
    );
    shared.ServiceRegistry.register(Sdvml);
    registerValidationChecks(Sdvml);
    if (!context.connection) {
        // We don't run inside a language server
        // Therefore, initialize the configuration provider instantly
        shared.workspace.ConfigurationProvider.initialized({});
    }
    return { shared, Sdvml };
}
