import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  AnimationClip,
  AnimationTrack,
  AnimationKeyData,
  PlaybackState,
  AnimProperty,
  InterpolationType,
  AnimationBlendState,
} from "@/editor/types";

interface AnimationState {
  clips: Record<string, AnimationClip>;
  activeClipId: string | null;
  playbackState: PlaybackState;
  currentFrame: number;
  framesPerSecond: number;
  isLooping: boolean;
  isPlayMode: boolean;

  // Blending
  blendState: AnimationBlendState | null;

  // Clip management
  createClip: (name: string) => string;
  deleteClip: (clipId: string) => void;
  renameClip: (clipId: string, name: string) => void;
  setActiveClip: (clipId: string | null) => void;
  setFramesPerSecond: (fps: number) => void;

  // Playback
  setPlaybackState: (state: PlaybackState) => void;
  setCurrentFrame: (frame: number) => void;
  toggleLoop: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  togglePlayMode: () => void;

  // Blending
  startBlend: (clipA: string, clipB: string) => void;
  setBlendFactor: (factor: number) => void;
  stopBlend: () => void;
  getBlendedValue: (boneId: string, property: AnimProperty, frame: number) => number;

  // Key management
  addKey: (
    clipId: string,
    boneId: string,
    property: AnimProperty,
    frame: number,
    value: number,
    interpolation?: InterpolationType
  ) => void;
  removeKey: (clipId: string, trackId: string, keyIndex: number) => void;
  getTrack: (clipId: string, boneId: string, property: AnimProperty) => AnimationTrack | null;
  getOrAddTrack: (clipId: string, boneId: string, property: AnimProperty) => AnimationTrack;

  // Queries
  getClipFrameRange: (clipId: string) => { min: number; max: number } | null;
  evaluateClip: (clipId: string, frame: number) => Record<string, Record<AnimProperty, number>>;
}

export const useAnimationStore = create<AnimationState>()(
  immer((set, get) => ({
    clips: {},
    activeClipId: null,
    playbackState: "stopped" as PlaybackState,
    currentFrame: 0,
    framesPerSecond: 30,
    isLooping: true,
    isPlayMode: false,
    blendState: null,

    createClip: (name) => {
      const id = crypto.randomUUID();
      set((state) => {
        state.clips[id] = {
          id,
          name,
          framesPerSecond: get().framesPerSecond,
          durationFrames: 60,
          tracks: [],
        };
        state.activeClipId = id;
      });
      return id;
    },

    deleteClip: (clipId) =>
      set((state) => {
        delete state.clips[clipId];
        if (state.activeClipId === clipId) {
          state.activeClipId = Object.keys(state.clips)[0] ?? null;
        }
      }),

    renameClip: (clipId, name) =>
      set((state) => {
        const clip = state.clips[clipId];
        if (clip) clip.name = name;
      }),

    setActiveClip: (clipId) =>
      set((state) => {
        state.activeClipId = clipId;
      }),

    setFramesPerSecond: (fps) =>
      set((state) => {
        state.framesPerSecond = fps;
      }),

    setPlaybackState: (playbackState) =>
      set((state) => {
        state.playbackState = playbackState;
      }),

    setCurrentFrame: (frame) =>
      set((state) => {
        state.currentFrame = frame;
      }),

    toggleLoop: () =>
      set((state) => {
        state.isLooping = !state.isLooping;
      }),

    stepForward: () =>
      set((state) => {
        state.currentFrame += 1;
      }),

    stepBackward: () =>
      set((state) => {
        state.currentFrame = Math.max(0, state.currentFrame - 1);
      }),

    addKey: (clipId, boneId, property, frame, value, interpolation = "linear") =>
      set((state) => {
        const clip = state.clips[clipId];
        if (!clip) return;
        let track = clip.tracks.find(
          (t) => t.boneId === boneId && t.property === property
        );
        if (!track) {
          track = {
            id: crypto.randomUUID(),
            boneId,
            property,
            keys: [],
          };
          clip.tracks.push(track);
        }
        // Check if a key already exists at this frame
        const existingIdx = track.keys.findIndex((k) => k.frame === frame);
        const keyData: AnimationKeyData = { frame, value, interpolation };
        if (existingIdx >= 0) {
          track.keys[existingIdx] = keyData;
        } else {
          track.keys.push(keyData);
          track.keys.sort((a, b) => a.frame - b.frame);
        }
        // Update duration
        const maxFrame = Math.max(...clip.tracks.map((t) => t.keys[t.keys.length - 1]?.frame ?? 0));
        clip.durationFrames = Math.max(clip.durationFrames, maxFrame + 1);
      }),

    removeKey: (clipId, trackId, keyIndex) =>
      set((state) => {
        const clip = state.clips[clipId];
        if (!clip) return;
        const track = clip.tracks.find((t) => t.id === trackId);
        if (!track) return;
        track.keys.splice(keyIndex, 1);
        // Remove empty tracks
        if (track.keys.length === 0) {
          clip.tracks = clip.tracks.filter((t) => t.id !== trackId);
        }
      }),

    getTrack: (clipId, boneId, property) => {
      const clip = get().clips[clipId];
      if (!clip) return null;
      return clip.tracks.find((t) => t.boneId === boneId && t.property === property) ?? null;
    },

    getOrAddTrack: (clipId, boneId, property) => {
      const clip = get().clips[clipId];
      if (!clip) throw new Error(`Clip ${clipId} not found`);
      let track = clip.tracks.find((t) => t.boneId === boneId && t.property === property);
      if (!track) {
        track = { id: crypto.randomUUID(), boneId, property, keys: [] };
        clip.tracks.push(track);
      }
      return track;
    },

    getClipFrameRange: (clipId) => {
      const clip = get().clips[clipId];
      if (!clip || clip.tracks.length === 0) return null;
      let min = Infinity;
      let max = -Infinity;
      for (const track of clip.tracks) {
        for (const key of track.keys) {
          if (key.frame < min) min = key.frame;
          if (key.frame > max) max = key.frame;
        }
      }
      if (min === Infinity) return null;
      return { min, max };
    },

    togglePlayMode: () =>
      set((state) => {
        state.isPlayMode = !state.isPlayMode;
      }),

    startBlend: (clipA, clipB) =>
      set((state) => {
        state.blendState = {
          clipA,
          clipB,
          factor: 0,
          looping: state.isLooping,
        };
      }),

    setBlendFactor: (factor) =>
      set((state) => {
        if (state.blendState) {
          state.blendState.factor = Math.max(0, Math.min(1, factor));
        }
      }),

    stopBlend: () =>
      set((state) => {
        state.blendState = null;
      }),

    getBlendedValue: (boneId, property, frame) => {
      const blend = get().blendState;
      if (!blend) {
        // No blending — use active clip
        const clipId = get().activeClipId;
        if (!clipId) return 0;
        return evaluateTrack(get().clips[clipId], boneId, property, frame);
      }

      const valA = evaluateTrack(get().clips[blend.clipA], boneId, property, frame);
      const valB = evaluateTrack(get().clips[blend.clipB], boneId, property, frame);
      return valA + (valB - valA) * blend.factor;
    },

    evaluateClip: (clipId, frame) => {
      const clip = get().clips[clipId];
      if (!clip) return {};
      const result: Record<string, Record<AnimProperty, number>> = {};
      for (const track of clip.tracks) {
        if (!result[track.boneId]) result[track.boneId] = {} as Record<AnimProperty, number>;
        result[track.boneId][track.property] = evaluateTrackAtKeys(track, frame);
      }
      return result;
    },
  }))
);

function evaluateTrack(
  clip: AnimationClip | undefined,
  boneId: string,
  property: AnimProperty,
  frame: number,
): number {
  if (!clip) return 0;
  const track = clip.tracks.find((t) => t.boneId === boneId && t.property === property);
  if (!track || track.keys.length === 0) return 0;
  return evaluateTrackAtKeys(track, frame);
}

function evaluateTrackAtKeys(track: AnimationTrack, frame: number): number {
  const keys = track.keys;
  if (keys.length === 0) return 0;
  if (keys.length === 1) return keys[0].value;

  // Before first key
  if (frame <= keys[0].frame) return keys[0].value;

  // After last key
  if (frame >= keys[keys.length - 1].frame) return keys[keys.length - 1].value;

  // Find surrounding keys
  for (let i = 0; i < keys.length - 1; i++) {
    if (frame >= keys[i].frame && frame <= keys[i + 1].frame) {
      const t = (frame - keys[i].frame) / (keys[i + 1].frame - keys[i].frame);

      if (keys[i].interpolation === "step" || keys[i + 1].interpolation === "step") {
        return keys[i].value;
      }

      // Smooth interpolation (ease in-out)
      const smoothT = t * t * (3 - 2 * t);
      return keys[i].value + (keys[i + 1].value - keys[i].value) * smoothT;
    }
  }

  return keys[keys.length - 1].value;
}
