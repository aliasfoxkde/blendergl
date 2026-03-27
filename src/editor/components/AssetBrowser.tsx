import { useState, useEffect, useCallback } from "react";
import { listScenes, deleteScene, loadScene } from "@/editor/utils/storage";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import type { SceneData } from "@/editor/types";

export function AssetBrowser() {
  const [scenes, setScenes] = useState<SceneData[]>([]);
  const [loading, setLoading] = useState(false);

  const currentSceneId = useSceneStore((s) => s.scene.id);
  const setScene = useSceneStore((s) => s.setScene);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const all = await listScenes();
      setScenes(all);
    } catch {
      // IndexedDB unavailable
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleLoad = async (id: string) => {
    try {
      const scene = await loadScene(id);
      if (scene) {
        setScene(scene);
        useSelectionStore.getState().deselectAll();
      }
    } catch {
      // Error loading scene
    }
  };

  const handleDelete = async (id: string) => {
    if (id === currentSceneId) return; // Don't delete current scene
    try {
      await deleteScene(id);
      setScenes((prev) => prev.filter((s) => s.id !== id));
    } catch {
      // Error deleting
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-[#282828] border-b border-[#333]">
        Saved Scenes
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading && scenes.length === 0 ? (
          <div className="px-3 py-2 text-xs text-gray-500">Loading...</div>
        ) : scenes.length === 0 ? (
          <div className="px-3 py-2 text-xs text-gray-500">No saved scenes</div>
        ) : (
          scenes.map((scene) => (
            <div
              key={scene.id}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-[#2a2a2a] transition group ${
                scene.id === currentSceneId ? "bg-[#2a2a2a] text-blue-300" : "text-gray-400"
              }`}
            >
              <button
                className="flex-1 text-left truncate"
                onClick={() => handleLoad(scene.id)}
                title={scene.name}
              >
                {scene.name}
              </button>
              {scene.id !== currentSceneId && (
                <button
                  className="opacity-0 group-hover:opacity-100 text-gray-600 hover:text-red-400 transition text-xs"
                  onClick={() => handleDelete(scene.id)}
                  title="Delete scene"
                >
                  x
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
