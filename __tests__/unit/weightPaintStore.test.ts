import { describe, it, expect, beforeEach } from "vitest";
import { useWeightPaintStore } from "@/editor/stores/weightPaintStore";

beforeEach(() => {
  useWeightPaintStore.setState({
    settings: {
      mode: "paint",
      brushRadius: 30,
      brushStrength: 0.3,
      brushFalloff: "smooth",
      activeBoneId: null,
      normalizeWeights: true,
      mirrorX: false,
    },
    skinWeights: {},
    activeEntityId: null,
    showWeightHeatmap: true,
  });
});

describe("weightPaintStore", () => {
  describe("enterWeightPaintMode / exitWeightPaintMode", () => {
    it("enters weight paint mode and initializes skin weights", () => {
      useWeightPaintStore.getState().enterWeightPaintMode("e1");
      expect(useWeightPaintStore.getState().activeEntityId).toBe("e1");
      expect(useWeightPaintStore.getState().skinWeights["e1"]).toBeDefined();
    });

    it("exits weight paint mode", () => {
      useWeightPaintStore.getState().enterWeightPaintMode("e1");
      useWeightPaintStore.getState().exitWeightPaintMode();
      expect(useWeightPaintStore.getState().activeEntityId).toBeNull();
    });
  });

  describe("settings", () => {
    it("sets mode", () => {
      useWeightPaintStore.getState().setMode("blur");
      expect(useWeightPaintStore.getState().settings.mode).toBe("blur");
    });

    it("sets brush radius", () => {
      useWeightPaintStore.getState().setBrushRadius(50);
      expect(useWeightPaintStore.getState().settings.brushRadius).toBe(50);
    });

    it("sets brush strength", () => {
      useWeightPaintStore.getState().setBrushStrength(0.8);
      expect(useWeightPaintStore.getState().settings.brushStrength).toBe(0.8);
    });

    it("sets brush falloff", () => {
      useWeightPaintStore.getState().setBrushFalloff("sharp");
      expect(useWeightPaintStore.getState().settings.brushFalloff).toBe("sharp");
    });

    it("sets active bone", () => {
      useWeightPaintStore.getState().setActiveBone("bone_1");
      expect(useWeightPaintStore.getState().settings.activeBoneId).toBe("bone_1");
    });

    it("toggles normalize weights", () => {
      useWeightPaintStore.getState().toggleNormalizeWeights();
      expect(useWeightPaintStore.getState().settings.normalizeWeights).toBe(false);
    });

    it("toggles mirror X", () => {
      useWeightPaintStore.getState().toggleMirrorX();
      expect(useWeightPaintStore.getState().settings.mirrorX).toBe(true);
    });

    it("toggles show heatmap", () => {
      useWeightPaintStore.getState().toggleShowHeatmap();
      expect(useWeightPaintStore.getState().showWeightHeatmap).toBe(false);
    });
  });

  describe("paintWeight", () => {
    it("paints weight on a vertex", () => {
      useWeightPaintStore.getState().enterWeightPaintMode("e1");
      useWeightPaintStore.getState().setActiveBone("bone_1");
      useWeightPaintStore.getState().paintWeight("e1", "bone_1", 0, 0.5, "smooth");
      // normalizeWeights is true, so single bone weight gets normalized to 1.0
      expect(useWeightPaintStore.getState().getVertexWeight("e1", "bone_1", 0)).toBe(1.0);
    });

    it("clamps weight to [0, 1]", () => {
      useWeightPaintStore.getState().enterWeightPaintMode("e1");
      useWeightPaintStore.getState().setActiveBone("bone_1");
      useWeightPaintStore.getState().paintWeight("e1", "bone_1", 0, 2.0, "smooth");
      expect(useWeightPaintStore.getState().getVertexWeight("e1", "bone_1", 0)).toBe(1.0);
    });

    it("normalizes weights across bones for same vertex", () => {
      useWeightPaintStore.getState().enterWeightPaintMode("e1");
      useWeightPaintStore.getState().paintWeight("e1", "bone_a", 0, 1.0, "smooth");
      useWeightPaintStore.getState().paintWeight("e1", "bone_b", 0, 1.0, "smooth");
      const wa = useWeightPaintStore.getState().getVertexWeight("e1", "bone_a", 0);
      const wb = useWeightPaintStore.getState().getVertexWeight("e1", "bone_b", 0);
      expect(wa + wb).toBeCloseTo(1.0);
    });
  });

  describe("getVertexWeight", () => {
    it("returns 0 for missing entity", () => {
      expect(useWeightPaintStore.getState().getVertexWeight("missing", "b", 0)).toBe(0);
    });

    it("returns 0 for missing bone", () => {
      useWeightPaintStore.getState().enterWeightPaintMode("e1");
      expect(useWeightPaintStore.getState().getVertexWeight("e1", "missing", 0)).toBe(0);
    });

    it("returns 0 for out-of-range vertex", () => {
      useWeightPaintStore.getState().enterWeightPaintMode("e1");
      expect(useWeightPaintStore.getState().getVertexWeight("e1", "b", 999)).toBe(0);
    });
  });

  describe("blurWeights", () => {
    it("blurs vertex weight with neighbors", () => {
      useWeightPaintStore.getState().enterWeightPaintMode("e1");
      useWeightPaintStore.getState().paintWeight("e1", "b1", 0, 1.0, "smooth");
      useWeightPaintStore.getState().paintWeight("e1", "b1", 1, 0.0, "smooth");
      useWeightPaintStore.getState().paintWeight("e1", "b1", 2, 0.0, "smooth");
      useWeightPaintStore.getState().blurWeights("e1", "b1", 1, 1);
      const w = useWeightPaintStore.getState().getVertexWeight("e1", "b1", 1);
      expect(w).toBeGreaterThan(0);
      expect(w).toBeLessThan(1);
    });
  });

  describe("autoWeight", () => {
    it("assigns weights based on distance to bones", () => {
      const bones = {
        bone_a: { restPosition: { x: -1, y: 0, z: 0 } },
        bone_b: { restPosition: { x: 1, y: 0, z: 0 } },
      };
      const positions = new Float32Array([0, 0, 0]);
      useWeightPaintStore.getState().autoWeight("e1", bones, positions);
      const wa = useWeightPaintStore.getState().getVertexWeight("e1", "bone_a", 0);
      const wb = useWeightPaintStore.getState().getVertexWeight("e1", "bone_b", 0);
      expect(wa + wb).toBeCloseTo(1.0);
    });
  });
});
