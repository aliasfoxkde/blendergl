import type {
  Entity,
  PrimitiveType,
  MeshComponent,
} from "@/editor/types";
import { generateEntityId, createDefaultTransform } from "@/editor/types";

const PRIMITIVE_COUNTERS: Record<string, number> = {};

function getNextName(type: PrimitiveType): string {
  PRIMITIVE_COUNTERS[type] = (PRIMITIVE_COUNTERS[type] || 0) + 1;
  const names: Record<PrimitiveType, string> = {
    cube: "Cube",
    sphere: "Sphere",
    plane: "Plane",
    cylinder: "Cylinder",
    cone: "Cone",
    torus: "Torus",
  };
  const count = PRIMITIVE_COUNTERS[type];
  return count > 1 ? `${names[type]}.${String(count).padStart(3, "0")}` : names[type];
}

export function createPrimitiveEntity(
  type: PrimitiveType,
  overrides: Partial<Entity> = {}
): Entity {
  const id = generateEntityId();
  const meshComponent: MeshComponent = {
    type: "mesh",
    geometryType: type,
  };

  return {
    id,
    name: getNextName(type),
    parentId: null,
    childrenIds: [],
    transform: createDefaultTransform(),
    visible: true,
    locked: false,
    components: { mesh: meshComponent },
    ...overrides,
  };
}

export const PRIMITIVE_TYPES: PrimitiveType[] = [
  "cube",
  "sphere",
  "plane",
  "cylinder",
  "cone",
  "torus",
];
