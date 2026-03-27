import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  SculptBrushType,
  FalloffType,
  SculptBrushSettings,
  SculptSymmetry,
} from "@/editor/types";

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
  }))
);
