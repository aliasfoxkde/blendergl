import { create } from "zustand";
import type { ShadingMode, AiProvider } from "@/editor/types";

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

  aiEnabled: boolean;
  aiProvider: AiProvider;
  aiApiKey: string;
  aiEndpoint: string;
  aiModel: string;

  setShowGrid: (show: boolean) => void;
  setShowAxes: (show: boolean) => void;
  setShadingMode: (mode: ShadingMode) => void;
  setSnapEnabled: (enabled: boolean) => void;
  setSnapIncrement: (increment: number) => void;
  setAngleSnap: (angle: number) => void;
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
  autoSave: true,
  autoSaveIntervalMs: 30000,
  theme: "dark",
  cameraMode: "perspective",

  aiEnabled: loadFromLocalStorage<boolean>("blendergl-ai-enabled", false),
  aiProvider: savedAiProvider,
  aiApiKey: savedAiApiKey,
  aiEndpoint: savedAiEndpoint,
  aiModel: savedAiModel,

  setShowGrid: (show) => set({ showGrid: show }),
  setShowAxes: (show) => set({ showAxes: show }),
  setShadingMode: (mode) => set({ shadingMode: mode }),
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
  setSnapIncrement: (increment) => set({ snapIncrement: increment }),
  setAngleSnap: (angle) => set({ angleSnap: angle }),
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
}));
