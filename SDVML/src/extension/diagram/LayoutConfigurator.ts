import { AbstractLayoutConfigurator, LayoutOptions } from '@eclipse-glsp/layout-elk';
import { GGraph } from '@eclipse-glsp/server';
import { injectable } from 'inversify';

@injectable()
export class LayoutConfigurator extends AbstractLayoutConfigurator {
    protected override graphOptions(graph: GGraph): LayoutOptions | undefined {
        return {
            'elk.algorithm': 'layered',
            'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES'
        };
    }
}