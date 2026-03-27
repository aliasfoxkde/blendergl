import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

interface PoseModeState {
  activeArmatureEntityId: string | null;
  selectedBoneIds: Set<string>;
  activeBoneId: string | null;

  enterPoseMode: (entityId: string) => void;
  exitPoseMode: () => void;
  selectBone: (boneId: string, additive?: boolean) => void;
  deselectAll: () => void;
  setActiveBone: (boneId: string | null) => void;
}

export const usePoseModeStore = create<PoseModeState>()(
  immer((set) => ({
    activeArmatureEntityId: null,
    selectedBoneIds: new Set<string>(),
    activeBoneId: null,

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
  }))
);
