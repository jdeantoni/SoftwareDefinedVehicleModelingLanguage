/******************************************************************************
 * This file was generated by langium-cli 3.5.0.
 * DO NOT EDIT MANUALLY!
 ******************************************************************************/
import { SdvmlAstReflection } from './ast.js';
import { SdvmlGrammar } from './grammar.js';
export const SdvmlLanguageMetaData = {
    languageId: 'sdvml',
    fileExtensions: ['.sdvml'],
    caseInsensitive: false,
    mode: 'development'
};
export const SdvmlGeneratedSharedModule = {
    AstReflection: () => new SdvmlAstReflection()
};
export const SdvmlGeneratedModule = {
    Grammar: () => SdvmlGrammar(),
    LanguageMetaData: () => SdvmlLanguageMetaData,
    parser: {}
};
//# sourceMappingURL=module.js.map