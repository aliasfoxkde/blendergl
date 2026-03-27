/**
 * Game script runtime — provides the scripting API for game mode.
 * Scripts attached to entities get access to entity manipulation,
 * input, time, physics, and transform utilities.
 */

import type { Vec3 } from "@/editor/types";
import { physicsEngine } from "./physicsEngine";
import { sceneRef } from "@/editor/utils/sceneRef";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { usePhysicsStore } from "@/editor/stores/physicsStore";
import { AbstractMesh, Ray, Vector3 } from "@babylonjs/core";

interface InputState {
  keysDown: Set<string>;
  keysPressed: Set<string>;
  mousePosition: { x: number; y: number };
  mouseDelta: { x: number; y: number };
  mouseButtons: { left: boolean; right: boolean; middle: boolean };
}

class GameScriptRuntime {
  private scriptContexts: Map<string, {
    onInit?: () => void;
    onUpdate?: (dt: number) => void;
    onDestroy?: () => void;
  }> = new Map();
  private inputState: InputState = {
    keysDown: new Set(),
    keysPressed: new Set(),
    mousePosition: { x: 0, y: 0 },
    mouseDelta: { x: 0, y: 0 },
    mouseButtons: { left: false, right: false, middle: false },
  };
  private startTime: number = 0;
  private entityIdMap: Map<string, AbstractMesh> = new Map();

  init(): void {
    this.entityIdMap.clear();
    this.scriptContexts.clear();
    this.startTime = performance.now() / 1000;
    this.inputState.keysDown.clear();
    this.inputState.keysPressed.clear();

    const scene = sceneRef.current;
    if (!scene) return;

    // Build entity ID → mesh map
    for (const mesh of scene.meshes) {
      if (mesh instanceof AbstractMesh && mesh.metadata?.entityId) {
        this.entityIdMap.set(mesh.metadata.entityId as string, mesh);
      }
    }
  }

  registerScript(entityId: string, source: string): void {
    try {
      const ctx = this.createScriptContext(entityId, source);
      this.scriptContexts.set(entityId, ctx);
      ctx.onInit?.();
    } catch (err) {
      console.warn(`Game script init error [${entityId}]:`, err);
    }
  }

  update(dt: number): void {
    // Clear per-frame input
    this.inputState.keysPressed.clear();
    this.inputState.mouseDelta = { x: 0, y: 0 };

    for (const [entityId, ctx] of this.scriptContexts) {
      try {
        ctx.onUpdate?.(dt);
      } catch (err) {
        console.warn(`Game script update error [${entityId}]:`, err);
      }
    }
  }

  destroy(): void {
    for (const [, ctx] of this.scriptContexts) {
      try {
        ctx.onDestroy?.();
      } catch {
        // ignore cleanup errors
      }
    }
    this.scriptContexts.clear();
    this.entityIdMap.clear();
  }

  handleKeyDown(key: string): void {
    if (this.inputState.keysDown.has(key)) return;
    this.inputState.keysDown.add(key);
    this.inputState.keysPressed.add(key);
  }

  handleKeyUp(key: string): void {
    this.inputState.keysDown.delete(key);
  }

  handleMouseMove(x: number, y: number): void {
    this.inputState.mouseDelta.x = x - this.inputState.mousePosition.x;
    this.inputState.mouseDelta.y = y - this.inputState.mousePosition.y;
    this.inputState.mousePosition = { x, y };
  }

  handleMouseDown(button: "left" | "right" | "middle"): void {
    this.inputState.mouseButtons[button] = true;
  }

  handleMouseUp(button: "left" | "right" | "middle"): void {
    this.inputState.mouseButtons[button] = false;
  }

  isKeyDown(key: string): boolean {
    return this.inputState.keysDown.has(key);
  }

  isKeyPressed(key: string): boolean {
    return this.inputState.keysPressed.has(key);
  }

  getTime(): number {
    return performance.now() / 1000 - this.startTime;
  }

  private createScriptContext(entityId: string, source: string) {
    const self = this;
    const entities = useSceneStore.getState().entities;
    const entity = entities[entityId];

    // Build API object
    const api = {
      // Input
      input: {
        isKeyDown: (key: string) => self.isKeyDown(key),
        isKeyPressed: (key: string) => self.isKeyPressed(key),
        getMousePosition: () => ({ ...self.inputState.mousePosition }),
        getMouseDelta: () => ({ ...self.inputState.mouseDelta }),
        isMouseButton: (btn: "left" | "right" | "middle") => self.inputState.mouseButtons[btn],
      },

      // Time
      time: {
        get deltaTime() { return 0; }, // set by update
        get elapsed() { return self.getTime(); },
        get fixedDeltaTime() { return usePhysicsStore.getState().gameSettings.fixedTimeStep; },
      },

      // Entity API
      entity: {
        getId: () => entityId,
        getName: () => entity?.name ?? "",
        getPosition: (): Vec3 | null => {
          const e = useSceneStore.getState().entities[entityId];
          return e ? { ...e.transform.position } : null;
        },
        setPosition: (pos: Vec3) => {
          useSceneStore.getState().updateEntityTransform(entityId, { position: { ...pos } });
        },
        getRotation: (): Vec3 | null => {
          const e = useSceneStore.getState().entities[entityId];
          return e ? { ...e.transform.rotation } : null;
        },
        setRotation: (rot: Vec3) => {
          useSceneStore.getState().updateEntityTransform(entityId, { rotation: { ...rot } });
        },
        getScale: (): Vec3 | null => {
          const e = useSceneStore.getState().entities[entityId];
          return e ? { ...e.transform.scale } : null;
        },
        setScale: (scale: Vec3) => {
          useSceneStore.getState().updateEntityTransform(entityId, { scale: { ...scale } });
        },
        translate: (offset: Vec3) => {
          const e = useSceneStore.getState().entities[entityId];
          if (!e) return;
          useSceneStore.getState().updateEntityTransform(entityId, {
            position: {
              x: e.transform.position.x + offset.x,
              y: e.transform.position.y + offset.y,
              z: e.transform.position.z + offset.z,
            },
          });
        },
      },

      // Transform math
      transform: {
        forward: (): Vec3 => ({ x: 0, y: 0, z: -1 }),
        right: (): Vec3 => ({ x: 1, y: 0, z: 0 }),
        up: (): Vec3 => ({ x: 0, y: 1, z: 0 }),
      },

      // Physics
      physics: {
        setVelocity: (vel: Vec3) => physicsEngine.setVelocity(entityId, vel),
        getVelocity: () => physicsEngine.getVelocity(entityId),
        applyForce: (force: Vec3) => physicsEngine.applyForce(entityId, force),
        applyImpulse: (impulse: Vec3) => physicsEngine.applyImpulse(entityId, impulse),
        isGrounded: () => physicsEngine.isGrounded(entityId),
        onCollision: (callback: (otherId: string) => void) => {
          physicsEngine.onCollision(entityId, callback);
        },
        raycast: (from: Vec3, to: Vec3): string | null => {
          const scene = sceneRef.current;
          if (!scene) return null;
          const origin = new Vector3(from.x, from.y, from.z);
          const dir = new Vector3(to.x - from.x, to.y - from.y, to.z - from.z);
          dir.normalize();
          const length = dir.length();
          const ray = new Ray(origin, dir, length);
          for (const mesh of scene.meshes) {
            if (!(mesh instanceof AbstractMesh)) continue;
            if (mesh.metadata?.entityId === entityId) continue;
            const pick = scene.pickWithRay(ray as any, (m: any) => m === mesh);
            if (pick?.hit) {
              return mesh.metadata?.entityId as string ?? null;
            }
          }
          return null;
        },
      },

      // Logging
      log: (...args: unknown[]) => console.log(`[Game:${entityId}]`, ...args),
      warn: (...args: unknown[]) => console.warn(`[Game:${entityId}]`, ...args),
    };

    // Create script functions from source
    const wrapped = new Function(
      "api",
      `
      "use strict";
      let onInit, onUpdate, onDestroy;
      const __scope = {
        get input() { return api.input; },
        get time() { return api.time; },
        get entity() { return api.entity; },
        get transform() { return api.transform; },
        get physics() { return api.physics; },
        log: api.log,
        warn: api.warn,
      };
      ${source}
      return { onInit, onUpdate, onDestroy };
      `
    );

    return wrapped(api) as {
      onInit?: () => void;
      onUpdate?: (dt: number) => void;
      onDestroy?: () => void;
    };
  }
}

// Singleton
export const gameScriptRuntime = new GameScriptRuntime();
