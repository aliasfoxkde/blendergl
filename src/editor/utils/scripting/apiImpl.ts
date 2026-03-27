/**
 * BlenderGL scripting API implementation.
 *
 * Bridges the `blendergl` API surface to the actual Zustand stores.
 * Each method reads/writes state through store.getState() / store.setState().
 */

import { useSceneStore } from "@/editor/stores/sceneStore";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { useMaterialStore } from "@/editor/stores/materialStore";
import { useSettingsStore } from "@/editor/stores/settingsStore";
import { useAnimationStore } from "@/editor/stores/animationStore";
import { useArmatureStore } from "@/editor/stores/armatureStore";
import { useSculptModeStore } from "@/editor/stores/sculptModeStore";
import { sculptControllerRef } from "@/editor/utils/sculptControllerRef";
import { createPrimitiveEntity } from "@/editor/utils/primitives";
import type { AnimProperty, SculptBrushType } from "@/editor/types";
import type {
  BlenderGLApi,
  ScriptEntity,
  ScriptScene,
  ScriptOps,
  ScriptData,
  ScriptConsole,
  ScriptMaterial,
  ScriptAnimation,
  ScriptArmature,
  ScriptSculpt,
  MathUtils,
  Vec3Op,
} from "./api";

// ---- Vec3 helper ----

class Vec3Impl implements Vec3Op {
  x: number;
  y: number;
  z: number;

  constructor(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  add(v: { x: number; y: number; z: number }): Vec3Impl {
    return new Vec3Impl(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  subtract(v: { x: number; y: number; z: number }): Vec3Impl {
    return new Vec3Impl(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  scale(s: number): Vec3Impl {
    return new Vec3Impl(this.x * s, this.y * s, this.z * s);
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize(): Vec3Impl {
    const len = this.length();
    if (len === 0) return new Vec3Impl(0, 0, 0);
    return new Vec3Impl(this.x / len, this.y / len, this.z / len);
  }

  dot(v: { x: number; y: number; z: number }): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  clone(): Vec3Impl {
    return new Vec3Impl(this.x, this.y, this.z);
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }
}

// ---- Math utilities ----

const mathUtils: MathUtils = {
  Vec3: (x: number, y: number, z: number) => new Vec3Impl(x, y, z),
  degToRad: (deg: number) => (deg * Math.PI) / 180,
  radToDeg: (rad: number) => (rad * 180) / Math.PI,
  lerp: (a: number, b: number, t: number) => a + (b - a) * t,
  clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
  random: (min = 0, max = 1) => min + Math.random() * (max - min),
};

// ---- Console ----

function createConsole(): ScriptConsole {
  return {
    log: (...args: unknown[]) => {
      console.log("[BGL Script]", ...args);
      window.dispatchEvent(new CustomEvent("script-console", {
        detail: { level: "log", args: args.map(String) },
      }));
    },
    warn: (...args: unknown[]) => {
      console.warn("[BGL Script]", ...args);
      window.dispatchEvent(new CustomEvent("script-console", {
        detail: { level: "warn", args: args.map(String) },
      }));
    },
    error: (...args: unknown[]) => {
      console.error("[BGL Script]", ...args);
      window.dispatchEvent(new CustomEvent("script-console", {
        detail: { level: "error", args: args.map(String) },
      }));
    },
    clear: () => {
      window.dispatchEvent(new CustomEvent("script-console-clear", {}));
    },
  };
}

// ---- Helpers ----

function entityToScript(e: { id: string; name: string; transform: { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number }; scale: { x: number; y: number; z: number } }; visible: boolean; locked: boolean }): ScriptEntity {
  return {
    id: e.id,
    name: e.name,
    transform: { ...e.transform },
    visible: e.visible,
    locked: e.locked,
  };
}

// ---- Scene implementation ----

function createSceneApi(): ScriptScene {
  return {
    getEntities(): ScriptEntity[] {
      return Object.values(useSceneStore.getState().entities).map(entityToScript);
    },
    getEntity(id: string): ScriptEntity | null {
      const entity = useSceneStore.getState().entities[id];
      if (!entity) return null;
      return entityToScript(entity);
    },
    createEntity(name: string, geometryType = "cube"): ScriptEntity {
      const { addEntity } = useSceneStore.getState();
      const entity = createPrimitiveEntity(geometryType as "cube", { name });
      addEntity(entity);
      return entityToScript(entity);
    },
    deleteEntity(id: string): void {
      useSceneStore.getState().removeEntity(id);
    },
    clear(): void {
      const ids = Object.keys(useSceneStore.getState().entities);
      const { removeEntity } = useSceneStore.getState();
      for (const id of ids) {
        removeEntity(id);
      }
    },
  };
}

// ---- Ops implementation ----

function createOpsApi(): ScriptOps {
  return {
    addPrimitive(type, options): ScriptEntity {
      const { addEntity, updateEntityTransform } = useSceneStore.getState();
      const name = options?.name ?? `${type}_${Date.now()}`;
      const entity = createPrimitiveEntity(type as "cube", { name });
      addEntity(entity);

      if (options?.position) {
        updateEntityTransform(entity.id, { position: options.position });
      }
      if (options?.rotation) {
        updateEntityTransform(entity.id, { rotation: options.rotation });
      }
      if (options?.scale) {
        updateEntityTransform(entity.id, { scale: options.scale });
      }

      const stored = useSceneStore.getState().entities[entity.id];
      return entityToScript(stored);
    },
    translate(id, offset): void {
      const entity = useSceneStore.getState().entities[id];
      if (!entity) return;
      const { updateEntityTransform } = useSceneStore.getState();
      updateEntityTransform(id, {
        position: {
          x: entity.transform.position.x + offset.x,
          y: entity.transform.position.y + offset.y,
          z: entity.transform.position.z + offset.z,
        },
      });
    },
    setPosition(id, position): void {
      useSceneStore.getState().updateEntityTransform(id, { position });
    },
    rotate(id, rotation): void {
      const entity = useSceneStore.getState().entities[id];
      if (!entity) return;
      const { updateEntityTransform } = useSceneStore.getState();
      updateEntityTransform(id, {
        rotation: {
          x: entity.transform.rotation.x + rotation.x,
          y: entity.transform.rotation.y + rotation.y,
          z: entity.transform.rotation.z + rotation.z,
        },
      });
    },
    setRotation(id, rotation): void {
      useSceneStore.getState().updateEntityTransform(id, { rotation });
    },
    scale(id, scaleFactor): void {
      const entity = useSceneStore.getState().entities[id];
      if (!entity) return;
      const { updateEntityTransform } = useSceneStore.getState();
      updateEntityTransform(id, {
        scale: {
          x: entity.transform.scale.x * scaleFactor.x,
          y: entity.transform.scale.y * scaleFactor.y,
          z: entity.transform.scale.z * scaleFactor.z,
        },
      });
    },
    setScale(id, scaleFactor): void {
      useSceneStore.getState().updateEntityTransform(id, { scale: scaleFactor });
    },
    duplicate(id): ScriptEntity | null {
      const entity = useSceneStore.getState().entities[id];
      if (!entity) return null;
      const { addEntity, updateEntityTransform } = useSceneStore.getState();
      const newEntity = createPrimitiveEntity(
        (entity.components.mesh as { geometryType?: string })?.geometryType as "cube" ?? "cube",
        { name: `${entity.name}_copy` }
      );
      addEntity(newEntity);
      updateEntityTransform(newEntity.id, {
        position: {
          x: entity.transform.position.x + 1,
          y: entity.transform.position.y,
          z: entity.transform.position.z,
        },
      });
      const stored = useSceneStore.getState().entities[newEntity.id];
      return entityToScript(stored);
    },
    delete(id): void {
      useSceneStore.getState().removeEntity(id);
    },
    select(id, addToSelection = false): void {
      const { select } = useSelectionStore.getState();
      select(id, addToSelection);
    },
    deselectAll(): void {
      useSelectionStore.getState().deselectAll();
    },
  };
}

// ---- Data implementation ----

function createDataApi(): ScriptData {
  return {
    getMaterial(entityId: string): ScriptMaterial | null {
      const mat = useMaterialStore.getState().materials[entityId];
      if (!mat) return null;
      return { ...mat };
    },
    setMaterial(entityId: string, props: Partial<ScriptMaterial>): void {
      const { updateMaterial } = useMaterialStore.getState();
      updateMaterial(entityId, props);
    },
    getSelection(): string[] {
      return [...useSelectionStore.getState().selectedIds];
    },
    getSettings(): Record<string, unknown> {
      const settings = useSettingsStore.getState();
      const sceneSettings = useSceneStore.getState().scene.settings;
      return {
        gridSize: sceneSettings.gridSize,
        snapIncrement: settings.snapIncrement,
        angleSnap: settings.angleSnap,
        shadingMode: settings.shadingMode,
      };
    },
    setSetting(key: string, value: unknown): void {
      if (key === "gridSize") {
        useSceneStore.getState().updateSettings({ gridSize: value as number });
      }
    },
  };
}

// ---- Animation implementation ----

function createAnimationApi(): ScriptAnimation {
  return {
    createClip(name: string): string {
      return useAnimationStore.getState().createClip(name);
    },
    deleteClip(clipId: string): void {
      useAnimationStore.getState().deleteClip(clipId);
    },
    setActiveClip(clipId: string | null): void {
      useAnimationStore.getState().setActiveClip(clipId);
    },
    getActiveClipId(): string | null {
      return useAnimationStore.getState().activeClipId;
    },
    getClipIds(): string[] {
      return Object.keys(useAnimationStore.getState().clips);
    },
    addKey(clipId: string, boneId: string, property: string, frame: number, value: number): void {
      useAnimationStore.getState().addKey(clipId, boneId, property as AnimProperty, frame, value);
    },
    removeKey(clipId: string, trackId: string, keyIndex: number): void {
      useAnimationStore.getState().removeKey(clipId, trackId, keyIndex);
    },
    getCurrentFrame(): number {
      return useAnimationStore.getState().currentFrame;
    },
    setCurrentFrame(frame: number): void {
      useAnimationStore.getState().setCurrentFrame(frame);
    },
    play(): void {
      useAnimationStore.getState().setPlaybackState("playing");
    },
    pause(): void {
      useAnimationStore.getState().setPlaybackState("paused");
    },
    stop(): void {
      useAnimationStore.getState().setPlaybackState("stopped");
      useAnimationStore.getState().setCurrentFrame(0);
    },
    setPlaybackState(state: "stopped" | "playing" | "paused"): void {
      useAnimationStore.getState().setPlaybackState(state);
    },
  };
}

// ---- Armature implementation ----

function createArmatureApi(): ScriptArmature {
  return {
    addArmature(entityId: string): void {
      useArmatureStore.getState().addArmature(entityId);
    },
    removeArmature(entityId: string): void {
      useArmatureStore.getState().removeArmature(entityId);
    },
    hasArmature(entityId: string): boolean {
      return !!useArmatureStore.getState().armatures[entityId];
    },
    getBones(entityId: string) {
      const arm = useArmatureStore.getState().armatures[entityId];
      if (!arm) return [];
      return Object.values(arm.bones).map((b) => ({
        id: b.id,
        name: b.name,
        parentId: b.parentId,
        length: b.length,
        restPosition: { ...b.restPosition },
        restRotation: { ...b.restRotation },
        restScale: { ...b.restScale },
      }));
    },
    addBone(entityId: string, name: string, parentId: string | null, position) {
      const arm = useArmatureStore.getState().armatures[entityId];
      if (!arm) return null;
      const boneId = crypto.randomUUID();
      const boneData = {
        id: boneId,
        name,
        parentId,
        length: 1,
        restPosition: { x: position.x, y: position.y, z: position.z },
        restRotation: { x: 0, y: 0, z: 0 },
        restScale: { x: 1, y: 1, z: 1 },
      };
      useArmatureStore.getState().addBone(entityId, boneData);
      return boneData;
    },
    removeBone(entityId: string, boneId: string): void {
      useArmatureStore.getState().removeBone(entityId, boneId);
    },
    setBoneTransform(boneId: string, position?, rotation?): void {
      // Find which entity owns this bone and update
      const state = useArmatureStore.getState();
      for (const [entityId, arm] of Object.entries(state.armatures)) {
        const bone = arm.bones[boneId];
        if (bone) {
          const updates: Record<string, unknown> = {};
          if (position) {
            updates.restPosition = { x: position.x, y: position.y, z: position.z };
          }
          if (rotation) {
            updates.restRotation = { x: rotation.x, y: rotation.y, z: rotation.z };
          }
          useArmatureStore.getState().updateBone(entityId, boneId, updates);
          return;
        }
      }
    },
  };
}

// ---- Sculpt implementation ----

function createSculptApi(): ScriptSculpt {
  return {
    setBrush(type: string, radius?: number, strength?: number): void {
      const store = useSculptModeStore.getState();
      store.setBrushType(type as SculptBrushType);
      if (radius !== undefined) store.setBrushRadius(radius);
      if (strength !== undefined) store.setBrushStrength(strength);
    },
    getBrush(): { type: string; radius: number; strength: number; falloff: string } {
      const brush = useSculptModeStore.getState().brush;
      return {
        type: brush.type,
        radius: brush.radius,
        strength: brush.strength,
        falloff: brush.falloff,
      };
    },
    setSymmetry(x: boolean, y: boolean, z: boolean): void {
      const store = useSculptModeStore.getState();
      if (store.symmetry.x !== x) store.toggleSymmetryX();
      if (store.symmetry.y !== y) store.toggleSymmetryY();
      if (store.symmetry.z !== z) store.toggleSymmetryZ();
    },
    sculptAt(x: number, y: number, z: number, brushType?: string, radius?: number, strength?: number): void {
      const controller = sculptControllerRef.current;
      if (!controller) return;
      const store = useSculptModeStore.getState();
      const type = (brushType ?? store.brush.type) as SculptBrushType;
      const r = radius ?? store.brush.radius;
      const s = strength ?? store.brush.strength;
      // Minimal pick result — SculptController only reads .pickedPoint
      const pickInfo = { pickedPoint: { x, y, z } } as unknown as import("@babylonjs/core").PickingInfo;
      controller.beginStroke(pickInfo, null as unknown as import("@babylonjs/core").Camera, type);
      controller.continueStroke(pickInfo, type, r, s, store.brush.falloff, store.brush.spacing, store.symmetry, 1.0);
      controller.endStroke();
    },
  };
}

// ---- Build the full API ----

export function createBlenderGLApi(): BlenderGLApi {
  return {
    scene: createSceneApi(),
    ops: createOpsApi(),
    data: createDataApi(),
    utils: mathUtils,
    animation: createAnimationApi(),
    armature: createArmatureApi(),
    sculpt: createSculptApi(),
    console: createConsole(),
    version: "0.1.0",
  };
}
