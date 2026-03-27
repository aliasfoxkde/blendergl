import { ArcRotateCamera, Animation } from "@babylonjs/core";
import type { CameraPreset } from "@/editor/types";

/**
 * Set the camera to a preset view using smooth animation.
 */
export function setCameraPreset(
  camera: ArcRotateCamera,
  preset: CameraPreset,
  radius = 10
): void {
  const presets: Record<CameraPreset, { alpha: number; beta: number }> = {
    front:    { alpha: -Math.PI / 2, beta: Math.PI / 2 },
    back:     { alpha: Math.PI / 2,  beta: Math.PI / 2 },
    right:    { alpha: 0,            beta: Math.PI / 2 },
    left:     { alpha: Math.PI,      beta: Math.PI / 2 },
    top:      { alpha: 0,            beta: 0 },
    bottom:   { alpha: 0,            beta: Math.PI },
    perspective: { alpha: -Math.PI / 4, beta: Math.PI / 3 },
  };

  const target = presets[preset];
  if (!target) return;

  // Animate camera to target position
  const fps = 60;
  const frames = 15;

  const animAlpha = new Animation(
    "camAlpha", "alpha", fps,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CONSTANT
  );
  animAlpha.setKeys([
    { frame: 0, value: camera.alpha },
    { frame: frames, value: target.alpha },
  ]);

  const animBeta = new Animation(
    "camBeta", "beta", fps,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CONSTANT
  );
  animBeta.setKeys([
    { frame: 0, value: camera.beta },
    { frame: frames, value: target.beta },
  ]);

  const animRadius = new Animation(
    "camRadius", "radius", fps,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CONSTANT
  );
  animRadius.setKeys([
    { frame: 0, value: camera.radius },
    { frame: frames, value: radius },
  ]);

  camera.animations = [animAlpha, animBeta, animRadius];
  camera.getScene().beginAnimation(camera, 0, frames, false);
}

/**
 * Toggle camera between perspective and orthographic.
 */
export function toggleOrtho(camera: ArcRotateCamera): boolean {
  camera.mode = camera.mode === ArcRotateCamera.ORTHOGRAPHIC_CAMERA
    ? ArcRotateCamera.PERSPECTIVE_CAMERA
    : ArcRotateCamera.ORTHOGRAPHIC_CAMERA;
  return camera.mode === ArcRotateCamera.ORTHOGRAPHIC_CAMERA;
}

/**
 * Get a human-readable label for the current camera preset based on angles.
 */
export function getCameraPresetLabel(camera: ArcRotateCamera): string {
  if (camera.mode === ArcRotateCamera.ORTHOGRAPHIC_CAMERA) {
    return "Orthographic";
  }
  return "Perspective";
}
