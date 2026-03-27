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
  diffuseTexture?: string; // base64 data URL

  // Advanced PBR
  clearcoatEnabled?: boolean;
  clearcoatIntensity?: number;
  clearcoatRoughness?: number;
  sheenEnabled?: boolean;
  sheenIntensity?: number;
  sheenColor?: string;
  sssEnabled?: boolean;
  sssColor?: string;
  sssRadius?: number;
  sssIntensity?: number;
  anisotropicEnabled?: boolean;
  anisotropy?: number;
  ior?: number;
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

export type EditorMode = "object" | "edit" | "pose" | "sculpt" | "weight_paint" | "texture_paint";
export type TransformMode = "translate" | "rotate" | "scale";
export type TransformSpace = "world" | "local";
export type SelectionMode = "object" | "vertex" | "edge" | "face";
export type ShadingMode = "wireframe" | "solid" | "material" | "textured" | "xray";

export type AiProvider = "anthropic" | "openai";

export interface AiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface AiConfig {
  enabled: boolean;
  provider: AiProvider;
  apiKey: string;
  endpoint: string;
  model: string;
}

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

// ---- Armature / Skeleton ----

export interface BoneData {
  id: string;
  name: string;
  parentId: string | null;
  length: number;
  restPosition: Vec3;
  restRotation: Vec3;
  restScale: Vec3;
}

export interface ArmatureComponent {
  type: "armature";
  bones: Record<string, BoneData>;
  rootBoneIds: string[];
}

// ---- Animation ----

export interface BoneTransform {
  position: Vec3;
  rotation: Vec3;
  scale: Vec3;
}

export type AnimProperty =
  | "position.x"
  | "position.y"
  | "position.z"
  | "rotation.x"
  | "rotation.y"
  | "rotation.z"
  | "scale.x"
  | "scale.y"
  | "scale.z";

export type InterpolationType = "linear" | "step" | "bezier";

export interface AnimationKeyData {
  frame: number;
  value: number;
  interpolation: InterpolationType;
  inTangent?: number;
  outTangent?: number;
}

export interface AnimationTrack {
  id: string;
  boneId: string;
  property: AnimProperty;
  keys: AnimationKeyData[];
}

export interface AnimationClip {
  id: string;
  name: string;
  framesPerSecond: number;
  durationFrames: number;
  tracks: AnimationTrack[];
}

export type PlaybackState = "stopped" | "playing" | "paused";

// ---- Sculpting ----

export type SculptBrushType =
  | "sculpt"
  | "smooth"
  | "grab"
  | "inflate"
  | "pinch"
  | "flatten"
  | "crease"
  | "clay_strips"
  | "mask";

export type FalloffType = "smooth" | "sharp" | "spike";

export interface SculptBrushSettings {
  type: SculptBrushType;
  radius: number;
  strength: number;
  falloff: FalloffType;
  spacing: number;
  usePressure: boolean;
}

export interface SculptSymmetry {
  x: boolean;
  y: boolean;
  z: boolean;
}

export type {
  PortDataType,
  PortDefinition,
  NodeTypeDefinition,
  GraphNode,
  GraphConnection,
  NodeGraphType,
  GraphData,
} from "./nodeEditor";
export { PORT_COLORS, CATEGORY_COLORS } from "./nodeEditor";

// ---- Physics ----

export type ColliderShape = "box" | "sphere" | "cylinder" | "capsule" | "convex_hull" | "mesh";
export type BodyMotionType = "static" | "dynamic" | "kinematic";

export interface PhysicsBodyData {
  enabled: boolean;
  motionType: BodyMotionType;
  mass: number;
  friction: number;
  restitution: number;
  linearDamping: number;
  angularDamping: number;
  colliderShape: ColliderShape;
  isTrigger: boolean;
  collisionLayer: number;
  collisionMask: number;
}

export function createDefaultPhysicsBody(): PhysicsBodyData {
  return {
    enabled: false,
    motionType: "dynamic",
    mass: 1.0,
    friction: 0.5,
    restitution: 0.0,
    linearDamping: 0.0,
    angularDamping: 0.05,
    colliderShape: "box",
    isTrigger: false,
    collisionLayer: 1,
    collisionMask: 1,
  };
}

// ---- Game Scripting ----

export interface GameScriptData {
  id: string;
  name: string;
  source: string; // JavaScript source code
  enabled: boolean;
}

// ---- Game State Machine ----

export interface StateMachineState {
  id: string;
  name: string;
  onEnter?: string; // script code
  onUpdate?: string; // script code
  onExit?: string; // script code
}

export interface StateMachineTransition {
  id: string;
  fromStateId: string;
  toStateId: string;
  condition: string; // JavaScript expression returning boolean
}

export interface StateMachineData {
  id: string;
  initialStateId: string;
  states: Record<string, StateMachineState>;
  transitions: StateMachineTransition[];
  parameters: Record<string, number | string | boolean>;
}

// ---- Game Settings ----

export interface GameSettings {
  gravity: Vec3;
  fixedTimeStep: number;
  maxSubSteps: number;
}

export function createDefaultGameSettings(): GameSettings {
  return {
    gravity: { x: 0, y: -9.81, z: 0 },
    fixedTimeStep: 1 / 60,
    maxSubSteps: 4,
  };
}

// ---- Play Mode ----

export type PlayModeState = "stopped" | "playing" | "paused";

// ---- UV Mapping ----

export type UvProjectionType = "smart" | "cube" | "cylinder" | "sphere" | "camera";
export type UvEditMode = "vertex" | "edge" | "face" | "island";

export interface UvIsland {
  index: number;
  faceIndices: number[];
  vertexIndices: number[];
}

export interface UvSettings {
  projectionType: UvProjectionType;
  showGrid: boolean;
  gridSize: number;
  snapToGrid: boolean;
  snapSize: number;
  checkerSize: number;
  packMargin: number;
  packSize: number;
}

export function createDefaultUvSettings(): UvSettings {
  return {
    projectionType: "smart",
    showGrid: true,
    gridSize: 10,
    snapToGrid: false,
    snapSize: 0.01,
    checkerSize: 8,
    packMargin: 0.05,
    packSize: 1024,
  };
}

// ---- Bone Constraints ----

export type ConstraintType = "ik" | "look_at" | "parent" | "track_to" | "limit";

export interface BoneConstraint {
  id: string;
  type: ConstraintType;
  boneId: string;
  enabled: boolean;
  influence: number; // 0-1
  targetBoneId: string | null;
  targetPosition: Vec3 | null;
  settings: Record<string, number | string | boolean>;
}

// ---- Weight Paint ----

export type WeightPaintMode = "paint" | "blur" | "multiply" | "lighten" | "darken";

export interface WeightPaintSettings {
  mode: WeightPaintMode;
  brushRadius: number;
  brushStrength: number;
  brushFalloff: "smooth" | "sharp" | "spike";
  activeBoneId: string | null;
  normalizeWeights: boolean;
  mirrorX: boolean;
}

// ---- Skinned Mesh ----

export interface SkinWeights {
  boneWeights: Record<string, Float32Array>; // boneId -> per-vertex weights
}

// ---- Animation Blending ----

export interface AnimationBlendState {
  clipA: string;
  clipB: string;
  factor: number; // 0 = clipA, 1 = clipB
  looping: boolean;
}
