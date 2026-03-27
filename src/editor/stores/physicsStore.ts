import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { PhysicsBodyData, GameScriptData, StateMachineData, GameSettings, PlayModeState, Vec3 } from "@/editor/types";
import { createDefaultPhysicsBody, createDefaultGameSettings } from "@/editor/types";

interface PhysicsState {
  // Physics bodies per entity
  bodies: Record<string, PhysicsBodyData>;

  // Game scripts per entity
  scripts: Record<string, GameScriptData[]>;

  // State machines per entity
  stateMachines: Record<string, StateMachineData[]>;

  // Game settings
  gameSettings: GameSettings;

  // Play mode
  playMode: PlayModeState;
  playTime: number; // seconds since play started

  // Actions
  setBody: (entityId: string, data: Partial<PhysicsBodyData>) => void;
  removeBody: (entityId: string) => void;
  enableBody: (entityId: string) => void;
  disableBody: (entityId: string) => void;

  addScript: (entityId: string, script: GameScriptData) => void;
  removeScript: (entityId: string, scriptId: string) => void;
  updateScript: (entityId: string, scriptId: string, updates: Partial<GameScriptData>) => void;

  addStateMachine: (entityId: string, sm: StateMachineData) => void;
  removeStateMachine: (entityId: string, smId: string) => void;
  updateStateMachine: (entityId: string, smId: string, updates: Partial<StateMachineData>) => void;

  setGameSettings: (settings: Partial<GameSettings>) => void;
  setGravity: (gravity: Vec3) => void;

  startPlay: () => void;
  pausePlay: () => void;
  resumePlay: () => void;
  stopPlay: () => void;
  tickPlay: (dt: number) => void;

  resetAll: () => void;
}

export const usePhysicsStore = create<PhysicsState>()(
  immer((set) => ({
    bodies: {},
    scripts: {},
    stateMachines: {},
    gameSettings: createDefaultGameSettings(),
    playMode: "stopped",
    playTime: 0,

    setBody: (entityId, data) =>
      set((state) => {
        if (!state.bodies[entityId]) {
          state.bodies[entityId] = createDefaultPhysicsBody();
        }
        Object.assign(state.bodies[entityId], data);
      }),

    removeBody: (entityId) =>
      set((state) => {
        delete state.bodies[entityId];
      }),

    enableBody: (entityId) =>
      set((state) => {
        if (!state.bodies[entityId]) {
          state.bodies[entityId] = createDefaultPhysicsBody();
        }
        state.bodies[entityId].enabled = true;
      }),

    disableBody: (entityId) =>
      set((state) => {
        if (state.bodies[entityId]) {
          state.bodies[entityId].enabled = false;
        }
      }),

    addScript: (entityId, script) =>
      set((state) => {
        if (!state.scripts[entityId]) {
          state.scripts[entityId] = [];
        }
        state.scripts[entityId].push(script);
      }),

    removeScript: (entityId, scriptId) =>
      set((state) => {
        if (state.scripts[entityId]) {
          state.scripts[entityId] = state.scripts[entityId].filter((s) => s.id !== scriptId);
        }
      }),

    updateScript: (entityId, scriptId, updates) =>
      set((state) => {
        const scripts = state.scripts[entityId];
        if (!scripts) return;
        const script = scripts.find((s) => s.id === scriptId);
        if (script) {
          Object.assign(script, updates);
        }
      }),

    addStateMachine: (entityId, sm) =>
      set((state) => {
        if (!state.stateMachines[entityId]) {
          state.stateMachines[entityId] = [];
        }
        state.stateMachines[entityId].push(sm);
      }),

    removeStateMachine: (entityId, smId) =>
      set((state) => {
        if (state.stateMachines[entityId]) {
          state.stateMachines[entityId] = state.stateMachines[entityId].filter((s) => s.id !== smId);
        }
      }),

    updateStateMachine: (entityId, smId, updates) =>
      set((state) => {
        const sms = state.stateMachines[entityId];
        if (!sms) return;
        const sm = sms.find((s) => s.id === smId);
        if (sm) {
          Object.assign(sm, updates);
        }
      }),

    setGameSettings: (settings) =>
      set((state) => {
        Object.assign(state.gameSettings, settings);
      }),

    setGravity: (gravity) =>
      set((state) => {
        state.gameSettings.gravity = gravity;
      }),

    startPlay: () =>
      set((state) => {
        state.playMode = "playing";
        state.playTime = 0;
      }),

    pausePlay: () =>
      set((state) => {
        state.playMode = "paused";
      }),

    resumePlay: () =>
      set((state) => {
        state.playMode = "playing";
      }),

    stopPlay: () =>
      set((state) => {
        state.playMode = "stopped";
        state.playTime = 0;
      }),

    tickPlay: (dt) =>
      set((state) => {
        if (state.playMode === "playing") {
          state.playTime += dt;
        }
      }),

    resetAll: () =>
      set((state) => {
        state.bodies = {};
        state.scripts = {};
        state.stateMachines = {};
        state.gameSettings = createDefaultGameSettings();
        state.playMode = "stopped";
        state.playTime = 0;
      }),
  }))
);
