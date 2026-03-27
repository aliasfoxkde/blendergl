/**
 * BlenderGL Scripting API surface.
 *
 * This is the API object injected into user scripts as the global `blendergl`.
 * It provides access to the scene, operators, materials, selection, and utilities.
 *
 * Usage in a script:
 * ```js
 * const cube = blendergl.ops.addPrimitive("cube");
 * blendergl.ops.translate(cube.id, { x: 2, y: 0, z: 0 });
 * blendergl.data.log("Created cube at (2, 0, 0)");
 * ```
 */

import type { Vec3, Transform } from "@/editor/types";

// ---- Scene access ----

export interface ScriptEntity {
  id: string;
  name: string;
  transform: Transform;
  visible: boolean;
  locked: boolean;
}

export interface ScriptScene {
  /** Get all entities in the scene. */
  getEntities(): ScriptEntity[];
  /** Get a specific entity by ID. */
  getEntity(id: string): ScriptEntity | null;
  /** Create a new entity with default components. */
  createEntity(name: string, geometryType?: string): ScriptEntity;
  /** Delete an entity by ID. */
  deleteEntity(id: string): void;
  /** Clear all entities from the scene. */
  clear(): void;
}

// ---- Operator system ----

export interface ScriptOps {
  /** Add a primitive mesh to the scene. */
  addPrimitive(type: string, options?: { name?: string; position?: Vec3; rotation?: Vec3; scale?: Vec3 }): ScriptEntity;
  /** Translate an entity by the given offset. */
  translate(id: string, offset: Vec3): void;
  /** Set absolute position of an entity. */
  setPosition(id: string, position: Vec3): void;
  /** Rotate an entity by the given Euler angles (degrees). */
  rotate(id: string, rotation: Vec3): void;
  /** Set absolute rotation of an entity. */
  setRotation(id: string, rotation: Vec3): void;
  /** Scale an entity by the given factor. */
  scale(id: string, scale: Vec3): void;
  /** Set absolute scale of an entity. */
  setScale(id: string, scale: Vec3): void;
  /** Duplicate an entity. */
  duplicate(id: string): ScriptEntity | null;
  /** Delete an entity. */
  delete(id: string): void;
  /** Select an entity. */
  select(id: string, addToSelection?: boolean): void;
  /** Deselect all entities. */
  deselectAll(): void;
}

// ---- Data access ----

export interface ScriptMaterial {
  albedo: string;
  metallic: number;
  roughness: number;
  emissive: string;
  emissiveIntensity: number;
  opacity: number;
}

export interface ScriptData {
  /** Get material for an entity. */
  getMaterial(entityId: string): ScriptMaterial | null;
  /** Set material properties for an entity. */
  setMaterial(entityId: string, props: Partial<ScriptMaterial>): void;
  /** Get current selection (array of entity IDs). */
  getSelection(): string[];
  /** Get scene settings. */
  getSettings(): Record<string, unknown>;
  /** Set a scene setting. */
  setSetting(key: string, value: unknown): void;
}

// ---- Logging ----

export interface ScriptConsole {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  clear(): void;
}

// ---- Math utilities ----

export interface Vec3Op {
  x: number;
  y: number;
  z: number;
  add(v: Vec3): Vec3Op;
  subtract(v: Vec3): Vec3Op;
  scale(s: number): Vec3Op;
  length(): number;
  normalize(): Vec3Op;
  dot(v: Vec3): number;
  clone(): Vec3Op;
  toArray(): [number, number, number];
}

export interface MathUtils {
  Vec3: (x: number, y: number, z: number) => Vec3Op;
  degToRad(deg: number): number;
  radToDeg(rad: number): number;
  lerp(a: number, b: number, t: number): number;
  clamp(value: number, min: number, max: number): number;
  random(min?: number, max?: number): number;
}

// ---- Top-level API ----

export interface BlenderGLApi {
  scene: ScriptScene;
  ops: ScriptOps;
  data: ScriptData;
  utils: MathUtils;
  console: ScriptConsole;
  version: string;
}
