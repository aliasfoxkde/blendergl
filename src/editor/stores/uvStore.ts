import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { UvSettings, UvProjectionType, UvEditMode, UvIsland } from "@/editor/types";
import { createDefaultUvSettings } from "@/editor/types";

interface UvState {
  // UV editor panel visibility
  panelOpen: boolean;

  // Per-entity UV data
  uvData: Record<string, {
    uvs: number[][];  // [u, v] per vertex
    islands: UvIsland[];
    pinnedVertices: number[];
    seams: string[]; // "v0-v1" edge keys
  }>

  // Settings
  settings: UvSettings;

  // Selection state
  editMode: UvEditMode;
  selectedUvVertices: Set<number>;
  selectedUvEdges: Set<[number, number]>;
  selectedUvFaces: Set<number>;
  selectedIslands: Set<number>;

  // Seam tool
  seamMode: boolean;

  // View state
  viewOffset: { x: number; y: number };
  viewZoom: number;

  // Actions
  togglePanel: () => void;
  openPanel: () => void;
  closePanel: () => void;

  setEditMode: (mode: UvEditMode) => void;
  selectUvVertex: (index: number, addToSelection?: boolean) => void;
  deselectUvVertex: (index: number) => void;
  selectUvEdge: (edge: [number, number], addToSelection?: boolean) => void;
  deselectUvEdge: (edge: [number, number]) => void;
  selectUvFace: (faceIndex: number, addToSelection?: boolean) => void;
  deselectUvFace: (faceIndex: number) => void;
  deselectAll: () => void;

  setUvPosition: (entityId: string, vertexIndex: number, u: number, v: number) => void;
  setUvPositions: (entityId: string, updates: { index: number; u: number; v: number }[]) => void;

  applyProjection: (entityId: string, projectionType: UvProjectionType, positions: number[], normals: number[], indices: number[], cameraMatrix?: number[] | null) => void;
  detectIslands: (entityId: string, indices: number[], uvs: number[][]) => void;

  packIslands: (entityId: string) => void;
  setSettings: (settings: Partial<UvSettings>) => void;

  setViewOffset: (offset: { x: number; y: number }) => void;
  setViewZoom: (zoom: number) => void;

  // Seam marking
  toggleSeamMode: () => void;
  toggleSeam: (entityId: string, v0: number, v1: number) => void;
  clearSeams: (entityId: string) => void;
  markSeamFromSelectedEdges: (entityId: string) => void;

  // UV pinning
  pinVertices: (entityId: string, vertexIndices: number[]) => void;
  unpinVertices: (entityId: string, vertexIndices: number[]) => void;
  unpinAll: (entityId: string) => void;
  isPinned: (entityId: string, vertexIndex: number) => boolean;

  // UV alignment
  alignSelectedU: (entityId: string) => void;
  alignSelectedV: (entityId: string) => void;
  distributeEvenlyU: (entityId: string) => void;
  distributeEvenlyV: (entityId: string) => void;

  // UV weld / rip / mirror
  weldSelected: (entityId: string) => void;
  weldAll: (entityId: string, threshold?: number) => void;
  ripSelected: (entityId: string) => void;
  mirrorSelectedU: (entityId: string) => void;
  mirrorSelectedV: (entityId: string) => void;

  // Island operations
  rotateIslandsToAxes: (entityId: string) => void;
  lockOverlappingIslands: (entityId: string) => void;

  // Procedural textures
  generatedTextures: Record<string, string>; // base64 data URLs
  generateCheckerTexture: (size?: number, checks?: number) => string;
  generateNoiseTexture: (size?: number, scale?: number) => string;
  generateGradientTexture: (size?: number, color1?: string, color2?: string, direction?: "horizontal" | "vertical" | "radial") => string;
  generateGridTexture: (size?: number, divisions?: number, lineWidth?: number) => string;
  generateColorRampTexture: (size: number, stops: { pos: number; color: string }[]) => string;
  combineTextures: (texA: string, texB: string, mode: "mix" | "multiply" | "add" | "subtract", factor: number) => string;
  clearTexture: (id: string) => void;
}

export const useUvStore = create<UvState>()(
  immer((set) => ({
    panelOpen: false,
    uvData: {},
    settings: createDefaultUvSettings(),
    editMode: "vertex" as UvEditMode,
    selectedUvVertices: new Set(),
    selectedUvEdges: new Set(),
    selectedUvFaces: new Set(),
    selectedIslands: new Set(),
    viewOffset: { x: 0, y: 0 },
    viewZoom: 1.0,
    generatedTextures: {},
    seamMode: false,

    togglePanel: () =>
      set((state) => {
        state.panelOpen = !state.panelOpen;
      }),

    openPanel: () =>
      set((state) => {
        state.panelOpen = true;
      }),

    closePanel: () =>
      set((state) => {
        state.panelOpen = false;
      }),

    setEditMode: (mode) =>
      set((state) => {
        state.editMode = mode;
        state.selectedUvVertices.clear();
        state.selectedUvEdges.clear();
        state.selectedUvFaces.clear();
        state.selectedIslands.clear();
      }),

    selectUvVertex: (index, addToSelection = false) =>
      set((state) => {
        if (!addToSelection) {
          state.selectedUvVertices.clear();
          state.selectedUvEdges.clear();
          state.selectedUvFaces.clear();
        }
        state.selectedUvVertices.add(index);
      }),

    deselectUvVertex: (index) =>
      set((state) => {
        state.selectedUvVertices.delete(index);
      }),

    selectUvEdge: (edge, addToSelection = false) =>
      set((state) => {
        if (!addToSelection) {
          state.selectedUvVertices.clear();
          state.selectedUvEdges.clear();
          state.selectedUvFaces.clear();
        }
        state.selectedUvEdges.add(edge);
      }),

    deselectUvEdge: (edge) =>
      set((state) => {
        state.selectedUvEdges.delete(edge);
      }),

    selectUvFace: (faceIndex, addToSelection = false) =>
      set((state) => {
        if (!addToSelection) {
          state.selectedUvVertices.clear();
          state.selectedUvEdges.clear();
          state.selectedUvFaces.clear();
        }
        state.selectedUvFaces.add(faceIndex);
      }),

    deselectUvFace: (faceIndex) =>
      set((state) => {
        state.selectedUvFaces.delete(faceIndex);
      }),

    deselectAll: () =>
      set((state) => {
        state.selectedUvVertices.clear();
        state.selectedUvEdges.clear();
        state.selectedUvFaces.clear();
        state.selectedIslands.clear();
      }),

    setUvPosition: (entityId, vertexIndex, u, v) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (data && vertexIndex < data.uvs.length) {
          data.uvs[vertexIndex] = [u, v];
        }
      }),

    setUvPositions: (entityId, updates) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (!data) return;
        for (const { index, u, v } of updates) {
          if (index < data.uvs.length) {
            data.uvs[index] = [u, v];
          }
        }
      }),

    applyProjection: (entityId, projectionType, positions, normals, indices, cameraMatrix) =>
      set((state) => {
        const uvs = computeProjection(positions, normals, indices, projectionType, cameraMatrix);
        if (!state.uvData[entityId]) {
          state.uvData[entityId] = { uvs: [], islands: [], pinnedVertices: [], seams: [] };
        }
        state.uvData[entityId].uvs = uvs;
        state.selectedUvVertices.clear();
        state.selectedUvEdges.clear();
        state.selectedUvFaces.clear();
      }),

    detectIslands: (entityId, indices, uvs) =>
      set((state) => {
        const islands = findUvIslands(indices, uvs);
        if (!state.uvData[entityId]) {
          state.uvData[entityId] = { uvs: [], islands: [], pinnedVertices: [], seams: [] };
        }
        state.uvData[entityId].islands = islands;
      }),

    packIslands: (entityId) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (!data || data.islands.length === 0) return;

        const margin = state.settings.packMargin;
        const packSize = state.settings.packSize;

        // Simple shelf packing
        const sortedIslands = [...data.islands].sort((a, b) => b.faceIndices.length - a.faceIndices.length);
        let currentY = margin;
        let currentX = margin;
        let rowHeight = 0;

        for (const island of sortedIslands) {
          // Calculate island bounds
          let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
          for (const vi of island.vertexIndices) {
            const uv = data.uvs[vi];
            if (!uv) continue;
            minU = Math.min(minU, uv[0]);
            minV = Math.min(minV, uv[1]);
            maxU = Math.max(maxU, uv[0]);
            maxV = Math.max(maxV, uv[1]);
          }

          const islandWidth = maxU - minU;
          const islandHeight = maxV - minV;

          if (islandWidth === 0 || islandHeight === 0) continue;

          if (currentX + islandWidth + margin > packSize) {
            currentX = margin;
            currentY += rowHeight + margin;
            rowHeight = 0;
          }

          // Move island vertices to packed position
          for (const vi of island.vertexIndices) {
            const uv = data.uvs[vi];
            if (!uv) continue;
            uv[0] = (uv[0] - minU) / (maxU - minU) * islandWidth + currentX;
            uv[1] = (uv[1] - minV) / (maxV - minV) * islandHeight + currentY;
          }

          currentX += islandWidth + margin;
          rowHeight = Math.max(rowHeight, islandHeight);
        }
      }),

    setSettings: (settings) =>
      set((state) => {
        Object.assign(state.settings, settings);
      }),

    setViewOffset: (offset) =>
      set((state) => {
        state.viewOffset = offset;
      }),

    setViewZoom: (zoom) =>
      set((state) => {
        state.viewZoom = Math.max(0.1, Math.min(10, zoom));
      }),

    generateCheckerTexture: (size = 256, checks = 8) => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";

      const checkSize = size / checks;
      for (let y = 0; y < checks; y++) {
        for (let x = 0; x < checks; x++) {
          ctx.fillStyle = (x + y) % 2 === 0 ? "#ffffff" : "#808080";
          ctx.fillRect(x * checkSize, y * checkSize, checkSize, checkSize);
        }
      }

      const id = `checker_${Date.now()}`;
      const dataUrl = canvas.toDataURL();
      set((state) => {
        state.generatedTextures[id] = dataUrl;
      });
      return dataUrl;
    },

    generateNoiseTexture: (size = 256, scale = 10) => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";

      const imageData = ctx.createImageData(size, size);
      const data = imageData.data;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const idx = (y * size + x) * 4;
          const val = simpleNoise(x / size * scale, y / size * scale);
          const c = Math.floor(val * 255);
          data[idx] = c;
          data[idx + 1] = c;
          data[idx + 2] = c;
          data[idx + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      const id = `noise_${Date.now()}`;
      const dataUrl = canvas.toDataURL();
      set((state) => {
        state.generatedTextures[id] = dataUrl;
      });
      return dataUrl;
    },

    generateGradientTexture: (size = 256, color1 = "#000000", color2 = "#ffffff", direction = "horizontal") => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";

      let gradient: CanvasGradient;
      if (direction === "horizontal") {
        gradient = ctx.createLinearGradient(0, 0, size, 0);
      } else if (direction === "vertical") {
        gradient = ctx.createLinearGradient(0, 0, 0, size);
      } else {
        gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      }
      gradient.addColorStop(0, color1);
      gradient.addColorStop(1, color2);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);

      const id = `gradient_${Date.now()}`;
      const dataUrl = canvas.toDataURL();
      set((state) => {
        state.generatedTextures[id] = dataUrl;
      });
      return dataUrl;
    },

    generateGridTexture: (size = 256, divisions = 8, lineWidth = 1) => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);

      ctx.strokeStyle = "#cccccc";
      ctx.lineWidth = lineWidth;
      const step = size / divisions;

      for (let i = 0; i <= divisions; i++) {
        ctx.beginPath();
        ctx.moveTo(i * step, 0);
        ctx.lineTo(i * step, size);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * step);
        ctx.lineTo(size, i * step);
        ctx.stroke();
      }

      const id = `grid_${Date.now()}`;
      const dataUrl = canvas.toDataURL();
      set((state) => {
        state.generatedTextures[id] = dataUrl;
      });
      return dataUrl;
    },

    clearTexture: (id) =>
      set((state) => {
        delete state.generatedTextures[id];
      }),

    // Seam marking
    toggleSeamMode: () =>
      set((state) => {
        state.seamMode = !state.seamMode;
      }),

    toggleSeam: (entityId, v0, v1) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (!data) return;
        const key = `${Math.min(v0, v1)}-${Math.max(v0, v1)}`;
        const idx = data.seams.indexOf(key);
        if (idx >= 0) {
          data.seams.splice(idx, 1);
        } else {
          data.seams.push(key);
        }
      }),

    clearSeams: (entityId) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (data) data.seams.length = 0;
      }),

    markSeamFromSelectedEdges: (entityId) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (!data) return;
        for (const edge of state.selectedUvEdges) {
          const key = `${Math.min(edge[0], edge[1])}-${Math.max(edge[0], edge[1])}`;
          if (!data.seams.includes(key)) {
            data.seams.push(key);
          }
        }
      }),

    // UV pinning
    pinVertices: (entityId, vertexIndices) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (!data) return;
        for (const vi of vertexIndices) {
          if (!data.pinnedVertices.includes(vi)) {
            data.pinnedVertices.push(vi);
          }
        }
      }),

    unpinVertices: (entityId, vertexIndices) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (!data) return;
        data.pinnedVertices = data.pinnedVertices.filter((vi) => !vertexIndices.includes(vi));
      }),

    unpinAll: (entityId) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (data) data.pinnedVertices.length = 0;
      }),

    isPinned: (entityId: string, vertexIndex: number): boolean => {
      const data = useUvStore.getState().uvData[entityId];
      return data ? data.pinnedVertices.includes(vertexIndex) : false;
    },

    // UV alignment
    alignSelectedU: (entityId: string) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (!data || state.selectedUvVertices.size < 2) return;
        // Average U of selected vertices
        let sumU = 0;
        let count = 0;
        for (const vi of state.selectedUvVertices) {
          const uv = data.uvs[vi];
          if (uv) { sumU += uv[0]; count++; }
        }
        if (count === 0) return;
        const avgU = sumU / count;
        for (const vi of state.selectedUvVertices) {
          const uv = data.uvs[vi];
          if (uv) uv[0] = avgU;
        }
      }),

    alignSelectedV: (entityId: string) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (!data || state.selectedUvVertices.size < 2) return;
        let sumV = 0;
        let count = 0;
        for (const vi of state.selectedUvVertices) {
          const uv = data.uvs[vi];
          if (uv) { sumV += uv[1]; count++; }
        }
        if (count === 0) return;
        const avgV = sumV / count;
        for (const vi of state.selectedUvVertices) {
          const uv = data.uvs[vi];
          if (uv) uv[1] = avgV;
        }
      }),

    distributeEvenlyU: (entityId: string) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (!data || state.selectedUvVertices.size < 2) return;
        const selected = Array.from(state.selectedUvVertices).map((vi) => ({
          vi,
          u: data.uvs[vi]?.[0] ?? 0,
        })).sort((a, b) => a.u - b.u);
        const minU = selected[0].u;
        const maxU = selected[selected.length - 1].u;
        const step = selected.length > 1 ? (maxU - minU) / (selected.length - 1) : 0;
        for (let i = 0; i < selected.length; i++) {
          const uv = data.uvs[selected[i].vi];
          if (uv) uv[0] = minU + step * i;
        }
      }),

    distributeEvenlyV: (entityId: string) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (!data || state.selectedUvVertices.size < 2) return;
        const selected = Array.from(state.selectedUvVertices).map((vi) => ({
          vi,
          v: data.uvs[vi]?.[1] ?? 0,
        })).sort((a, b) => a.v - b.v);
        const minV = selected[0].v;
        const maxV = selected[selected.length - 1].v;
        const step = selected.length > 1 ? (maxV - minV) / (selected.length - 1) : 0;
        for (let i = 0; i < selected.length; i++) {
          const uv = data.uvs[selected[i].vi];
          if (uv) uv[1] = minV + step * i;
        }
      }),

    // UV weld
    weldSelected: (entityId: string) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (!data || state.selectedUvVertices.size < 2) return;
        const selected = Array.from(state.selectedUvVertices);
        // Average position
        let sumU = 0, sumV = 0;
        let count = 0;
        for (const vi of selected) {
          const uv = data.uvs[vi];
          if (uv) { sumU += uv[0]; sumV += uv[1]; count++; }
        }
        if (count === 0) return;
        const avgU = sumU / count;
        const avgV = sumV / count;
        for (const vi of selected) {
          const uv = data.uvs[vi];
          if (uv) { uv[0] = avgU; uv[1] = avgV; }
        }
      }),

    weldAll: (entityId: string, threshold = 0.001) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (!data) return;
        const processed = new Set<number>();
        for (let i = 0; i < data.uvs.length; i++) {
          if (processed.has(i)) continue;
          const group = [i];
          for (let j = i + 1; j < data.uvs.length; j++) {
            if (processed.has(j)) continue;
            const du = data.uvs[i][0] - data.uvs[j][0];
            const dv = data.uvs[i][1] - data.uvs[j][1];
            if (Math.sqrt(du * du + dv * dv) < threshold) {
              group.push(j);
            }
          }
          if (group.length > 1) {
            let sumU = 0, sumV = 0;
            for (const vi of group) { sumU += data.uvs[vi][0]; sumV += data.uvs[vi][1]; }
            const avgU = sumU / group.length;
            const avgV = sumV / group.length;
            for (const vi of group) { data.uvs[vi] = [avgU, avgV]; processed.add(vi); }
          }
        }
      }),

    // UV rip
    ripSelected: (entityId: string) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (!data || state.selectedUvVertices.size === 0) return;
        // Offset selected vertices slightly to create a split visual
        const offset = 0.005;
        for (const vi of state.selectedUvVertices) {
          const uv = data.uvs[vi];
          if (uv) {
            uv[0] += offset;
            uv[1] += offset;
          }
        }
      }),

    // UV mirror
    mirrorSelectedU: (entityId: string) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (!data || state.selectedUvVertices.size === 0) return;
        // Mirror around 0.5 U
        for (const vi of state.selectedUvVertices) {
          const uv = data.uvs[vi];
          if (uv) uv[0] = 1.0 - uv[0];
        }
      }),

    mirrorSelectedV: (entityId: string) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (!data || state.selectedUvVertices.size === 0) return;
        // Mirror around 0.5 V
        for (const vi of state.selectedUvVertices) {
          const uv = data.uvs[vi];
          if (uv) uv[1] = 1.0 - uv[1];
        }
      }),

    // Island operations
    rotateIslandsToAxes: (entityId: string) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (!data) return;
        for (const island of data.islands) {
          // Find island bounding box and determine dominant axis
          let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
          for (const vi of island.vertexIndices) {
            const uv = data.uvs[vi];
            if (!uv) continue;
            minU = Math.min(minU, uv[0]); minV = Math.min(minV, uv[1]);
            maxU = Math.max(maxU, uv[0]); maxV = Math.max(maxV, uv[1]);
          }
          const width = maxU - minU;
          const height = maxV - minV;
          // If taller than wide, rotate 90 degrees
          if (height > width * 1.2) {
            const centerX = (minU + maxU) / 2;
            const centerY = (minV + maxV) / 2;
            for (const vi of island.vertexIndices) {
              const uv = data.uvs[vi];
              if (!uv) continue;
              const dx = uv[0] - centerX;
              const dy = uv[1] - centerY;
              uv[0] = centerX + dy;
              uv[1] = centerY - dx;
            }
          }
        }
      }),

    lockOverlappingIslands: (entityId: string) =>
      set((state) => {
        const data = state.uvData[entityId];
        if (!data || data.islands.length < 2) return;
        // Detect overlapping islands and mark for locking
        const overlaps = new Map<number, number[]>();
        for (let i = 0; i < data.islands.length; i++) {
          for (let j = i + 1; j < data.islands.length; j++) {
            if (islandsOverlap(data, data.islands[i], data.islands[j])) {
              if (!overlaps.has(i)) overlaps.set(i, []);
              if (!overlaps.has(j)) overlaps.set(j, []);
              overlaps.get(i)!.push(j);
              overlaps.get(j)!.push(i);
            }
          }
        }
        // Pin all vertices in overlapping islands
        for (const [islandIdx] of overlaps) {
          const island = data.islands[islandIdx];
          for (const vi of island.vertexIndices) {
            if (!data.pinnedVertices.includes(vi)) {
              data.pinnedVertices.push(vi);
            }
          }
        }
      }),

    // Color ramp texture
    generateColorRampTexture: (size = 256, stops = [{ pos: 0, color: "#000000" }, { pos: 1, color: "#ffffff" }]) => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";

      const gradient = ctx.createLinearGradient(0, 0, size, 0);
      for (const stop of stops) {
        gradient.addColorStop(Math.max(0, Math.min(1, stop.pos)), stop.color);
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, 1);

      const id = `ramp_${Date.now()}`;
      const dataUrl = canvas.toDataURL();
      set((state) => {
        state.generatedTextures[id] = dataUrl;
      });
      return dataUrl;
    },

    // Combine textures
    combineTextures: (texA: string, texB: string, mode = "mix", factor = 0.5) => {
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext("2d");
      if (!ctx) return "";

      const imgA = new Image();
      const imgB = new Image();
      let loaded = 0;

      const finish = () => {
        ctx.drawImage(imgA, 0, 0, 256, 256);
        if (mode === "mix") {
          ctx.globalAlpha = factor;
          ctx.drawImage(imgB, 0, 0, 256, 256);
          ctx.globalAlpha = 1.0;
        } else {
          const imgDataA = ctx.getImageData(0, 0, 256, 256);
          ctx.drawImage(imgB, 0, 0, 256, 256);
          const imgDataB = ctx.getImageData(0, 0, 256, 256);
          const result = ctx.createImageData(256, 256);
          for (let i = 0; i < imgDataA.data.length; i += 4) {
            const a = imgDataA.data[i] / 255;
            const b = imgDataB.data[i] / 255;
            let val: number;
            if (mode === "multiply") val = a * b;
            else if (mode === "add") val = Math.min(1, a + b);
            else val = Math.max(0, a - b); // subtract
            const c = Math.floor(val * 255);
            result.data[i] = c;
            result.data[i + 1] = c;
            result.data[i + 2] = c;
            result.data[i + 3] = 255;
          }
          ctx.putImageData(result, 0, 0);
        }
        const id = `combined_${Date.now()}`;
        const dataUrl = canvas.toDataURL();
        set((state) => {
          state.generatedTextures[id] = dataUrl;
        });
      };

      imgA.onload = () => { loaded++; if (loaded >= 2) finish(); };
      imgB.onload = () => { loaded++; if (loaded >= 2) finish(); };
      imgA.src = texA;
      imgB.src = texB;

      return "";
    },
  }))
);

// --- UV projection algorithms ---

function computeProjection(
  positions: number[],
  normals: number[],
  _indices: number[],
  type: UvProjectionType,
  cameraMatrix?: number[] | null,
): number[][] {
  const vertexCount = positions.length / 3;

  if (type === "camera" && cameraMatrix) {
    return cameraProjection(positions, vertexCount, cameraMatrix);
  }
  if (type === "smart" || type === "cube") {
    return cubeProjection(positions, normals, vertexCount);
  }
  if (type === "cylinder") {
    return cylinderProjection(positions, vertexCount);
  }
  if (type === "sphere") {
    return sphereProjection(positions, vertexCount);
  }
  return cubeProjection(positions, normals, vertexCount);
}

function cameraProjection(positions: number[], vertexCount: number, cameraMatrix: number[]): number[][] {
  // cameraMatrix is a 4x4 view-projection matrix (16 floats, column-major)
  const uvs: number[][] = [];
  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];

    // Apply view-projection matrix
    const cx = cameraMatrix[0] * x + cameraMatrix[4] * y + cameraMatrix[8] * z + cameraMatrix[12];
    const cy = cameraMatrix[1] * x + cameraMatrix[5] * y + cameraMatrix[9] * z + cameraMatrix[13];
    const cw = cameraMatrix[3] * x + cameraMatrix[7] * y + cameraMatrix[11] * z + cameraMatrix[15];

    if (Math.abs(cw) < 0.0001) {
      uvs.push([0.5, 0.5]);
      continue;
    }

    // NDC to UV: [-1,1] -> [0,1]
    const ndcX = cx / cw;
    const ndcY = cy / cw;
    uvs.push([(ndcX + 1) * 0.5, (ndcY + 1) * 0.5]);
  }
  return normalizeUvs(uvs);
}

function cubeProjection(positions: number[], normals: number[], vertexCount: number): number[][] {
  const uvs: number[][] = [];
  for (let i = 0; i < vertexCount; i++) {
    const nx = Math.abs(normals[i * 3]);
    const ny = Math.abs(normals[i * 3 + 1]);
    const nz = Math.abs(normals[i * 3 + 2]);

    let u: number, v: number;

    if (nx >= ny && nx >= nz) {
      // X-axis dominant
      u = positions[i * 3 + 1]; // Y
      v = positions[i * 3 + 2]; // Z
    } else if (ny >= nx && ny >= nz) {
      // Y-axis dominant
      u = positions[i * 3]; // X
      v = positions[i * 3 + 2]; // Z
    } else {
      // Z-axis dominant
      u = positions[i * 3]; // X
      v = positions[i * 3 + 1]; // Y
    }

    uvs.push([u, v]);
  }
  return normalizeUvs(uvs);
}

function cylinderProjection(positions: number[], vertexCount: number): number[][] {
  const uvs: number[][] = [];
  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];

    const angle = Math.atan2(x, z);
    const u = (angle + Math.PI) / (2 * Math.PI);
    const v = (y + 1) / 2; // assume unit height range

    uvs.push([u, v]);
  }
  return normalizeUvs(uvs);
}

function sphereProjection(positions: number[], vertexCount: number): number[][] {
  const uvs: number[][] = [];
  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];

    const len = Math.sqrt(x * x + y * y + z * z) || 1;
    const ny = y / len;
    const nx = x / len;
    const nz = z / len;

    const u = 0.5 + Math.atan2(nz, nx) / (2 * Math.PI);
    const v = 0.5 + Math.asin(ny) / Math.PI;

    uvs.push([u, v]);
  }
  return normalizeUvs(uvs);
}

function normalizeUvs(uvs: number[][]): number[][] {
  if (uvs.length === 0) return uvs;

  let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
  for (const uv of uvs) {
    minU = Math.min(minU, uv[0]);
    minV = Math.min(minV, uv[1]);
    maxU = Math.max(maxU, uv[0]);
    maxV = Math.max(maxV, uv[1]);
  }

  const rangeU = maxU - minU || 1;
  const rangeV = maxV - minV || 1;

  return uvs.map(([u, v]) => [(u - minU) / rangeU, (v - minV) / rangeV]);
}

// --- UV island detection ---

function findUvIslands(indicesParam: number[], uvs: number[][]): UvIsland[] {
  if (indicesParam.length === 0 || uvs.length === 0) return [];

  // Build face-vertex adjacency using edge connectivity
  const faceCount = indicesParam.length / 3;
  const faceVertices: number[][] = [];
  for (let f = 0; f < faceCount; f++) {
    faceVertices.push([
      indicesParam[f * 3],
      indicesParam[f * 3 + 1],
      indicesParam[f * 3 + 2],
    ]);
  }

  // Build edge map: edge (v0,v1) -> faces
  const edgeFaces = new Map<string, number[]>();
  for (let f = 0; f < faceCount; f++) {
    const verts = faceVertices[f];
    for (let e = 0; e < 3; e++) {
      const v0 = Math.min(verts[e], verts[(e + 1) % 3]);
      const v1 = Math.max(verts[e], verts[(e + 1) % 3]);
      const key = `${v0}-${v1}`;
      if (!edgeFaces.has(key)) edgeFaces.set(key, []);
      edgeFaces.get(key)!.push(f);
    }
  }

  // Build face adjacency (faces sharing an edge)
  const faceAdjacency: Map<number, Set<number>> = new Map();
  for (let f = 0; f < faceCount; f++) {
    faceAdjacency.set(f, new Set());
  }
  for (const [, faces] of edgeFaces) {
    for (let i = 0; i < faces.length; i++) {
      for (let j = i + 1; j < faces.length; j++) {
        faceAdjacency.get(faces[i])!.add(faces[j]);
        faceAdjacency.get(faces[j])!.add(faces[i]);
      }
    }
  }

  // Flood fill to find connected components
  const visited = new Set<number>();
  const islands: UvIsland[] = [];

  for (let startFace = 0; startFace < faceCount; startFace++) {
    if (visited.has(startFace)) continue;

    const islandFaces: number[] = [];
    const islandVertices = new Set<number>();
    const queue = [startFace];
    visited.add(startFace);

    while (queue.length > 0) {
      const face = queue.pop()!;
      islandFaces.push(face);

      for (const vi of faceVertices[face]) {
        islandVertices.add(vi);
      }

      for (const neighbor of faceAdjacency.get(face)!) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    if (islandFaces.length > 0) {
      islands.push({
        index: islands.length,
        faceIndices: islandFaces,
        vertexIndices: Array.from(islandVertices),
      });
    }
  }

  return islands;
}

// --- Simple noise for procedural textures ---

function simpleNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  const a = pseudoRandom(ix, iy);
  const b = pseudoRandom(ix + 1, iy);
  const c = pseudoRandom(ix, iy + 1);
  const d = pseudoRandom(ix + 1, iy + 1);

  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);

  return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function pseudoRandom(x: number, y: number): number {
  let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

// Check if two UV islands overlap (AABB intersection)
function islandsOverlap(
  data: { uvs: number[][] },
  islandA: UvIsland,
  islandB: UvIsland,
): boolean {
  let minUA = Infinity, minVA = Infinity, maxUA = -Infinity, maxVA = -Infinity;
  for (const vi of islandA.vertexIndices) {
    const uv = data.uvs[vi];
    if (!uv) continue;
    minUA = Math.min(minUA, uv[0]); minVA = Math.min(minVA, uv[1]);
    maxUA = Math.max(maxUA, uv[0]); maxVA = Math.max(maxVA, uv[1]);
  }

  let minUB = Infinity, minVB = Infinity, maxUB = -Infinity, maxVB = -Infinity;
  for (const vi of islandB.vertexIndices) {
    const uv = data.uvs[vi];
    if (!uv) continue;
    minUB = Math.min(minUB, uv[0]); minVB = Math.min(minVB, uv[1]);
    maxUB = Math.max(maxUB, uv[0]); maxVB = Math.max(maxVB, uv[1]);
  }

  const margin = 0.001;
  return (
    minUA < maxUB + margin &&
    maxUA > minUB - margin &&
    minVA < maxVB + margin &&
    maxVA > minVB - margin
  );
}
