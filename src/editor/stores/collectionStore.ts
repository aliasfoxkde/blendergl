/**
 * Collection store — entity grouping support.
 * Collections are named groups that contain entity IDs.
 * Similar to Blender's collection system.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export interface Collection {
  id: string;
  name: string;
  entityIds: string[];
  visible: boolean;
  locked: boolean;
  color: string; // hex color for the collection indicator
}

interface CollectionState {
  collections: Record<string, Collection>;
  collectionOrder: string[];
  activeCollectionId: string | null;

  // Actions
  createCollection: (name: string) => string;
  removeCollection: (id: string) => void;
  renameCollection: (id: string, name: string) => void;
  setActiveCollection: (id: string | null) => void;

  // Entity management within collections
  addEntityToCollection: (entityId: string, collectionId: string) => void;
  removeEntityFromCollection: (entityId: string, collectionId: string) => void;
  moveEntityToCollection: (entityId: string, fromCollectionId: string, toCollectionId: string) => void;

  // Collection-level actions
  setCollectionVisibility: (id: string, visible: boolean) => void;
  setCollectionLocked: (id: string, locked: boolean) => void;
  setCollectionColor: (id: string, color: string) => void;
  toggleCollectionVisibility: (id: string) => void;

  // Queries
  getEntitiesInCollection: (collectionId: string) => string[];
  getCollectionForEntity: (entityId: string) => string | null;

  // Reorder
  moveCollectionUp: (id: string) => void;
  moveCollectionDown: (id: string) => void;
}

const COLLECTION_COLORS = [
  "#f97316", "#3b82f6", "#22c55e", "#a855f7",
  "#ef4444", "#eab308", "#06b6d4", "#ec4899",
];

let collectionCounter = 0;

export const useCollectionStore = create<CollectionState>()(
  immer((set, get) => ({
    collections: {},
    collectionOrder: [],
    activeCollectionId: null,

    createCollection: (name) => {
      collectionCounter++;
      const id = `collection_${Date.now()}_${collectionCounter}`;
      const colorIdx = (collectionCounter - 1) % COLLECTION_COLORS.length;
      set((state) => {
        state.collections[id] = {
          id,
          name,
          entityIds: [],
          visible: true,
          locked: false,
          color: COLLECTION_COLORS[colorIdx],
        };
        state.collectionOrder.push(id);
        state.activeCollectionId = id;
      });
      return id;
    },

    removeCollection: (id) =>
      set((state) => {
        delete state.collections[id];
        state.collectionOrder = state.collectionOrder.filter((cid) => cid !== id);
        if (state.activeCollectionId === id) {
          state.activeCollectionId =
            state.collectionOrder.length > 0
              ? state.collectionOrder[state.collectionOrder.length - 1]
              : null;
        }
      }),

    renameCollection: (id, name) =>
      set((state) => {
        const col = state.collections[id];
        if (col) col.name = name;
      }),

    setActiveCollection: (id) =>
      set((state) => {
        state.activeCollectionId = id;
      }),

    addEntityToCollection: (entityId, collectionId) =>
      set((state) => {
        const col = state.collections[collectionId];
        if (col && !col.entityIds.includes(entityId)) {
          col.entityIds.push(entityId);
        }
      }),

    removeEntityFromCollection: (entityId, collectionId) =>
      set((state) => {
        const col = state.collections[collectionId];
        if (col) {
          col.entityIds = col.entityIds.filter((eid) => eid !== entityId);
        }
      }),

    moveEntityToCollection: (entityId, fromCollectionId, toCollectionId) =>
      set((state) => {
        const from = state.collections[fromCollectionId];
        const to = state.collections[toCollectionId];
        if (from) {
          from.entityIds = from.entityIds.filter((eid) => eid !== entityId);
        }
        if (to && !to.entityIds.includes(entityId)) {
          to.entityIds.push(entityId);
        }
      }),

    setCollectionVisibility: (id, visible) =>
      set((state) => {
        const col = state.collections[id];
        if (col) col.visible = visible;
      }),

    setCollectionLocked: (id, locked) =>
      set((state) => {
        const col = state.collections[id];
        if (col) col.locked = locked;
      }),

    setCollectionColor: (id, color) =>
      set((state) => {
        const col = state.collections[id];
        if (col) col.color = color;
      }),

    toggleCollectionVisibility: (id) =>
      set((state) => {
        const col = state.collections[id];
        if (col) col.visible = !col.visible;
      }),

    getEntitiesInCollection: (collectionId) => {
      const col = get().collections[collectionId];
      return col ? col.entityIds : [];
    },

    getCollectionForEntity: (entityId) => {
      const state = get();
      for (const colId of state.collectionOrder) {
        const col = state.collections[colId];
        if (col && col.entityIds.includes(entityId)) {
          return colId;
        }
      }
      return null;
    },

    moveCollectionUp: (id) =>
      set((state) => {
        const idx = state.collectionOrder.indexOf(id);
        if (idx < state.collectionOrder.length - 1) {
          const temp = state.collectionOrder[idx];
          state.collectionOrder[idx] = state.collectionOrder[idx + 1];
          state.collectionOrder[idx + 1] = temp;
        }
      }),

    moveCollectionDown: (id) =>
      set((state) => {
        const idx = state.collectionOrder.indexOf(id);
        if (idx > 0) {
          const temp = state.collectionOrder[idx];
          state.collectionOrder[idx] = state.collectionOrder[idx - 1];
          state.collectionOrder[idx - 1] = temp;
        }
      }),
  }))
);
