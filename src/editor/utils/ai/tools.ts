import { useSceneStore } from "@/editor/stores/sceneStore";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { createPrimitiveEntity } from "@/editor/utils/primitives";
import { useMaterialStore } from "@/editor/stores/materialStore";
import type { PrimitiveType, MaterialData } from "@/editor/types";

interface ToolResult {
  success: boolean;
  message: string;
}

const ACTION_PATTERN = /\[action:\s*(\w+)\s*([^\]]*)\]/g;

export interface ParsedAction {
  type: string;
  params: Record<string, string>;
}

export function parseActions(text: string): ParsedAction[] {
  const actions: ParsedAction[] = [];
  let match: RegExpExecArray | null;

  while ((match = ACTION_PATTERN.exec(text)) !== null) {
    const type = match[1];
    const paramsStr = match[2];
    const params: Record<string, string> = {};

    for (const pair of paramsStr.split(/\s+/)) {
      const eqIndex = pair.indexOf("=");
      if (eqIndex > 0) {
        params[pair.slice(0, eqIndex).toLowerCase()] = pair.slice(eqIndex + 1);
      }
    }

    actions.push({ type, params });
  }

  return actions;
}

export function executeAction(action: ParsedAction): ToolResult {
  switch (action.type) {
    case "generate_object":
      return executeGenerateObject(action.params);
    case "set_material":
      return executeSetMaterial(action.params);
    case "analyze_scene":
      return executeAnalyzeScene();
    case "arrange_objects":
      return executeArrangeObjects();
    default:
      return { success: false, message: `Unknown action: ${action.type}` };
  }
}

function executeGenerateObject(params: Record<string, string>): ToolResult {
  const type = (params.type || "cube") as PrimitiveType;
  const validTypes: PrimitiveType[] = ["cube", "sphere", "plane", "cylinder", "cone", "torus"];

  if (!validTypes.includes(type)) {
    return { success: false, message: `Invalid object type: ${type}. Valid: ${validTypes.join(", ")}` };
  }

  const entity = createPrimitiveEntity(type);
  const sceneStore = useSceneStore.getState();
  sceneStore.addEntity(entity);

  // Select the new entity
  const selectionStore = useSelectionStore.getState();
  selectionStore.deselectAll();
  selectionStore.select(entity.id, false);

  return { success: true, message: `Created ${type} "${entity.name}"` };
}

function executeSetMaterial(params: Record<string, string>): ToolResult {
  const selectionStore = useSelectionStore.getState();
  const materialStore = useMaterialStore.getState();
  const activeId = selectionStore.activeEntityId;

  if (!activeId) {
    return { success: false, message: "No entity selected. Select an object first." };
  }

  const current = materialStore.materials[activeId] || {
    albedo: "#888888",
    metallic: 0,
    roughness: 0.5,
    emissive: "#000000",
    emissiveIntensity: 0,
    opacity: 1,
    alphaMode: "opaque" as const,
  };

  const updated: MaterialData = {
    ...current,
    albedo: params.albedo || current.albedo,
    metallic: params.metallic !== undefined ? parseFloat(params.metallic) : current.metallic,
    roughness: params.roughness !== undefined ? parseFloat(params.roughness) : current.roughness,
    emissive: params.emissive || current.emissive,
    opacity: params.opacity !== undefined ? parseFloat(params.opacity) : current.opacity,
  };

  // Clamp values
  updated.metallic = Math.max(0, Math.min(1, updated.metallic));
  updated.roughness = Math.max(0, Math.min(1, updated.roughness));
  updated.opacity = Math.max(0, Math.min(1, updated.opacity));

  materialStore.updateMaterial(activeId, updated);

  return { success: true, message: `Applied material to ${activeId}` };
}

function executeAnalyzeScene(): ToolResult {
  const sceneStore = useSceneStore.getState();
  const entities = Object.values(sceneStore.entities);
  const materialStore = useMaterialStore.getState();

  const count = entities.length;
  const visible = entities.filter((e) => e.visible).length;
  const materials = Object.keys(materialStore.materials).length;

  return {
    success: true,
    message: `Scene analysis: ${count} object${count !== 1 ? "s" : ""} (${visible} visible), ${materials} material${materials !== 1 ? "s" : ""}.`,
  };
}

function executeArrangeObjects(): ToolResult {
  const sceneStore = useSceneStore.getState();
  const entities = Object.values(sceneStore.entities);
  const cols = Math.ceil(Math.sqrt(entities.length));
  const spacing = 2;

  entities.forEach((entity, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    sceneStore.updateEntityTransform(entity.id, {
      position: {
        x: col * spacing - (cols * spacing) / 2 + spacing / 2,
        y: 0,
        z: row * spacing - (cols * spacing) / 2 + spacing / 2,
      },
    });
  });

  return { success: true, message: `Arranged ${entities.length} object${entities.length !== 1 ? "s" : ""} in grid.` };
}
