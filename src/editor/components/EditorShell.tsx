import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Viewport } from "./Viewport";
import { SceneHierarchy } from "./SceneHierarchy";
import { PropertiesPanel } from "./PropertiesPanel";
import { Toolbar } from "./Toolbar";
import { AiPanel } from "./AiPanel";
import { ContextMenu } from "./ContextMenu";
import { AssetBrowser } from "./AssetBrowser";
import { ScriptEditorPanel } from "./ScriptEditorPanel";
import { Timeline } from "./Timeline";
import { NodeEditorPanel } from "./nodeEditor/NodeEditorPanel";
import { UvEditorPanel } from "./UvEditorPanel";
import { RenderSettingsPanel } from "./RenderSettingsPanel";
import { useKeyboardShortcuts } from "@/editor/hooks/useKeyboardShortcuts";
import { useAutoSave } from "@/editor/hooks/useAutoSave";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { useSettingsStore } from "@/editor/stores/settingsStore";
import { useEditModeStore } from "@/editor/stores/editModeStore";
import { usePhysicsStore } from "@/editor/stores/physicsStore";
import { createPrimitiveEntity } from "@/editor/utils/primitives";
import type { PrimitiveType } from "@/editor/types";
import { saveScene, loadLatestScene } from "@/editor/utils/storage";

export function EditorShell() {
  const addEntity = useSceneStore((s) => s.addEntity);
  const removeEntity = useSceneStore((s) => s.removeEntity);
  const scene = useSceneStore((s) => s.scene);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const entities = useSceneStore((s) => s.entities);
  const transformMode = useSelectionStore((s) => s.transformMode);
  const setTransformMode = useSelectionStore((s) => s.setTransformMode);
  const editorMode = useSelectionStore((s) => s.editorMode);
  const elementMode = useEditModeStore((s) => s.elementMode);
  const shadingMode = useSettingsStore((s) => s.shadingMode);
  const snapEnabled = useSettingsStore((s) => s.snapEnabled);
  const cameraMode = useSettingsStore((s) => s.cameraMode);
  const playMode = usePhysicsStore((s) => s.playMode);
  const playTime = usePhysicsStore((s) => s.playTime);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState<string | null>(null);
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);

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

  // Restore last saved scene on mount when scene is empty
  const setScene = useSceneStore((s) => s.setScene);
  useEffect(() => {
    if (objectCount === 0) {
      loadLatestScene().then((saved) => {
        if (saved && Object.keys(saved.entities).length > 0) {
          setScene(saved);
        }
      });
    }
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Register keyboard shortcuts and auto-save
  useKeyboardShortcuts();
  useAutoSave();

  // Track cursor 3D position from viewport events
  useEffect(() => {
    const handleCursor = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.x !== undefined) {
        setCursorPos(`${detail.x.toFixed(1)}, ${detail.y.toFixed(1)}, ${detail.z.toFixed(1)}`);
      } else {
        setCursorPos(null);
      }
    };
    window.addEventListener("viewport-cursor-position", handleCursor);
    return () => window.removeEventListener("viewport-cursor-position", handleCursor);
  }, []);

  // Track auto-save time
  useEffect(() => {
    const handleSave = () => setLastSaveTime(new Date().toLocaleTimeString());
    window.addEventListener("scene-saved", handleSave);
    return () => window.removeEventListener("scene-saved", handleSave);
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-[#1a1a1a] text-white overflow-hidden">
      {/* Context menu */}
      <ContextMenu />

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
          <AssetBrowser />
        </aside>

        {/* Viewport */}
        <main className={`flex-1 relative bg-[#1a1a2e] ${playMode === "playing" ? "ring-2 ring-inset ring-green-500/50" : playMode === "paused" ? "ring-2 ring-inset ring-yellow-500/50" : ""}`}>
          <Viewport />
          <ScriptEditorPanel />
          <Timeline isOpen={timelineOpen} onToggle={() => setTimelineOpen(!timelineOpen)} />
          <NodeEditorPanel />
          <UvEditorPanel />
          <RenderSettingsPanel />
          {/* Viewport overlay info */}
          <div className="absolute bottom-2 left-2 text-xs text-gray-500 pointer-events-none">
            {objectCount === 0
              ? "Add an object to get started"
              : `${objectCount} object${objectCount !== 1 ? "s" : ""}`}
          </div>
        </main>

        {/* Right sidebar - Properties + AI */}
        <aside className="w-64 bg-[#222] border-l border-[#333] flex flex-col shrink-0 overflow-hidden">
          <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-[#333]">
            Properties
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            <PropertiesPanel />
          </div>
          <AiPanel />
        </aside>
      </div>

      {/* Status bar */}
      <footer className="h-6 bg-[#2a2a2a] border-t border-[#333] flex items-center px-3 shrink-0 text-xs text-gray-500 gap-3">
        <span>Objects: {objectCount}</span>
        <span>
          Selected: {selectedIds.length > 0 ? selectedIds.length : "None"}
        </span>
        <span className="text-gray-600">|</span>
        <span className="capitalize">
          {editorMode === "edit" ? `${elementMode} (Edit)` : editorMode === "pose" ? "Pose" : "Object"}
        </span>
        <span className="capitalize">{shadingMode}</span>
        <span>{cameraMode}</span>
        {playMode !== "stopped" && (
          <>
            <span className="text-gray-600">|</span>
            <span className={playMode === "playing" ? "text-green-400" : "text-yellow-400"}>
              {playMode === "playing" ? "PLAYING" : "PAUSED"} {playTime.toFixed(1)}s
            </span>
          </>
        )}
        {snapEnabled && <span className="text-blue-400">Snap</span>}
        {cursorPos && <span className="text-gray-600">|</span>}
        {cursorPos && <span title="3D cursor position">Cursor: {cursorPos}</span>}
        {lastSaveTime && <span className="text-gray-600">|</span>}
        {lastSaveTime && <span title="Last auto-save" className="text-gray-600">Saved {lastSaveTime}</span>}
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
