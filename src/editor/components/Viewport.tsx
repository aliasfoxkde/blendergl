import { useEffect, useRef } from "react";
import {
  Engine,
  Scene,
  Color3,
  Vector3,
  StandardMaterial,
  MeshBuilder,
  AbstractMesh,
  Mesh,
  PointerEventTypes,
} from "@babylonjs/core";
import {
  createEngine,
  createScene,
  createCamera,
  createDefaultLights,
  createGrid,
} from "@/editor/utils/engine";
import { TransformGizmoController } from "@/editor/utils/gizmos";
import { EditModeController } from "@/editor/utils/editModeController";
import { editControllerRef } from "@/editor/utils/editModeRef";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { useMaterialStore } from "@/editor/stores/materialStore";
import { useEditModeStore } from "@/editor/stores/editModeStore";
import { useSettingsStore } from "@/editor/stores/settingsStore";
import { setCameraPreset, toggleOrtho } from "@/editor/utils/cameraUtils";
import { cameraRef as sharedCameraRef } from "@/editor/utils/cameraRef";
import type { TransformMode } from "@/editor/types";

interface ViewportProps {
  onSceneReady?: (scene: Scene, engine: Engine) => void;
}

export function Viewport({ onSceneReady }: ViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const meshMapRef = useRef<Map<string, AbstractMesh>>(new Map());
  const gizmoRef = useRef<TransformGizmoController | null>(null);
  const editControllerRef_local = useRef<EditModeController | null>(null);
  // Note: camera is shared via sharedCameraRef from cameraRef.ts

  const entities = useSceneStore((s) => s.entities);
  const { select, deselectAll, selectedIds, setHoveredEntity } =
    useSelectionStore();
  const editorMode = useSelectionStore((s) => s.editorMode);
  const transformMode = useSelectionStore((s) => s.transformMode);
  const materials = useMaterialStore((s) => s.materials);
  const {
    activeMeshEntityId,
    elementMode,
    selectedVertices,
    selectedEdges,
    selectedFaces,
    selectVertex,
    selectEdge,
    selectFace,
  } = useEditModeStore();

  const shadingMode = useSettingsStore((s) => s.shadingMode);
  const snapEnabled = useSettingsStore((s) => s.snapEnabled);
  const snapIncrement = useSettingsStore((s) => s.snapIncrement);
  const setCameraMode = useSettingsStore((s) => s.setCameraMode);

  // Initialize engine + scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = createEngine(canvas);
    const scene = createScene(engine);
    const camera = createCamera(scene, canvas);
    createDefaultLights(scene);
    createGrid(scene);

    // Initialize gizmo controller
    const gizmoController = new TransformGizmoController(scene);
    gizmoRef.current = gizmoController;

    engineRef.current = engine;
    sceneRef.current = scene;
    sharedCameraRef.current = camera;

    // Camera preset event listeners
    const handleCameraPreset = (e: Event) => {
      const preset = (e as CustomEvent).detail as string;
      setCameraPreset(camera, preset as Parameters<typeof setCameraPreset>[1]);
    };
    const handleToggleOrtho = () => {
      const isOrtho = toggleOrtho(camera);
      setCameraMode(isOrtho ? "orthographic" : "perspective");
    };
    window.addEventListener("camera-preset", handleCameraPreset);
    window.addEventListener("camera-toggle-ortho", handleToggleOrtho);

    // Render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Resize handling
    const resizeObserver = new ResizeObserver(() => {
      engine.resize();
    });
    resizeObserver.observe(canvas);

    // Pick handling
    scene.onPointerObservable.add((pointerInfo) => {
      const editController = editControllerRef_local.current;

      if (pointerInfo.type === PointerEventTypes.POINTERPICK) {
        const pickResult = pointerInfo.pickInfo;

        // Edit mode: pick vertices/edges/faces
        if (editorMode === "edit" && editController && pickResult?.hit && pickResult.pickedMesh) {
          const meshId = pickResult.pickedMesh.metadata?.entityId as
            | string
            | undefined;

          // Only pick on the mesh we're editing
          if (meshId === activeMeshEntityId) {
            const shiftKey = pointerInfo.event.shiftKey;

            if (elementMode === "face") {
              selectFace(pickResult.faceId, shiftKey);
            } else if (elementMode === "vertex") {
              // Get the 3 vertices of the hit face and pick the closest
              const [v0, v1, v2] = editController.getFaceVertexIndices(
                pickResult.faceId
              );
              const pickedPoint = pickResult.pickedPoint;
              if (pickedPoint) {
                // Find closest vertex among the face's vertices
                let closestVertex = v0;
                let closestDist = Infinity;
                for (const v of [v0, v1, v2]) {
                  const pos = editController.getVertexPosition(v);
                  const dist = Vector3.Distance(pickedPoint, pos);
                  if (dist < closestDist) {
                    closestDist = dist;
                    closestVertex = v;
                  }
                }
                selectVertex(closestVertex, shiftKey);
              }
            } else if (elementMode === "edge") {
              const edge = editController.getEdgeFromBarycentric(
                pickResult.faceId,
                pickResult.bu,
                pickResult.bv
              );
              selectEdge(edge[0], edge[1], shiftKey);
            }
          }
          return;
        }

        // Object mode: pick entities
        if (pickResult?.hit && pickResult.pickedMesh) {
          const meshId = pickResult.pickedMesh.metadata?.entityId as
            | string
            | undefined;
          if (meshId) {
            const shiftKey = pointerInfo.event.shiftKey;
            select(meshId, shiftKey);
          }
        } else {
          deselectAll();
        }
      }

      if (pointerInfo.type === PointerEventTypes.POINTERMOVE) {
        const pickResult = pointerInfo.pickInfo;
        if (pickResult?.hit && pickResult.pickedMesh) {
          const meshId = pickResult.pickedMesh.metadata?.entityId as
            | string
            | undefined;
          setHoveredEntity(meshId ?? null);
          if (canvas) canvas.style.cursor = meshId ? "pointer" : "default";
        } else {
          setHoveredEntity(null);
          if (canvas) canvas.style.cursor = "default";
        }
      }
    });

    onSceneReady?.(scene, engine);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("camera-preset", handleCameraPreset);
      window.removeEventListener("camera-toggle-ortho", handleToggleOrtho);
      scene.onPointerObservable.clear();
      gizmoController.dispose();
      editControllerRef_local.current?.dispose();
      engine.dispose();
      engineRef.current = null;
      sceneRef.current = null;
      sharedCameraRef.current = null;
      gizmoRef.current = null;
      editControllerRef_local.current = null;
      meshMapRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync entities to Babylon meshes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const meshMap = meshMapRef.current;
    const currentEntityIds = new Set(Object.keys(entities));

    // Remove meshes for deleted entities
    for (const [id, mesh] of meshMap) {
      if (!currentEntityIds.has(id)) {
        mesh.dispose();
        meshMap.delete(id);
      }
    }

    // Create/update meshes for existing entities
    for (const [id, entity] of Object.entries(entities)) {
      let mesh = meshMap.get(id) ?? undefined;

      if (!mesh) {
        // Create new mesh based on entity components
        const meshComp = entity.components.mesh as
          | { geometryType: string }
          | undefined;
        const geoType = meshComp?.geometryType ?? "cube";

        const newMesh = createPrimitiveMesh(scene, geoType, id);
        if (newMesh) {
          newMesh.metadata = { entityId: id };
          meshMap.set(id, newMesh);
          mesh = newMesh;
        }
      }

      if (mesh) {
        // Sync transform
        mesh.position.x = entity.transform.position.x;
        mesh.position.y = entity.transform.position.y;
        mesh.position.z = entity.transform.position.z;

        mesh.rotation.x = (entity.transform.rotation.x * Math.PI) / 180;
        mesh.rotation.y = (entity.transform.rotation.y * Math.PI) / 180;
        mesh.rotation.z = (entity.transform.rotation.z * Math.PI) / 180;

        mesh.scaling.x = entity.transform.scale.x;
        mesh.scaling.y = entity.transform.scale.y;
        mesh.scaling.z = entity.transform.scale.z;

        // Sync visibility
        mesh.isVisible = entity.visible;
      }
    }
  }, [entities]);

  // Sync selection highlighting
  useEffect(() => {
    const meshMap = meshMapRef.current;
    for (const [id, mesh] of meshMap) {
      const material = mesh.material as StandardMaterial;
      if (!material) continue;

      if (selectedIds.includes(id)) {
        material.emissiveColor = new Color3(0.15, 0.15, 0.15);
        mesh.renderOutline = true;
        mesh.outlineColor = new Color3(0.4, 0.6, 1.0);
        mesh.outlineWidth = 0.04;
      } else {
        material.emissiveColor = Color3.Black();
        mesh.renderOutline = false;
      }
    }
  }, [selectedIds]);

  // Sync materials to Babylon meshes
  useEffect(() => {
    const meshMap = meshMapRef.current;
    for (const [id, mesh] of meshMap) {
      const mat = materials[id];
      const material = mesh.material as StandardMaterial;
      if (!material) continue;

      if (mat) {
        material.diffuseColor = Color3.FromHexString(mat.albedo);
        material.specularColor = new Color3(mat.metallic * 0.5, mat.metallic * 0.5, mat.metallic * 0.5);
        material.specularPower = 64 - mat.roughness * 32;
        material.emissiveColor = Color3.FromHexString(mat.emissive);
        material.alpha = mat.opacity;
        material.needDepthPrePass = mat.opacity < 1;
      }
    }
  }, [materials]);

  // Sync shading mode to all meshes
  useEffect(() => {
    const meshMap = meshMapRef.current;
    for (const [, mesh] of meshMap) {
      const material = mesh.material as StandardMaterial;
      if (!material) continue;

      switch (shadingMode) {
        case "wireframe":
          material.wireframe = true;
          material.disableLighting = false;
          break;
        case "solid":
          material.wireframe = false;
          material.disableLighting = true;
          material.diffuseColor = new Color3(0.7, 0.7, 0.7);
          material.specularColor = Color3.Black();
          material.emissiveColor = Color3.Black();
          break;
        case "material":
        case "textured":
          material.wireframe = false;
          material.disableLighting = false;
          break;
      }
    }
  }, [shadingMode, materials]);

  // Sync snap settings to gizmo controller
  useEffect(() => {
    const gizmo = gizmoRef.current;
    if (!gizmo) return;
    gizmo.setSnapEnabled(snapEnabled);
    // Update snap distance to use the settings store value
    if (snapEnabled) {
      gizmo.setSnapDistance(snapIncrement);
    }
  }, [snapEnabled, snapIncrement]);

  // Sync gizmo mode and attach to selected mesh
  useEffect(() => {
    const gizmo = gizmoRef.current;
    if (!gizmo) return;

    // Hide gizmo in edit mode
    if (editorMode === "edit") {
      gizmo.attachToMesh(null);
      return;
    }

    gizmo.mode = transformMode as TransformMode;

    const activeId = selectedIds[0];
    if (activeId) {
      const mesh = meshMapRef.current.get(activeId) ?? undefined;
      gizmo.attachToMesh(mesh ?? null);
    } else {
      gizmo.attachToMesh(null);
    }
  }, [transformMode, selectedIds, editorMode]);

  // Edit mode: attach/detach controller
  useEffect(() => {
    const scene = sceneRef.current;
    const meshMap = meshMapRef.current;

    if (editorMode === "edit" && activeMeshEntityId && scene) {
      const mesh = meshMap.get(activeMeshEntityId) as Mesh | undefined;
      if (mesh) {
        const controller = new EditModeController();
        controller.attachToMesh(mesh, scene);
        editControllerRef_local.current = controller;
        editControllerRef.current = controller;
      }
    } else {
      editControllerRef_local.current?.dispose();
      editControllerRef_local.current = null;
      editControllerRef.current = null;
    }
  }, [editorMode, activeMeshEntityId]);

  // Edit mode: update selection overlay
  useEffect(() => {
    const controller = editControllerRef_local.current;
    if (!controller) return;

    controller.updateSelectionOverlay(
      Array.from(selectedVertices),
      Array.from(selectedFaces),
      Array.from(selectedEdges)
    );
  }, [selectedVertices, selectedFaces, selectedEdges]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full no-select outline-none"
      style={{ touchAction: "none" }}
    />
  );
}

function createPrimitiveMesh(
  scene: Scene,
  geometryType: string,
  entityId: string
): AbstractMesh | undefined {
  const material = new StandardMaterial(`mat_${entityId}`, scene);
  material.diffuseColor = new Color3(0.6, 0.6, 0.6);
  material.specularColor = new Color3(0.2, 0.2, 0.2);

  let mesh: AbstractMesh;

  switch (geometryType) {
    case "sphere":
      mesh = MeshBuilder.CreateSphere(
        `mesh_${entityId}`,
        { diameter: 1, segments: 32 },
        scene
      );
      break;
    case "plane":
      mesh = MeshBuilder.CreateGround(
        `mesh_${entityId}`,
        { width: 1, height: 1 },
        scene
      );
      break;
    case "cylinder":
      mesh = MeshBuilder.CreateCylinder(
        `mesh_${entityId}`,
        { diameter: 1, height: 1, tessellation: 32 },
        scene
      );
      break;
    case "cone":
      mesh = MeshBuilder.CreateCylinder(
        `mesh_${entityId}`,
        { diameterTop: 0, diameterBottom: 1, height: 1, tessellation: 32 },
        scene
      );
      break;
    case "torus":
      mesh = MeshBuilder.CreateTorus(
        `mesh_${entityId}`,
        { diameter: 1, thickness: 0.3, tessellation: 32 },
        scene
      );
      break;
    default:
      mesh = MeshBuilder.CreateBox(`mesh_${entityId}`, { size: 1 }, scene);
  }

  mesh.material = material;
  return mesh;
}
