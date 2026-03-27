/**
 * Game export — produces a standalone HTML file that embeds the scene
 * and game scripts with a minimal Babylon.js runtime.
 *
 * The exported HTML includes:
 * - Inline scene data (meshes, materials, lights, transforms)
 * - Game scripts (from the scripting store)
 * - Babylon.js from CDN
 * - Minimal game loop (input, physics, rendering)
 */

import type { Scene } from "@babylonjs/core";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import type { Light } from "@babylonjs/core/Lights/light";
import type { Entity, MeshComponent, MaterialData } from "@/editor/types";

interface GameExportOptions {
  title?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  physicsEnabled?: boolean;
  scripts?: Record<string, string>;
}

interface SerializedMesh {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  albedo: string;
  metallic: number;
  roughness: number;
  opacity: number;
  vertices: number[];
  indices: number[];
}

interface SerializedLight {
  name: string;
  type: "hemispheric" | "directional" | "point" | "spot";
  position: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  color: { r: number; g: number; b: number };
  intensity: number;
}

interface SerializedScene {
  meshes: SerializedMesh[];
  lights: SerializedLight[];
  scripts: Record<string, string>;
  settings: {
    width: number;
    height: number;
    backgroundColor: string;
    physicsEnabled: boolean;
  };
}

function serializeScene(
  babylonScene: Scene,
  entities: Record<string, Entity>,
  options: GameExportOptions,
): SerializedScene {
  const meshes: SerializedMesh[] = [];
  const lights: SerializedLight[] = [];

  // Serialize meshes
  for (const [entityId, entity] of Object.entries(entities)) {
    const mesh = babylonScene.getMeshByName(`mesh_${entityId}`);
    if (!mesh || !(mesh instanceof Mesh)) continue;

    const positions = mesh.getVerticesData("position");
    const indices = mesh.getIndices();
    if (!positions || !indices) continue;

    const meshComp = entity.components.mesh as MeshComponent | undefined;
    const matComp = entity.components.material as MaterialData | undefined;

    meshes.push({
      id: entityId,
      name: entity.name,
      type: meshComp?.geometryType ?? "cube",
      position: { ...entity.transform.position },
      rotation: { ...entity.transform.rotation },
      scale: { ...entity.transform.scale },
      albedo: matComp?.albedo ?? "#cccccc",
      metallic: matComp?.metallic ?? 0,
      roughness: matComp?.roughness ?? 0.5,
      opacity: matComp?.opacity ?? 1,
      vertices: Array.from(positions),
      indices: Array.from(indices),
    });
  }

  // Serialize lights
  for (const light of babylonScene.lights) {
    const typedLight = light as Light & {
      direction?: { x: number; y: number; z: number };
      typeID?: number;
    };
    const pos = (light as unknown as { position: { x: number; y: number; z: number } }).position;
    const dir = typedLight.direction ?? { x: 0, y: -1, z: 0 };
    lights.push({
      name: light.name,
      type: typedLight.typeID === 2 ? "directional" : typedLight.typeID === 1 ? "point" : typedLight.typeID === 3 ? "spot" : "hemispheric",
      position: { x: pos.x, y: pos.y, z: pos.z },
      direction: { x: dir.x, y: dir.y, z: dir.z },
      color: {
        r: light.diffuse.r,
        g: light.diffuse.g,
        b: light.diffuse.b,
      },
      intensity: light.intensity,
    });
  }

  return {
    meshes,
    lights,
    scripts: options.scripts ?? {},
    settings: {
      width: options.width ?? 1280,
      height: options.height ?? 720,
      backgroundColor: options.backgroundColor ?? "#1a1a2e",
      physicsEnabled: options.physicsEnabled ?? false,
    },
  };
}

function buildHtml(sceneData: SerializedScene, title: string): string {
  const sceneJson = JSON.stringify(sceneData);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; overflow: hidden; background: ${sceneData.settings.backgroundColor}; }
canvas { width: 100%; height: 100%; display: block; outline: none; }
</style>
</head>
<body>
<canvas id="gameCanvas" touch-action="none"></canvas>
<script src="https://cdn.babylonjs.com/babylon.js"></script>
<script>
// Scene data
const SCENE = ${sceneJson};

// Engine setup
const canvas = document.getElementById("gameCanvas");
const engine = new BABYLON.Engine(canvas, true);
const scene = new BABYLON.Scene(engine);
scene.clearColor = new BABYLON.Color4(0.1, 0.1, 0.15, 1);

// Camera
const camera = new BABYLON.FreeCamera("camera", new BABYLON.Vector3(0, 2, -8), scene);
camera.setTarget(BABYLON.Vector3.Zero());
camera.attachControl(canvas, true);
camera.minZ = 0.1;

// Lights
for (const ld of SCENE.lights) {
  if (ld.type === "directional") {
    const l = new BABYLON.DirectionalLight(ld.name, new BABYLON.Vector3(ld.direction.x, ld.direction.y, ld.direction.z), scene);
    l.diffuse = new BABYLON.Color3(ld.color.r, ld.color.g, ld.color.b);
    l.intensity = ld.intensity;
  } else if (ld.type === "point") {
    const l = new BABYLON.PointLight(ld.name, new BABYLON.Vector3(ld.position.x, ld.position.y, ld.position.z), scene);
    l.diffuse = new BABYLON.Color3(ld.color.r, ld.color.g, ld.color.b);
    l.intensity = ld.intensity;
  } else if (ld.type === "hemispheric") {
    const l = new BABYLON.HemisphericLight(ld.name, new BABYLON.Vector3(ld.direction.x, ld.direction.y, ld.direction.z), scene);
    l.diffuse = new BABYLON.Color3(ld.color.r, ld.color.g, ld.color.b);
    l.intensity = ld.intensity;
  }
}

// Meshes
const entityMap = {};
for (const md of SCENE.meshes) {
  let mesh;
  const positions = new Float32Array(md.vertices);
  const indices = md.indices;

  if (md.type === "sphere") {
    mesh = BABYLON.MeshBuilder.CreateSphere(md.id, { diameter: 1, segments: 16 }, scene);
  } else if (md.type === "cylinder") {
    mesh = BABYLON.MeshBuilder.CreateCylinder(md.id, { diameter: 1, height: 1, tessellation: 16 }, scene);
  } else if (md.type === "plane") {
    mesh = BABYLON.MeshBuilder.CreateGround(md.id, { width: 1, height: 1 }, scene);
  } else if (md.type === "torus") {
    mesh = BABYLON.MeshBuilder.CreateTorus(md.id, { diameter: 1, thickness: 0.3, tessellation: 16 }, scene);
  } else if (md.type === "cone") {
    mesh = BABYLON.MeshBuilder.CreateCylinder(md.id, { diameterTop: 0, diameterBottom: 1, height: 1, tessellation: 16 }, scene);
  } else {
    mesh = BABYLON.MeshBuilder.CreateBox(md.id, { size: 1 }, scene);
  }

  mesh.position = new BABYLON.Vector3(md.position.x, md.position.y, md.position.z);
  mesh.rotation = new BABYLON.Vector3(md.rotation.x, md.rotation.y, md.rotation.z);
  mesh.scaling = new BABYLON.Vector3(md.scale.x, md.scale.y, md.scale.z);

  const mat = new BABYLON.StandardMaterial("mat_" + md.id, scene);
  mat.diffuseColor = BABYLON.Color3.FromHexString(md.albedo);
  mat.specularColor = new BABYLON.Color3(md.metallic * 0.5, md.metallic * 0.5, md.metallic * 0.5);
  mat.specularPower = 64 - md.roughness * 32;
  mat.alpha = md.opacity;
  mesh.material = mat;

  entityMap[md.id] = mesh;
}

// Input state
const input = {
  keys: {},
  mouse: { x: 0, y: 0, buttons: {} },
  keysPressed: new Set(),
  keysReleased: new Set(),
};

window.addEventListener("keydown", (e) => {
  if (!input.keys[e.code]) input.keysPressed.add(e.code);
  input.keys[e.code] = true;
});
window.addEventListener("keyup", (e) => {
  input.keys[e.code] = false;
  input.keysReleased.add(e.code);
});

// Script execution
const scriptContexts = {};

function initScripts() {
  for (const [entityId, source] of Object.entries(SCENE.scripts)) {
    try {
      const api = {
        input: {
          isKeyDown: (key) => !!input.keys[key],
          isKeyPressed: (key) => input.keysPressed.has(key),
          getMousePosition: () => ({ ...input.mouse }),
        },
        time: { elapsed: 0, deltaTime: 0 },
        entity: {
          getId: () => entityId,
          getPosition: () => {
            const m = entityMap[entityId];
            return m ? { x: m.position.x, y: m.position.y, z: m.position.z } : null;
          },
          setPosition: (p) => {
            const m = entityMap[entityId];
            if (m) m.position = new BABYLON.Vector3(p.x, p.y, p.z);
          },
          translate: (d) => {
            const m = entityMap[entityId];
            if (m) m.position.addInPlace(new BABYLON.Vector3(d.x, d.y, d.z));
          },
        },
        log: (...args) => console.log("[" + entityId + "]", ...args),
      };

      const fn = new Function("api", source + "\\nreturn { onInit, onUpdate, onDestroy };");
      const ctx = fn(api);
      scriptContexts[entityId] = ctx;
      if (ctx.onInit) ctx.onInit();
    } catch (e) {
      console.warn("Script init error [" + entityId + "]:", e);
    }
  }
}

// Game loop
let startTime = performance.now() / 1000;

scene.registerBeforeRender(() => {
  const now = performance.now() / 1000;
  const dt = Math.min(now - startTime, 0.1);
  startTime = now;

  for (const ctx of Object.values(scriptContexts)) {
    try {
      if (ctx.onUpdate) ctx.onUpdate(dt);
    } catch (e) {
      console.warn("Script update error:", e);
    }
  }

  input.keysPressed.clear();
  input.keysReleased.clear();
});

// Initialize
initScripts();

// Render loop
engine.runRenderLoop(() => scene.render());

// Resize
window.addEventListener("resize", () => engine.resize());
</script>
</body>
</html>`;
}

/**
 * Export the scene as a standalone HTML game.
 */
export function exportGame(
  babylonScene: Scene,
  entities: Record<string, Entity>,
  options: GameExportOptions = {},
  filename = "game.html",
): void {
  const title = options.title ?? "BlenderGL Game";
  const sceneData = serializeScene(babylonScene, entities, options);
  const html = buildHtml(sceneData, title);

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
