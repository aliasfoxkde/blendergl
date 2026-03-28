import { describe, it, expect, beforeEach } from "vitest";
import { useArmatureStore } from "@/editor/stores/armatureStore";

function makeBone(id: string, parentId: string | null = null) {
  return {
    id,
    name: id,
    parentId,
    headPosition: { x: 0, y: 0, z: 0 },
    tailPosition: { x: 0, y: 1, z: 0 },
    restPosition: { x: 0, y: 0, z: 0 },
    restRotation: { x: 0, y: 0, z: 0 },
  };
}

beforeEach(() => {
  useArmatureStore.setState({ armatures: {} });
});

describe("armatureStore", () => {
  describe("addArmature / removeArmature", () => {
    it("creates an armature with empty bones", () => {
      useArmatureStore.getState().addArmature("entity_1");
      const arm = useArmatureStore.getState().armatures["entity_1"];
      expect(arm).toBeDefined();
      expect(arm!.bones).toEqual({});
      expect(arm!.rootBoneIds).toEqual([]);
    });

    it("removes an armature", () => {
      useArmatureStore.getState().addArmature("entity_1");
      useArmatureStore.getState().removeArmature("entity_1");
      expect(useArmatureStore.getState().armatures["entity_1"]).toBeUndefined();
    });
  });

  describe("addBone / removeBone", () => {
    it("adds a root bone", () => {
      useArmatureStore.getState().addArmature("e1");
      useArmatureStore.getState().addBone("e1", makeBone("bone_1"));
      const arm = useArmatureStore.getState().armatures["e1"];
      expect(arm!.bones["bone_1"]).toBeDefined();
      expect(arm!.rootBoneIds).toContain("bone_1");
    });

    it("adds a child bone (non-root)", () => {
      useArmatureStore.getState().addArmature("e1");
      useArmatureStore.getState().addBone("e1", makeBone("bone_1"));
      useArmatureStore.getState().addBone("e1", makeBone("bone_2", "bone_1"));
      const arm = useArmatureStore.getState().armatures["e1"];
      expect(arm!.rootBoneIds).not.toContain("bone_2");
      expect(arm!.bones["bone_2"].parentId).toBe("bone_1");
    });

    it("re-parents children when removing a bone", () => {
      useArmatureStore.getState().addArmature("e1");
      useArmatureStore.getState().addBone("e1", makeBone("root"));
      useArmatureStore.getState().addBone("e1", makeBone("child", "root"));
      useArmatureStore.getState().removeBone("e1", "root");
      const arm = useArmatureStore.getState().armatures["e1"];
      expect(arm!.bones["child"].parentId).toBeNull();
      expect(arm!.rootBoneIds).toContain("child");
    });

    it("does nothing for missing armature", () => {
      useArmatureStore.getState().addBone("missing", makeBone("bone_1"));
      expect(useArmatureStore.getState().armatures).toEqual({});
    });
  });

  describe("updateBone", () => {
    it("updates bone properties", () => {
      useArmatureStore.getState().addArmature("e1");
      useArmatureStore.getState().addBone("e1", makeBone("bone_1"));
      useArmatureStore.getState().updateBone("e1", "bone_1", { name: "Updated Bone" });
      expect(useArmatureStore.getState().armatures["e1"]!.bones["bone_1"].name).toBe("Updated Bone");
    });
  });

  describe("setParentBone", () => {
    it("re-parents a root bone to another bone", () => {
      useArmatureStore.getState().addArmature("e1");
      useArmatureStore.getState().addBone("e1", makeBone("a"));
      useArmatureStore.getState().addBone("e1", makeBone("b"));
      useArmatureStore.getState().setParentBone("e1", "b", "a");
      const arm = useArmatureStore.getState().armatures["e1"];
      expect(arm!.bones["b"].parentId).toBe("a");
      expect(arm!.rootBoneIds).toEqual(["a"]);
    });

    it("makes a bone a root when setting parent to null", () => {
      useArmatureStore.getState().addArmature("e1");
      useArmatureStore.getState().addBone("e1", makeBone("a"));
      useArmatureStore.getState().addBone("e1", makeBone("b", "a"));
      useArmatureStore.getState().setParentBone("e1", "b", null);
      const arm = useArmatureStore.getState().armatures["e1"];
      expect(arm!.bones["b"].parentId).toBeNull();
      expect(arm!.rootBoneIds).toContain("b");
    });
  });
});
