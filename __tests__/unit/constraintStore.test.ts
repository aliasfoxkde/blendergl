import { describe, it, expect, beforeEach } from "vitest";
import { useConstraintStore } from "@/editor/stores/constraintStore";

beforeEach(() => {
  useConstraintStore.setState({ constraints: {} });
});

describe("constraintStore", () => {
  describe("addConstraint / removeConstraint", () => {
    it("adds a constraint and returns ID", () => {
      const id = useConstraintStore.getState().addConstraint({
        boneId: "bone_1",
        type: "look_at",
        enabled: true,
        influence: 1.0,
        targetBoneId: null,
        targetPosition: { x: 1, y: 0, z: 0 },
        settings: {},
      });
      expect(id).toBeTruthy();
      expect(useConstraintStore.getState().constraints[id].type).toBe("look_at");
    });

    it("removes a constraint", () => {
      const id = useConstraintStore.getState().addConstraint({
        boneId: "bone_1",
        type: "limit",
        enabled: true,
        influence: 1.0,
        targetBoneId: null,
        targetPosition: null,
        settings: { minRot: -45, maxRot: 45, axis: "z" },
      });
      useConstraintStore.getState().removeConstraint(id);
      expect(useConstraintStore.getState().constraints[id]).toBeUndefined();
    });
  });

  describe("updateConstraint", () => {
    it("updates constraint fields", () => {
      const id = useConstraintStore.getState().addConstraint({
        boneId: "bone_1",
        type: "limit",
        enabled: true,
        influence: 0.5,
        targetBoneId: null,
        targetPosition: null,
        settings: { minRot: -90, maxRot: 90, axis: "x" },
      });
      useConstraintStore.getState().updateConstraint(id, { influence: 0.8 });
      expect(useConstraintStore.getState().constraints[id].influence).toBe(0.8);
    });
  });

  describe("setConstraintInfluence", () => {
    it("clamps influence to [0, 1]", () => {
      const id = useConstraintStore.getState().addConstraint({
        boneId: "bone_1",
        type: "look_at",
        enabled: true,
        influence: 0.5,
        targetBoneId: null,
        targetPosition: { x: 0, y: 0, z: 0 },
        settings: {},
      });
      useConstraintStore.getState().setConstraintInfluence(id, 2.0);
      expect(useConstraintStore.getState().constraints[id].influence).toBe(1.0);
      useConstraintStore.getState().setConstraintInfluence(id, -0.5);
      expect(useConstraintStore.getState().constraints[id].influence).toBe(0.0);
    });
  });

  describe("getBoneConstraints", () => {
    it("returns only enabled constraints for a bone", () => {
      useConstraintStore.getState().addConstraint({
        boneId: "bone_1",
        type: "look_at",
        enabled: true,
        influence: 1.0,
        targetBoneId: null,
        targetPosition: { x: 1, y: 0, z: 0 },
        settings: {},
      });
      useConstraintStore.getState().addConstraint({
        boneId: "bone_1",
        type: "limit",
        enabled: false,
        influence: 1.0,
        targetBoneId: null,
        targetPosition: null,
        settings: {},
      });
      const constraints = useConstraintStore.getState().getBoneConstraints("bone_1");
      expect(constraints.length).toBe(1);
      expect(constraints[0].type).toBe("look_at");
    });
  });

  describe("evaluateConstraints", () => {
    it("initializes result with rest poses", () => {
      const bones = {
        bone_1: { restPosition: { x: 0, y: 1, z: 0 }, restRotation: { x: 0, y: 0, z: 0 }, parentId: null },
      };
      const result = useConstraintStore.getState().evaluateConstraints(bones);
      expect(result.bone_1.position).toEqual({ x: 0, y: 1, z: 0 });
    });

    it("applies look_at constraint rotation", () => {
      const id = useConstraintStore.getState().addConstraint({
        boneId: "bone_1",
        type: "look_at",
        enabled: true,
        influence: 1.0,
        targetBoneId: null,
        targetPosition: { x: 1, y: 0, z: 0 },
        settings: {},
      });
      const bones = {
        bone_1: { restPosition: { x: 0, y: 0, z: 0 }, restRotation: { x: 0, y: 0, z: 0 }, parentId: null },
      };
      const result = useConstraintStore.getState().evaluateConstraints(bones);
      expect(result.bone_1.rotation.y).not.toBe(0);
    });

    it("applies limit constraint", () => {
      useConstraintStore.getState().addConstraint({
        boneId: "bone_1",
        type: "limit",
        enabled: true,
        influence: 1.0,
        targetBoneId: null,
        targetPosition: null,
        settings: { minRot: -30, maxRot: 30, axis: "z" },
      });
      const bones = {
        bone_1: { restPosition: { x: 0, y: 0, z: 0 }, restRotation: { x: 0, y: 0, z: 90 }, parentId: null },
      };
      const result = useConstraintStore.getState().evaluateConstraints(bones);
      expect(result.bone_1.rotation.z).toBe(30);
    });

    it("applies parent constraint with influence", () => {
      useConstraintStore.getState().addConstraint({
        boneId: "child",
        type: "parent",
        enabled: true,
        influence: 0.5,
        targetBoneId: "parent",
        targetPosition: null,
        settings: {},
      });
      const bones = {
        parent: { restPosition: { x: 10, y: 0, z: 0 }, restRotation: { x: 0, y: 0, z: 0 }, parentId: null },
        child: { restPosition: { x: 0, y: 0, z: 0 }, restRotation: { x: 0, y: 0, z: 0 }, parentId: null },
      };
      const result = useConstraintStore.getState().evaluateConstraints(bones);
      expect(result.child.position.x).toBe(5);
    });

    it("orders IK constraints last", () => {
      useConstraintStore.getState().addConstraint({
        boneId: "bone_1",
        type: "look_at",
        enabled: true,
        influence: 1.0,
        targetBoneId: null,
        targetPosition: { x: 1, y: 0, z: 0 },
        settings: {},
      });
      useConstraintStore.getState().addConstraint({
        boneId: "bone_1",
        type: "ik",
        enabled: true,
        influence: 1.0,
        targetBoneId: null,
        targetPosition: null,
        settings: {},
      });
      const bones = {
        bone_1: { restPosition: { x: 0, y: 0, z: 0 }, restRotation: { x: 0, y: 0, z: 0 }, parentId: null },
      };
      const result = useConstraintStore.getState().evaluateConstraints(bones);
      expect(result.bone_1.rotation.y).not.toBe(0);
    });
  });
});
