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
import { SDVMLModelState } from './model/sdvml-model-state.js'
import { sdvmlModelStorage } from './model/sdvml-model-storage.js'
import { sdvmlGModelFactory } from './model/sdvml-gmodel-factory.js'
import { sdvmlModelIndex } from './model/sdvml-diagram-model-index.js'
import { sdvmlApplyLabelEditHandler } from './handler/sdvml-apply-label-edit-handler.js'

import "../diagram/view/nodeStyles.css";

@injectable()
export class SdvmlDiagramModule extends DiagramModule {
	readonly diagramType = 'sdvml-diagram'

	protected bindDiagramConfiguration(): BindingTarget<DiagramConfiguration> {
		return sdvmlDiagramConfiguration
	}

	protected bindSourceModelStorage(): BindingTarget<sdvmlModelStorage> {
		return sdvmlModelStorage
	}

	protected bindModelState(): BindingTarget<ModelState> {
		return { service: SDVMLModelState }
	}

	protected bindGModelFactory(): BindingTarget<GModelFactory> {
		return sdvmlGModelFactory
	}

	protected override configureActionHandlers(binding: InstanceMultiBinding<ActionHandlerConstructor>): void {
		super.configureActionHandlers(binding)
	}

	protected override configureOperationHandlers(binding: InstanceMultiBinding<OperationHandlerConstructor>): void {
		binding.add(sdvmlApplyLabelEditHandler)
		binding.add(CompoundOperationHandler)
	}

	protected override bindGModelIndex(): BindingTarget<GModelIndex> {
		this.context.bind(sdvmlModelIndex).toSelf().inSingletonScope()
		return { service: sdvmlModelIndex }
	}
}
