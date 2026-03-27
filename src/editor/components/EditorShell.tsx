import { useCallback } from "react";
import { Link } from "react-router-dom";
import { Viewport } from "./Viewport";
import { SceneHierarchy } from "./SceneHierarchy";
import { PropertiesPanel } from "./PropertiesPanel";
import { Toolbar } from "./Toolbar";
import { useKeyboardShortcuts } from "@/editor/hooks/useKeyboardShortcuts";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { createPrimitiveEntity } from "@/editor/utils/primitives";
import type { PrimitiveType } from "@/editor/types";
import { saveScene } from "@/editor/utils/storage";

export function EditorShell() {
  const addEntity = useSceneStore((s) => s.addEntity);
  const removeEntity = useSceneStore((s) => s.removeEntity);
  const scene = useSceneStore((s) => s.scene);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const entities = useSceneStore((s) => s.entities);
  const transformMode = useSelectionStore((s) => s.transformMode);
  const setTransformMode = useSelectionStore((s) => s.setTransformMode);

  const handleAddPrimitive = useCallback(
    (type: PrimitiveType) => {
      const entity = createPrimitiveEntity(type);
      addEntity(entity);
    },
    [addEntity]
  );

  const handleDeleteSelected = useCallback(() => {
    for (const id of selectedIds) {
      removeEntity(id);
    }
    useSelectionStore.getState().deselectAll();
  }, [selectedIds, removeEntity]);

  const handleSave = useCallback(async () => {
    await saveScene(scene);
  }, [scene]);

  const objectCount = Object.keys(entities).length;

  // Register keyboard shortcuts
  useKeyboardShortcuts();

  return (
    <div className="w-full h-full flex flex-col bg-[#1a1a1a] text-white overflow-hidden">
      {/* Toolbar */}
      <Toolbar
        onAddPrimitive={handleAddPrimitive}
        onDelete={handleDeleteSelected}
        onSave={handleSave}
        transformMode={transformMode}
        onTransformModeChange={setTransformMode}
        hasSelection={selectedIds.length > 0}
      />

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Scene Hierarchy */}
        <aside className="w-56 bg-[#222] border-r border-[#333] flex flex-col shrink-0">
          <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-[#333]">
            Scene Hierarchy
          </div>
          <SceneHierarchy />
        </aside>

        {/* Viewport */}
        <main className="flex-1 relative bg-[#1a1a2e]">
          <Viewport />
          {/* Viewport overlay info */}
          <div className="absolute bottom-2 left-2 text-xs text-gray-500 pointer-events-none">
            {objectCount === 0
              ? "Add an object to get started"
              : `${objectCount} object${objectCount !== 1 ? "s" : ""}`}
          </div>
        </main>

        {/* Right sidebar - Properties */}
        <aside className="w-64 bg-[#222] border-l border-[#333] flex flex-col shrink-0">
          <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-[#333]">
            Properties
          </div>
          <PropertiesPanel />
        </aside>
      </div>

      {/* Status bar */}
      <footer className="h-6 bg-[#2a2a2a] border-t border-[#333] flex items-center px-3 shrink-0 text-xs text-gray-500 gap-4">
        <span>Objects: {objectCount}</span>
        <span>
          Selected: {selectedIds.length > 0 ? selectedIds.length : "None"}
        </span>
        <Link
          to="/"
          className="ml-auto text-gray-500 hover:text-gray-300 transition"
        >
          Exit Editor
        </Link>
      </footer>
    </div>
  );
}
