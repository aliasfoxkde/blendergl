import { describe, it, expect, beforeEach } from "vitest";
import { usePoseModeStore } from "@/editor/stores/poseModeStore";

beforeEach(() => {
  usePoseModeStore.setState({
    activeArmatureEntityId: null,
    selectedBoneIds: new Set(),
    activeBoneId: null,
    poseLibrary: [],
  });
});

describe("poseModeStore", () => {
  describe("enterPoseMode / exitPoseMode", () => {
    it("enters pose mode", () => {
      usePoseModeStore.getState().enterPoseMode("arm_1");
      expect(usePoseModeStore.getState().activeArmatureEntityId).toBe("arm_1");
    });

    it("exits pose mode and clears selections", () => {
      usePoseModeStore.getState().enterPoseMode("arm_1");
      usePoseModeStore.getState().selectBone("bone_1");
      usePoseModeStore.getState().exitPoseMode();
      expect(usePoseModeStore.getState().activeArmatureEntityId).toBeNull();
      expect(usePoseModeStore.getState().selectedBoneIds.size).toBe(0);
      expect(usePoseModeStore.getState().activeBoneId).toBeNull();
    });
  });

  describe("bone selection", () => {
    it("selects a bone (non-additive)", () => {
      usePoseModeStore.getState().enterPoseMode("arm_1");
      usePoseModeStore.getState().selectBone("a");
      usePoseModeStore.getState().selectBone("b");
      expect(usePoseModeStore.getState().selectedBoneIds.size).toBe(1);
      expect(usePoseModeStore.getState().selectedBoneIds.has("b")).toBe(true);
    });

    it("additively selects bones", () => {
      usePoseModeStore.getState().enterPoseMode("arm_1");
      usePoseModeStore.getState().selectBone("a");
      usePoseModeStore.getState().selectBone("b", true);
      expect(usePoseModeStore.getState().selectedBoneIds.size).toBe(2);
    });

    it("toggles bone off on re-select", () => {
      usePoseModeStore.getState().enterPoseMode("arm_1");
      usePoseModeStore.getState().selectBone("a");
      usePoseModeStore.getState().selectBone("a", true);
      expect(usePoseModeStore.getState().selectedBoneIds.has("a")).toBe(false);
    });

    it("sets active bone", () => {
      usePoseModeStore.getState().enterPoseMode("arm_1");
      usePoseModeStore.getState().setActiveBone("bone_x");
      expect(usePoseModeStore.getState().activeBoneId).toBe("bone_x");
    });
  });

  describe("deselectAll", () => {
    it("clears bone selections but not active", () => {
      usePoseModeStore.getState().enterPoseMode("arm_1");
      usePoseModeStore.getState().selectBone("a");
      usePoseModeStore.getState().deselectAll();
      expect(usePoseModeStore.getState().selectedBoneIds.size).toBe(0);
    });
  });

  describe("pose library", () => {
    it("saves a pose", () => {
      usePoseModeStore.getState().savePose("Rest", { bone1: { x: 0, y: 0, z: 0 } }, { bone1: { x: 0, y: 0, z: 0 } });
      expect(usePoseModeStore.getState().poseLibrary.length).toBe(1);
      expect(usePoseModeStore.getState().poseLibrary[0].name).toBe("Rest");
    });

    it("overwrites existing pose with same name", () => {
      usePoseModeStore.getState().savePose("Rest", { b1: { x: 0, y: 0, z: 0 } }, {});
      usePoseModeStore.getState().savePose("Rest", { b1: { x: 10, y: 0, z: 0 } }, {});
      expect(usePoseModeStore.getState().poseLibrary.length).toBe(1);
      expect(usePoseModeStore.getState().poseLibrary[0].boneRotations.b1.x).toBe(10);
    });

    it("deletes a pose", () => {
      usePoseModeStore.getState().savePose("A", {}, {});
      usePoseModeStore.getState().savePose("B", {}, {});
      usePoseModeStore.getState().deletePose("A");
      expect(usePoseModeStore.getState().poseLibrary.length).toBe(1);
    });

    it("applies a pose by name", () => {
      usePoseModeStore.getState().savePose("Action", { bone1: { x: 45, y: 0, z: 0 } }, {});
      const pose = usePoseModeStore.getState().applyPose("Action");
      expect(pose).toBeDefined();
      expect(pose!.boneRotations.bone1.x).toBe(45);
    });

    it("returns undefined for missing pose", () => {
      expect(usePoseModeStore.getState().applyPose("missing")).toBeUndefined();
    });

    it("blends two poses at factor 0 = poseA, factor 1 = poseB", () => {
      usePoseModeStore.getState().savePose("A", { bone1: { x: 0, y: 0, z: 0 } }, {});
      usePoseModeStore.getState().savePose("B", { bone1: { x: 90, y: 0, z: 0 } }, {});
      const r0 = usePoseModeStore.getState().blendPoses("A", "B", 0);
      const r1 = usePoseModeStore.getState().blendPoses("A", "B", 1);
      const r05 = usePoseModeStore.getState().blendPoses("A", "B", 0.5);
      expect(r0!.bone1.x).toBe(0);
      expect(r1!.bone1.x).toBe(90);
      expect(r05!.bone1.x).toBeCloseTo(45);
    });

    it("returns null for missing pose in blend", () => {
      expect(usePoseModeStore.getState().blendPoses("A", "missing", 0.5)).toBeNull();
    });
  });
});
