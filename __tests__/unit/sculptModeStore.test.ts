import { describe, it, expect, beforeEach } from "vitest";
import { useSculptModeStore } from "@/editor/stores/sculptModeStore";

beforeEach(() => {
  useSculptModeStore.setState({
    activeMeshEntityId: null,
    brush: { type: "sculpt", radius: 0.3, strength: 0.3, falloff: "smooth", spacing: 0.15, usePressure: false },
    symmetry: { x: false, y: false, z: false },
    isSculpting: false,
    showBrushCursor: true,
    dyntopo: { enabled: false, detailSize: 0.1, subdivideEdges: true, collapseEdges: true },
    multires: { levels: 0, currentLevel: 0 },
    masks: {},
    faceSets: {},
    hiddenFaceSets: {},
  });
});

describe("sculptModeStore", () => {
  describe("enterSculptMode / exitSculptMode", () => {
    it("enters sculpt mode", () => {
      useSculptModeStore.getState().enterSculptMode("mesh_1");
      expect(useSculptModeStore.getState().activeMeshEntityId).toBe("mesh_1");
    });

    it("exits sculpt mode and clears isSculpting", () => {
      useSculptModeStore.getState().enterSculptMode("mesh_1");
      useSculptModeStore.getState().setIsSculpting(true);
      useSculptModeStore.getState().exitSculptMode();
      expect(useSculptModeStore.getState().activeMeshEntityId).toBeNull();
      expect(useSculptModeStore.getState().isSculpting).toBe(false);
    });
  });

  describe("brush settings", () => {
    it("sets brush type", () => {
      useSculptModeStore.getState().setBrushType("flatten");
      expect(useSculptModeStore.getState().brush.type).toBe("flatten");
    });

    it("clamps brush radius to [0.01, 5.0]", () => {
      useSculptModeStore.getState().setBrushRadius(10);
      expect(useSculptModeStore.getState().brush.radius).toBe(5.0);
      useSculptModeStore.getState().setBrushRadius(0.001);
      expect(useSculptModeStore.getState().brush.radius).toBe(0.01);
    });

    it("clamps brush strength to [0.01, 1.0]", () => {
      useSculptModeStore.getState().setBrushStrength(2);
      expect(useSculptModeStore.getState().brush.strength).toBe(1.0);
      useSculptModeStore.getState().setBrushStrength(0);
      expect(useSculptModeStore.getState().brush.strength).toBe(0.01);
    });

    it("clamps spacing to [0.05, 1.0]", () => {
      useSculptModeStore.getState().setSpacing(2);
      expect(useSculptModeStore.getState().brush.spacing).toBe(1.0);
    });
  });

  describe("symmetry", () => {
    it("toggles X symmetry", () => {
      useSculptModeStore.getState().toggleSymmetryX();
      expect(useSculptModeStore.getState().symmetry.x).toBe(true);
      useSculptModeStore.getState().toggleSymmetryX();
      expect(useSculptModeStore.getState().symmetry.x).toBe(false);
    });

    it("toggles Y and Z symmetry", () => {
      useSculptModeStore.getState().toggleSymmetryY();
      expect(useSculptModeStore.getState().symmetry.y).toBe(true);
      useSculptModeStore.getState().toggleSymmetryZ();
      expect(useSculptModeStore.getState().symmetry.z).toBe(true);
    });
  });

  describe("dyntopo", () => {
    it("toggles dyntopo", () => {
      useSculptModeStore.getState().toggleDyntopo();
      expect(useSculptModeStore.getState().dyntopo.enabled).toBe(true);
    });

    it("clamps detail size", () => {
      useSculptModeStore.getState().setDyntopoDetailSize(2);
      expect(useSculptModeStore.getState().dyntopo.detailSize).toBe(1.0);
    });
  });

  describe("multires", () => {
    it("adds multires level", () => {
      useSculptModeStore.getState().addMultiresLevel();
      useSculptModeStore.getState().addMultiresLevel();
      expect(useSculptModeStore.getState().multires.levels).toBe(2);
      expect(useSculptModeStore.getState().multires.currentLevel).toBe(2);
    });

    it("removes multires level and adjusts current", () => {
      useSculptModeStore.getState().addMultiresLevel();
      useSculptModeStore.getState().addMultiresLevel();
      useSculptModeStore.getState().removeMultiresLevel();
      expect(useSculptModeStore.getState().multires.levels).toBe(1);
      expect(useSculptModeStore.getState().multires.currentLevel).toBe(1);
    });

    it("does not go below 0 levels", () => {
      useSculptModeStore.getState().removeMultiresLevel();
      expect(useSculptModeStore.getState().multires.levels).toBe(0);
    });

    it("clamps setMultiresLevel", () => {
      useSculptModeStore.getState().addMultiresLevel();
      useSculptModeStore.getState().setMultiresLevel(5);
      expect(useSculptModeStore.getState().multires.currentLevel).toBe(1);
    });
  });

  describe("mask operations", () => {
    it("initializes mask", () => {
      useSculptModeStore.getState().initMask("e1", 100);
      const mask = useSculptModeStore.getState().masks["e1"];
      expect(mask).toBeInstanceOf(Float32Array);
      expect(mask.length).toBe(100);
    });

    it("inverts mask", () => {
      useSculptModeStore.getState().initMask("e1", 4);
      const mask = useSculptModeStore.getState().masks["e1"];
      mask[0] = 0.2;
      mask[1] = 0.8;
      useSculptModeStore.getState().invertMask("e1");
      expect(useSculptModeStore.getState().masks["e1"][0]).toBeCloseTo(0.8);
      expect(useSculptModeStore.getState().masks["e1"][1]).toBeCloseTo(0.2);
    });

    it("clears mask", () => {
      useSculptModeStore.getState().initMask("e1", 4);
      const mask = useSculptModeStore.getState().masks["e1"];
      mask[0] = 0.5;
      useSculptModeStore.getState().clearMask("e1");
      expect(useSculptModeStore.getState().masks["e1"][0]).toBe(0);
    });
  });

  describe("face set operations", () => {
    it("creates face set on existing data", () => {
      useSculptModeStore.getState().faceSets["e1"] = new Int32Array(6).fill(-1);
      useSculptModeStore.getState().createFaceSet("e1", [0, 1, 2]);
      const fs = useSculptModeStore.getState().faceSets["e1"];
      // All 3 indices should be set to the same face set ID (not -1)
      expect(fs[0]).not.toBe(-1);
      expect(fs[1]).not.toBe(-1);
      expect(fs[2]).not.toBe(-1);
      // All three should have the same face set ID
      expect(fs[0]).toBe(fs[1]);
      expect(fs[1]).toBe(fs[2]);
      // Indices outside the passed array are untouched
      expect(fs[3]).toBe(-1);
      expect(fs[4]).toBe(-1);
      expect(fs[5]).toBe(-1);
    });

    it("clears face sets", () => {
      useSculptModeStore.getState().faceSets["e1"] = new Int32Array(3).fill(1);
      useSculptModeStore.getState().hiddenFaceSets["e1"] = [1];
      useSculptModeStore.getState().clearFaceSets("e1");
      expect(useSculptModeStore.getState().faceSets["e1"][0]).toBe(-1);
      expect(useSculptModeStore.getState().hiddenFaceSets["e1"]).toEqual([]);
    });

    it("toggles face set visibility", () => {
      useSculptModeStore.getState().toggleFaceSetVisibility("e1", 1);
      expect(useSculptModeStore.getState().hiddenFaceSets["e1"]).toContain(1);
      useSculptModeStore.getState().toggleFaceSetVisibility("e1", 1);
      expect(useSculptModeStore.getState().hiddenFaceSets["e1"]).toEqual([]);
    });

    it("shows all face sets", () => {
      useSculptModeStore.getState().hiddenFaceSets["e1"] = [1, 2, 3];
      useSculptModeStore.getState().showAllFaceSets("e1");
      expect(useSculptModeStore.getState().hiddenFaceSets["e1"]).toEqual([]);
    });
  });
});
