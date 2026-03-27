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
  }>;

  // Settings
  settings: UvSettings;

  // Selection state
  editMode: UvEditMode;
  selectedUvVertices: Set<number>;
  selectedUvEdges: Set<[number, number]>;
  selectedUvFaces: Set<number>;
  selectedIslands: Set<number>;

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

  applyProjection: (entityId: string, projectionType: UvProjectionType, positions: number[], normals: number[], indices: number[]) => void;
  detectIslands: (entityId: string, indices: number[], uvs: number[][]) => void;

  packIslands: (entityId: string) => void;
  setSettings: (settings: Partial<UvSettings>) => void;

  setViewOffset: (offset: { x: number; y: number }) => void;
  setViewZoom: (zoom: number) => void;

  // Procedural textures
  generatedTextures: Record<string, string>; // base64 data URLs
  generateCheckerTexture: (size?: number, checks?: number) => string;
  generateNoiseTexture: (size?: number, scale?: number) => string;
  generateGradientTexture: (size?: number, color1?: string, color2?: string, direction?: "horizontal" | "vertical" | "radial") => string;
  generateGridTexture: (size?: number, divisions?: number, lineWidth?: number) => string;
  clearTexture: (id: string) => void;
}

export const useUvStore = create<UvState>()(
  immer((set) => ({
    panelOpen: false,
    uvData: {},
    settings: createDefaultUvSettings(),
    editMode: "vertex",
    selectedUvVertices: new Set(),
    selectedUvEdges: new Set(),
    selectedUvFaces: new Set(),
    selectedIslands: new Set(),
    viewOffset: { x: 0, y: 0 },
    viewZoom: 1.0,
    generatedTextures: {},

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

    applyProjection: (entityId, projectionType, positions, normals, indices) =>
      set((state) => {
        const uvs = computeProjection(positions, normals, indices, projectionType);
        if (!state.uvData[entityId]) {
          state.uvData[entityId] = { uvs: [], islands: [] };
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
          state.uvData[entityId] = { uvs: [], islands: [] };
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
  }))
);

// --- UV projection algorithms ---

function computeProjection(
  positions: number[],
  normals: number[],
  _indices: number[],
  type: UvProjectionType,
): number[][] {
  const vertexCount = positions.length / 3;

  if (type === "smart" || type === "cube") {
    return cubeProjection(positions, normals, vertexCount);
  }
  if (type === "cylinder") {
    return cylinderProjection(positions, vertexCount);
  }
  if (type === "sphere") {
    return sphereProjection(positions, vertexCount);
  }
  // camera projection: use smart as fallback
  return cubeProjection(positions, normals, vertexCount);
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
