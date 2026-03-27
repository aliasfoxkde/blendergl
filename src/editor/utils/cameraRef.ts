import type { ArcRotateCamera } from "@babylonjs/core";

/**
 * Module-level mutable reference to share the camera
 * between Viewport component and keyboard shortcuts.
 */
export const cameraRef: { current: ArcRotateCamera | null } = {
  current: null,
};
