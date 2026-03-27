import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  SculptBrushType,
  FalloffType,
  SculptBrushSettings,
  SculptSymmetry,
} from "@/editor/types";

interface DyntopoSettings {
  enabled: boolean;
  detailSize: number; // target edge length
  subdivideEdges: boolean;
  collapseEdges: boolean;
}

interface MultiresSettings {
  levels: number; // current max level
  currentLevel: number; // viewing/sculpting level
}

interface SculptModeState {
  /** Which entity is being sculpted (null = not in sculpt mode) */
  activeMeshEntityId: string | null;

  /** Active brush configuration */
  brush: SculptBrushSettings;

  /** Axis symmetry for mirrored strokes */
  symmetry: SculptSymmetry;

  /** True while a brush stroke is in progress */
  isSculpting: boolean;

  /** Show brush cursor circle on mesh surface */
  showBrushCursor: boolean;

  /** Dynamic topology settings */
  dyntopo: DyntopoSettings;

  /** Multiresolution settings */
  multires: MultiresSettings;

  /** Sculpt mask per entity (Float32Array, 0=unmasked, 1=masked) */
  masks: Record<string, Float32Array>;

  /** Face sets per entity (Int32Array, -1=none, 0+=set index) */
  faceSets: Record<string, Int32Array>;

  /** Hidden face set IDs per entity */
  hiddenFaceSets: Record<string, number[]>;

  // Actions
  enterSculptMode: (entityId: string) => void;
  exitSculptMode: () => void;
  setBrushType: (type: SculptBrushType) => void;
  setBrushRadius: (radius: number) => void;
  setBrushStrength: (strength: number) => void;
  setFalloff: (falloff: FalloffType) => void;
  setSpacing: (spacing: number) => void;
  setIsSculpting: (val: boolean) => void;
  setShowBrushCursor: (val: boolean) => void;
  toggleSymmetryX: () => void;
  toggleSymmetryY: () => void;
  toggleSymmetryZ: () => void;

  // Dyntopo
  toggleDyntopo: () => void;
  setDyntopoDetailSize: (size: number) => void;
  setDyntopoSubdivide: (val: boolean) => void;
  setDyntopoCollapse: (val: boolean) => void;

  // Multires
  addMultiresLevel: () => void;
  removeMultiresLevel: () => void;
  setMultiresLevel: (level: number) => void;

  // Mask
  invertMask: (entityId: string) => void;
  clearMask: (entityId: string) => void;
  initMask: (entityId: string, vertexCount: number) => void;

  // Face sets
  createFaceSet: (entityId: string, faceIndices: number[]) => void;
  clearFaceSets: (entityId: string) => void;
  toggleFaceSetVisibility: (entityId: string, setId: number) => void;
  showAllFaceSets: (entityId: string) => void;
}

const defaultBrush: SculptBrushSettings = {
  type: "sculpt",
  radius: 0.3,
  strength: 0.3,
  falloff: "smooth",
  spacing: 0.15,
  usePressure: false,
};

export const useSculptModeStore = create<SculptModeState>()(
  immer((set) => ({
    activeMeshEntityId: null,
    brush: { ...defaultBrush },
    symmetry: { x: false, y: false, z: false },
    isSculpting: false,
    showBrushCursor: true,
    dyntopo: { enabled: false, detailSize: 0.1, subdivideEdges: true, collapseEdges: true },
    multires: { levels: 0, currentLevel: 0 },
    masks: {},
    faceSets: {},
    hiddenFaceSets: {},

    enterSculptMode: (entityId) =>
      set((state) => {
        state.activeMeshEntityId = entityId;
      }),

    exitSculptMode: () =>
      set((state) => {
        state.activeMeshEntityId = null;
        state.isSculpting = false;
      }),

    setBrushType: (type) =>
      set((state) => {
        state.brush.type = type;
      }),

    setBrushRadius: (radius) =>
      set((state) => {
        state.brush.radius = Math.max(0.01, Math.min(5.0, radius));
      }),

    setBrushStrength: (strength) =>
      set((state) => {
        state.brush.strength = Math.max(0.01, Math.min(1.0, strength));
      }),

    setFalloff: (falloff) =>
      set((state) => {
        state.brush.falloff = falloff;
      }),

    setSpacing: (spacing) =>
      set((state) => {
        state.brush.spacing = Math.max(0.05, Math.min(1.0, spacing));
      }),

    setIsSculpting: (val) =>
      set((state) => {
        state.isSculpting = val;
      }),

    setShowBrushCursor: (val) =>
      set((state) => {
        state.showBrushCursor = val;
      }),

    toggleSymmetryX: () =>
      set((state) => {
        state.symmetry.x = !state.symmetry.x;
      }),

    toggleSymmetryY: () =>
      set((state) => {
        state.symmetry.y = !state.symmetry.y;
      }),

    toggleSymmetryZ: () =>
      set((state) => {
        state.symmetry.z = !state.symmetry.z;
      }),

    // Dyntopo
    toggleDyntopo: () =>
      set((state) => {
        state.dyntopo.enabled = !state.dyntopo.enabled;
      }),

    setDyntopoDetailSize: (size) =>
      set((state) => {
        state.dyntopo.detailSize = Math.max(0.01, Math.min(1.0, size));
      }),

    setDyntopoSubdivide: (val) =>
      set((state) => {
        state.dyntopo.subdivideEdges = val;
      }),

    setDyntopoCollapse: (val) =>
      set((state) => {
        state.dyntopo.collapseEdges = val;
      }),

    // Multires
    addMultiresLevel: () =>
      set((state) => {
        state.multires.levels += 1;
        state.multires.currentLevel = state.multires.levels;
      }),

    removeMultiresLevel: () =>
      set((state) => {
        if (state.multires.levels > 0) {
          state.multires.levels -= 1;
          if (state.multires.currentLevel > state.multires.levels) {
            state.multires.currentLevel = state.multires.levels;
          }
        }
      }),

    setMultiresLevel: (level) =>
      set((state) => {
        state.multires.currentLevel = Math.max(0, Math.min(state.multires.levels, level));
      }),

    // Mask
    invertMask: (entityId) =>
      set((state) => {
        const mask = state.masks[entityId];
        if (mask) {
          for (let i = 0; i < mask.length; i++) {
            mask[i] = 1.0 - mask[i];
          }
        }
      }),

    clearMask: (entityId) =>
      set((state) => {
        const mask = state.masks[entityId];
        if (mask) {
          mask.fill(0);
        }
      }),

    initMask: (entityId, vertexCount) =>
      set((state) => {
        if (!state.masks[entityId] || state.masks[entityId].length !== vertexCount) {
          state.masks[entityId] = new Float32Array(vertexCount);
        }
      }),

    // Face sets
    createFaceSet: (entityId, faceIndices) =>
      set((state) => {
        if (!state.faceSets[entityId]) return;
        const nextId = Math.max(0, ...state.faceSets[entityId]) + 1;
        for (const idx of faceIndices) {
          if (idx >= 0 && idx < state.faceSets[entityId].length) {
            state.faceSets[entityId][idx] = nextId;
          }
        }
      }),

    clearFaceSets: (entityId) =>
      set((state) => {
        if (state.faceSets[entityId]) {
          state.faceSets[entityId].fill(-1);
        }
        state.hiddenFaceSets[entityId] = [];
      }),

    toggleFaceSetVisibility: (entityId, setId) =>
      set((state) => {
        if (!state.hiddenFaceSets[entityId]) {
          state.hiddenFaceSets[entityId] = [];
        }
        const hidden = state.hiddenFaceSets[entityId];
        const idx = hidden.indexOf(setId);
        if (idx >= 0) {
          hidden.splice(idx, 1);
        } else {
          hidden.push(setId);
        }
      }),

    showAllFaceSets: (entityId) =>
      set((state) => {
        state.hiddenFaceSets[entityId] = [];
      }),
  }))
);
