import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { BoneConstraint, Vec3 } from "@/editor/types";

interface ConstraintState {
  constraints: Record<string, BoneConstraint>;

  addConstraint: (constraint: Omit<BoneConstraint, "id">) => string;
  removeConstraint: (id: string) => void;
  updateConstraint: (id: string, updates: Partial<BoneConstraint>) => void;
  setConstraintEnabled: (id: string, enabled: boolean) => void;
  setConstraintInfluence: (id: string, influence: number) => void;
  setConstraintTarget: (id: string, targetBoneId: string | null, targetPosition: Vec3 | null) => void;
  getBoneConstraints: (boneId: string) => BoneConstraint[];
  evaluateConstraints: (
    bones: Record<string, { restPosition: Vec3; restRotation: Vec3; parentId: string | null }>,
  ) => Record<string, { position: Vec3; rotation: Vec3 }>;
}

let nextConstraintId = 1;

export const useConstraintStore = create<ConstraintState>()(
  immer((set, get) => ({
    constraints: {},

    addConstraint: (constraint) => {
      const id = `constraint_${nextConstraintId++}`;
      set((state) => {
        state.constraints[id] = { ...constraint, id };
      });
      return id;
    },

    removeConstraint: (id) =>
      set((state) => {
        delete state.constraints[id];
      }),

    updateConstraint: (id, updates) =>
      set((state) => {
        const c = state.constraints[id];
        if (c) Object.assign(c, updates);
      }),

    setConstraintEnabled: (id, enabled) =>
      set((state) => {
        const c = state.constraints[id];
        if (c) c.enabled = enabled;
      }),

    setConstraintInfluence: (id, influence) =>
      set((state) => {
        const c = state.constraints[id];
        if (c) c.influence = Math.max(0, Math.min(1, influence));
      }),

    setConstraintTarget: (id, targetBoneId, targetPosition) =>
      set((state) => {
        const c = state.constraints[id];
        if (c) {
          c.targetBoneId = targetBoneId;
          c.targetPosition = targetPosition;
        }
      }),

    getBoneConstraints: (boneId) => {
      return Object.values(get().constraints).filter(
        (c) => c.boneId === boneId && c.enabled,
      );
    },

    evaluateConstraints: (bones) => {
      const result: Record<string, { position: Vec3; rotation: Vec3 }> = {};
      const constraints = get().constraints;

      // Initialize result with rest poses
      for (const [boneId, bone] of Object.entries(bones)) {
        result[boneId] = {
          position: { ...bone.restPosition },
          rotation: { ...bone.restRotation },
        };
      }

      // Evaluate constraints in order
      const orderedConstraints = Object.values(constraints)
        .filter((c) => c.enabled)
        .sort((a, b) => {
          // IK constraints evaluate last
          if (a.type === "ik" && b.type !== "ik") return 1;
          if (a.type !== "ik" && b.type === "ik") return -1;
          return 0;
        });

      for (const constraint of orderedConstraints) {
        const boneResult = result[constraint.boneId];
        if (!boneResult) continue;

        switch (constraint.type) {
          case "look_at": {
            const target = constraint.targetPosition;
            if (!target) break;
            const dx = target.x - boneResult.position.x;
            const dz = target.z - boneResult.position.z;
            const targetRotY = Math.atan2(-dx, dz) * (180 / Math.PI);
            boneResult.rotation.y = lerp(
              boneResult.rotation.y,
              targetRotY,
              constraint.influence,
            );
            break;
          }

          case "track_to": {
            const target = constraint.targetPosition;
            if (!target) break;
            const dx = target.x - boneResult.position.x;
            const dy = target.y - boneResult.position.y;
            const dz = target.z - boneResult.position.z;
            const targetRotX = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz)) * (180 / Math.PI);
            const targetRotY = Math.atan2(-dx, dz) * (180 / Math.PI);
            boneResult.rotation.x = lerp(
              boneResult.rotation.x,
              targetRotX,
              constraint.influence,
            );
            boneResult.rotation.y = lerp(
              boneResult.rotation.y,
              targetRotY,
              constraint.influence,
            );
            break;
          }

          case "limit": {
            const minRot = constraint.settings.minRot as number | undefined;
            const maxRot = constraint.settings.maxRot as number | undefined;
            const axis = (constraint.settings.axis as string) || "z";
            if (minRot !== undefined) {
              boneResult.rotation[axis as keyof Vec3] = Math.max(
                minRot,
                boneResult.rotation[axis as keyof Vec3],
              );
            }
            if (maxRot !== undefined) {
              boneResult.rotation[axis as keyof Vec3] = Math.min(
                maxRot,
                boneResult.rotation[axis as keyof Vec3],
              );
            }
            break;
          }

          case "parent": {
            const parentBoneId = constraint.targetBoneId;
            if (parentBoneId && result[parentBoneId]) {
              const parent = result[parentBoneId];
              boneResult.position.x = lerp(
                boneResult.position.x,
                parent.position.x,
                constraint.influence,
              );
              boneResult.position.y = lerp(
                boneResult.position.y,
                parent.position.y,
                constraint.influence,
              );
              boneResult.position.z = lerp(
                boneResult.position.z,
                parent.position.z,
                constraint.influence,
              );
            }
            break;
          }

          // IK is handled separately by the IK solver at runtime
          case "ik":
            break;
        }
      }

      return result;
    },
  })),
);

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
