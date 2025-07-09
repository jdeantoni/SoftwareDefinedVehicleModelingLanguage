import { AbstractLayoutConfigurator, LayoutOptions } from '@eclipse-glsp/layout-elk';
import { GGraph, GEdge } from '@eclipse-glsp/server';
import { injectable } from 'inversify';

@injectable()
export class LayoutConfigurator extends AbstractLayoutConfigurator {
    protected override graphOptions(graph: GGraph): LayoutOptions | undefined {
        return {
            'elk.algorithm': 'layered',
            'elk.direction': 'RIGHT',
            "elk.edgeRouting": "ORTHOGONAL",
			// "elk.layered.mergeEdges": "false",
			// "elk.layered.spacing.nodeNodeBetweenLayers": "150",
			// "elk.spacing.nodeNode": "150",
			// "elk.spacing.edgeNode": "150",
			// "elk.portConstraints": "FIXED_SIDE",
            // 'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES'
        };
    }

    protected override edgeOptions(edge: GEdge): LayoutOptions | undefined {
        return {
            "elk.edgeRouting": "ORTHOGONAL",

            // 'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES'
        };
    }
}