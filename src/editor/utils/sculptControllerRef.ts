import type { SculptController } from "@/editor/utils/sculptController";

/**
 * Module-level mutable reference to share the active SculptController
 * between the Viewport component and keyboard shortcuts hook.
 */
export const sculptControllerRef: { current: SculptController | null } = {
  current: null,
};
