/**
 * Texture paint store — painting directly on mesh surfaces in the 3D viewport.
 * Supports multiple layers, brush tools, undo/redo, and stylus pressure.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

export type PaintLayerType = "base_color" | "roughness" | "metallic" | "normal" | "emission";

export interface PaintLayer {
  id: string;
  name: string;
  type: PaintLayerType;
  visible: boolean;
  opacity: number; // 0-1
  blendMode: PaintBlendMode;
  canvas: HTMLCanvasElement | null; // offscreen canvas
}

export type PaintBlendMode = "normal" | "add" | "subtract" | "multiply" | "overlay";

export type PaintToolType = "brush" | "fill" | "gradient" | "clone";

export interface PaintStroke {
  points: { x: number; y: number; pressure: number; color: string }[];
  layerId: string;
  tool: PaintToolType;
  brushSize: number;
  brushOpacity: number;
}

export interface PaintBrushSettings {
  color: string;
  size: number;
  opacity: number;
  falloff: "smooth" | "sharp" | "spike";
  hardness: number; // 0-1, edge softness
  spacing: number; // 0-1
  usePressure: boolean;
  pressureSize: boolean; // pressure affects size
  pressureOpacity: boolean; // pressure affects opacity
}

interface TexturePaintState {
  active: boolean;
  activeEntityId: string | null;
  resolution: 512 | 1024 | 2048 | 4096;

  // Layers
  layers: Record<string, PaintLayer>;
  activeLayerId: string | null;
  layerOrder: string[];

  // Brush
  brush: PaintBrushSettings;
  tool: PaintToolType;
  isPainting: boolean;

  // Clone stamp
  cloneOffset: { x: number; y: number };

  // Undo/redo
  undoStack: PaintStroke[];
  redoStack: PaintStroke[];
  maxUndo: number;

  // Actions
  enterPaintMode: (entityId: string) => void;
  exitPaintMode: () => void;

  // Layer management
  addLayer: (type: PaintLayerType, name?: string) => void;
  removeLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  setLayerBlendMode: (id: string, blendMode: PaintBlendMode) => void;
  toggleLayerVisibility: (id: string) => void;
  moveLayerUp: (id: string) => void;
  moveLayerDown: (id: string) => void;

  // Brush settings
  setBrushColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setBrushOpacity: (opacity: number) => void;
  setBrushFalloff: (falloff: "smooth" | "sharp" | "spike") => void;
  setBrushHardness: (hardness: number) => void;
  setTool: (tool: PaintToolType) => void;
  setIsPainting: (val: boolean) => void;

  // Clone stamp
  setCloneOffset: (x: number, y: number) => void;

  // Undo/redo
  pushStroke: (stroke: PaintStroke) => void;
  undo: () => void;
  redo: () => void;

  // Paint operations (called from viewport interaction)
  paintAt: (x: number, y: number, pressure: number) => void;
  fillLayer: (color: string) => void;
  getCompositeTexture: () => string | null;
}

const defaultBrush: PaintBrushSettings = {
  color: "#ffffff",
  size: 32,
  opacity: 1.0,
  falloff: "smooth",
  hardness: 0.5,
  spacing: 0.1,
  usePressure: false,
  pressureSize: false,
  pressureOpacity: false,
};

let layerCounter = 0;

export const useTexturePaintStore = create<TexturePaintState>()(
  immer((set, get) => ({
    active: false,
    activeEntityId: null,
    resolution: 1024,

    layers: {},
    activeLayerId: null,
    layerOrder: [],

    brush: { ...defaultBrush },
    tool: "brush",
    isPainting: false,

    cloneOffset: { x: 0, y: 0 },

    undoStack: [],
    redoStack: [],
    maxUndo: 50,

    enterPaintMode: (entityId) =>
      set((state) => {
        state.active = true;
        state.activeEntityId = entityId;

        // Create default base color layer if none exist
        if (Object.keys(state.layers).length === 0) {
          layerCounter++;
          const id = `layer_${Date.now()}_${layerCounter}`;
          state.layers[id] = {
            id,
            name: "Base Color",
            type: "base_color",
            visible: true,
            opacity: 1.0,
            blendMode: "normal",
            canvas: null,
          };
          state.layerOrder.push(id);
          state.activeLayerId = id;
        }
      }),

    exitPaintMode: () =>
      set((state) => {
        state.active = false;
        state.activeEntityId = null;
        state.isPainting = false;
      }),

    addLayer: (type, name) =>
      set((state) => {
        layerCounter++;
        const id = `layer_${Date.now()}_${layerCounter}`;
        const defaultNames: Record<PaintLayerType, string> = {
          base_color: "Base Color",
          roughness: "Roughness",
          metallic: "Metallic",
          normal: "Normal Map",
          emission: "Emission",
        };
        state.layers[id] = {
          id,
          name: name ?? defaultNames[type] ?? "Layer",
          type,
          visible: true,
          opacity: 1.0,
          blendMode: "normal",
          canvas: null,
        };
        state.layerOrder.push(id);
        state.activeLayerId = id;
        return id;
      }),

    removeLayer: (id) =>
      set((state) => {
        delete state.layers[id];
        state.layerOrder = state.layerOrder.filter((lid) => lid !== id);
        if (state.activeLayerId === id) {
          state.activeLayerId = state.layerOrder.length > 0 ? state.layerOrder[state.layerOrder.length - 1] : null;
        }
      }),

    setActiveLayer: (id) =>
      set((state) => {
        state.activeLayerId = id;
      }),

    setLayerOpacity: (id, opacity) =>
      set((state) => {
        const layer = state.layers[id];
        if (layer) layer.opacity = Math.max(0, Math.min(1, opacity));
      }),

    setLayerBlendMode: (id, blendMode) =>
      set((state) => {
        const layer = state.layers[id];
        if (layer) layer.blendMode = blendMode;
      }),

    toggleLayerVisibility: (id) =>
      set((state) => {
        const layer = state.layers[id];
        if (layer) layer.visible = !layer.visible;
      }),

    moveLayerUp: (id) =>
      set((state) => {
        const idx = state.layerOrder.indexOf(id);
        if (idx < state.layerOrder.length - 1) {
          const temp = state.layerOrder[idx];
          state.layerOrder[idx] = state.layerOrder[idx + 1];
          state.layerOrder[idx + 1] = temp;
        }
      }),

    moveLayerDown: (id) =>
      set((state) => {
        const idx = state.layerOrder.indexOf(id);
        if (idx > 0) {
          const temp = state.layerOrder[idx];
          state.layerOrder[idx] = state.layerOrder[idx - 1];
          state.layerOrder[idx - 1] = temp;
        }
      }),

    setBrushColor: (color) =>
      set((state) => {
        state.brush.color = color;
      }),

    setBrushSize: (size) =>
      set((state) => {
        state.brush.size = Math.max(1, Math.min(256, size));
      }),

    setBrushOpacity: (opacity) =>
      set((state) => {
        state.brush.opacity = Math.max(0, Math.min(1, opacity));
      }),

    setBrushFalloff: (falloff) =>
      set((state) => {
        state.brush.falloff = falloff;
      }),

    setBrushHardness: (hardness) =>
      set((state) => {
        state.brush.hardness = Math.max(0, Math.min(1, hardness));
      }),

    setTool: (tool) =>
      set((state) => {
        state.tool = tool;
      }),

    setIsPainting: (val) =>
      set((state) => {
        state.isPainting = val;
      }),

    setCloneOffset: (x, y) =>
      set((state) => {
        state.cloneOffset = { x, y };
      }),

    pushStroke: (stroke) =>
      set((state) => {
        state.undoStack.push(stroke);
        if (state.undoStack.length > state.maxUndo) {
          state.undoStack.shift();
        }
        state.redoStack = [];
      }),

    undo: () =>
      set((state) => {
        if (state.undoStack.length === 0) return;
        const stroke = state.undoStack.pop()!;
        state.redoStack.push(stroke);
      }),

    redo: () =>
      set((state) => {
        if (state.redoStack.length === 0) return;
        const stroke = state.redoStack.pop()!;
        state.undoStack.push(stroke);
      }),

    paintAt: (x, y, pressure) => {
      const state = get();
      if (!state.active || !state.activeLayerId) return;

      const layer = state.layers[state.activeLayerId];
      if (!layer || !layer.visible) return;

      // Create layer canvas if needed
      const res = state.resolution;
      if (!layer.canvas) {
        layer.canvas = document.createElement("canvas");
        layer.canvas.width = res;
        layer.canvas.height = res;
      }

      const ctx = layer.canvas.getContext("2d");
      if (!ctx) return;

      const brush = state.brush;
      const effectiveSize = brush.pressureSize ? brush.size * pressure : brush.size;
      const effectiveOpacity = brush.pressureOpacity ? brush.opacity * pressure : brush.opacity;
      const radius = effectiveSize / 2;

      if (state.tool === "brush" || state.tool === "clone") {
        ctx.save();
        ctx.globalAlpha = effectiveOpacity;

        if (state.tool === "clone" && layer.canvas) {
          // Clone: sample from offset position
          const srcX = x - state.cloneOffset.x;
          const srcY = y - state.cloneOffset.y;
          ctx.drawImage(
            layer.canvas,
            srcX - radius, srcY - radius, radius * 2, radius * 2,
            x - radius, y - radius, radius * 2, radius * 2,
          );
        } else {
          // Radial gradient brush with falloff
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
          const innerStop = brush.hardness;
          const color = brush.color;
          gradient.addColorStop(0, color);
          gradient.addColorStop(innerStop, color);

          if (brush.falloff === "smooth") {
            gradient.addColorStop(1, color + "00");
          } else if (brush.falloff === "spike") {
            gradient.addColorStop(Math.min(1, innerStop + 0.1), color + "40");
            gradient.addColorStop(1, color + "00");
          } else {
            gradient.addColorStop(Math.min(1, innerStop + 0.01), color + "00");
          }

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }
    },

    fillLayer: (color) => {
      const state = get();
      if (!state.activeLayerId) return;
      const layer = state.layers[state.activeLayerId];
      if (!layer) return;

      const res = state.resolution;
      if (!layer.canvas) {
        layer.canvas = document.createElement("canvas");
        layer.canvas.width = res;
        layer.canvas.height = res;
      }

      const ctx = layer.canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = color;
      ctx.fillRect(0, 0, res, res);
    },

    getCompositeTexture: () => {
      const state = get();
      if (state.layerOrder.length === 0) return null;

      const res = state.resolution;
      const composite = document.createElement("canvas");
      composite.width = res;
      composite.height = res;
      const ctx = composite.getContext("2d");
      if (!ctx) return null;

      // Clear to black
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, res, res);

      // Composite layers bottom to top
      for (const layerId of state.layerOrder) {
        const layer = state.layers[layerId];
        if (!layer || !layer.visible || !layer.canvas) continue;

        ctx.save();
        ctx.globalAlpha = layer.opacity;

        if (layer.blendMode === "multiply") {
          ctx.globalCompositeOperation = "multiply";
        } else if (layer.blendMode === "add") {
          ctx.globalCompositeOperation = "lighter";
        } else if (layer.blendMode === "subtract") {
          ctx.globalCompositeOperation = "difference";
        } else if (layer.blendMode === "overlay") {
          ctx.globalCompositeOperation = "overlay";
        } else {
          ctx.globalCompositeOperation = "source-over";
        }

        ctx.drawImage(layer.canvas, 0, 0);
        ctx.restore();
      }

      return composite.toDataURL();
    },
  }))
);
