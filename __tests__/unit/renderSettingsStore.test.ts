import { describe, it, expect, beforeEach } from "vitest";
import { useRenderSettingsStore, createDefaultRenderSettings, MATERIAL_PRESETS } from "@/editor/stores/renderSettingsStore";

beforeEach(() => {
  useRenderSettingsStore.setState({
    settings: createDefaultRenderSettings(),
    panelOpen: false,
  });
});

describe("renderSettingsStore", () => {
  it("has sensible defaults", () => {
    const s = useRenderSettingsStore.getState().settings;
    expect(s.toneMapping).toBe("aces");
    expect(s.exposure).toBe(1.0);
    expect(s.antiAliasing).toBe("fxaa");
    expect(s.bloomEnabled).toBe(true);
    expect(s.shadowsEnabled).toBe(true);
    expect(s.renderWidth).toBe(1920);
    expect(s.renderHeight).toBe(1080);
  });

  it("updates individual settings", () => {
    useRenderSettingsStore.getState().updateSettings({ exposure: 2.0 });
    expect(useRenderSettingsStore.getState().settings.exposure).toBe(2.0);
  });

  it("updates multiple settings at once", () => {
    useRenderSettingsStore.getState().updateSettings({
      exposure: 1.5,
      toneMapping: "reinhard",
      bloomEnabled: false,
    });
    const s = useRenderSettingsStore.getState().settings;
    expect(s.exposure).toBe(1.5);
    expect(s.toneMapping).toBe("reinhard");
    expect(s.bloomEnabled).toBe(false);
  });

  it("resets to defaults", () => {
    useRenderSettingsStore.getState().updateSettings({ exposure: 5, gamma: 1 });
    useRenderSettingsStore.getState().resetSettings();
    const s = useRenderSettingsStore.getState().settings;
    expect(s.exposure).toBe(1.0);
    expect(s.gamma).toBe(2.2);
  });

  it("toggles panel", () => {
    useRenderSettingsStore.getState().togglePanel();
    expect(useRenderSettingsStore.getState().panelOpen).toBe(true);
    useRenderSettingsStore.getState().togglePanel();
    expect(useRenderSettingsStore.getState().panelOpen).toBe(false);
  });

  it("MATERIAL_PRESETS contains expected presets", () => {
    expect(MATERIAL_PRESETS.metal).toBeDefined();
    expect(MATERIAL_PRESETS.glass).toBeDefined();
    expect(MATERIAL_PRESETS.gold).toBeDefined();
    expect(MATERIAL_PRESETS.rubber).toBeDefined();
  });

  it("metal preset has high metallic and low roughness", () => {
    expect(MATERIAL_PRESETS.metal.metallic).toBe(0.9);
    expect(MATERIAL_PRESETS.metal.roughness).toBe(0.2);
  });

  it("glass preset has low opacity and blend alpha mode", () => {
    expect(MATERIAL_PRESETS.glass.opacity).toBe(0.3);
    expect(MATERIAL_PRESETS.glass.alphaMode).toBe("blend");
  });
});
