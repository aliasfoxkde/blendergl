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

export function NodeEditorPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [panelSize, setPanelSize] = useState({ width: 600, height: 400 });
  const containerRef = useRef<HTMLDivElement>(null);

  const entityId = useSelectionStore((s) => s.selectedIds[0] ?? null);
  const clear = useNodeGraphStore((s) => s.clear);
  const setEntityId = useNodeGraphStore((s) => s.setEntityId);

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
  }, []);

  // Listen for toggle event from toolbar/keyboard
  useEffect(() => {
    const handler = () => setIsOpen((prev) => !prev);
    window.addEventListener("toggle-node-editor", handler);
    return () => window.removeEventListener("toggle-node-editor", handler);
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
          {entityId && (
            <span className="text-[10px] text-gray-500">
              {useSceneStore.getState().entities[entityId]?.name ?? entityId}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
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
    </div>
  );
}
