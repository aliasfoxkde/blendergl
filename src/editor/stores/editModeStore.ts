import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export type ElementMode = "vertex" | "edge" | "face";

interface EditModeState {
  /** Which entity is being edited (null = not in edit mode) */
  activeMeshEntityId: string | null;

  /** Selection mode within edit mode */
  elementMode: ElementMode;

  /** Selected vertex indices */
  selectedVertices: Set<number>;

  /** Selected edge keys ("minIdx-maxIdx") */
  selectedEdges: Set<string>;

  /** Selected face indices */
  selectedFaces: Set<number>;

  // Actions
  enterEditMode: (entityId: string) => void;
  exitEditMode: () => void;
  setElementMode: (mode: ElementMode) => void;
  selectVertex: (index: number, additive?: boolean) => void;
  selectEdge: (v1: number, v2: number, additive?: boolean) => void;
  selectFace: (faceId: number, additive?: boolean) => void;
  deselectAll: () => void;
  selectAll: (vertexCount?: number, faceCount?: number) => void;
}

function edgeKey(v1: number, v2: number): string {
  const min = Math.min(v1, v2);
  const max = Math.max(v1, v2);
  return `${min}-${max}`;
}

export const useEditModeStore = create<EditModeState>()(
  immer((set) => ({
    activeMeshEntityId: null,
    elementMode: "face" as ElementMode,
    selectedVertices: new Set<number>(),
    selectedEdges: new Set<string>(),
    selectedFaces: new Set<number>(),

    enterEditMode: (entityId) =>
      set((state) => {
        state.activeMeshEntityId = entityId;
        state.selectedVertices = new Set();
        state.selectedEdges = new Set();
        state.selectedFaces = new Set();
      }),

    exitEditMode: () =>
      set((state) => {
        state.activeMeshEntityId = null;
        state.selectedVertices = new Set();
        state.selectedEdges = new Set();
        state.selectedFaces = new Set();
      }),

    setElementMode: (mode) =>
      set((state) => {
        state.elementMode = mode;
        // Clear selections when switching element mode
        state.selectedVertices = new Set();
        state.selectedEdges = new Set();
        state.selectedFaces = new Set();
      }),

    selectVertex: (index, additive = false) =>
      set((state) => {
        if (!additive) {
          state.selectedVertices = new Set();
          state.selectedEdges = new Set();
          state.selectedFaces = new Set();
        }
        if (state.selectedVertices.has(index)) {
          state.selectedVertices.delete(index);
        } else {
          state.selectedVertices.add(index);
        }
      }),

    selectEdge: (v1, v2, additive = false) =>
      set((state) => {
        const key = edgeKey(v1, v2);
        if (!additive) {
          state.selectedVertices = new Set();
          state.selectedEdges = new Set();
          state.selectedFaces = new Set();
        }
        if (state.selectedEdges.has(key)) {
          state.selectedEdges.delete(key);
        } else {
          state.selectedEdges.add(key);
        }
      }),

    selectFace: (faceId, additive = false) =>
      set((state) => {
        if (!additive) {
          state.selectedVertices = new Set();
          state.selectedEdges = new Set();
          state.selectedFaces = new Set();
        }
        if (state.selectedFaces.has(faceId)) {
          state.selectedFaces.delete(faceId);
        } else {
          state.selectedFaces.add(faceId);
        }
      }),

    deselectAll: () =>
      set((state) => {
        state.selectedVertices = new Set();
        state.selectedEdges = new Set();
        state.selectedFaces = new Set();
      }),

    selectAll: (vertexCount = 0, faceCount = 0) =>
      set((state) => {
        state.selectedVertices = new Set();
        state.selectedEdges = new Set();
        state.selectedFaces = new Set();

        if (state.elementMode === "vertex" && vertexCount > 0) {
          for (let i = 0; i < vertexCount; i++) {
            state.selectedVertices.add(i);
          }
        } else if (state.elementMode === "face" && faceCount > 0) {
          for (let i = 0; i < faceCount; i++) {
            state.selectedFaces.add(i);
          }
        }
      }),
  }))
);
