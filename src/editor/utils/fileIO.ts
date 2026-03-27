import type { Scene } from "@babylonjs/core";
import type { SceneData } from "@/editor/types";

/**
 * Export the current scene to GLB binary format and trigger browser download.
 * Uses Babylon.js v9 GLTF2Export.
 */
export async function exportSceneToGLB(
  scene: Scene,
  filename = "scene.glb"
): Promise<void> {
  const { GLTF2Export } = await import("@babylonjs/serializers/glTF/2.0/glTFSerializer");

  const gltfData = await GLTF2Export.GLBAsync(scene, filename);

  const blob = gltfData.files[filename];
  if (blob instanceof Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } else {
    // Fallback: use built-in download
    gltfData.downloadFiles();
  }
}

/**
 * Export scene data to JSON and trigger download.
 */
export function exportSceneJSON(
  sceneData: SceneData,
  filename = "scene.json"
): void {
  const json = JSON.stringify(sceneData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Read a file as ArrayBuffer.
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Read a file as text.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
