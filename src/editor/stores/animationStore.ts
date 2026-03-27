import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type {
  AnimationClip,
  AnimationTrack,
  AnimationKeyData,
  PlaybackState,
  AnimProperty,
  InterpolationType,
} from "@/editor/types";

interface AnimationState {
  clips: Record<string, AnimationClip>;
  activeClipId: string | null;
  playbackState: PlaybackState;
  currentFrame: number;
  framesPerSecond: number;
  isLooping: boolean;

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
}

export const useAnimationStore = create<AnimationState>()(
  immer((set, get) => ({
    clips: {},
    activeClipId: null,
    playbackState: "stopped" as PlaybackState,
    currentFrame: 0,
    framesPerSecond: 30,
    isLooping: true,

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
  }))
);
