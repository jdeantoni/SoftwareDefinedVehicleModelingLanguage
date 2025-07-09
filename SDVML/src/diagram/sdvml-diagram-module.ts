import {
	ActionHandlerConstructor,
	BindingTarget,
	CompoundOperationHandler,
	DiagramConfiguration,
	DiagramModule,
	GModelFactory,
	GModelIndex,
	InstanceMultiBinding,
	// LayoutEngine,
	ModelState,
	OperationHandlerConstructor,
} from '@eclipse-glsp/server/node.js'
import { injectable, interfaces } from 'inversify'
import { sdvmlDiagramConfiguration } from './sdvml-diagram-configuration.js'
import { SDVMLModelState } from './model/sdvml-model-state.js'
import { sdvmlModelStorage } from './model/sdvml-model-storage.js'
import { sdvmlGModelFactory } from './model/sdvml-gmodel-factory.js'
import { sdvmlModelIndex } from './model/sdvml-diagram-model-index.js'
import { sdvmlApplyLabelEditHandler } from './handler/sdvml-apply-label-edit-handler.js'
import { NodeChangeBoundsHandler } from './handler/sdvml-change-bounds-handlers.js'
// import { ElkFactory, GlspElkLayoutEngine, LayoutConfigurator } from '@eclipse-glsp/layout-elk'


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

 	// protected override bindLayoutEngine(): BindingTarget<LayoutEngine> | undefined {
        
	// 	return new GlspElkLayoutEngine(new ElkFactory(), undefined,new LayoutConfigurator(),ModelState);
    // }

	protected override configureActionHandlers(binding: InstanceMultiBinding<ActionHandlerConstructor>): void {
		super.configureActionHandlers(binding)
	}

	protected override configureOperationHandlers(binding: InstanceMultiBinding<OperationHandlerConstructor>): void {
		binding.add(sdvmlApplyLabelEditHandler)
		binding.add(CompoundOperationHandler)
		binding.add(NodeChangeBoundsHandler)
	}

	protected override bindGModelIndex(): BindingTarget<GModelIndex> {
		this.context.bind(sdvmlModelIndex).toSelf().inSingletonScope()
		return { service: sdvmlModelIndex }
	}

	protected override configure(bind: interfaces.Bind, unbind: interfaces.Unbind, isBound: interfaces.IsBound, rebind: interfaces.Rebind): void {
    	super.configure(bind,unbind,isBound,rebind);

		// Register the class with the container
		// bind(GlspElkLayoutEngine).toSelf().inSingletonScope();
	}


}
