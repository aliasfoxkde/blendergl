/**
 * Animation Controller — evaluates keyframes and drives playback.
 *
 * Handles keyframe interpolation, clip evaluation, and frame seeking.
 * The controller does NOT own Babylon.js Animation objects — instead,
 * it evaluates clips manually and applies bone poses through ArmatureController.
 */

import type { AnimationClip, AnimationTrack, BoneTransform, ArmatureComponent } from "@/editor/types";
import type { ArmatureController } from "./armatureController";

export class AnimationController {
  private armatureController: ArmatureController | null = null;
  private rafId: number | null = null;
  private lastFrameTime: number = 0;

  attach(armatureController: ArmatureController): void {
    this.armatureController = armatureController;
  }

  detach(): void {
    this.stopPlayback();
    this.armatureController = null;
  }

  /**
   * Evaluate a single track at a given frame.
   * Returns the interpolated value.
   */
  evaluateTrack(track: AnimationTrack, frame: number): number {
    const keys = track.keys;
    if (keys.length === 0) return 0;

    // Before first key
    if (frame <= keys[0].frame) return keys[0].value;

    // After last key
    if (frame >= keys[keys.length - 1].frame) return keys[keys.length - 1].value;

    // Find surrounding keys
    let prevIdx = 0;
    for (let i = 0; i < keys.length - 1; i++) {
      if (keys[i].frame <= frame && keys[i + 1].frame >= frame) {
        prevIdx = i;
        break;
      }
    }

    const prev = keys[prevIdx];
    const next = keys[prevIdx + 1];

    // Step interpolation
    if (prev.interpolation === "step") {
      return prev.value;
    }

    // Linear interpolation
    const range = next.frame - prev.frame;
    if (range === 0) return prev.value;
    const t = (frame - prev.frame) / range;

    return prev.value + (next.value - prev.value) * t;
  }

  /**
   * Evaluate all tracks in a clip at a given frame.
   * Returns a map of boneId -> BoneTransform.
   */
  evaluateClip(clip: AnimationClip, frame: number, armData: ArmatureComponent): Record<string, BoneTransform> {
    const poses: Record<string, BoneTransform> = {};

    // Start from rest poses
    for (const [boneId, boneData] of Object.entries(armData.bones)) {
      poses[boneId] = {
        position: { ...boneData.restPosition },
        rotation: { ...boneData.restRotation },
        scale: { ...boneData.restScale },
      };
    }

    // Apply track evaluations
    for (const track of clip.tracks) {
      const value = this.evaluateTrack(track, frame);
      if (!poses[track.boneId]) {
        poses[track.boneId] = {
          position: { x: 0, y: 0, z: 0 },
          rotation: { x: 0, y: 0, z: 0 },
          scale: { x: 1, y: 1, z: 1 },
        };
      }

      // Parse property name (e.g., "position.x" -> property="position", axis="x")
      const dotIdx = track.property.indexOf(".");
      const propName = track.property.substring(0, dotIdx);
      const axis = track.property.substring(dotIdx + 1) as "x" | "y" | "z";

      const pose = poses[track.boneId];
      if (pose && (propName === "position" || propName === "rotation" || propName === "scale")) {
        const posePart = pose[propName as keyof BoneTransform];
        if (posePart) {
          (posePart as unknown as Record<string, number>)[axis] = value;
        }
      }
    }

    return poses;
  }

  /**
   * Apply a clip at a given frame to the armature.
   */
  applyFrame(clip: AnimationClip, frame: number, armData: ArmatureComponent): void {
    if (!this.armatureController) return;
    const poses = this.evaluateClip(clip, frame, armData);
    this.armatureController.applyPoses(poses);
  }

  /**
   * Start playback loop using requestAnimationFrame.
   * Note: Timeline component handles its own rAF loop; this is available for
   * programmatic playback from the scripting API.
   */
  startPlayback(
    clip: AnimationClip,
    _armData: ArmatureComponent,
    onFrame: (frame: number) => void,
    fps: number = 30,
    looping = true
  ): void {
    this.stopPlayback();
    this.lastFrameTime = performance.now();
    const frameDuration = 1000 / fps;

    const tick = () => {
      const now = performance.now();
      const elapsed = now - this.lastFrameTime;

      if (elapsed >= frameDuration) {
        this.lastFrameTime = now;
        const framesToAdvance = Math.min(Math.floor(elapsed / frameDuration), 5);
        let nextFrame = (typeof onFrame === "function" ? 0 : 0) + framesToAdvance;
        // Clamp to clip duration
        if (nextFrame >= clip.durationFrames) {
          nextFrame = looping ? nextFrame % clip.durationFrames : clip.durationFrames - 1;
        }
        onFrame(nextFrame);
      }

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  /**
   * Stop playback loop.
   */
  stopPlayback(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

// Module-level ref
export const animationControllerRef: { current: AnimationController | null } = {
  current: null,
};
