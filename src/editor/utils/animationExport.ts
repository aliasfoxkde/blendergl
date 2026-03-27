/**
 * Animation export utility — exports animation clips as glTF animation data.
 */

import type { AnimationClip, AnimationTrack, AnimProperty } from "@/editor/types";

interface GlTfAnimationChannel {
  sampler: number;
  target: { node: number; path: string };
}

interface GlTfAnimationSampler {
  input: number[];
  output: number[];
  interpolation: "LINEAR" | "STEP" | "CUBICSPLINE";
}

interface GlTfAnimation {
  name: string;
  channels: GlTfAnimationChannel[];
  samplers: GlTfAnimationSampler[];
}

const PROPERTY_TO_PATH: Record<AnimProperty, string> = {
  "position.x": "translation",
  "position.y": "translation",
  "position.z": "translation",
  "rotation.x": "rotation",
  "rotation.y": "rotation",
  "rotation.z": "rotation",
  "scale.x": "scale",
  "scale.y": "scale",
  "scale.z": "scale",
};

const PROPERTY_TO_INDEX: Record<AnimProperty, 0 | 1 | 2> = {
  "position.x": 0,
  "position.y": 1,
  "position.z": 2,
  "rotation.x": 0,
  "rotation.y": 1,
  "rotation.z": 2,
  "scale.x": 0,
  "scale.y": 1,
  "scale.z": 2,
};

export function exportAnimationClipsToGlTF(clips: Record<string, AnimationClip>): GlTfAnimation[] {
  const animations: GlTfAnimation[] = [];

  for (const clip of Object.values(clips)) {
    if (clip.tracks.length === 0) continue;

    // Group tracks by (boneId, path) for glTF channels
    const channelGroups = new Map<string, AnimationTrack[]>();

    for (const track of clip.tracks) {
      const path = PROPERTY_TO_PATH[track.property];
      const groupKey = `${track.boneId}:${path}`;
      if (!channelGroups.has(groupKey)) {
        channelGroups.set(groupKey, []);
      }
      channelGroups.get(groupKey)!.push(track);
    }

    const samplers: GlTfAnimationSampler[] = [];
    const channels: GlTfAnimationChannel[] = [];

    for (const tracks of channelGroups.values()) {
      const path = PROPERTY_TO_PATH[tracks[0].property];

      // Collect all unique frames
      const frameSet = new Set<number>();
      for (const t of tracks) {
        for (const key of t.keys) {
          frameSet.add(key.frame);
        }
      }
      const frames = Array.from(frameSet).sort((a, b) => a - b);

      // Build input (times) and output (values)
      const input: number[] = frames.map((f) => f / clip.framesPerSecond);
      const output: number[] = [];

      for (const frame of frames) {
        // Output 3 values (xyz) per frame
        for (let axis = 0; axis < 3; axis++) {
          const prop = tracks.find((t) => PROPERTY_TO_INDEX[t.property] === axis);
          if (prop) {
            const val = evaluateKeyAtFrame(prop.keys, frame);
            output.push(val);
          } else {
            output.push(0);
          }
        }
      }

      const interpolation = tracks[0].keys[0]?.interpolation === "step" ? "STEP" : "LINEAR";

      const samplerIndex = samplers.length;
      samplers.push({ input, output, interpolation });

      channels.push({
        sampler: samplerIndex,
        target: {
          // Node index is a placeholder — the caller maps bone IDs to node indices
          node: 0,
          path,
        },
      });
    }

    animations.push({
      name: clip.name,
      channels,
      samplers,
    });
  }

  return animations;
}

export function exportAnimationToJSON(clips: Record<string, AnimationClip>): string {
  const gltfAnimations = exportAnimationClipsToGlTF(clips);
  return JSON.stringify({ animations: gltfAnimations }, null, 2);
}

function evaluateKeyAtFrame(
  keys: { frame: number; value: number; interpolation: string }[],
  frame: number,
): number {
  if (keys.length === 0) return 0;
  if (keys.length === 1) return keys[0].value;
  if (frame <= keys[0].frame) return keys[0].value;
  if (frame >= keys[keys.length - 1].frame) return keys[keys.length - 1].value;

  for (let i = 0; i < keys.length - 1; i++) {
    if (frame >= keys[i].frame && frame <= keys[i + 1].frame) {
      const t = (frame - keys[i].frame) / (keys[i + 1].frame - keys[i].frame);
      return keys[i].value + (keys[i + 1].value - keys[i].value) * t;
    }
  }

  return keys[keys.length - 1].value;
}
