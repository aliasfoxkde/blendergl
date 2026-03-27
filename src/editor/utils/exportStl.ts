import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { Scene } from "@babylonjs/core/scene.js";

/**
 * Export meshes to binary STL format.
 * Uses Babylon.js STLExport from @babylonjs/serializers.
 */
export function exportToSTL(
  meshes: Mesh[],
  binary = true,
  filename = "model.stl"
): void {
  // Dynamic import to keep serializers out of the main bundle
  import("@babylonjs/serializers").then(({ STLExport }) => {
    const stlData = STLExport.CreateSTL(meshes, false, filename, binary);
    const blob = new Blob([stlData], {
      type: binary ? "application/octet-stream" : "text/plain",
    });
    downloadBlob(blob, filename);
  });
}

/**
 * Export the full scene to STL.
 */
export function exportSceneToSTL(
  scene: Scene,
  binary = true,
  filename = "scene.stl"
): void {
  const meshes = scene.meshes.filter((m) => m.isVisible && m instanceof Mesh) as Mesh[];
  exportToSTL(meshes, binary, filename);
}

/**
 * Export selected meshes to STL, or all visible meshes if nothing is selected.
 */
export function exportSelectedToSTL(
  scene: Scene,
  selectedIds: Set<string>,
  binary = true,
  filename = "selection.stl"
): void {
  let meshes: Mesh[];

  if (selectedIds.size > 0) {
    meshes = scene.meshes.filter(
      (m) =>
        m.isVisible &&
        m instanceof Mesh &&
        m.metadata?.entityId &&
        selectedIds.has(m.metadata.entityId as string)
    ) as Mesh[];
  } else {
    meshes = scene.meshes.filter(
      (m) => m.isVisible && m instanceof Mesh && m.metadata?.entityId
    ) as Mesh[];
    filename = "scene.stl";
  }

  if (meshes.length > 0) {
    exportToSTL(meshes, binary, filename);
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
