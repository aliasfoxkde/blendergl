/**
 * PrintPreviewPanel — shows sliced layer visualization, print time,
 * material usage, and color-coded preview.
 */

import { useState, useCallback } from "react";
import { useSettingsStore } from "@/editor/stores/settingsStore";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { sceneRef } from "@/editor/utils/sceneRef";
import { sliceMesh } from "@/editor/utils/gcode/slicer";
import {
  generateGcode,
  generateSupportRegions,
  downloadGcode,
  type GcodeResult,
} from "@/editor/utils/gcode/gcodeGenerator";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";

interface LayerPreview {
  z: number;
  perimeterPoints: { x: number; y: number }[][];
  infillLines: { x1: number; y1: number; x2: number; y2: number }[];
  supportContours: { x: number; y: number }[][];
  filament: number;
}

export function PrintPreviewPanel() {
  const printSettings = useSettingsStore((s) => s.printSettings);
  const entities = useSceneStore((s) => s.entities);
  const selectedIds = useSelectionStore((s) => s.selectedIds);

  const [layers, setLayers] = useState<LayerPreview[]>([]);
  const [result, setResult] = useState<GcodeResult | null>(null);
  const [activeLayer, setActiveLayer] = useState(0);
  const [slicing, setSlicing] = useState(false);
  const [hasSliced, setHasSliced] = useState(false);

  const doSlice = useCallback(() => {
    setSlicing(true);
    setHasSliced(false);

    // Use requestAnimationFrame to avoid blocking UI
    requestAnimationFrame(() => {
      try {
        const scene = sceneRef.current;
        if (!scene) return;

        const selectedId = selectedIds[0];
        if (!selectedId) return;

        const entity = entities[selectedId];
        if (!entity) return;

        // Find the Babylon mesh
        const mesh = scene.getMeshByName(entity.id);
        if (!(mesh instanceof Mesh)) return;

        const positions = mesh.getVerticesData("position") as Float32Array | null;
        const indices = mesh.getIndices();
        if (!positions || !indices) return;

        // Apply world matrix
        const worldMatrix = mesh.getWorldMatrix();
        const transformed = new Float32Array(positions.length);
        const min = { x: Infinity, y: Infinity, z: Infinity };
        const max = { x: -Infinity, y: -Infinity, z: -Infinity };

        for (let i = 0; i < positions.length / 3; i++) {
          const v = new Vector3(
            positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]
          );
          Vector3.TransformCoordinatesToRef(v, worldMatrix, v);
          transformed[i * 3] = v.x;
          transformed[i * 3 + 1] = v.y;
          transformed[i * 3 + 2] = v.z;
          if (v.x < min.x) min.x = v.x;
          if (v.y < min.y) min.y = v.y;
          if (v.z < min.z) min.z = v.z;
          if (v.x > max.x) max.x = v.x;
          if (v.y > max.y) max.y = v.y;
          if (v.z > max.z) max.z = v.z;
        }

        const boundingBox = { min, max };
        const sliceResult = sliceMesh(
          transformed,
          indices,
          min.z,
          max.z,
          printSettings.layerHeight
        );

        // Generate support regions if enabled
        const supportRegions = printSettings.supportEnabled
          ? generateSupportRegions(sliceResult, boundingBox, printSettings.supportOverhangAngle)
          : undefined;

        const gcodeResult = generateGcode(sliceResult, printSettings, boundingBox, supportRegions);
        setResult(gcodeResult);

        // Build layer preview data
        const previewLayers: LayerPreview[] = [];
        const minX = boundingBox.min.x;
        const maxX = boundingBox.max.x;
        const minY = boundingBox.min.y;
        const maxY = boundingBox.max.y;

        for (const sliceLayer of sliceResult) {
          const perimeterPoints = sliceLayer.contours.map((c) =>
            c.map((p) => ({ x: p.x, y: p.y }))
          );

          // Build infill lines for preview
          const infillSpacing = printSettings.infillDensity > 0
            ? (100 / printSettings.infillDensity) * printSettings.nozzleDiameter
            : Infinity;
          const infillLines: { x1: number; y1: number; x2: number; y2: number }[] = [];
          for (let y = minY; y <= maxY; y += infillSpacing) {
            infillLines.push({ x1: minX, y1: y, x2: maxX, y2: y });
          }

          // Find support contours for this layer
          const support = supportRegions?.find((s) => s.z === sliceLayer.z);
          const supportContours = support?.contours ?? [];

          const layerInfo = gcodeResult.layers.find((l) => Math.abs(l.z - sliceLayer.z) < 0.001);

          previewLayers.push({
            z: sliceLayer.z,
            perimeterPoints,
            infillLines,
            supportContours,
            filament: layerInfo?.filament ?? 0,
          });
        }

        setLayers(previewLayers);
        setHasSliced(true);
        if (previewLayers.length > 0) setActiveLayer(0);
      } finally {
        setSlicing(false);
      }
    });
  }, [selectedIds, entities, printSettings]);

  const filamentMeters = result ? (result.totalFilament / 1000).toFixed(1) : "—";
  const filamentGrams = result ? (result.totalFilament * 1.24 * Math.PI * (0.875) ** 2 / 1000).toFixed(1) : "—";
  const timeMinutes = result ? Math.round(result.totalTime / 60) : "—";

  return (
    <div className="p-2 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Print Preview</span>
        <button
          onClick={doSlice}
          disabled={slicing || selectedIds.length === 0}
          className="px-2 py-0.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white text-[10px] transition"
        >
          {slicing ? "Slicing..." : "Slice Preview"}
        </button>
      </div>

      {hasSliced && result && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-1">
            <div className="bg-[#1a1a2e] rounded p-1.5 text-center">
              <div className="text-[10px] text-gray-500">Time</div>
              <div className="text-xs text-gray-200">{timeMinutes}m</div>
            </div>
            <div className="bg-[#1a1a2e] rounded p-1.5 text-center">
              <div className="text-[10px] text-gray-500">Filament</div>
              <div className="text-xs text-gray-200">{filamentGrams}g</div>
            </div>
            <div className="bg-[#1a1a2e] rounded p-1.5 text-center">
              <div className="text-[10px] text-gray-500">Length</div>
              <div className="text-xs text-gray-200">{filamentMeters}m</div>
            </div>
          </div>

          <div className="text-[10px] text-gray-500">
            {result.layerCount} layers | {result.totalFilament.toFixed(0)}mm total
          </div>

          {/* Layer slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-400">Layer {activeLayer + 1} / {layers.length}</span>
              <span className="text-[10px] text-gray-400">Z={layers[activeLayer]?.z.toFixed(2)}mm</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, layers.length - 1)}
              value={activeLayer}
              onChange={(e) => setActiveLayer(parseInt(e.target.value))}
              className="w-full h-1 accent-blue-500"
            />
          </div>

          {/* Layer preview canvas */}
          {layers.length > 0 && (
            <div className="bg-[#0a0a0f] rounded border border-gray-700 overflow-hidden">
              <LayerCanvas layer={layers[activeLayer]} />
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-3 text-[10px] text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-blue-400" /> Perimeter
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-green-400" /> Infill
            </span>
            {printSettings.supportEnabled && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-sm bg-yellow-400" /> Support
              </span>
            )}
          </div>

          {/* Download */}
          <button
            onClick={() => result && downloadGcode(result.gcode)}
            className="w-full py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-200 text-[10px] transition"
          >
            Download G-code
          </button>
        </>
      )}

      {!hasSliced && (
        <div className="text-[10px] text-gray-500 text-center py-4">
          Select a mesh and click "Slice Preview" to see the layer-by-layer preview.
        </div>
      )}
    </div>
  );
}

function LayerCanvas({ layer }: { layer: LayerPreview }) {
  const canvasRef = (el: HTMLCanvasElement | null) => {
    if (!el) return;

    const ctx = el.getContext("2d");
    if (!ctx) return;

    const w = el.clientWidth;
    const h = el.clientHeight;
    el.width = w * 2;
    el.height = h * 2;
    ctx.scale(2, 2);

    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, w, h);

    // Find bounds of all points
    const allPoints = layer.perimeterPoints.flat();
    if (allPoints.length === 0) {
      ctx.fillStyle = "#333";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("No contours at this layer", w / 2, h / 2);
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of allPoints) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    // Also include infill and support bounds
    for (const line of layer.infillLines) {
      if (line.x1 < minX) minX = line.x1;
      if (line.x2 > maxX) maxX = line.x2;
      if (line.y1 < minY) minY = line.y1;
      if (line.y2 > maxY) maxY = line.y2;
    }
    for (const contour of layer.supportContours) {
      for (const p of contour) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
    }

    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const padding = 10;
    const scale = Math.min((w - padding * 2) / rangeX, (h - padding * 2) / rangeY);
    const offsetX = (w - rangeX * scale) / 2 - minX * scale;
    const offsetY = (h - rangeY * scale) / 2 - minY * scale;

    const tx = (x: number) => x * scale + offsetX;
    const ty = (y: number) => h - (y * scale + offsetY); // flip Y

    // Draw support
    ctx.strokeStyle = "#a08020";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);
    for (const contour of layer.supportContours) {
      if (contour.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(tx(contour[0].x), ty(contour[0].y));
      for (let i = 1; i < contour.length; i++) {
        ctx.lineTo(tx(contour[i].x), ty(contour[i].y));
      }
      ctx.closePath();
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw infill
    ctx.strokeStyle = "#2a8040";
    ctx.lineWidth = 0.3;
    for (const line of layer.infillLines) {
      ctx.beginPath();
      ctx.moveTo(tx(line.x1), ty(line.y1));
      ctx.lineTo(tx(line.x2), ty(line.y2));
      ctx.stroke();
    }

    // Draw perimeters
    ctx.strokeStyle = "#4090e0";
    ctx.lineWidth = 1;
    for (const contour of layer.perimeterPoints) {
      if (contour.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(tx(contour[0].x), ty(contour[0].y));
      for (let i = 1; i < contour.length; i++) {
        ctx.lineTo(tx(contour[i].x), ty(contour[i].y));
      }
      ctx.closePath();
      ctx.stroke();
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full"
      style={{ height: 180 }}
    />
  );
}
