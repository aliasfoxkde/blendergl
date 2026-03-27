import { useRef, useEffect, useCallback, useState } from "react";
import { useUvStore } from "@/editor/stores/uvStore";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { useMaterialStore } from "@/editor/stores/materialStore";
import { sceneRef } from "@/editor/utils/sceneRef";
import { AbstractMesh } from "@babylonjs/core";
import type { UvEditMode, UvProjectionType } from "@/editor/types";

export function UvEditorPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [panStart, setPanStart] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null);

  const panelOpen = useUvStore((s) => s.panelOpen);
  const editMode = useUvStore((s) => s.editMode);
  const selectedUvVertices = useUvStore((s) => s.selectedUvVertices);
  const viewOffset = useUvStore((s) => s.viewOffset);
  const viewZoom = useUvStore((s) => s.viewZoom);
  const settings = useUvStore((s) => s.settings);
  const uvData = useUvStore((s) => s.uvData);
  const activeEntityId = useSelectionStore((s) => s.activeEntityId);
  const entities = useSceneStore((s) => s.entities);
  const materials = useMaterialStore((s) => s.materials);

  const setViewOffset = useUvStore((s) => s.setViewOffset);
  const setViewZoom = useUvStore((s) => s.setViewZoom);
  const selectUvVertex = useUvStore((s) => s.selectUvVertex);
  const deselectAll = useUvStore((s) => s.deselectAll);
  const setUvPosition = useUvStore((s) => s.setUvPosition);
  const setUvPositions = useUvStore((s) => s.setUvPositions);
  const applyProjection = useUvStore((s) => s.applyProjection);
  const detectIslands = useUvStore((s) => s.detectIslands);
  const packIslands = useUvStore((s) => s.packIslands);
  const setEditMode = useUvStore((s) => s.setEditMode);
  const setSettings = useUvStore((s) => s.setSettings);
  const togglePanel = useUvStore((s) => s.togglePanel);

  // Draw UV editor
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const zoom = viewZoom;
    const ox = viewOffset.x;
    const oy = viewOffset.y;

    // Clear
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(zoom, zoom);

    const uvSize = Math.min(w, h) * 0.85;

    // Grid
    if (settings.showGrid) {
      const gridSize = settings.gridSize;
      ctx.strokeStyle = "#2a2a3e";
      ctx.lineWidth = 0.5 / zoom;
      for (let i = 0; i <= gridSize; i++) {
        const pos = (i / gridSize) * uvSize;
        ctx.beginPath();
        ctx.moveTo(pos, 0);
        ctx.lineTo(pos, uvSize);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, pos);
        ctx.lineTo(uvSize, pos);
        ctx.stroke();
      }
    }

    // UV boundary
    ctx.strokeStyle = "#4a4a6a";
    ctx.lineWidth = 1.5 / zoom;
    ctx.strokeRect(0, 0, uvSize, uvSize);

    // Draw UV data
    if (activeEntityId && uvData[activeEntityId]) {
      const data = uvData[activeEntityId];
      const entity = entities[activeEntityId];
      const mesh = entity ? getMeshForEntity(activeEntityId) : null;

      // Draw island fills
      if (data.islands.length > 0) {
        for (let i = 0; i < data.islands.length; i++) {
          const island = data.islands[i];
          ctx.fillStyle = islandColors[i % islandColors.length] + "15";
          ctx.beginPath();
          for (const fi of island.faceIndices) {
            if (!mesh) break;
            const indices = mesh.getIndices();
            if (!indices) break;
            const i0 = indices[fi * 3];
            const i1 = indices[fi * 3 + 1];
            const i2 = indices[fi * 3 + 2];
            const uv0 = data.uvs[i0];
            const uv1 = data.uvs[i1];
            const uv2 = data.uvs[i2];
            if (!uv0 || !uv1 || !uv2) continue;
            ctx.moveTo(uv0[0] * uvSize, uv0[1] * uvSize);
            ctx.lineTo(uv1[0] * uvSize, uv1[1] * uvSize);
            ctx.lineTo(uv2[0] * uvSize, uv2[1] * uvSize);
            ctx.closePath();
          }
          ctx.fill();
        }
      }

      // Draw edges (from mesh indices)
      if (mesh) {
        const indices = mesh.getIndices();
        if (indices) {
          ctx.strokeStyle = "#6666aa";
          ctx.lineWidth = 1 / zoom;
          const drawnEdges = new Set<string>();
          for (let fi = 0; fi < indices.length / 3; fi++) {
            const v0 = indices[fi * 3];
            const v1 = indices[fi * 3 + 1];
            const v2 = indices[fi * 3 + 2];
            const uv0 = data.uvs[v0];
            const uv1 = data.uvs[v1];
            const uv2 = data.uvs[v2];
            if (!uv0 || !uv1 || !uv2) continue;

            const drawEdge = (a: number[], b: number[], iA: number, iB: number) => {
              const key = `${Math.min(iA, iB)}-${Math.max(iA, iB)}`;
              if (drawnEdges.has(key)) return;
              drawnEdges.add(key);
              ctx.beginPath();
              ctx.moveTo(a[0] * uvSize, a[1] * uvSize);
              ctx.lineTo(b[0] * uvSize, b[1] * uvSize);
              ctx.stroke();
            };

            drawEdge(uv0, uv1, v0, v1);
            drawEdge(uv1, uv2, v1, v2);
            drawEdge(uv2, uv0, v2, v0);
          }
        }
      }

      // Draw vertices
      for (let i = 0; i < data.uvs.length; i++) {
        const uv = data.uvs[i];
        const x = uv[0] * uvSize;
        const y = uv[1] * uvSize;
        const isSelected = selectedUvVertices.has(i);

        ctx.beginPath();
        ctx.arc(x, y, (isSelected ? 4 : 2.5) / zoom, 0, Math.PI * 2);
        ctx.fillStyle = isSelected ? "#ff6644" : "#aaaacc";
        ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = "#ff6644";
          ctx.lineWidth = 1 / zoom;
          ctx.stroke();
        }
      }

      // Checker preview in UV space
      if (entity) {
        const mat = materials[entity.components.material as string];
        if (mat?.diffuseTexture) {
          const img = new Image();
          img.src = mat.diffuseTexture;
          img.onload = () => {
            ctx.globalAlpha = 0.4;
            ctx.drawImage(img, 0, 0, uvSize, uvSize);
            ctx.globalAlpha = 1.0;
          };
        }
      }
    }

    ctx.restore();
  }, [viewOffset, viewZoom, settings, activeEntityId, uvData, selectedUvVertices, entities, materials]);

  // Animation loop
  useEffect(() => {
    if (!panelOpen) return;
    let animId: number;
    const loop = () => {
      draw();
      animId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animId);
  }, [panelOpen, draw]);

  // Resize canvas
  useEffect(() => {
    if (!panelOpen || !containerRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [panelOpen]);

  // Load UV data when entity changes
  useEffect(() => {
    if (!activeEntityId || !panelOpen) return;
    const mesh = getMeshForEntity(activeEntityId);
    if (!mesh) return;

    const positions = mesh.getVerticesData("position");
    const normals = mesh.getVerticesData("normal");
    const indices = mesh.getIndices();
    const uvs = mesh.getVerticesData("uv");

    if (positions && indices) {
      const posArray = Array.from(positions) as number[];
      const normArray = normals ? Array.from(normals) as number[] : posArray.map((_, i) => (i % 3 === 1 ? 1 : 0));
      const indicesArray = Array.from(indices) as number[];

      const uvArray = uvs
        ? (Array.from(uvs) as number[]).reduce<number[][]>((acc, val, i) => {
            if (i % 2 === 0) acc.push([val, 0]);
            else acc[acc.length - 1][1] = val;
            return acc;
          }, [])
        : computeDefaultUvs(posArray, normArray, indicesArray);

      const store = useUvStore.getState();
      store.applyProjection(activeEntityId, "smart", posArray, normArray, indicesArray);
      store.detectIslands(activeEntityId, indicesArray, uvArray);
    }
  }, [activeEntityId, panelOpen]);

  // Mouse handlers
  const screenToUv = useCallback((screenX: number, screenY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const cx = screenX - rect.left;
    const cy = screenY - rect.top;
    const uvSize = Math.min(canvas.width, canvas.height) * 0.85;
    const u = (cx - viewOffset.x) / viewZoom / uvSize;
    const v = (cy - viewOffset.y) / viewZoom / uvSize;
    return { u, v };
  }, [viewOffset, viewZoom]);

  const findNearestVertex = useCallback((u: number, v: number): number | null => {
    if (!activeEntityId || !uvData[activeEntityId]) return null;
    const data = uvData[activeEntityId];
    let nearestIdx: number | null = null;
    let nearestDist = Infinity;
    const threshold = 10 / viewZoom;

    for (let i = 0; i < data.uvs.length; i++) {
      const dx = data.uvs[i][0] - u;
      const dy = data.uvs[i][1] - v;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist && dist < threshold) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    return nearestIdx;
  }, [activeEntityId, uvData, viewZoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle click or alt+click: pan
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY, ox: viewOffset.x, oy: viewOffset.y });
      return;
    }

    if (e.button === 0) {
      const uv = screenToUv(e.clientX, e.clientY);
      if (!uv) return;

      if (editMode === "vertex") {
        const idx = findNearestVertex(uv.u, uv.v);
        if (idx !== null) {
          selectUvVertex(idx, e.shiftKey);
          setIsDragging(true);
          setDragStart({ x: e.clientX, y: e.clientY });
        } else {
          deselectAll();
        }
      } else {
        deselectAll();
      }
    }
  }, [screenToUv, findNearestVertex, selectUvVertex, deselectAll, editMode, viewOffset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning && panStart) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setViewOffset({ x: panStart.ox + dx, y: panStart.oy + dy });
      return;
    }

    if (isDragging && activeEntityId && selectedUvVertices.size > 0) {
      const uv = screenToUv(e.clientX, e.clientY);
      if (!uv) return;

      if (selectedUvVertices.size === 1) {
        const idx = Array.from(selectedUvVertices)[0];
        setUvPosition(activeEntityId, idx, uv.u, uv.v);
      } else {
        // Move all selected by delta
        const updates: { index: number; u: number; v: number }[] = [];
        const data = uvData[activeEntityId];
        if (!data || !dragStart) return;

        const startUv = screenToUv(dragStart.x, dragStart.y);
        if (!startUv) return;

        const du = uv.u - startUv.u;
        const dv = uv.v - startUv.v;

        for (const idx of selectedUvVertices) {
          const origUv = data.uvs[idx];
          if (origUv) {
            updates.push({ index: idx, u: origUv[0] + du, v: origUv[1] + dv });
          }
        }
        setUvPositions(activeEntityId, updates);
      }
    }
  }, [isPanning, panStart, isDragging, activeEntityId, selectedUvVertices, screenToUv, setUvPosition, setUvPositions, setViewOffset, uvData, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsPanning(false);
    setDragStart(null);
    setPanStart(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setViewZoom(viewZoom * factor);
  }, [viewZoom, setViewZoom]);

  const handleApplyProjection = useCallback((type: UvProjectionType) => {
    if (!activeEntityId) return;
    const mesh = getMeshForEntity(activeEntityId);
    if (!mesh) return;

    const positions = mesh.getVerticesData("position");
    const normals = mesh.getVerticesData("normal");
    const indices = mesh.getIndices();

    if (positions && indices) {
      const posArray = Array.from(positions) as number[];
      const normArray = normals ? Array.from(normals) as number[] : posArray.map((_, i) => (i % 3 === 1 ? 1 : 0));
      const indicesArray = Array.from(indices) as number[];

      applyProjection(activeEntityId, type, posArray, normArray, indicesArray);
      detectIslands(activeEntityId, indicesArray, useUvStore.getState().uvData[activeEntityId]?.uvs ?? []);
    }
  }, [activeEntityId, applyProjection, detectIslands]);

  if (!panelOpen) return null;

  return (
    <div className="absolute inset-0 z-40 bg-[#1e1e2e] border border-[#333] rounded-lg shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#2a2a3a] border-b border-[#333] shrink-0">
        <span className="text-xs font-semibold text-gray-300">UV Editor</span>
        <div className="flex items-center gap-1">
          {/* Edit mode buttons */}
          {(["vertex", "edge", "face", "island"] as UvEditMode[]).map((mode) => (
            <button
              key={mode}
              className={`px-1.5 h-5 text-[9px] font-medium rounded transition ${
                editMode === mode
                  ? "bg-blue-600/40 text-blue-200"
                  : "text-gray-400 hover:text-white"
              }`}
              onClick={() => setEditMode(mode)}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1, 4)}
            </button>
          ))}
          <div className="w-px h-4 bg-[#444] mx-1" />
          <button
            className="px-1.5 h-5 text-[9px] text-gray-400 hover:text-white rounded transition"
            onClick={() => {
              if (activeEntityId) {
                handleApplyProjection("smart");
              }
            }}
            title="Smart UV Project"
          >
            Smart
          </button>
          <button
            className="px-1.5 h-5 text-[9px] text-gray-400 hover:text-white rounded transition"
            onClick={() => {
              if (activeEntityId) {
                handleApplyProjection("cube");
              }
            }}
            title="Cube Projection"
          >
            Cube
          </button>
          <button
            className="px-1.5 h-5 text-[9px] text-gray-400 hover:text-white rounded transition"
            onClick={() => {
              if (activeEntityId) {
                handleApplyProjection("cylinder");
              }
            }}
            title="Cylinder Projection"
          >
            Cyl
          </button>
          <button
            className="px-1.5 h-5 text-[9px] text-gray-400 hover:text-white rounded transition"
            onClick={() => {
              if (activeEntityId) {
                handleApplyProjection("sphere");
              }
            }}
            title="Sphere Projection"
          >
            Sph
          </button>
          <button
            className="px-1.5 h-5 text-[9px] text-green-400 hover:text-green-200 rounded transition"
            onClick={() => {
              if (activeEntityId) packIslands(activeEntityId);
            }}
            title="Pack UV Islands"
          >
            Pack
          </button>
          <div className="w-px h-4 bg-[#444] mx-1" />
          <button
            className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white rounded transition"
            onClick={togglePanel}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          onContextMenu={(e) => e.preventDefault()}
        />
        {/* Info overlay */}
        <div className="absolute bottom-1 left-1 text-[9px] text-gray-500 pointer-events-none">
          {activeEntityId && uvData[activeEntityId]
            ? `${uvData[activeEntityId].uvs.length} verts | ${uvData[activeEntityId].islands.length} islands | Zoom: ${viewZoom.toFixed(1)}x`
            : "Select a mesh to edit UVs"
          }
        </div>
      </div>

      {/* Bottom toolbar */}
      <div className="flex items-center gap-2 px-3 py-1 bg-[#2a2a3a] border-t border-[#333] shrink-0 text-[9px] text-gray-400">
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={settings.showGrid}
            onChange={(e) => setSettings({ showGrid: e.target.checked })}
            className="w-3 h-3"
          />
          Grid
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            checked={settings.snapToGrid}
            onChange={(e) => setSettings({ snapToGrid: e.target.checked })}
            className="w-3 h-3"
          />
          Snap
        </label>
        <span>|</span>
        <span>Selected: {selectedUvVertices.size} verts</span>
        <span>|</span>
        <span>Scroll to zoom, Alt+drag to pan</span>
      </div>
    </div>
  );
}

// Helper: get mesh from Babylon scene by entity ID
function getMeshForEntity(entityId: string): AbstractMesh | null {
  const scene = sceneRef.current;
  if (!scene) return null;
  for (const mesh of scene.meshes) {
    if (mesh instanceof AbstractMesh && mesh.metadata?.entityId === entityId) {
      return mesh;
    }
  }
  return null;
}

// Compute default UVs when mesh has none
function computeDefaultUvs(positions: number[], normals: number[], _indices: number[]): number[][] {
  const vertexCount = positions.length / 3;
  const uvs: number[][] = [];

  for (let i = 0; i < vertexCount; i++) {
    const nx = Math.abs(normals[i * 3]);
    const ny = Math.abs(normals[i * 3 + 1]);
    const nz = Math.abs(normals[i * 3 + 2]);

    let u: number, v: number;
    if (nx >= ny && nx >= nz) {
      u = positions[i * 3 + 1];
      v = positions[i * 3 + 2];
    } else if (ny >= nx && ny >= nz) {
      u = positions[i * 3];
      v = positions[i * 3 + 2];
    } else {
      u = positions[i * 3];
      v = positions[i * 3 + 1];
    }
    uvs.push([u, v]);
  }

  // Normalize
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

const islandColors = [
  "#ff6644", "#44aaff", "#44ff88", "#ffaa44",
  "#aa44ff", "#ff44aa", "#44ffff", "#ffff44",
];
