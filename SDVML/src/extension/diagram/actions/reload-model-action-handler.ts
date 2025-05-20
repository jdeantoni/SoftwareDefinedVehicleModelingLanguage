import {
	Action,
	EditorContextService,
	isViewport,
	RequestModelAction,
	SetModelAction,
	SetViewportAction,
	UpdateModelAction,
	Viewport,
} from '@eclipse-glsp/client'
import { inject, injectable } from 'inversify'
import { ReloadModelAction } from './reload-model-action.js'

@injectable()
export class ReloadModelActionHandler {
	@inject(EditorContextService)
	protected editorContext?: EditorContextService
	protected cachedViewport?: Viewport

	handle(action: Action): Action | void {
		if (ReloadModelAction.is(action)) {
			if (this.editorContext) {
				const root = this.editorContext.modelRoot
				if (isViewport(root)) {
					this.cachedViewport = { scroll: root.scroll, zoom: root.zoom }
				}
				return RequestModelAction.create({ options: action.options })
			}
		} else if ((SetModelAction.is(action) || UpdateModelAction.is(action)) && this.cachedViewport) {
			const viewport = this.cachedViewport
			this.cachedViewport = undefined
			return SetViewportAction.create(action.newRoot.id, viewport, {
				animate: false,
			})
		}
	}
}
