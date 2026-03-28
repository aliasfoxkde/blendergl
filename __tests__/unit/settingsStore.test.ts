import { describe, it, expect, beforeEach } from "vitest";
import { useSettingsStore, PRINTER_PROFILES, defaultPrintSettings } from "@/editor/stores/settingsStore";

describe("settingsStore", () => {
  beforeEach(() => {
    useSettingsStore.setState({
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
      aiEnabled: false,
      aiProvider: "anthropic",
      aiApiKey: "",
      aiEndpoint: "https://api.anthropic.com",
      aiModel: "claude-sonnet-4-20250514",
      printSettings: { ...defaultPrintSettings },
    });
  });

  describe("display settings", () => {
    it("toggles grid", () => {
      useSettingsStore.getState().setShowGrid(false);
      expect(useSettingsStore.getState().showGrid).toBe(false);
    });

    it("toggles axes", () => {
      useSettingsStore.getState().setShowAxes(false);
      expect(useSettingsStore.getState().showAxes).toBe(false);
    });

    it("sets shading mode", () => {
      useSettingsStore.getState().setShadingMode("wireframe");
      expect(useSettingsStore.getState().shadingMode).toBe("wireframe");
    });
  });

  describe("snap settings", () => {
    it("toggles snap", () => {
      useSettingsStore.getState().setSnapEnabled(true);
      expect(useSettingsStore.getState().snapEnabled).toBe(true);
    });

    it("sets snap increment", () => {
      useSettingsStore.getState().setSnapIncrement(1.0);
      expect(useSettingsStore.getState().snapIncrement).toBe(1.0);
    });

    it("sets angle snap", () => {
      useSettingsStore.getState().setAngleSnap(45);
      expect(useSettingsStore.getState().angleSnap).toBe(45);
    });
  });

  describe("auto save", () => {
    it("toggles auto save", () => {
      useSettingsStore.getState().setAutoSave(false);
      expect(useSettingsStore.getState().autoSave).toBe(false);
    });
  });

  describe("theme and camera", () => {
    it("sets theme", () => {
      useSettingsStore.getState().setTheme("light");
      expect(useSettingsStore.getState().theme).toBe("light");
    });

    it("sets camera mode", () => {
      useSettingsStore.getState().setCameraMode("orthographic");
      expect(useSettingsStore.getState().cameraMode).toBe("orthographic");
    });
  });

  describe("AI settings", () => {
    it("toggles AI enabled", () => {
      useSettingsStore.getState().setAiEnabled(true);
      expect(useSettingsStore.getState().aiEnabled).toBe(true);
    });

    it("sets AI provider with defaults", () => {
      useSettingsStore.getState().setAiProvider("openai");
      expect(useSettingsStore.getState().aiProvider).toBe("openai");
      expect(useSettingsStore.getState().aiEndpoint).toBe("https://api.openai.com");
      expect(useSettingsStore.getState().aiModel).toBe("gpt-4o");
    });

    it("sets AI API key", () => {
      useSettingsStore.getState().setAiApiKey("sk-test");
      expect(useSettingsStore.getState().aiApiKey).toBe("sk-test");
    });

    it("sets AI endpoint", () => {
      useSettingsStore.getState().setAiEndpoint("https://custom.api.com");
      expect(useSettingsStore.getState().aiEndpoint).toBe("https://custom.api.com");
    });

    it("sets AI model", () => {
      useSettingsStore.getState().setAiModel("gpt-4o-mini");
      expect(useSettingsStore.getState().aiModel).toBe("gpt-4o-mini");
    });
  });

  describe("print settings", () => {
    it("updates print settings", () => {
      useSettingsStore.getState().setPrintSettings({ layerHeight: 0.1 });
      expect(useSettingsStore.getState().printSettings.layerHeight).toBe(0.1);
    });

    it("preserves other print settings on partial update", () => {
      useSettingsStore.getState().setPrintSettings({ layerHeight: 0.1 });
      expect(useSettingsStore.getState().printSettings.infillDensity).toBe(20);
    });
  });

  describe("PRINTER_PROFILES", () => {
    it("contains expected printers", () => {
      const names = PRINTER_PROFILES.map((p) => p.name);
      expect(names).toContain("Creality Ender 3");
      expect(names).toContain("Prusa MK4");
      expect(names).toContain("Bambu Lab P1S");
      expect(names).toContain("Voron 2.4");
    });

    it("all profiles have valid bed sizes", () => {
      for (const profile of PRINTER_PROFILES) {
        expect(profile.bedSize.x).toBeGreaterThan(0);
        expect(profile.bedSize.y).toBeGreaterThan(0);
        expect(profile.bedSize.z).toBeGreaterThan(0);
      }
    });
  });
});
