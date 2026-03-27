import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export type ToneMappingMode = "linear" | "reinhard" | "filmic" | "aces";
export type AntiAliasingMode = "fxaa" | "msaa4" | "msaa8" | "none";
export type ScreenshotFormat = "png" | "jpeg";

export interface RenderSettingsData {
  // Tone mapping
  toneMapping: ToneMappingMode;
  exposure: number;
  contrast: number;
  gamma: number;

  // Anti-aliasing
  antiAliasing: AntiAliasingMode;

  // Post-processing
  bloomEnabled: boolean;
  bloomThreshold: number;
  bloomWeight: number;
  bloomKernel: number;
  bloomScale: number;

  ssaoEnabled: boolean;
  ssaoRadius: number;
  ssaoIntensity: number;
  ssaoFallOff: number;
  ssaoArea: number;

  // Color grading
  colorGradingEnabled: boolean;
  colorTemperature: number;
  colorTint: { r: number; g: number; b: number };
  colorSaturation: number;
  colorBrightness: number;
  vignetteEnabled: boolean;
  vignetteWeight: number;
  vignetteColor: string;
  vignetteStretch: number;

  // Depth of field
  dofEnabled: boolean;
  dofFStop: number;
  dofFocalLength: number;
  dofFocusDistance: number;

  // Chromatic aberration
  chromaticAberrationEnabled: boolean;
  chromaticAberrationAmount: number;

  // Shadows
  shadowsEnabled: boolean;
  shadowResolution: number;
  shadowBias: number;
  shadowNormalBias: number;
  contactShadowsEnabled: boolean;
  csmEnabled: boolean;
  csmCascades: number;
  csmLambda: number;
  csmShadowAutoCalc: boolean;

  // Environment
  environmentIntensity: number;
  environmentRotation: number;
  environmentBlur: number;

  // Render output
  renderWidth: number;
  renderHeight: number;
  screenshotFormat: ScreenshotFormat;
  screenshotQuality: number;

  // Advanced PBR
  clearcoatEnabled: boolean;
  clearcoatIntensity: number;
  clearcoatRoughness: number;
  sheenEnabled: boolean;
  sheenIntensity: number;
  sheenColor: string;
  sssEnabled: boolean;
  sssColor: string;
  sssRadius: number;
  sssIntensity: number;
  anisotropicEnabled: boolean;
  anisotropy: number;
  ior: number;

  // Screen-space reflections
  ssrEnabled: boolean;
  ssrMaxSteps: number;
  ssrStepSize: number;
  ssrRoughnessThreshold: number;

  // Motion blur
  motionBlurEnabled: boolean;
  motionBlurShutterSpeed: number;
  motionBlurIntensity: number;

  // Light linking
  lightLinkingEnabled: boolean;
}

function createDefaultRenderSettings(): RenderSettingsData {
  return {
    toneMapping: "aces",
    exposure: 1.0,
    contrast: 1.0,
    gamma: 2.2,

    antiAliasing: "fxaa",

    bloomEnabled: true,
    bloomThreshold: 0.8,
    bloomWeight: 0.3,
    bloomKernel: 64,
    bloomScale: 0.5,

    ssaoEnabled: false,
    ssaoRadius: 0.02,
    ssaoIntensity: 1.0,
    ssaoFallOff: 0.001,
    ssaoArea: 0.075,

    colorGradingEnabled: false,
    colorTemperature: 6500,
    colorTint: { r: 0, g: 0, b: 0 },
    colorSaturation: 1.0,
    colorBrightness: 0,
    vignetteEnabled: false,
    vignetteWeight: 1.5,
    vignetteColor: "#000000",
    vignetteStretch: 0,

    dofEnabled: false,
    dofFStop: 1.4,
    dofFocalLength: 50,
    dofFocusDistance: 10,

    chromaticAberrationEnabled: false,
    chromaticAberrationAmount: 25,

    shadowsEnabled: true,
    shadowResolution: 1024,
    shadowBias: 0.00005,
    shadowNormalBias: 0.02,
    contactShadowsEnabled: false,
    csmEnabled: false,
    csmCascades: 3,
    csmLambda: 0.5,
    csmShadowAutoCalc: true,

    environmentIntensity: 1.0,
    environmentRotation: 0,
    environmentBlur: 0,

    renderWidth: 1920,
    renderHeight: 1080,
    screenshotFormat: "png",
    screenshotQuality: 0.92,

    // Advanced PBR
    clearcoatEnabled: false,
    clearcoatIntensity: 1.0,
    clearcoatRoughness: 0.1,
    sheenEnabled: false,
    sheenIntensity: 1.0,
    sheenColor: "#ffffff",
    sssEnabled: false,
    sssColor: "#ff8866",
    sssRadius: 0.5,
    sssIntensity: 1.0,
    anisotropicEnabled: false,
    anisotropy: 0.5,
    ior: 1.5,

    // Screen-space reflections
    ssrEnabled: false,
    ssrMaxSteps: 64,
    ssrStepSize: 0.02,
    ssrRoughnessThreshold: 0.6,

    // Motion blur
    motionBlurEnabled: false,
    motionBlurShutterSpeed: 1.0,
    motionBlurIntensity: 0.5,

    // Light linking
    lightLinkingEnabled: false,
  };
}

interface RenderSettingsState {
  settings: RenderSettingsData;
  panelOpen: boolean;

  updateSettings: (updates: Partial<RenderSettingsData>) => void;
  resetSettings: () => void;
  togglePanel: () => void;

  // Material presets
  applyPreset: (entityId: string, preset: string) => void;
}

// Material presets
const MATERIAL_PRESETS: Record<string, {
  albedo: string;
  metallic: number;
  roughness: number;
  emissive: string;
  emissiveIntensity: number;
  opacity: number;
  alphaMode: "opaque" | "blend" | "mask";
}> = {
  metal: { albedo: "#c0c0c0", metallic: 0.9, roughness: 0.2, emissive: "#000000", emissiveIntensity: 0, opacity: 1.0, alphaMode: "opaque" },
  plastic: { albedo: "#e83030", metallic: 0.0, roughness: 0.4, emissive: "#000000", emissiveIntensity: 0, opacity: 1.0, alphaMode: "opaque" },
  wood: { albedo: "#8B5A2B", metallic: 0.0, roughness: 0.7, emissive: "#000000", emissiveIntensity: 0, opacity: 1.0, alphaMode: "opaque" },
  stone: { albedo: "#888888", metallic: 0.0, roughness: 0.85, emissive: "#000000", emissiveIntensity: 0, opacity: 1.0, alphaMode: "opaque" },
  glass: { albedo: "#ffffff", metallic: 0.0, roughness: 0.05, emissive: "#000000", emissiveIntensity: 0, opacity: 0.3, alphaMode: "blend" },
  fabric: { albedo: "#3366aa", metallic: 0.0, roughness: 0.9, emissive: "#000000", emissiveIntensity: 0, opacity: 1.0, alphaMode: "opaque" },
  rubber: { albedo: "#222222", metallic: 0.0, roughness: 0.95, emissive: "#000000", emissiveIntensity: 0, opacity: 1.0, alphaMode: "opaque" },
  gold: { albedo: "#FFD700", metallic: 1.0, roughness: 0.3, emissive: "#000000", emissiveIntensity: 0, opacity: 1.0, alphaMode: "opaque" },
  chrome: { albedo: "#e0e0e0", metallic: 1.0, roughness: 0.05, emissive: "#000000", emissiveIntensity: 0, opacity: 1.0, alphaMode: "opaque" },
  ceramic: { albedo: "#f5f5f0", metallic: 0.0, roughness: 0.3, emissive: "#000000", emissiveIntensity: 0, opacity: 1.0, alphaMode: "opaque" },
  emissive_red: { albedo: "#330000", metallic: 0.0, roughness: 0.5, emissive: "#ff2200", emissiveIntensity: 2.0, opacity: 1.0, alphaMode: "opaque" },
  emissive_blue: { albedo: "#000033", metallic: 0.0, roughness: 0.5, emissive: "#0044ff", emissiveIntensity: 2.0, opacity: 1.0, alphaMode: "opaque" },
};

export { MATERIAL_PRESETS };

export const useRenderSettingsStore = create<RenderSettingsState>()(
  immer((set) => ({
    settings: createDefaultRenderSettings(),
    panelOpen: false,

    updateSettings: (updates) =>
      set((state) => {
        Object.assign(state.settings, updates);
      }),

    resetSettings: () =>
      set((state) => {
        state.settings = createDefaultRenderSettings();
      }),

    togglePanel: () =>
      set((state) => {
        state.panelOpen = !state.panelOpen;
      }),

    applyPreset: (entityId, preset) =>
      set((state) => {
        // This action is handled by the caller who has access to materialStore
        // We just provide the preset data via MATERIAL_PRESETS
        void entityId;
        void preset;
        void state;
      }),
  }))
);

export { createDefaultRenderSettings };
