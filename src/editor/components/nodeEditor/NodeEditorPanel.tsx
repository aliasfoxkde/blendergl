/**
 * NodeEditorPanel — floating panel containing the node graph editor.
 *
 * Toggle via toolbar button or N key shortcut.
 * Similar pattern to ScriptEditorPanel.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { NodeGraphCanvas } from "./NodeGraphCanvas";
import { useNodeGraphStore } from "@/editor/stores/nodeGraphStore";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { sceneRef } from "@/editor/utils/sceneRef";
import { compileAndApplyShader } from "@/editor/utils/nodeEditor/shaderCompiler";
import { AbstractMesh } from "@babylonjs/core";
import { SHADER_PRESETS } from "@/editor/utils/nodeEditor/shaderPresets";
import { COMPOSITING_PRESETS, GEOMETRY_PRESETS, LOGIC_PRESETS, type NodePreset } from "@/editor/utils/nodeEditor/nodePresets";
import { saveNodeGroup, loadNodeGroups, deleteNodeGroup, type NodeGroupData } from "@/editor/utils/nodeEditor/nodeLibrary";
import type { NodeGraphType } from "@/editor/types/nodeEditor";

export function NodeEditorPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [panelSize, setPanelSize] = useState({ width: 600, height: 400 });
  const containerRef = useRef<HTMLDivElement>(null);

  const entityId = useSelectionStore((s) => s.selectedIds[0] ?? null);
  const clear = useNodeGraphStore((s) => s.clear);
  const setEntityId = useNodeGraphStore((s) => s.setEntityId);
  const graphType = useNodeGraphStore((s) => s.graphType);

  // Get presets for current graph type
  const getPresetList = useCallback((gt: NodeGraphType): NodePreset[] => {
    switch (gt) {
      case "shader": return SHADER_PRESETS;
      case "compositing": return COMPOSITING_PRESETS;
      case "geometry": return GEOMETRY_PRESETS;
      case "logic": return LOGIC_PRESETS;
    }
  }, []);

  // When entity changes, clear graph (unless re-opening same entity)
  const prevEntityRef = useRef<string | null>(null);
  useEffect(() => {
    if (entityId && entityId !== prevEntityRef.current) {
      clear();
      // Create default graph template
      createDefaultGraph(entityId);
      prevEntityRef.current = entityId;
    } else if (!entityId) {
      clear();
      prevEntityRef.current = null;
    }
    setEntityId(entityId);
  }, [entityId, clear, setEntityId]);

  // Resize handler
  useEffect(() => {
    if (!isOpen) return;
    const handleResize = () => {
      setPanelSize({
        width: Math.min(window.innerWidth * 0.7, 900),
        height: Math.min(window.innerHeight * 0.6, 600),
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen]);

  const createDefaultGraph = useCallback((_eid: string) => {
    const store = useNodeGraphStore.getState();
    const gt = store.graphType;

    if (gt === "shader") {
      const colorInputId = store.addNode("color_input", { x: 50, y: 50 });
      const metalInputId = store.addNode("value_input", { x: 50, y: 180 });
      const roughInputId = store.addNode("value_input", { x: 50, y: 260 });
      const bsdfId = store.addNode("principled_bsdf", { x: 300, y: 100 });
      const outputId = store.addNode("material_output", { x: 550, y: 100 });

      if (colorInputId && bsdfId) {
        store.setNodeValue(colorInputId, "value", [0.8, 0.8, 0.8]);
        store.addConnection(colorInputId, "color", bsdfId, "baseColor");
      }
      if (metalInputId && bsdfId) {
        store.setNodeValue(metalInputId, "value", 0);
        store.addConnection(metalInputId, "value", bsdfId, "metallic");
      }
      if (roughInputId && bsdfId) {
        store.setNodeValue(roughInputId, "value", 0.5);
        store.addConnection(roughInputId, "value", bsdfId, "roughness");
      }
      if (bsdfId && outputId) {
        store.addConnection(bsdfId, "surface", outputId, "surface");
      }
    } else if (gt === "compositing") {
      const rlId = store.addNode("render_layer", { x: 50, y: 50 });
      const blurId = store.addNode("comp_blur", { x: 300, y: 50 });
      const outputId = store.addNode("composite_output", { x: 550, y: 50 });
      if (rlId && blurId) store.addConnection(rlId, "image", blurId, "image");
      if (blurId && outputId) store.addConnection(blurId, "image", outputId, "image");
    } else if (gt === "geometry") {
      const primId = store.addNode("mesh_primitive", { x: 50, y: 50 });
      const subId = store.addNode("geo_subdivide", { x: 300, y: 50 });
      const outputId = store.addNode("group_output", { x: 550, y: 50 });
      if (primId && subId) store.addConnection(primId, "geometry", subId, "geometry");
      if (subId && outputId) store.addConnection(subId, "geometry", outputId, "geometry");
    } else if (gt === "logic") {
      const startId = store.addNode("event_start", { x: 50, y: 50 });
      const moveId = store.addNode("action_move", { x: 300, y: 50 });
      if (startId && moveId) store.addConnection(startId, "exec", moveId, "exec");
    }
  }, []);

  // Listen for toggle event from toolbar/keyboard
  useEffect(() => {
    const handler = () => setIsOpen((prev) => !prev);
    window.addEventListener("toggle-node-editor", handler);
    return () => window.removeEventListener("toggle-node-editor", handler);
  }, []);

  // Auto-compile shader when graph changes (debounced)
  const nodes = useNodeGraphStore((s) => s.nodes);
  const connections = useNodeGraphStore((s) => s.connections);
  const storeEntityId = useNodeGraphStore((s) => s.entityId);

  useEffect(() => {
    if (!isOpen || !storeEntityId || graphType !== "shader") return;

    const timer = setTimeout(() => {
      const scene = sceneRef.current;
      if (!scene) return;

      const mesh = scene.meshes.find(
        (m) => m instanceof AbstractMesh && m.metadata?.entityId === storeEntityId
      ) as AbstractMesh | undefined;

      if (mesh) {
        try {
          const material = compileAndApplyShader(nodes, connections, scene, mesh);
          if (material) {
            material.build();
            mesh.material = material;
          }
        } catch {
          // Shader compilation errors are expected during graph editing
        }
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [isOpen, storeEntityId, nodes, connections, graphType]);

  // Load preset
  const loadPreset = useCallback((preset: NodePreset) => {
    const store = useNodeGraphStore.getState();
    store.clear();
    const idMap: string[] = [];
    for (const nodeDef of preset.nodes) {
      const id = store.addNode(nodeDef.type, nodeDef.position);
      if (!id) continue;
      idMap.push(id);
      if (id && nodeDef.values) {
        for (const [portId, value] of Object.entries(nodeDef.values)) {
          store.setNodeValue(id, portId, value);
        }
      }
    }
    for (const conn of preset.connections) {
      store.addConnection(idMap[conn.sourceNodeId], conn.sourcePortId, idMap[conn.targetNodeId], conn.targetPortId);
    }
  }, []);

  // Node library
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryGroups, setLibraryGroups] = useState<NodeGroupData[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");

  const handleOpenLibrary = useCallback(async () => {
    try {
      const groups = await loadNodeGroups();
      setLibraryGroups(groups.filter((g) => g.graphType === useNodeGraphStore.getState().graphType));
      setLibraryOpen(true);
    } catch { /* indexedDB not available */ }
  }, []);

  const handleSaveToLibrary = useCallback(async () => {
    const store = useNodeGraphStore.getState();
    if (!saveName.trim() || store.selectedNodeIds.length === 0) return;
    const selectedSet = new Set(store.selectedNodeIds);
    const nodes: Record<string, import("@/editor/types/nodeEditor").GraphNode> = {};
    const connections: Record<string, import("@/editor/types/nodeEditor").GraphConnection> = {};
    for (const id of store.selectedNodeIds) {
      const node = store.nodes[id];
      if (node) nodes[id] = JSON.parse(JSON.stringify(node));
    }
    for (const [cid, conn] of Object.entries(store.connections)) {
      if (selectedSet.has(conn.sourceNodeId) && selectedSet.has(conn.targetNodeId)) {
        connections[cid] = JSON.parse(JSON.stringify(conn));
      }
    }
    try {
      await saveNodeGroup(saveName.trim(), "", store.graphType, nodes, connections);
      setSaveDialogOpen(false);
      setSaveName("");
    } catch { /* save failed */ }
  }, [saveName]);

  const handleLoadFromLibrary = useCallback((group: NodeGroupData) => {
    const store = useNodeGraphStore.getState();
    const idMap = new Map<string, string>();
    for (const [oldId, node] of Object.entries(group.nodes)) {
      const newId = store.addNode(node.type, { x: node.position.x + 50, y: node.position.y + 50 });
      if (newId) {
        idMap.set(oldId, newId);
        for (const [portId, value] of Object.entries(node.values)) {
          store.setNodeValue(newId, portId, value);
        }
      }
    }
    for (const conn of Object.values(group.connections)) {
      const srcId = idMap.get(conn.sourceNodeId);
      const tgtId = idMap.get(conn.targetNodeId);
      if (srcId && tgtId) {
        store.addConnection(srcId, conn.sourcePortId, tgtId, conn.targetPortId);
      }
    }
    setLibraryOpen(false);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      className="absolute bottom-0 left-0 right-0 z-10 bg-[#1e1e1e] border-t border-[#444] flex flex-col"
      style={{ height: panelSize.height }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#444] bg-[#252525] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-300">Node Editor</span>
          <select
            value={graphType}
            onChange={(e) => {
              const store = useNodeGraphStore.getState();
              store.clear();
              prevEntityRef.current = null;
              useNodeGraphStore.setState({ graphType: e.target.value as NodeGraphType });
              if (entityId) createDefaultGraph(entityId);
            }}
            className="bg-[#1a1a1a] border border-[#444] rounded px-1.5 py-0.5 text-[10px] text-gray-400 focus:border-blue-500 focus:outline-none"
          >
            <option value="shader">Shader</option>
            <option value="compositing">Compositing</option>
            <option value="geometry">Geometry</option>
            <option value="logic">Logic</option>
          </select>
          {entityId && (
            <span className="text-[10px] text-gray-500">
              {useSceneStore.getState().entities[entityId]?.name ?? entityId}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            defaultValue=""
            onChange={(e) => {
              const presets = getPresetList(useNodeGraphStore.getState().graphType);
              const preset = presets.find((p) => p.name === e.target.value);
              if (preset) loadPreset(preset);
              e.target.value = "";
            }}
            className="bg-[#1a1a1a] border border-[#444] rounded px-1.5 py-0.5 text-[10px] text-gray-400 focus:border-blue-500 focus:outline-none"
          >
            <option value="" disabled>Presets...</option>
            {getPresetList(graphType).map((p) => (
              <option key={p.name} value={p.name}>{p.name}</option>
            ))}
          </select>
          <button
            className="text-gray-500 hover:text-gray-300 text-xs"
            onClick={() => {
              useNodeGraphStore.getState().addFrame("Frame", { x: 100, y: 100 });
            }}
            title="Add frame"
          >
            Frame
          </button>
          <button
            className="text-gray-500 hover:text-gray-300 text-xs"
            onClick={handleOpenLibrary}
            title="Node library"
          >
            Library
          </button>
          <button
            className="text-gray-500 hover:text-gray-300 text-xs"
            onClick={() => {
              clear();
              prevEntityRef.current = null;
            }}
            title="Clear graph"
          >
            Clear
          </button>
          <button
            className="text-gray-500 hover:text-gray-300 text-xs"
            onClick={() => setIsOpen(false)}
          >
            ×
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 min-h-0">
        <NodeGraphCanvas width={panelSize.width} height={panelSize.height - 36} />
      </div>

      {/* Save to Library Dialog */}
      {saveDialogOpen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
          <div className="bg-[#2a2a2a] border border-[#444] rounded-lg p-4 w-72">
            <h3 className="text-xs font-semibold text-gray-300 mb-2">Save to Library</h3>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Group name..."
              className="w-full bg-[#1a1a1a] border border-[#444] rounded px-2 py-1 text-xs text-gray-300 mb-3 outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") handleSaveToLibrary(); }}
            />
            <div className="flex justify-end gap-2">
              <button className="text-[10px] text-gray-400 hover:text-gray-200 px-2 py-1" onClick={() => setSaveDialogOpen(false)}>Cancel</button>
              <button className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-500" onClick={handleSaveToLibrary}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Node Library Dialog */}
      {libraryOpen && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50">
          <div className="bg-[#2a2a2a] border border-[#444] rounded-lg p-4 w-80 max-h-64 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-300">Node Library</h3>
              <div className="flex gap-1">
                <button className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded hover:bg-blue-500" onClick={() => setSaveDialogOpen(true)}>Save Selected</button>
                <button className="text-gray-400 hover:text-gray-200 text-xs" onClick={() => setLibraryOpen(false)}>×</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {libraryGroups.length === 0 && (
                <p className="text-[10px] text-gray-500 text-center py-4">No saved groups yet. Select nodes and save them.</p>
              )}
              {libraryGroups.map((group) => (
                <div key={group.id} className="flex items-center justify-between px-2 py-1.5 hover:bg-[#333] rounded cursor-pointer group" onClick={() => handleLoadFromLibrary(group)}>
                  <div>
                    <span className="text-[11px] text-gray-300">{group.name}</span>
                    <span className="text-[9px] text-gray-500 ml-2">{Object.keys(group.nodes).length} nodes</span>
                  </div>
                  <button
                    className="text-gray-500 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100"
                    onClick={(e) => { e.stopPropagation(); if (group.id) { deleteNodeGroup(group.id).then(() => handleOpenLibrary()); } }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
