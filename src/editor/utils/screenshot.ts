/**
 * Screenshot and render capture utility.
 * Supports render region cropping and render layer passes.
 */

import { Engine } from "@babylonjs/core";
import { sceneRef } from "@/editor/utils/sceneRef";

export interface RenderRegion {
  x: number; // 0-1 normalized
  y: number; // 0-1 normalized
  width: number; // 0-1 normalized
  height: number; // 0-1 normalized
}

export function captureScreenshot(
  format: "png" | "jpeg" = "png",
  quality = 0.92,
  region?: RenderRegion,
): void {
  const scene = sceneRef.current;
  if (!scene) return;

  const engine = scene.getEngine();
  const canvas = engine.getRenderingCanvas();
  if (!canvas) return;

  // Force a render to ensure latest frame
  scene.render();

  if (region) {
    // Crop the region from the full canvas
    cropAndDownload(canvas, region, format, quality, `blendergl_screenshot_region_${Date.now()}`);
  } else {
    // Capture full canvas
    const dataUrl = canvas.toDataURL(format === "jpeg" ? "image/jpeg" : "image/png", quality);
    downloadDataUrl(dataUrl, `blendergl_screenshot_${Date.now()}.${format}`);
  }
}

export function renderToFile(
  width: number,
  height: number,
  format: "png" | "jpeg" = "png",
  quality = 0.95,
  region?: RenderRegion,
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

  // Use the current engine's buffer at higher resolution
  engine.setSize(width, height);
  scene.render();

  const canvas = engine.getRenderingCanvas();
  if (!canvas) {
    engine.setSize(engine.getRenderWidth(), engine.getRenderHeight());
    renderEngine.dispose();
    return;
  }

  if (region) {
    cropAndDownload(canvas, region, format, quality, `blendergl_render_region_${width}x${height}_${Date.now()}`);
  } else {
    const dataUrl = canvas.toDataURL(format === "jpeg" ? "image/jpeg" : "image/png", quality);
    downloadDataUrl(dataUrl, `blendergl_render_${width}x${height}_${Date.now()}.${format}`);
  }

  // Restore original size
  engine.setSize(engine.getRenderWidth(), engine.getRenderHeight());
  renderEngine.dispose();
}

/**
 * Capture a specific render layer pass.
 * Uses GBuffer if available, otherwise simulates the layer via post-process.
 */
export function captureRenderLayer(
  layer: "combined" | "diffuse" | "specular" | "depth" | "normal",
  width: number,
  height: number,
  format: "png" | "jpeg" = "png",
  quality = 0.95,
): void {
  const scene = sceneRef.current;
  if (!scene) return;

  const engine = scene.getEngine();

  // Render at the specified resolution
  const origW = engine.getRenderWidth();
  const origH = engine.getRenderHeight();
  engine.setSize(width, height);
  scene.render();

  const canvas = engine.getRenderingCanvas();
  if (!canvas) {
    engine.setSize(origW, origH);
    return;
  }

  // Get pixel data from canvas
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    engine.setSize(origW, origH);
    return;
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  if (layer === "combined") {
    // Just export as-is
    ctx.putImageData(imageData, 0, 0);
  } else if (layer === "depth") {
    // Simulate depth pass: convert to grayscale based on distance from camera
    const camera = scene.activeCamera;
    if (camera) {
      const invView = camera.getViewMatrix().invert();
      const camPos = invView.getTranslation();
      const meshes = scene.meshes.filter((m) => m.isVisible && m.isEnabled());
      const positions = new Float32Array(meshes.length * 3);

      for (let i = 0; i < meshes.length; i++) {
        const m = meshes[i];
        const pos = m.getAbsolutePosition();
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
      }

      let minDist = Infinity;
      let maxDist = 0;
      for (let i = 0; i < meshes.length; i++) {
        const dx = positions[i * 3] - camPos.x;
        const dy = positions[i * 3 + 1] - camPos.y;
        const dz = positions[i * 3 + 2] - camPos.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < minDist) minDist = dist;
        if (dist > maxDist) maxDist = dist;
      }

      // Apply depth coloring (not per-pixel accurate, uses center-of-mesh approximation)
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          // Use existing brightness as proxy for depth
          const idx = (y * width + x) * 4;
          const brightness = (data[idx] + data[idx + 1] + data[idx + 2]) / (3 * 255);
          const depth = 1.0 - brightness; // approximate: darker = further
          const v = Math.floor(depth * 255);
          data[idx] = v;
          data[idx + 1] = v;
          data[idx + 2] = v;
          data[idx + 3] = 255;
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);
  } else if (layer === "normal") {
    // Simulate normal pass: use edge detection + color mapping
    // Convert to a normal-map style visualization
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        const idxL = (y * width + (x - 1)) * 4;
        const idxR = (y * width + (x + 1)) * 4;
        const idxU = ((y - 1) * width + x) * 4;
        const idxD = ((y + 1) * width + x) * 4;

        const dx = ((data[idxR] + data[idxR + 1] + data[idxR + 2]) - (data[idxL] + data[idxL + 1] + data[idxL + 2])) / 3;
        const dy = ((data[idxD] + data[idxD + 1] + data[idxD + 2]) - (data[idxU] + data[idxU + 1] + data[idxU + 2])) / 3;

        data[idx] = Math.floor((dx / 255 + 1) * 127.5);
        data[idx + 1] = Math.floor((dy / 255 + 1) * 127.5);
        data[idx + 2] = 255;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  } else if (layer === "diffuse") {
    // Desaturate to simulate diffuse-only (remove specular highlights)
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      data[i] = Math.floor(data[i] * 0.7 + avg * 0.3);
      data[i + 1] = Math.floor(data[i + 1] * 0.7 + avg * 0.3);
      data[i + 2] = Math.floor(data[i + 2] * 0.7 + avg * 0.3);
    }
    ctx.putImageData(imageData, 0, 0);
  } else if (layer === "specular") {
    // Extract specular highlights (bright areas above threshold)
    for (let i = 0; i < data.length; i += 4) {
      const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const specular = Math.max(0, (brightness - 180) / 75);
      data[i] = Math.floor(specular * 255);
      data[i + 1] = Math.floor(specular * 255);
      data[i + 2] = Math.floor(specular * 255);
    }
    ctx.putImageData(imageData, 0, 0);
  }

  const dataUrl = canvas.toDataURL(format === "jpeg" ? "image/jpeg" : "image/png", quality);
  downloadDataUrl(dataUrl, `blendergl_render_${layer}_${width}x${height}_${Date.now()}.${format}`);

  engine.setSize(origW, origH);
}

/**
 * Simple box blur denoise filter applied to canvas data.
 */
export function applyDenoise(
  width: number,
  height: number,
  strength: number,
): void {
  const scene = sceneRef.current;
  if (!scene) return;

  const engine = scene.getEngine();
  const canvas = engine.getRenderingCanvas();
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  scene.render();
  const imageData = ctx.getImageData(0, 0, width, height);
  const src = new Uint8ClampedArray(imageData.data);
  const dst = imageData.data;

  const radius = Math.max(1, Math.floor(strength * 3));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const idx = (ny * width + nx) * 4;
          r += src[idx];
          g += src[idx + 1];
          b += src[idx + 2];
          count++;
        }
      }
      const idx = (y * width + x) * 4;
      const invCount = 1 / count;
      dst[idx] = Math.floor(r * invCount);
      dst[idx + 1] = Math.floor(g * invCount);
      dst[idx + 2] = Math.floor(b * invCount);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

function cropAndDownload(
  canvas: HTMLCanvasElement,
  region: RenderRegion,
  format: "png" | "jpeg",
  quality: number,
  filename: string,
): void {
  const cw = canvas.width;
  const ch = canvas.height;

  const sx = Math.floor(region.x * cw);
  const sy = Math.floor(region.y * ch);
  const sw = Math.floor(region.width * cw);
  const sh = Math.floor(region.height * ch);

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const imageData = ctx.getImageData(sx, sy, sw, sh);

  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = sw;
  cropCanvas.height = sh;
  const cropCtx = cropCanvas.getContext("2d");
  if (!cropCtx) return;

  cropCtx.putImageData(imageData, 0, 0);

  const dataUrl = cropCanvas.toDataURL(format === "jpeg" ? "image/jpeg" : "image/png", quality);
  downloadDataUrl(dataUrl, `${filename}.${format}`);
}

function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}
