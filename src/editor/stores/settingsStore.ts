import { create } from "zustand";
import type { ShadingMode } from "@/editor/types";

interface SettingsState {
  showGrid: boolean;
  showAxes: boolean;
  shadingMode: ShadingMode;
  snapEnabled: boolean;
  snapIncrement: number;
  angleSnap: number;
  autoSave: boolean;
  autoSaveIntervalMs: number;
  theme: "dark" | "light";
  cameraMode: "perspective" | "orthographic";

  setShowGrid: (show: boolean) => void;
  setShowAxes: (show: boolean) => void;
  setShadingMode: (mode: ShadingMode) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setSnapIncrement: (increment: number) => void;
  setAngleSnap: (angle: number) => void;
  setAutoSave: (enabled: boolean) => void;
  setTheme: (theme: "dark" | "light") => void;
  setCameraMode: (mode: "perspective" | "orthographic") => void;
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  showGrid: true,
  showAxes: true,
  shadingMode: "material",
  snapEnabled: false,
  snapIncrement: 0.5,
  angleSnap: 15,
  autoSave: true,
  autoSaveIntervalMs: 30000,
  theme: "dark",
  cameraMode: "perspective",

  setShowGrid: (show) => set({ showGrid: show }),
  setShowAxes: (show) => set({ showAxes: show }),
  setShadingMode: (mode) => set({ shadingMode: mode }),
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  setSnapIncrement: (increment) => set({ snapIncrement: increment }),
  setAngleSnap: (angle) => set({ angleSnap: angle }),
  setAutoSave: (enabled) => set({ autoSave: enabled }),
  setTheme: (theme) => set({ theme }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
}));
