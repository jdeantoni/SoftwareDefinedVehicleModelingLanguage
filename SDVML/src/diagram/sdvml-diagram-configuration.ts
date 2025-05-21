import {
  DiagramConfiguration,

  getDefaultMapping,
  GModelElement,
  GModelElementConstructor,
  ServerLayoutKind,
  ShapeTypeHint,
  EdgeTypeHint
} from "@eclipse-glsp/server";
import { injectable } from "inversify";

@injectable()
export class sdvmlDiagramConfiguration implements DiagramConfiguration {
  layoutKind = ServerLayoutKind.AUTOMATIC;
  needsClientLayout = true;
  animatedUpdate = true;

  get typeMapping(): Map<string, GModelElementConstructor<GModelElement>> {
    const defaultMappings = getDefaultMapping();
    return defaultMappings;
  }

  get shapeTypeHints(): ShapeTypeHint[] {
    return [
      {
        elementTypeId: 'node:sensorsignalnode',
        deletable: true,
        reparentable: false,
        repositionable: true,
        resizable: true,
      },
      {
        elementTypeId: 'node:actuatorsignalnode',
        deletable: true,
        reparentable: false,
        repositionable: true,
        resizable: true,
      },
      {
        elementTypeId: 'node:componentnode',
        deletable: true,
        reparentable: false,
        repositionable: true,
        resizable: true,
      },
      {
        elementTypeId: 'node:inport',
        deletable: true,
        reparentable: false,
        repositionable: true,
        resizable: true,
      },
    ];
  }

  get edgeTypeHints(): EdgeTypeHint[] {
		return []
	}

  
}



