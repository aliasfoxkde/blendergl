import type { Scene } from "@babylonjs/core";

/**
 * Module-level mutable reference to share the Babylon scene
 * between Viewport component and other panels (e.g. mesh analysis).
 */
export const sceneRef: { current: Scene | null } = {
  current: null,
};
