import {
	ActionHandlerConstructor,
	BindingTarget,
	CompoundOperationHandler,
	DiagramConfiguration,
	DiagramModule,
	GModelFactory,
	GModelIndex,
	InstanceMultiBinding,
	ModelState,
	OperationHandlerConstructor,
} from '@eclipse-glsp/server/node.js'
import { injectable } from 'inversify'
import { sdvmlDiagramConfiguration } from './sdvml-diagram-configuration.js'
import { sdvmlModelState } from './model/sdvml-model-state.js'
import { sdvmlModelStorage } from './model/sdvml-model-storage.js'
import { sdvmlGModelFactory } from './model/sdvml-gmodel-factory.js'
import { sdvmlModelIndex } from './model/sdvml-diagram-model-index.js'
import { sdvmlApplyLabelEditHandler } from './handler/sdvml-apply-label-edit-handler.js'
@injectable()
export class SdvmlDiagramModule extends DiagramModule {
	readonly diagramType = 'sdvml-diagram'

	protected bindDiagramConfiguration(): BindingTarget<DiagramConfiguration> {
		console.debug("1")
		return sdvmlDiagramConfiguration
	}

	protected bindSourceModelStorage(): BindingTarget<sdvmlModelStorage> {
		console.debug("2")
		return sdvmlModelStorage
	}

	protected bindModelState(): BindingTarget<ModelState> {
		console.debug("3")
		return { service: sdvmlModelState }
	}

	protected bindGModelFactory(): BindingTarget<GModelFactory> {
		console.debug("4")
		return sdvmlGModelFactory
	}

	protected override configureActionHandlers(binding: InstanceMultiBinding<ActionHandlerConstructor>): void {
		console.debug("5")
		super.configureActionHandlers(binding)
	}

	protected override configureOperationHandlers(binding: InstanceMultiBinding<OperationHandlerConstructor>): void {
		console.debug("6")
		binding.add(sdvmlApplyLabelEditHandler)
		binding.add(CompoundOperationHandler)
	}

	protected override bindGModelIndex(): BindingTarget<GModelIndex> {
		console.debug("7")
		this.context.bind(sdvmlModelIndex).toSelf().inSingletonScope()
		return { service: sdvmlModelIndex }
	}
}
