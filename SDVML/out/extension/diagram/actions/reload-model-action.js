import { Action } from '@eclipse-glsp/client';
// eslint-disable-next-line @typescript-eslint/no-namespace
export var ReloadModelAction;
(function (ReloadModelAction) {
    ReloadModelAction.KIND = 'reloadModel';
    function is(action) {
        return Action.hasKind(action, ReloadModelAction.KIND);
    }
    ReloadModelAction.is = is;
    function create(options) {
        return Object.assign({ kind: ReloadModelAction.KIND }, options);
    }
    ReloadModelAction.create = create;
})(ReloadModelAction || (ReloadModelAction = {}));
//# sourceMappingURL=reload-model-action.js.map