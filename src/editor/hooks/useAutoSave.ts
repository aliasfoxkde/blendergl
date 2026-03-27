import { useEffect, useRef } from "react";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { useSettingsStore } from "@/editor/stores/settingsStore";
import { saveScene } from "@/editor/utils/storage";

/**
 * Auto-saves the scene on a configurable interval.
 * Debounces to avoid saving on every keystroke/move.
 */
export function useAutoSave() {
  const autoSave = useSettingsStore((s) => s.autoSave);
  const autoSaveIntervalMs = useSettingsStore((s) => s.autoSaveIntervalMs);
  const scene = useSceneStore((s) => s.scene);
  const lastSavedRef = useRef<string>(scene.updatedAt);
  const lastSaveTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!autoSave) return;

    const interval = setInterval(() => {
      // Only save if scene has changed since last save
      if (scene.updatedAt !== lastSavedRef.current) {
        const now = Date.now();
        // Don't save more than once per interval
        if (now - lastSaveTimeRef.current >= autoSaveIntervalMs) {
          saveScene(scene);
          window.dispatchEvent(new CustomEvent("scene-saved"));
          lastSavedRef.current = scene.updatedAt;
          lastSaveTimeRef.current = now;
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [autoSave, autoSaveIntervalMs, scene]);
}
