import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Vec3 } from "@/editor/types";

export interface PoseData {
  name: string;
  boneRotations: Record<string, Vec3>;
  bonePositions: Record<string, Vec3>;
}

interface PoseModeState {
  activeArmatureEntityId: string | null;
  selectedBoneIds: Set<string>;
  activeBoneId: string | null;
  poseLibrary: PoseData[];

  enterPoseMode: (entityId: string) => void;
  exitPoseMode: () => void;
  selectBone: (boneId: string, additive?: boolean) => void;
  deselectAll: () => void;
  setActiveBone: (boneId: string | null) => void;
  savePose: (name: string, boneRotations: Record<string, Vec3>, bonePositions: Record<string, Vec3>) => void;
  deletePose: (name: string) => void;
  applyPose: (name: string) => PoseData | undefined;
  blendPoses: (poseA: string, poseB: string, factor: number) => Record<string, Vec3> | null;
}

export const usePoseModeStore = create<PoseModeState>()(
  immer((set) => ({
    activeArmatureEntityId: null,
    selectedBoneIds: new Set<string>(),
    activeBoneId: null,
    poseLibrary: [],

    enterPoseMode: (entityId) =>
      set((state) => {
        state.activeArmatureEntityId = entityId;
        state.selectedBoneIds = new Set();
        state.activeBoneId = null;
      }),

    exitPoseMode: () =>
      set((state) => {
        state.activeArmatureEntityId = null;
        state.selectedBoneIds = new Set();
        state.activeBoneId = null;
      }),

    selectBone: (boneId, additive = false) =>
      set((state) => {
        if (!additive) {
          state.selectedBoneIds = new Set();
        }
        if (state.selectedBoneIds.has(boneId)) {
          state.selectedBoneIds.delete(boneId);
        } else {
          state.selectedBoneIds.add(boneId);
        }
        state.activeBoneId = boneId;
      }),

    deselectAll: () =>
      set((state) => {
        state.selectedBoneIds = new Set();
      }),

    setActiveBone: (boneId) =>
      set((state) => {
        state.activeBoneId = boneId;
      }),

    savePose: (name, boneRotations, bonePositions) =>
      set((state) => {
        // Remove existing pose with same name
        state.poseLibrary = state.poseLibrary.filter((p) => p.name !== name);
        state.poseLibrary.push({ name, boneRotations, bonePositions });
      }),

    deletePose: (name) =>
      set((state) => {
        state.poseLibrary = state.poseLibrary.filter((p) => p.name !== name);
      }),

    applyPose: (name): PoseData | undefined => {
      const state = usePoseModeStore.getState();
      return state.poseLibrary.find((p: PoseData) => p.name === name);
    },

    blendPoses: (poseA: string, poseB: string, factor: number): Record<string, Vec3> | null => {
      const state = usePoseModeStore.getState();
      const a = state.poseLibrary.find((p: PoseData) => p.name === poseA);
      const b = state.poseLibrary.find((p: PoseData) => p.name === poseB);
      if (!a || !b) return null;

      const result: Record<string, Vec3> = {};
      const allBoneIds = new Set([...Object.keys(a.boneRotations), ...Object.keys(b.boneRotations)]);
      for (const boneId of allBoneIds) {
        const rotA = a.boneRotations[boneId] || { x: 0, y: 0, z: 0 };
        const rotB = b.boneRotations[boneId] || { x: 0, y: 0, z: 0 };
        result[boneId] = {
          x: rotA.x + (rotB.x - rotA.x) * factor,
          y: rotA.y + (rotB.y - rotA.y) * factor,
          z: rotA.z + (rotB.z - rotA.z) * factor,
        };
      }
      return result;
    },
  }))
);
