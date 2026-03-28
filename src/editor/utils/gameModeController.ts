/**
 * GameModeController — orchestrates play mode.
 * Saves/restores entity state, runs physics + scripts in the game loop.
 */

import { sceneRef } from "@/editor/utils/sceneRef";
import { physicsEngine } from "./physicsEngine";
import { gameScriptRuntime } from "./gameScriptRuntime";
import { stateMachineRuntime } from "./stateMachineRuntime";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { usePhysicsStore } from "@/editor/stores/physicsStore";
import { AbstractMesh } from "@babylonjs/core";
import type { Transform } from "@/editor/types";

interface SavedEntityState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
}

class GameModeController {
  private savedStates: Map<string, SavedEntityState> = new Map();
  private isPlaying: boolean = false;
  private animFrameId: number = 0;
  private lastTime: number = 0;

  start(): void {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const scene = sceneRef.current;
    if (!scene) return;

    const physicsStore = usePhysicsStore.getState();

    // Save all entity transforms
    this.savedStates.clear();
    for (const mesh of scene.meshes) {
      if (!(mesh instanceof AbstractMesh) || !mesh.metadata?.entityId) continue;
      const entityId = mesh.metadata.entityId as string;
      this.savedStates.set(entityId, {
        position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
        rotation: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
        scale: { x: mesh.scaling.x, y: mesh.scaling.y, z: mesh.scaling.z },
      });
    }

    // Initialize physics engine
    physicsEngine.init(physicsStore.gameSettings.gravity, physicsStore.gameSettings.fixedTimeStep, physicsStore.gameSettings.maxSubSteps);

    // Register physics bodies
    for (const [entityId, bodyData] of Object.entries(physicsStore.bodies)) {
      if (!bodyData.enabled) continue;
      const mesh = scene.meshes.find(
        (m) => m instanceof AbstractMesh && m.metadata?.entityId === entityId
      ) as AbstractMesh | undefined;
      if (mesh) {
        physicsEngine.addBody(entityId, mesh, bodyData);
      }
    }

    // Initialize script runtime
    gameScriptRuntime.init();

    // Register scripts
    for (const [entityId, scripts] of Object.entries(physicsStore.scripts)) {
      for (const script of scripts) {
        if (script.enabled && script.source.trim()) {
          gameScriptRuntime.registerScript(entityId, script.source);
        }
      }
    }

    // Register input handlers
    this.registerInputHandlers();

    // Initialize and register state machines
    stateMachineRuntime.init();
    for (const [entityId, sms] of Object.entries(physicsStore.stateMachines)) {
      for (const sm of sms) {
        stateMachineRuntime.registerMachine(entityId, sm);
      }
    }

    // Start physics engine
    physicsEngine.start();

    // Start game loop for scripts
    this.lastTime = performance.now();
    this.gameLoop();

    // Dispatch play start event
    window.dispatchEvent(new CustomEvent("game-play-started"));
  }

  pause(): void {
    if (!this.isPlaying) return;
    physicsEngine.pause();
    window.dispatchEvent(new CustomEvent("game-play-paused"));
  }

  resume(): void {
    if (!this.isPlaying) return;
    physicsEngine.resume();
    this.lastTime = performance.now();
    this.gameLoop();
    window.dispatchEvent(new CustomEvent("game-play-resumed"));
  }

  stop(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    // Cancel game loop
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    // Stop physics
    physicsEngine.stop();
    physicsEngine.reset();

    // Destroy scripts
    gameScriptRuntime.destroy();

    // Destroy state machines
    stateMachineRuntime.destroy();

    // Remove input handlers
    this.unregisterInputHandlers();

    // Restore entity transforms
    const scene = sceneRef.current;
    if (scene) {
      for (const mesh of scene.meshes) {
        if (!(mesh instanceof AbstractMesh) || !mesh.metadata?.entityId) continue;
        const entityId = mesh.metadata.entityId as string;
        const saved = this.savedStates.get(entityId);
        if (saved) {
          mesh.position.set(saved.position.x, saved.position.y, saved.position.z);
          mesh.rotation.set(saved.rotation.x, saved.rotation.y, saved.rotation.z);
          mesh.scaling.set(saved.scale.x, saved.scale.y, saved.scale.z);

          // Also update the store
          useSceneStore.getState().updateEntityTransform(entityId, {
            position: saved.position,
            rotation: saved.rotation,
            scale: saved.scale,
          } as Partial<Transform>);
        }
      }
    }

    this.savedStates.clear();

    window.dispatchEvent(new CustomEvent("game-play-stopped"));
  }

  private gameLoop = (): void => {
    if (!this.isPlaying) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.25);
    this.lastTime = now;

    // Update scripts
    gameScriptRuntime.update(dt);

    // Update state machines
    stateMachineRuntime.update(dt);

    // Tick play time in store
    usePhysicsStore.getState().tickPlay(dt);

    // Render debug wireframes if enabled
    const { showDebugWireframes } = usePhysicsStore.getState();
    if (showDebugWireframes && !physicsEngine.isDebugEnabled()) {
      physicsEngine.setDebugEnabled(true);
    } else if (!showDebugWireframes && physicsEngine.isDebugEnabled()) {
      physicsEngine.setDebugEnabled(false);
    }
    if (showDebugWireframes) {
      physicsEngine.renderDebugVisuals();
    }

    this.animFrameId = requestAnimationFrame(this.gameLoop);
  };

  private boundKeyDown: ((e: KeyboardEvent) => void) | null = null;
  private boundKeyUp: ((e: KeyboardEvent) => void) | null = null;
  private boundMouseMove: ((e: MouseEvent) => void) | null = null;
  private boundMouseDown: ((e: MouseEvent) => void) | null = null;
  private boundMouseUp: ((e: MouseEvent) => void) | null = null;

  private registerInputHandlers(): void {
    this.boundKeyDown = (e: KeyboardEvent) => {
      gameScriptRuntime.handleKeyDown(e.key);
    };
    this.boundKeyUp = (e: KeyboardEvent) => {
      gameScriptRuntime.handleKeyUp(e.key);
    };
    this.boundMouseMove = (e: MouseEvent) => {
      gameScriptRuntime.handleMouseMove(e.clientX, e.clientY);
    };
    this.boundMouseDown = (e: MouseEvent) => {
      if (e.button === 0) gameScriptRuntime.handleMouseDown("left");
      if (e.button === 2) gameScriptRuntime.handleMouseDown("right");
    };
    this.boundMouseUp = (e: MouseEvent) => {
      if (e.button === 0) gameScriptRuntime.handleMouseUp("left");
      if (e.button === 2) gameScriptRuntime.handleMouseUp("right");
    };

    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);
    window.addEventListener("mousemove", this.boundMouseMove);
    window.addEventListener("mousedown", this.boundMouseDown);
    window.addEventListener("mouseup", this.boundMouseUp);
  }

  private unregisterInputHandlers(): void {
    if (this.boundKeyDown) window.removeEventListener("keydown", this.boundKeyDown);
    if (this.boundKeyUp) window.removeEventListener("keyup", this.boundKeyUp);
    if (this.boundMouseMove) window.removeEventListener("mousemove", this.boundMouseMove);
    if (this.boundMouseDown) window.removeEventListener("mousedown", this.boundMouseDown);
    if (this.boundMouseUp) window.removeEventListener("mouseup", this.boundMouseUp);
    this.boundKeyDown = null;
    this.boundKeyUp = null;
    this.boundMouseMove = null;
    this.boundMouseDown = null;
    this.boundMouseUp = null;
  }
}

// Singleton
export const gameModeController = new GameModeController();
