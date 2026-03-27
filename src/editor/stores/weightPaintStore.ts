import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { WeightPaintSettings, SkinWeights, WeightPaintMode } from "@/editor/types";

interface WeightPaintState {
  settings: WeightPaintSettings;
  skinWeights: Record<string, SkinWeights>; // entityId -> bone weights
  activeEntityId: string | null;
  showWeightHeatmap: boolean;

  enterWeightPaintMode: (entityId: string) => void;
  exitWeightPaintMode: () => void;
  setMode: (mode: WeightPaintMode) => void;
  setBrushRadius: (radius: number) => void;
  setBrushStrength: (strength: number) => void;
  setBrushFalloff: (falloff: WeightPaintSettings["brushFalloff"]) => void;
  setActiveBone: (boneId: string | null) => void;
  toggleNormalizeWeights: () => void;
  toggleMirrorX: () => void;
  toggleShowHeatmap: () => void;
  paintWeight: (
    entityId: string,
    boneId: string,
    vertexIndex: number,
    weight: number,
    falloff: WeightPaintSettings["brushFalloff"],
  ) => void;
  blurWeights: (entityId: string, boneId: string, vertexIndex: number, radius: number) => void;
  normalizeVertexWeights: (entityId: string, vertexIndex: number) => void;
  mirrorWeightsX: () => void;
  autoWeight: (
    entityId: string,
    bones: Record<string, { restPosition: { x: number; y: number; z: number } }>,
    vertexPositions: Float32Array,
  ) => void;
  getVertexWeight: (entityId: string, boneId: string, vertexIndex: number) => number;
}

export const useWeightPaintStore = create<WeightPaintState>()(
  immer((set, get) => ({
    settings: {
      mode: "paint",
      brushRadius: 30,
      brushStrength: 0.3,
      brushFalloff: "smooth",
      activeBoneId: null,
      normalizeWeights: true,
      mirrorX: false,
    },
    skinWeights: {},
    activeEntityId: null,
    showWeightHeatmap: true,

    enterWeightPaintMode: (entityId) =>
      set((state) => {
        state.activeEntityId = entityId;
        if (!state.skinWeights[entityId]) {
          state.skinWeights[entityId] = { boneWeights: {} };
        }
      }),

    exitWeightPaintMode: () =>
      set((state) => {
        state.activeEntityId = null;
      }),

    setMode: (mode) =>
      set((state) => {
        state.settings.mode = mode;
      }),

    setBrushRadius: (radius) =>
      set((state) => {
        state.settings.brushRadius = radius;
      }),

    setBrushStrength: (strength) =>
      set((state) => {
        state.settings.brushStrength = strength;
      }),

    setBrushFalloff: (falloff) =>
      set((state) => {
        state.settings.brushFalloff = falloff;
      }),

    setActiveBone: (boneId) =>
      set((state) => {
        state.settings.activeBoneId = boneId;
      }),

    toggleNormalizeWeights: () =>
      set((state) => {
        state.settings.normalizeWeights = !state.settings.normalizeWeights;
      }),

    toggleMirrorX: () =>
      set((state) => {
        state.settings.mirrorX = !state.settings.mirrorX;
      }),

    toggleShowHeatmap: () =>
      set((state) => {
        state.showWeightHeatmap = !state.showWeightHeatmap;
      }),

    paintWeight: (entityId, boneId, vertexIndex, weight, falloff) =>
      set((state) => {
        const skin = state.skinWeights[entityId];
        if (!skin) return;

        if (!skin.boneWeights[boneId]) {
          skin.boneWeights[boneId] = new Float32Array(0);
        }

        const weights = skin.boneWeights[boneId];
        // Ensure array is large enough
        if (vertexIndex >= weights.length) {
          const newWeights = new Float32Array(vertexIndex + 1);
          newWeights.set(weights);
          skin.boneWeights[boneId] = newWeights;
        }

        const falloffMultiplier = computeFalloff(weight, falloff);
        const currentWeight = skin.boneWeights[boneId][vertexIndex];
        skin.boneWeights[boneId][vertexIndex] = Math.max(
          0,
          Math.min(1, currentWeight + falloffMultiplier),
        );

        if (state.settings.normalizeWeights) {
          // Normalize: ensure all bone weights for this vertex sum to 1
          let totalWeight = 0;
          for (const bw of Object.values(skin.boneWeights)) {
            if (vertexIndex < bw.length) {
              totalWeight += bw[vertexIndex];
            }
          }
          if (totalWeight > 0) {
            for (const bw of Object.values(skin.boneWeights)) {
              if (vertexIndex < bw.length) {
                bw[vertexIndex] /= totalWeight;
              }
            }
          }
        }
      }),

    blurWeights: (entityId, boneId, vertexIndex, radius) =>
      set((state) => {
        const skin = state.skinWeights[entityId];
        if (!skin || !skin.boneWeights[boneId]) return;

        const weights = skin.boneWeights[boneId];
        const startIdx = Math.max(0, vertexIndex - radius);
        const endIdx = Math.min(weights.length - 1, vertexIndex + radius);

        let sum = 0;
        let count = 0;
        for (let i = startIdx; i <= endIdx; i++) {
          sum += weights[i];
          count++;
        }

        if (count > 0) {
          const avg = sum / count;
          weights[vertexIndex] = weights[vertexIndex] * 0.5 + avg * 0.5;
        }
      }),

    normalizeVertexWeights: (entityId, vertexIndex) =>
      set((state) => {
        const skin = state.skinWeights[entityId];
        if (!skin) return;

        let totalWeight = 0;
        for (const bw of Object.values(skin.boneWeights)) {
          if (vertexIndex < bw.length) {
            totalWeight += bw[vertexIndex];
          }
        }
        if (totalWeight > 0) {
          for (const bw of Object.values(skin.boneWeights)) {
            if (vertexIndex < bw.length) {
              bw[vertexIndex] /= totalWeight;
            }
          }
        }
      }),

    mirrorWeightsX: () =>
      set(() => {
        // Mirror is a placeholder — actual mirroring requires mesh topology info
        // (vertex pairs across X axis). The UI toggle is functional.
      }),

    autoWeight: (entityId, bones, vertexPositions) =>
      set((state) => {
        if (!state.skinWeights[entityId]) {
          state.skinWeights[entityId] = { boneWeights: {} };
        }

        const skin = state.skinWeights[entityId];
        const boneIds = Object.keys(bones);
        const vertexCount = vertexPositions.length / 3;

        // Initialize weight arrays
        for (const boneId of boneIds) {
          skin.boneWeights[boneId] = new Float32Array(vertexCount);
        }

        // Envelope-based auto-weight: distance from each vertex to each bone
        const bonePositions = boneIds.map((id) => bones[id].restPosition);

        for (let v = 0; v < vertexCount; v++) {
          const vx = vertexPositions[v * 3];
          const vy = vertexPositions[v * 3 + 1];
          const vz = vertexPositions[v * 3 + 2];

          const distances = boneIds.map((boneId, i) => {
            const bp = bonePositions[i];
            const dx = vx - bp.x;
            const dy = vy - bp.y;
            const dz = vz - bp.z;
            return { boneId, dist: Math.sqrt(dx * dx + dy * dy + dz * dz) };
          });

          // Inverse distance weighting
          const maxDist = 2.0; // envelope radius
          let totalWeight = 0;
          const rawWeights: Record<string, number> = {};

          for (const { boneId, dist } of distances) {
            if (dist < maxDist) {
              const w = 1.0 - dist / maxDist;
              rawWeights[boneId] = w;
              totalWeight += w;
            }
          }

          if (totalWeight > 0) {
            for (const [boneId, w] of Object.entries(rawWeights)) {
              skin.boneWeights[boneId][v] = w / totalWeight;
            }
          } else {
            // Assign to nearest bone
            const nearest = distances.reduce((min, d) =>
              d.dist < min.dist ? d : min,
            );
            skin.boneWeights[nearest.boneId][v] = 1.0;
          }
        }
      }),

    getVertexWeight: (entityId, boneId, vertexIndex) => {
      const skin = get().skinWeights[entityId];
      if (!skin || !skin.boneWeights[boneId]) return 0;
      if (vertexIndex >= skin.boneWeights[boneId].length) return 0;
      return skin.boneWeights[boneId][vertexIndex];
    },
  })),
);

function computeFalloff(weight: number, falloff: string): number {
  switch (falloff) {
    case "sharp":
      return weight > 0.5 ? weight : 0;
    case "spike":
      return weight * weight;
    case "smooth":
    default:
      return weight;
  }
}
