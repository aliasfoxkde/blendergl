import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  Entity,
  SceneData,
  SceneSettings,
  Transform,
} from "@/editor/types";

interface SceneState {
  scene: SceneData;
  entities: Record<string, Entity>;

  // Actions
  setScene: (scene: SceneData) => void;
  addEntity: (entity: Entity) => void;
  removeEntity: (id: string) => void;
  updateEntityTransform: (id: string, transform: Partial<Transform>) => void;
  updateEntityName: (id: string, name: string) => void;
  updateEntityVisibility: (id: string, visible: boolean) => void;
  updateEntityLock: (id: string, locked: boolean) => void;
  updateEntityComponents: (id: string, components: Record<string, unknown>) => void;
  setParent: (childId: string, parentId: string | null) => void;
  updateSettings: (settings: Partial<SceneSettings>) => void;
  clearScene: () => void;
}

function createEmptyScene(): SceneData {
  return {
    id: `scene_${Date.now()}`,
    name: "Untitled Scene",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    entities: {},
    rootEntityIds: [],
    settings: {
      gridSize: 20,
      gridSubdivisions: 20,
      snapEnabled: false,
      snapIncrement: 0.5,
      angleSnap: 15,
      backgroundColor: "#1a1a2e",
    },
  };
}

export const useSceneStore = create<SceneState>()(
  immer((set) => ({
    scene: createEmptyScene(),
    entities: {},

    setScene: (scene) =>
      set((state) => {
        state.scene = scene;
        state.entities = scene.entities;
      }),

    addEntity: (entity) =>
      set((state) => {
        state.entities[entity.id] = entity;
        state.scene.entities[entity.id] = entity;
        state.scene.updatedAt = new Date().toISOString();
        if (entity.parentId === null) {
          state.scene.rootEntityIds.push(entity.id);
        }
      }),

    removeEntity: (id) =>
      set((state) => {
        const entity = state.entities[id];
        if (!entity) return;

        // Remove from parent's children
        if (entity.parentId && state.entities[entity.parentId]) {
          state.entities[entity.parentId].childrenIds = state.entities[
            entity.parentId
          ].childrenIds.filter((cid) => cid !== id);
        } else {
          state.scene.rootEntityIds = state.scene.rootEntityIds.filter(
            (rid) => rid !== id
          );
        }

        // Recursively remove children
        const removeRecursive = (eid: string) => {
          const e = state.entities[eid];
          if (!e) return;
          for (const childId of e.childrenIds) {
            removeRecursive(childId);
          }
          delete state.entities[eid];
          delete state.scene.entities[eid];
        };

        removeRecursive(id);
        state.scene.updatedAt = new Date().toISOString();
      }),

    updateEntityTransform: (id, transform) =>
      set((state) => {
        const entity = state.entities[id];
        if (!entity || entity.locked) return;
        Object.assign(entity.transform, transform);
        state.scene.entities[id] = entity;
        state.scene.updatedAt = new Date().toISOString();
      }),

    updateEntityName: (id, name) =>
      set((state) => {
        const entity = state.entities[id];
        if (!entity) return;
        entity.name = name;
        state.scene.entities[id] = entity;
        state.scene.updatedAt = new Date().toISOString();
      }),

    updateEntityVisibility: (id, visible) =>
      set((state) => {
        const entity = state.entities[id];
        if (!entity) return;
        entity.visible = visible;
        state.scene.entities[id] = entity;
      }),

    updateEntityLock: (id, locked) =>
      set((state) => {
        const entity = state.entities[id];
        if (!entity) return;
        entity.locked = locked;
      }),

    updateEntityComponents: (id, components) =>
      set((state) => {
        const entity = state.entities[id];
        if (!entity) return;
        entity.components = { ...entity.components, ...components };
      }),

    setParent: (childId, parentId) =>
      set((state) => {
        const child = state.entities[childId];
        if (!child) return;

        // Remove from old parent
        if (child.parentId && state.entities[child.parentId]) {
          state.entities[child.parentId].childrenIds = state.entities[
            child.parentId
          ].childrenIds.filter((cid) => cid !== childId);
        } else {
          state.scene.rootEntityIds = state.scene.rootEntityIds.filter(
            (rid) => rid !== childId
          );
        }

        // Add to new parent
        child.parentId = parentId;
        if (parentId && state.entities[parentId]) {
          state.entities[parentId].childrenIds.push(childId);
        } else {
          state.scene.rootEntityIds.push(childId);
        }

        state.scene.updatedAt = new Date().toISOString();
      }),

    updateSettings: (settings) =>
      set((state) => {
        Object.assign(state.scene.settings, settings);
      }),

    clearScene: () =>
      set((state) => {
        const emptyScene = createEmptyScene();
        state.scene = emptyScene;
        state.entities = {};
      }),
  }))
);
