import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { BoneData, ArmatureComponent } from "@/editor/types";

interface ArmatureState {
  armatures: Record<string, ArmatureComponent>;

  addArmature: (entityId: string) => void;
  removeArmature: (entityId: string) => void;
  addBone: (entityId: string, bone: BoneData) => void;
  removeBone: (entityId: string, boneId: string) => void;
  updateBone: (entityId: string, boneId: string, updates: Partial<BoneData>) => void;
  setParentBone: (entityId: string, boneId: string, parentId: string | null) => void;
}

export const useArmatureStore = create<ArmatureState>()(
  immer((set) => ({
    armatures: {},

    addArmature: (entityId) =>
      set((state) => {
        state.armatures[entityId] = {
          type: "armature",
          bones: {},
          rootBoneIds: [],
        };
      }),

    removeArmature: (entityId) =>
      set((state) => {
        delete state.armatures[entityId];
      }),

    addBone: (entityId, bone) =>
      set((state) => {
        const arm = state.armatures[entityId];
        if (!arm) return;
        arm.bones[bone.id] = bone;
        if (bone.parentId === null) {
          arm.rootBoneIds.push(bone.id);
        }
      }),

    removeBone: (entityId, boneId) =>
      set((state) => {
        const arm = state.armatures[entityId];
        if (!arm) return;
        const bone = arm.bones[boneId];
        if (!bone) return;
        // Re-parent children to bone's parent
        for (const child of Object.values(arm.bones)) {
          if (child.parentId === boneId) {
            child.parentId = bone.parentId;
            if (bone.parentId === null) {
              arm.rootBoneIds.push(child.id);
            }
          }
        }
        // Remove from root if root
        arm.rootBoneIds = arm.rootBoneIds.filter((id) => id !== boneId);
        delete arm.bones[boneId];
      }),

    updateBone: (entityId, boneId, updates) =>
      set((state) => {
        const arm = state.armatures[entityId];
        if (!arm || !arm.bones[boneId]) return;
        Object.assign(arm.bones[boneId], updates);
      }),

    setParentBone: (entityId, boneId, parentId) =>
      set((state) => {
        const arm = state.armatures[entityId];
        if (!arm || !arm.bones[boneId]) return;
        const bone = arm.bones[boneId];
        // Remove from old parent's children list (root or bone)
        if (bone.parentId === null) {
          arm.rootBoneIds = arm.rootBoneIds.filter((id) => id !== boneId);
        }
        bone.parentId = parentId;
        if (parentId === null) {
          arm.rootBoneIds.push(boneId);
        }
      }),
  }))
);
