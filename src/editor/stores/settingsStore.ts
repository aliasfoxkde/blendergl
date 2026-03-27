import { create } from "zustand";
import type { ShadingMode, AiProvider } from "@/editor/types";

export interface PrintSettings {
  layerHeight: number;
  infillDensity: number;
  infillPattern: "grid" | "lines" | "triangles" | "gyroid" | "honeycomb";
  wallCount: number;
  topBottomLayers: number;
  supportEnabled: boolean;
  supportOverhangAngle: number;
  adhesionType: "none" | "skirt" | "brim" | "raft";
  printSpeed: number;
  outerWallSpeed: number;
  innerWallSpeed: number;
  infillSpeed: number;
  travelSpeed: number;
  extruderTemp: number;
  bedTemp: number;
  nozzleDiameter: number;
  filamentDiameter: number;
}

const defaultPrintSettings: PrintSettings = {
  layerHeight: 0.2,
  infillDensity: 20,
  infillPattern: "grid",
  wallCount: 3,
  topBottomLayers: 4,
  supportEnabled: false,
  supportOverhangAngle: 45,
  adhesionType: "brim",
  printSpeed: 50,
  outerWallSpeed: 30,
  innerWallSpeed: 50,
  infillSpeed: 80,
  travelSpeed: 150,
  extruderTemp: 200,
  bedTemp: 60,
  nozzleDiameter: 0.4,
  filamentDiameter: 1.75,
};

export interface PrinterProfile {
  name: string;
  bedSize: { x: number; y: number; z: number };
  nozzleDiameter: number;
  maxExtruderTemp: number;
  maxBedTemp: number;
}

export const PRINTER_PROFILES: PrinterProfile[] = [
  {
    name: "Creality Ender 3",
    bedSize: { x: 220, y: 220, z: 250 },
    nozzleDiameter: 0.4,
    maxExtruderTemp: 260,
    maxBedTemp: 100,
  },
  {
    name: "Prusa MK4",
    bedSize: { x: 250, y: 210, z: 220 },
    nozzleDiameter: 0.4,
    maxExtruderTemp: 300,
    maxBedTemp: 120,
  },
  {
    name: "Bambu Lab P1S",
    bedSize: { x: 256, y: 256, z: 256 },
    nozzleDiameter: 0.4,
    maxExtruderTemp: 300,
    maxBedTemp: 120,
  },
  {
    name: "Bambu Lab X1C",
    bedSize: { x: 256, y: 256, z: 256 },
    nozzleDiameter: 0.4,
    maxExtruderTemp: 300,
    maxBedTemp: 120,
  },
  {
    name: "Voron 2.4",
    bedSize: { x: 350, y: 350, z: 340 },
    nozzleDiameter: 0.4,
    maxExtruderTemp: 300,
    maxBedTemp: 120,
  },
  {
    name: "Anycubic Kobra 2",
    bedSize: { x: 220, y: 220, z: 250 },
    nozzleDiameter: 0.4,
    maxExtruderTemp: 260,
    maxBedTemp: 100,
  },
];

interface SettingsState {
  showGrid: boolean;
  showAxes: boolean;
  shadingMode: ShadingMode;
  snapEnabled: boolean;
  snapIncrement: number;
  angleSnap: number;
  scaleSnap: number;
  autoSave: boolean;
  autoSaveIntervalMs: number;
  theme: "dark" | "light";
  cameraMode: "perspective" | "orthographic";

  aiEnabled: boolean;
  aiProvider: AiProvider;
  aiApiKey: string;
  aiEndpoint: string;
  aiModel: string;

  printSettings: PrintSettings;
  setPrintSettings: (settings: Partial<PrintSettings>) => void;

  setShowGrid: (show: boolean) => void;
  setShowAxes: (show: boolean) => void;
  setShadingMode: (mode: ShadingMode) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setSnapIncrement: (increment: number) => void;
  setAngleSnap: (angle: number) => void;
  setScaleSnap: (snap: number) => void;
  setAutoSave: (enabled: boolean) => void;
  setTheme: (theme: "dark" | "light") => void;
  setCameraMode: (mode: "perspective" | "orthographic") => void;

  setAiEnabled: (enabled: boolean) => void;
  setAiProvider: (provider: AiProvider) => void;
  setAiApiKey: (key: string) => void;
  setAiEndpoint: (endpoint: string) => void;
  setAiModel: (model: string) => void;
}

function loadFromLocalStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored !== null ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function persistToLocalStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or unavailable — ignore
  }
}

const savedAiProvider = loadFromLocalStorage<AiProvider>("blendergl-ai-provider", "anthropic");
const savedAiApiKey = loadFromLocalStorage<string>("blendergl-ai-api-key", "");
const savedAiEndpoint = loadFromLocalStorage<string>(
  "blendergl-ai-endpoint",
  savedAiProvider === "anthropic" ? "https://api.anthropic.com" : "https://api.openai.com"
);
const savedAiModel = loadFromLocalStorage<string>(
  "blendergl-ai-model",
  savedAiProvider === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o"
);

export const useSettingsStore = create<SettingsState>()((set) => ({
  showGrid: true,
  showAxes: true,
  shadingMode: "material",
  snapEnabled: false,
  snapIncrement: 0.5,
  angleSnap: 15,
  scaleSnap: 0.1,
  autoSave: true,
  autoSaveIntervalMs: 30000,
  theme: "dark",
  cameraMode: "perspective",

  aiEnabled: loadFromLocalStorage<boolean>("blendergl-ai-enabled", false),
  aiProvider: savedAiProvider,
  aiApiKey: savedAiApiKey,
  aiEndpoint: savedAiEndpoint,
  aiModel: savedAiModel,

  printSettings: loadFromLocalStorage<PrintSettings>("blendergl-print-settings", defaultPrintSettings),

  setShowGrid: (show) => set({ showGrid: show }),
  setShowAxes: (show) => set({ showAxes: show }),
  setShadingMode: (mode) => set({ shadingMode: mode }),
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  setSnapIncrement: (increment) => set({ snapIncrement: increment }),
  setAngleSnap: (angle) => set({ angleSnap: angle }),
  setScaleSnap: (snap) => set({ scaleSnap: snap }),
  setAutoSave: (enabled) => set({ autoSave: enabled }),
  setTheme: (theme) => set({ theme }),
  setCameraMode: (mode) => set({ cameraMode: mode }),

  setAiEnabled: (enabled) => {
    persistToLocalStorage("blendergl-ai-enabled", enabled);
    set({ aiEnabled: enabled });
  },
  setAiProvider: (provider) => {
    persistToLocalStorage("blendergl-ai-provider", provider);
    const defaultEndpoint = provider === "anthropic" ? "https://api.anthropic.com" : "https://api.openai.com";
    const defaultModel = provider === "anthropic" ? "claude-sonnet-4-20250514" : "gpt-4o";
    persistToLocalStorage("blendergl-ai-endpoint", defaultEndpoint);
    persistToLocalStorage("blendergl-ai-model", defaultModel);
    set({ aiProvider: provider, aiEndpoint: defaultEndpoint, aiModel: defaultModel });
  },
  setAiApiKey: (key) => {
    persistToLocalStorage("blendergl-ai-api-key", key);
    set({ aiApiKey: key });
  },
  setAiEndpoint: (endpoint) => {
    persistToLocalStorage("blendergl-ai-endpoint", endpoint);
    set({ aiEndpoint: endpoint });
  },
  setAiModel: (model) => {
    persistToLocalStorage("blendergl-ai-model", model);
    set({ aiModel: model });
  },
  setPrintSettings: (settings) => {
    const updated = { ...defaultPrintSettings, ...settings };
    persistToLocalStorage("blendergl-print-settings", updated);
    set({ printSettings: updated });
  },
}));
