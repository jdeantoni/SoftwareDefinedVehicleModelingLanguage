import {
  DiagramConfiguration,

  getDefaultMapping,
  GModelElement,
  GModelElementConstructor,
  ServerLayoutKind,
  ShapeTypeHint,
  EdgeTypeHint,
  GEdge,
  GPort,
  GNode
} from "@eclipse-glsp/server";
import { injectable } from "inversify";

@injectable()
export class sdvmlDiagramConfiguration implements DiagramConfiguration {
  layoutKind = ServerLayoutKind.AUTOMATIC;
  needsClientLayout = true;
  needsServerLayout = true;
  animatedUpdate = true;

  get typeMapping(): Map<string, GModelElementConstructor<GModelElement>> {
    const defaultMappings = getDefaultMapping();

// Layout Model types
        defaultMappings.set("edge:pushpub", GEdge);
        // mappings.put(ModelTypes.COMP_HEADER, GraphPackage.Literals.GCOMPARTMENT);
        defaultMappings.set("node:inport", GPort);
        defaultMappings.set("node:outport", GPort);

        // BPMN Types
        defaultMappings.set("node:sensorsignalnode", GNode);
        defaultMappings.set("node:actuatorsignalnode", GNode);
        defaultMappings.set("node:componentnode", GNode);
        defaultMappings.set("node:vssnode", GNode);



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
      {
        elementTypeId: 'node:outport',
        deletable: true,
        reparentable: false,
        repositionable: true,
        resizable: true,
      },
      {
        elementTypeId: 'node:vssnode',
        deletable: true,
        reparentable: false,
        repositionable: true,
        resizable: true,
      },
    ];
  }

  get edgeTypeHints(): EdgeTypeHint[] {
		return [
      {
        routable: true,
        elementTypeId: "edge:pushpub",
        repositionable: false,
        deletable: false,
        sourceElementTypeIds:["node:sensorsignalnode","node:outport"],
        targetElementTypeIds:["node:actuatorsignalnode","node:inport"]
      }
    ]
	}

  
}



