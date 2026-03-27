import { useEffect, useRef, useState, useCallback } from "react";
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
  Viewport as BabylonViewport,
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
import { importGltf } from "@/editor/utils/importGltf";
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

    // glTF import event listener
    const handleImportGltf = async (e: Event) => {
      const file = (e as CustomEvent).detail as File;
      await importGltf(file, scene);
    };
    window.addEventListener("import-gltf", handleImportGltf);

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
      window.removeEventListener("import-gltf", handleImportGltf);
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

  // Box select state
  const [boxSelect, setBoxSelect] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start box select in object mode, on left click, on empty space
    if (editorMode !== "object" || e.button !== 0) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setBoxSelect({ startX: e.clientX - rect.left, startY: e.clientY - rect.top, currentX: e.clientX - rect.left, currentY: e.clientY - rect.top });
  }, [editorMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!boxSelect) return;
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setBoxSelect((prev) => prev ? { ...prev, currentX: e.clientX - rect.left, currentY: e.clientY - rect.top } : null);
  }, [boxSelect]);

  const handleMouseUp = useCallback(() => {
    if (!boxSelect || !sceneRef.current) {
      setBoxSelect(null);
      return;
    }

    // Calculate selection rectangle bounds
    const x1 = Math.min(boxSelect.startX, boxSelect.currentX);
    const y1 = Math.min(boxSelect.startY, boxSelect.currentY);
    const x2 = Math.max(boxSelect.startX, boxSelect.currentX);
    const y2 = Math.max(boxSelect.startY, boxSelect.currentY);

    // Only process if drag was meaningful
    if (x2 - x1 > 5 || y2 - y1 > 5) {
      const engine = engineRef.current;
      if (engine) {
        const scene = sceneRef.current;
        const camera = scene.activeCamera;
        let anySelected = false;

        for (const [, mesh] of meshMapRef.current) {
          if (!mesh.isVisible || !camera) continue;

          // Project mesh center to screen
          const worldPos = mesh.getBoundingInfo().boundingBox.centerWorld;
          const viewport = new BabylonViewport(0, 0, engine.getRenderWidth(), engine.getRenderHeight());
          const screenPos = Vector3.Project(
            worldPos,
            scene.getTransformMatrix(),
            camera.getProjectionMatrix(),
            viewport
          );

          // Check if screen position is within the selection rectangle
          // Babylon screen coords: origin top-left, y down
          const sx = screenPos.x;
          const sy = screenPos.y;

          if (sx >= x1 && sx <= x2 && sy >= y1 && sy <= y2) {
            const entityId = mesh.metadata?.entityId as string | undefined;
            if (entityId) {
              select(entityId, anySelected);
              anySelected = true;
            }
          }
        }

        if (!anySelected) {
          deselectAll();
        }
      }
    }

    setBoxSelect(null);
  }, [boxSelect, select, deselectAll]);

  const boxRect = boxSelect
    ? {
        left: Math.min(boxSelect.startX, boxSelect.currentX),
        top: Math.min(boxSelect.startY, boxSelect.currentY),
        width: Math.abs(boxSelect.currentX - boxSelect.startX),
        height: Math.abs(boxSelect.currentY - boxSelect.startY),
      }
    : null;

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full no-select outline-none"
        style={{ touchAction: "none" }}
      />
      {boxRect && boxRect.width > 2 && boxRect.height > 2 && (
        <div
          className="absolute border border-blue-400 bg-blue-400/10 pointer-events-none"
          style={{ left: boxRect.left, top: boxRect.top, width: boxRect.width, height: boxRect.height }}
        />
      )}
    </div>
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
