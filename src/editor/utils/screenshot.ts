/**
 * Screenshot and render capture utility.
 */

import { Engine } from "@babylonjs/core";
import { sceneRef } from "@/editor/utils/sceneRef";

export function captureScreenshot(format: "png" | "jpeg" = "png", quality = 0.92): void {
  const scene = sceneRef.current;
  if (!scene) return;

  const engine = scene.getEngine();
  const canvas = engine.getRenderingCanvas();
  if (!canvas) return;

  // Force a render to ensure latest frame
  scene.render();

  // Capture from canvas
  const dataUrl = canvas.toDataURL(format === "jpeg" ? "image/jpeg" : "image/png", quality);

  // Download
  const link = document.createElement("a");
  link.download = `blendergl_screenshot_${Date.now()}.${format}`;
  link.href = dataUrl;
  link.click();
}

export function renderToFile(
  width: number,
  height: number,
  format: "png" | "jpeg" = "png",
  quality = 0.95,
): void {
  const scene = sceneRef.current;
  if (!scene) return;

  const engine = scene.getEngine();

  // Create offscreen canvas
  const offscreen = document.createElement("canvas");
  offscreen.width = width;
  offscreen.height = height;

  // Create temp engine
  const renderEngine = new Engine(offscreen, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    antialias: true,
  });

  // Create temp scene clone (simplified — just use the current scene's screenshot)
  // For a proper render, we'd clone meshes to the temp scene, but that's complex.
  // Instead, we use the current engine's buffer at higher resolution.
  engine.setSize(width, height);
  scene.render();

  const canvas = engine.getRenderingCanvas();
  if (!canvas) {
    engine.setSize(engine.getRenderWidth(), engine.getRenderHeight());
    renderEngine.dispose();
    return;
  }

  const dataUrl = canvas.toDataURL(format === "jpeg" ? "image/jpeg" : "image/png", quality);

  // Restore original size
  engine.setSize(engine.getRenderWidth(), engine.getRenderHeight());

  // Download
  const link = document.createElement("a");
  link.download = `blendergl_render_${width}x${height}_${Date.now()}.${format}`;
  link.href = dataUrl;
  link.click();

  renderEngine.dispose();
}
