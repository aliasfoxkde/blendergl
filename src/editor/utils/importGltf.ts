import { SceneLoader, AbstractMesh, StandardMaterial } from "@babylonjs/core";
import "@babylonjs/loaders/glTF";
import type { Scene } from "@babylonjs/core";
import { generateEntityId } from "@/editor/types";
import type { Entity, MaterialData } from "@/editor/types";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { useMaterialStore } from "@/editor/stores/materialStore";
import { useSelectionStore } from "@/editor/stores/selectionStore";

/**
 * Import a glTF/GLB file into the scene.
 * Creates entities from the loaded meshes.
 */
export async function importGltf(
  file: File,
  scene: Scene,
  addToSceneStore = true
): Promise<Entity[]> {
  const url = URL.createObjectURL(file);
  const name = file.name.replace(/\.(gltf|glb)$/i, "");

  try {
    const result = await SceneLoader.ImportMeshAsync("", "", url, scene, undefined, ".glb");

    const entities: Entity[] = [];
    const selectionStore = useSelectionStore.getState();
    const sceneStore = useSceneStore.getState();
    const materialStore = useMaterialStore.getState();

    selectionStore.deselectAll();

    for (const mesh of result.meshes) {
      // Skip transform nodes and skeletons
      if (!(mesh instanceof AbstractMesh) || mesh.getTotalVertices() === 0) continue;

      const id = generateEntityId();
      const meshName = mesh.name || name;
      const entityId = `${id}`;

      const entity: Entity = {
        id: entityId,
        name: meshName,
        parentId: null,
        childrenIds: [],
        transform: {
          position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
          rotation: {
            x: (mesh.rotation.x * 180) / Math.PI,
            y: (mesh.rotation.y * 180) / Math.PI,
            z: (mesh.rotation.z * 180) / Math.PI,
          },
          scale: { x: mesh.scaling.x, y: mesh.scaling.y, z: mesh.scaling.z },
        },
        visible: mesh.isVisible,
        locked: false,
        components: {
          mesh: { type: "mesh", geometryType: "imported" },
        },
      };

      // Extract material data
      const babylonMat = mesh.material as StandardMaterial | null;
      if (babylonMat) {
        const materialData: MaterialData = {
          albedo: babylonMat.diffuseColor
            ? `#${babylonMat.diffuseColor.toHexString().slice(0, 6)}`
            : "#888888",
          metallic: babylonMat.specularColor
            ? babylonMat.specularColor.r * 2
            : 0,
          roughness: babylonMat.specularPower
            ? Math.max(0, Math.min(1, 1 - (babylonMat.specularPower - 32) / 32))
            : 0.5,
          emissive: babylonMat.emissiveColor
            ? `#${babylonMat.emissiveColor.toHexString().slice(0, 6)}`
            : "#000000",
          emissiveIntensity: 0,
          opacity: babylonMat.alpha,
          alphaMode: babylonMat.alpha < 1 ? "blend" : "opaque",
        };

        if (addToSceneStore) {
          materialStore.updateMaterial(entityId, materialData);
        }
      }

      // Store reference to the imported mesh
      mesh.metadata = { entityId };

      if (addToSceneStore) {
        sceneStore.addEntity(entity);
        selectionStore.select(entityId, true);
      }

      entities.push(entity);
    }

    return entities;
  } finally {
    URL.revokeObjectURL(url);
  }
}
