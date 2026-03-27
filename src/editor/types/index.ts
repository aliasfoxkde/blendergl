export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Transform {
  position: Vec3;
  rotation: Vec3; // Euler angles in degrees
  scale: Vec3;
}

export type ComponentType = "mesh" | "material" | "light" | "camera";

export interface Entity {
  id: string;
  name: string;
  parentId: string | null;
  childrenIds: string[];
  transform: Transform;
  visible: boolean;
  locked: boolean;
  components: Record<string, unknown>;
}

export interface MeshComponent {
  type: "mesh";
  geometryType: PrimitiveType;
  vertices?: Float32Array;
  indices?: Uint32Array;
}

export type PrimitiveType =
  | "cube"
  | "sphere"
  | "plane"
  | "cylinder"
  | "cone"
  | "torus";

export interface MaterialData {
  albedo: string; // hex color
  metallic: number;
  roughness: number;
  emissive: string;
  emissiveIntensity: number;
  opacity: number;
  alphaMode: "opaque" | "blend" | "mask";
}

export interface SceneData {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  entities: Record<string, Entity>;
  rootEntityIds: string[];
  settings: SceneSettings;
}

export interface SceneSettings {
  gridSize: number;
  gridSubdivisions: number;
  snapEnabled: boolean;
  snapIncrement: number;
  angleSnap: number;
  backgroundColor: string;
}

export type EditorMode = "object" | "edit";
export type TransformMode = "translate" | "rotate" | "scale";
export type TransformSpace = "world" | "local";
export type SelectionMode = "object" | "vertex" | "edge" | "face";
export type ShadingMode = "wireframe" | "solid" | "material" | "textured";

export interface ViewportConfig {
  showGrid: boolean;
  showAxes: boolean;
  showWireframe: boolean;
  shadingMode: ShadingMode;
  cameraPreset: CameraPreset | null;
}

export type CameraPreset =
  | "front"
  | "back"
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "perspective";

export function createDefaultTransform(): Transform {
  return {
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
  };
}

export function createDefaultMaterial(): MaterialData {
  return {
    albedo: "#888888",
    metallic: 0.0,
    roughness: 0.5,
    emissive: "#000000",
    emissiveIntensity: 0,
    opacity: 1.0,
    alphaMode: "opaque",
  };
}

export function createDefaultSceneSettings(): SceneSettings {
  return {
    gridSize: 20,
    gridSubdivisions: 20,
    snapEnabled: false,
    snapIncrement: 0.5,
    angleSnap: 15,
    backgroundColor: "#1a1a2e",
  };
}

let entityIdCounter = 0;

export function generateEntityId(): string {
  entityIdCounter++;
  return `entity_${Date.now()}_${entityIdCounter}`;
}

export function generateSceneId(): string {
  return `scene_${Date.now()}`;
}
