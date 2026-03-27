import type { EditModeController } from "@/editor/utils/editModeController";

/**
 * Module-level mutable reference to share the active EditModeController
 * between the Viewport component and keyboard shortcuts hook.
 */
export const editControllerRef: { current: EditModeController | null } = {
  current: null,
};
