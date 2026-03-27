/**
 * Texture Paint Panel — UI for texture painting in the 3D viewport.
 * Provides brush settings, layer management, tool selection, and undo/redo.
 */

import { useCallback } from "react";
import { useTexturePaintStore } from "@/editor/stores/texturePaintStore";
import type { PaintLayerType, PaintBlendMode, PaintToolType } from "@/editor/stores/texturePaintStore";
import { sceneRef } from "@/editor/utils/sceneRef";
import { AbstractMesh } from "@babylonjs/core";

const LAYER_TYPES: { type: PaintLayerType; label: string }[] = [
  { type: "base_color", label: "Base Color" },
  { type: "roughness", label: "Roughness" },
  { type: "metallic", label: "Metallic" },
  { type: "normal", label: "Normal" },
  { type: "emission", label: "Emission" },
];

const TOOLS: { tool: PaintToolType; label: string; shortcut: string }[] = [
  { tool: "brush", label: "Brush", shortcut: "B" },
  { tool: "fill", label: "Fill", shortcut: "F" },
  { tool: "gradient", label: "Gradient", shortcut: "G" },
  { tool: "clone", label: "Clone", shortcut: "C" },
  { tool: "project", label: "Project", shortcut: "P" },
];

const BLEND_MODES: { mode: PaintBlendMode; label: string }[] = [
  { mode: "normal", label: "Normal" },
  { mode: "add", label: "Add" },
  { mode: "subtract", label: "Subtract" },
  { mode: "multiply", label: "Multiply" },
  { mode: "overlay", label: "Overlay" },
];

export function TexturePaintPanel() {
  const active = useTexturePaintStore((s) => s.active);
  const layers = useTexturePaintStore((s) => s.layers);
  const layerOrder = useTexturePaintStore((s) => s.layerOrder);
  const activeLayerId = useTexturePaintStore((s) => s.activeLayerId);
  const brush = useTexturePaintStore((s) => s.brush);
  const tool = useTexturePaintStore((s) => s.tool);
  const resolution = useTexturePaintStore((s) => s.resolution);
  const undoStack = useTexturePaintStore((s) => s.undoStack);
  const redoStack = useTexturePaintStore((s) => s.redoStack);

  const setBrushColor = useTexturePaintStore((s) => s.setBrushColor);
  const setBrushSize = useTexturePaintStore((s) => s.setBrushSize);
  const setBrushOpacity = useTexturePaintStore((s) => s.setBrushOpacity);
  const setBrushFalloff = useTexturePaintStore((s) => s.setBrushFalloff);
  const setBrushHardness = useTexturePaintStore((s) => s.setBrushHardness);
  const setTool = useTexturePaintStore((s) => s.setTool);
  const addLayer = useTexturePaintStore((s) => s.addLayer);
  const removeLayer = useTexturePaintStore((s) => s.removeLayer);
  const setActiveLayer = useTexturePaintStore((s) => s.setActiveLayer);
  const setLayerOpacity = useTexturePaintStore((s) => s.setLayerOpacity);
  const setLayerBlendMode = useTexturePaintStore((s) => s.setLayerBlendMode);
  const toggleLayerVisibility = useTexturePaintStore((s) => s.toggleLayerVisibility);
  const moveLayerUp = useTexturePaintStore((s) => s.moveLayerUp);
  const moveLayerDown = useTexturePaintStore((s) => s.moveLayerDown);
  const fillLayer = useTexturePaintStore((s) => s.fillLayer);
  const undo = useTexturePaintStore((s) => s.undo);
  const redo = useTexturePaintStore((s) => s.redo);
  const exitPaintMode = useTexturePaintStore((s) => s.exitPaintMode);
  const setCloneOffset = useTexturePaintStore((s) => s.setCloneOffset);

  if (!active) return null;

  const activeLayer = activeLayerId ? layers[activeLayerId] : null;

  // Texture projection handler
  const handleProjectTexture = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      const scene = sceneRef.current;
      if (!scene) return;

      const store = useTexturePaintStore.getState();
      const entityId = store.activeEntityId;
      if (!entityId) return;

      const mesh = scene.meshes.find(
        (m) => m instanceof AbstractMesh && m.metadata?.entityId === entityId
      ) as AbstractMesh | undefined;
      if (!mesh || !mesh.geometry) return;

      const vertexData = mesh.geometry.getVerticesData("position");
      const normalData = mesh.geometry.getVerticesData("normal");
      const indexData = mesh.geometry.getIndices();
      if (!vertexData || !normalData || !indexData) return;

      const camera = scene.activeCamera;
      if (!camera) return;

      // Build view-projection matrix
      camera.getViewMatrix();
      const vpMatrix = scene.getTransformMatrix().asArray();

      store.projectTexture(base64, Array.from(vertexData), Array.from(normalData), Array.from(indexData), vpMatrix);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }, []);

  return (
    <div className="flex flex-col gap-2 text-[10px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-200">Texture Paint</span>
        <button
          className="text-gray-400 hover:text-red-400 transition text-xs"
          onClick={exitPaintMode}
          title="Exit paint mode"
        >
          [X]
        </button>
      </div>

      {/* Tools */}
      <div>
        <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Tools</div>
        <div className="flex gap-1">
          {TOOLS.map((t) => (
            <button
              key={t.tool}
              className={`flex-1 py-1 rounded text-center transition ${
                tool === t.tool
                  ? "bg-blue-600/40 text-blue-200"
                  : "bg-[#2a2a3a] text-gray-400 hover:text-white"
              }`}
              onClick={() => setTool(t.tool)}
              title={`${t.label} (${t.shortcut})`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Brush Settings */}
      <div>
        <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Brush</div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <label className="text-gray-400 w-12">Color</label>
            <input
              type="color"
              value={brush.color}
              onChange={(e) => setBrushColor(e.target.value)}
              className="w-6 h-6 border border-[#444] rounded cursor-pointer bg-transparent"
            />
            <span className="text-gray-500">{brush.color}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-gray-400 w-12">Size</label>
            <input
              type="range"
              min={1}
              max={256}
              value={brush.size}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-gray-500 w-8 text-right">{brush.size}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-gray-400 w-12">Opacity</label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(brush.opacity * 100)}
              onChange={(e) => setBrushOpacity(Number(e.target.value) / 100)}
              className="flex-1"
            />
            <span className="text-gray-500 w-8 text-right">{Math.round(brush.opacity * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-gray-400 w-12">Hard</label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(brush.hardness * 100)}
              onChange={(e) => setBrushHardness(Number(e.target.value) / 100)}
              className="flex-1"
            />
            <span className="text-gray-500 w-8 text-right">{Math.round(brush.hardness * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-gray-400 w-12">Falloff</label>
            {(["smooth", "sharp", "spike"] as const).map((f) => (
              <button
                key={f}
                className={`px-1.5 py-0.5 rounded text-[9px] transition ${
                  brush.falloff === f ? "bg-blue-600/40 text-blue-200" : "text-gray-500 hover:text-white"
                }`}
                onClick={() => setBrushFalloff(f)}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-1">
            <label className="flex items-center gap-1 text-gray-400">
              <input
                type="checkbox"
                checked={brush.usePressure}
                onChange={() => {
                  // Pressure support toggle
                }}
                className="w-3 h-3"
              />
              Pressure
            </label>
          </div>
        </div>
      </div>

      {/* Clone offset (only when clone tool active) */}
      {tool === "clone" && (
        <div>
          <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Clone Stamp</div>
          <div className="flex items-center gap-2">
            <label className="text-gray-400 w-12">Offset X</label>
            <input
              type="number"
              value={useTexturePaintStore.getState().cloneOffset.x}
              onChange={(evt) => setCloneOffset(Number(evt.target.value), useTexturePaintStore.getState().cloneOffset.y)}
              className="w-16 bg-[#1a1a2e] border border-[#333] rounded px-1 py-0.5 text-gray-300"
            />
          </div>
          <div className="flex items-center gap-2 mt-1">
            <label className="text-gray-400 w-12">Offset Y</label>
            <input
              type="number"
              value={useTexturePaintStore.getState().cloneOffset.y}
              onChange={(evt) => setCloneOffset(useTexturePaintStore.getState().cloneOffset.x, Number(evt.target.value))}
              className="w-16 bg-[#1a1a2e] border border-[#333] rounded px-1 py-0.5 text-gray-300"
            />
          </div>
        </div>
      )}

      {/* Project Texture (only when project tool active) */}
      {tool === "project" && (
        <div>
          <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Texture Projection</div>
          <p className="text-[9px] text-gray-500 mb-1">Project an image through the camera onto the mesh surface.</p>
          <label className="flex-1 cursor-pointer bg-[#2a2a3a] border border-[#444] rounded px-2 py-1 text-[10px] text-gray-400 hover:text-gray-200 hover:border-blue-500 transition text-center block">
            Load Image to Project
            <input type="file" accept="image/*" onChange={handleProjectTexture} className="hidden" />
          </label>
        </div>
      )}

      {/* Undo/Redo */}
      <div className="flex gap-1">
        <button
          className="flex-1 py-1 rounded bg-[#2a2a3a] text-gray-400 hover:text-white transition text-center"
          onClick={undo}
          disabled={undoStack.length === 0}
          title="Undo (Ctrl+Z)"
        >
          Undo ({undoStack.length})
        </button>
        <button
          className="flex-1 py-1 rounded bg-[#2a2a3a] text-gray-400 hover:text-white transition text-center"
          onClick={redo}
          disabled={redoStack.length === 0}
          title="Redo (Ctrl+Shift+Z)"
        >
          Redo ({redoStack.length})
        </button>
      </div>

      {/* Layers */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-[9px] text-gray-500 uppercase tracking-wider">Layers</div>
          <div className="flex gap-1">
            {LAYER_TYPES.map((lt) => (
              <button
                key={lt.type}
                className="px-1 py-0.5 text-[8px] bg-[#2a2a3a] text-gray-400 hover:text-white rounded transition"
                onClick={() => addLayer(lt.type)}
                title={`Add ${lt.label} layer`}
              >
                +{lt.label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-0.5">
          {[...layerOrder].reverse().map((layerId) => {
            const layer = layers[layerId];
            if (!layer) return null;
            const isActive = layerId === activeLayerId;
            return (
              <div
                key={layerId}
                className={`flex items-center gap-1 px-1.5 py-1 rounded cursor-pointer transition ${
                  isActive ? "bg-blue-600/20 border border-blue-500/30" : "bg-[#1a1a2e] hover:bg-[#252535]"
                }`}
                onClick={() => setActiveLayer(layerId)}
              >
                <button
                  className="w-3 h-3 text-[8px] text-gray-400 hover:text-white"
                  onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layerId); }}
                >
                  {layer.visible ? "V" : "H"}
                </button>
                <span className={`flex-1 truncate ${layer.visible ? "text-gray-300" : "text-gray-600"}`}>
                  {layer.name}
                </span>
                <span className="text-gray-600 text-[8px]">{layer.type.split("_")[0]}</span>
                <div className="flex gap-0.5">
                  <button
                    className="text-gray-500 hover:text-white text-[8px]"
                    onClick={(e) => { e.stopPropagation(); moveLayerUp(layerId); }}
                  >
                    ^
                  </button>
                  <button
                    className="text-gray-500 hover:text-white text-[8px]"
                    onClick={(e) => { e.stopPropagation(); moveLayerDown(layerId); }}
                  >
                    v
                  </button>
                  <button
                    className="text-gray-500 hover:text-red-400 text-[8px]"
                    onClick={(e) => { e.stopPropagation(); removeLayer(layerId); }}
                  >
                    x
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Active layer settings */}
      {activeLayer && (
        <div>
          <div className="text-[9px] text-gray-500 uppercase tracking-wider mb-1">Active Layer</div>
          <div className="flex items-center gap-2">
            <label className="text-gray-400 w-12">Opacity</label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(activeLayer.opacity * 100)}
              onChange={(e) => setLayerOpacity(activeLayer.id, Number(e.target.value) / 100)}
              className="flex-1"
            />
            <span className="text-gray-500 w-8 text-right">{Math.round(activeLayer.opacity * 100)}%</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <label className="text-gray-400 w-12">Blend</label>
            <select
              value={activeLayer.blendMode}
              onChange={(e) => setLayerBlendMode(activeLayer.id, e.target.value as PaintBlendMode)}
              className="flex-1 bg-[#1a1a2e] border border-[#333] rounded px-1 py-0.5 text-gray-300 text-[9px]"
            >
              {BLEND_MODES.map((b) => (
                <option key={b.mode} value={b.mode}>{b.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-1 mt-1">
            <button
              className="flex-1 py-1 rounded bg-[#2a2a3a] text-gray-400 hover:text-white transition text-[9px]"
              onClick={() => fillLayer(brush.color)}
            >
              Fill Layer
            </button>
            <button
              className="flex-1 py-1 rounded bg-[#2a2a3a] text-gray-400 hover:text-white transition text-[9px]"
              onClick={() => fillLayer("#000000")}
            >
              Clear Layer
            </button>
          </div>
        </div>
      )}

      {/* Resolution */}
      <div className="flex items-center gap-2">
        <label className="text-gray-400 text-[9px]">Resolution</label>
        <select
          value={resolution}
          onChange={() => {
            // Resolution changes would need to resize all layer canvases
            // For now, this is a display of the current setting
          }}
          className="flex-1 bg-[#1a1a2e] border border-[#333] rounded px-1 py-0.5 text-gray-300 text-[9px]"
        >
          <option value="512">512</option>
          <option value="1024">1024</option>
          <option value="2048">2048</option>
          <option value="4096">4096</option>
        </select>
      </div>
    </div>
  );
}
