import { describe, it, expect } from "vitest";
import {
  solveCCD,
  solveLookAt,
  solveTwoBoneIK,
  computeBoneWorldTransforms,
} from "@/editor/utils/ikSolver";
import type { BoneData } from "@/editor/types";

function makeBone(id: string, parentId: string | null, length = 1): BoneData {
  return {
    id,
    name: id,
    parentId,
    restPosition: { x: 0, y: 0, z: 0 },
    restRotation: { x: 0, y: 0, z: 0 },
    restScale: { x: 1, y: 1, z: 1 },
    length,
  };
}

describe("ikSolver", () => {
  describe("solveLookAt", () => {
    it("rotates to look at target in +Z direction", () => {
      const result = solveLookAt(
        { position: { x: 0, y: 0, z: 0 }, forward: { x: 0, y: 0, z: 1 } },
        { x: 0, y: 0, z: 10 },
      );
      expect(result.x).toBe(0);
      expect(result.y).toBeCloseTo(0);
      expect(result.z).toBe(0);
    });

    it("rotates to look at target in +X direction", () => {
      const result = solveLookAt(
        { position: { x: 0, y: 0, z: 0 }, forward: { x: 0, y: 0, z: 1 } },
        { x: 10, y: 0, z: 0 },
      );
      expect(result.y).toBeCloseTo(-Math.PI / 2);
    });

    it("rotates to look at target in -Z direction", () => {
      const result = solveLookAt(
        { position: { x: 0, y: 0, z: 0 }, forward: { x: 0, y: 0, z: 1 } },
        { x: 0, y: 0, z: -10 },
      );
      // atan2(-0, -10) = -PI (signed zero makes atan2 return -PI)
      expect(Math.abs(result.y)).toBeCloseTo(Math.PI);
    });
  });

  describe("solveTwoBoneIK", () => {
    it("returns angles for a reachable target", () => {
      const result = solveTwoBoneIK(
        { x: 0, y: 0, z: 0 },
        2, 2,
        { x: 0, y: 3, z: 0 },
      );
      expect(result.shoulderAngle).toBeGreaterThan(0);
      expect(result.elbowAngle).toBeGreaterThan(0);
      expect(result.elbowAngle).toBeLessThan(Math.PI);
    });

    it("returns angles for a target at max reach", () => {
      const result = solveTwoBoneIK(
        { x: 0, y: 0, z: 0 },
        3, 3,
        { x: 6, y: 0, z: 0 },
      );
      // At max reach, elbow is nearly straight (small angle due to clamping epsilon)
      expect(result.elbowAngle).toBeCloseTo(0, 0.5);
    });

    it("clamps to min reach when target too close", () => {
      const result = solveTwoBoneIK(
        { x: 0, y: 0, z: 0 },
        3, 3,
        { x: 0.1, y: 0, z: 0 },
      );
      expect(result.shoulderAngle).toBeGreaterThan(0);
      expect(result.elbowAngle).toBeGreaterThan(0);
    });
  });

  describe("solveCCD", () => {
    it("returns empty for single-bone chain", () => {
      const bones: Record<string, BoneData> = { root: makeBone("root", null) };
      const result = solveCCD(bones, "root", "root", { x: 5, y: 5, z: 0 }, {});
      expect(result).toEqual({});
    });

    it("returns rotations for a valid bone chain", () => {
      const bones: Record<string, BoneData> = {
        root: makeBone("root", null, 1),
        mid: makeBone("mid", "root", 1),
        end: makeBone("end", "mid", 1),
      };
      const worldTransforms: Record<string, { position: { x: number; y: number; z: number }; forward: { x: number; y: number; z: number } }> = {
        root: { position: { x: 0, y: 1, z: 0 }, forward: { x: 0, y: 1, z: 0 } },
        mid: { position: { x: 0, y: 2, z: 0 }, forward: { x: 0, y: 1, z: 0 } },
        end: { position: { x: 0, y: 3, z: 0 }, forward: { x: 0, y: 1, z: 0 } },
      };

      const result = solveCCD(bones, "root", "end", { x: 2, y: 3, z: 0 }, worldTransforms);
      expect(Object.keys(result)).toContain("root");
      expect(Object.keys(result)).toContain("mid");
      expect(Object.keys(result)).toContain("end");
    });

    it("returns empty for non-existent bone", () => {
      const result = solveCCD({}, "root", "end", { x: 0, y: 0, z: 0 }, {});
      expect(result).toEqual({});
    });
  });

  describe("computeBoneWorldTransforms", () => {
    it("computes transforms for a single root bone", () => {
      const bones: Record<string, BoneData> = {
        root: makeBone("root", null, 2),
      };
      const transforms = computeBoneWorldTransforms(bones, ["root"]);
      expect(transforms["root"]).toBeDefined();
      // Zero rotation: forward = (0, 0, -1), so bone extends in -Z direction
      expect(transforms["root"].position.z).toBe(-2);
    });

    it("computes transforms for a parent-child chain", () => {
      const bones: Record<string, BoneData> = {
        upper: makeBone("upper", null, 2),
        lower: makeBone("lower", "upper", 2),
      };
      const transforms = computeBoneWorldTransforms(bones, ["upper"]);
      expect(transforms["upper"]).toBeDefined();
      expect(transforms["lower"]).toBeDefined();
      // Both extend in -Z; child should be further in -Z than parent
      expect(transforms["lower"].position.z).toBeLessThan(transforms["upper"].position.z);
    });

    it("handles rotated bone", () => {
      const bones: Record<string, BoneData> = {
        bone: { ...makeBone("bone", null, 2), restRotation: { x: 0, y: Math.PI / 2, z: 0 } },
      };
      const transforms = computeBoneWorldTransforms(bones, ["bone"]);
      expect(transforms["bone"]).toBeDefined();
      // Rotated 90 degrees on Y: forward.x = -sin(PI/2)*cos(0) = -1
      // So bone extends in -X direction
      expect(transforms["bone"].position.x).toBe(-2);
    });

    it("uses default length when bone has zero length", () => {
      const bones: Record<string, BoneData> = {
        bone: makeBone("bone", null, 0),
      };
      const transforms = computeBoneWorldTransforms(bones, ["bone"]);
      expect(transforms["bone"]).toBeDefined();
      // length=0 means boneLength = 0 || 0.5 = 0.5, so position advances 0.5 in -Z
      expect(transforms["bone"].position.z).toBe(-0.5);
    });
  });
});
