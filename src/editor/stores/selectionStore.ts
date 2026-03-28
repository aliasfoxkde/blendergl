import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  EditorMode,
  SelectionMode,
  TransformMode,
  TransformSpace,
} from "@/editor/types";

interface SelectionState {
  selectedIds: string[];
  activeEntityId: string | null;
  editorMode: EditorMode;
  selectionMode: SelectionMode;
  transformMode: TransformMode;
  transformSpace: TransformSpace;
  hoveredEntityId: string | null;

  // Actions
  select: (id: string, additive?: boolean) => void;
  deselect: (id: string) => void;
  deselectAll: () => void;
  selectAll: (ids: string[]) => void;
  setActiveEntity: (id: string | null) => void;
  setEditorMode: (mode: EditorMode) => void;
  setSelectionMode: (mode: SelectionMode) => void;
  setTransformMode: (mode: TransformMode) => void;
  setTransformSpace: (space: TransformSpace) => void;
  setHoveredEntity: (id: string | null) => void;
}

export const useSelectionStore = create<SelectionState>()(
  immer((set) => ({
    selectedIds: [],
    activeEntityId: null,
    editorMode: "object",
    selectionMode: "object",
    transformMode: "translate",
    transformSpace: "world",
    hoveredEntityId: null,

    select: (id, additive = false) =>
      set((state) => {
        if (additive) {
          if (!state.selectedIds.includes(id)) {
            state.selectedIds.push(id);
          }
        } else {
          state.selectedIds = [id];
        }
        state.activeEntityId = id;
      }),

    deselect: (id) =>
      set((state) => {
        state.selectedIds = state.selectedIds.filter((sid) => sid !== id);
        if (state.activeEntityId === id) {
          state.activeEntityId = state.selectedIds[0] ?? null;
        }
      }),

    deselectAll: () =>
      set((state) => {
        state.selectedIds = [];
        state.activeEntityId = null;
      }),

    selectAll: (ids) =>
      set((state) => {
        state.selectedIds = [...ids];
      }),

    setActiveEntity: (id) =>
      set((state) => {
        state.activeEntityId = id;
      }),

    setEditorMode: (mode) =>
      set((state) => {
        state.editorMode = mode;
        if (mode === "object") {
          state.selectionMode = "object";
        }
      }),

    setSelectionMode: (mode) =>
      set((state) => {
        state.selectionMode = mode;
      }),

    setTransformMode: (mode) =>
      set((state) => {
        state.transformMode = mode;
      }),

    setTransformSpace: (space) =>
      set((state) => {
        state.transformSpace = space;
      }),

    setHoveredEntity: (id) =>
      set((state) => {
        state.hoveredEntityId = id;
      }),
  }))
);

// Dispatch selection change events for callback scripts
let _prevSelectedIds: string[] = [];
useSelectionStore.subscribe((state) => {
  if (state.selectedIds !== _prevSelectedIds) {
    _prevSelectedIds = state.selectedIds;
    window.dispatchEvent(new CustomEvent("selection-change", { detail: { selectedIds: state.selectedIds } }));
  }
});
