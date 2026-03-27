import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { MaterialData } from "@/editor/types";
import { createDefaultMaterial } from "@/editor/types";

interface MaterialState {
  materials: Record<string, MaterialData>;
  activeMaterialId: string | null;

  // Actions
  createMaterial: (id: string) => void;
  removeMaterial: (id: string) => void;
  updateMaterial: (id: string, updates: Partial<MaterialData>) => void;
  setActiveMaterial: (id: string | null) => void;
  getMaterial: (id: string) => MaterialData | undefined;
}

export const useMaterialStore = create<MaterialState>()(
  immer((set, get) => ({
    materials: {},
    activeMaterialId: null,

    createMaterial: (id) =>
      set((state) => {
        state.materials[id] = { ...createDefaultMaterial() };
      }),

    removeMaterial: (id) =>
      set((state) => {
        delete state.materials[id];
        if (state.activeMaterialId === id) {
          state.activeMaterialId = null;
        }
      }),

    updateMaterial: (id, updates) =>
      set((state) => {
        const mat = state.materials[id];
        if (mat) {
          Object.assign(mat, updates);
        }
      }),

    setActiveMaterial: (id) =>
      set((state) => {
        state.activeMaterialId = id;
      }),

    getMaterial: (id) => get().materials[id],
  }))
);
