import { Action, Args } from '@eclipse-glsp/client'

export interface ReloadModelAction extends Action {
	kind: typeof ReloadModelAction.KIND
	options?: Args
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ReloadModelAction {
	export const KIND = 'reloadModel'

	export function is(action: Action): action is ReloadModelAction {
		return Action.hasKind(action, KIND)
	}

	export function create(options?: Args): ReloadModelAction {
		return {
			kind: KIND,
			...options,
		}
	}
}
