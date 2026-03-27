import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color4,
  Color3,
  MeshBuilder,
} from "@babylonjs/core";

export function createEngine(canvas: HTMLCanvasElement): Engine {
  const engine = new Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    antialias: true,
  });
  return engine;
}

export function createScene(engine: Engine, bgColor = "#1a1a2e"): Scene {
  const scene = new Scene(engine);
  const bg = Color4.FromHexString(bgColor);
  scene.clearColor = bg;
  return scene;
}

export function createCamera(
  scene: Scene,
  canvas: HTMLCanvasElement
): ArcRotateCamera {
  const camera = new ArcRotateCamera(
    "editorCamera",
    -Math.PI / 4,
    Math.PI / 3,
    10,
    Vector3.Zero(),
    scene
  );

  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 0.5;
  camera.upperRadiusLimit = 200;
  camera.wheelPrecision = 20;
  camera.panningSensibility = 100;
  camera.minZ = 0.1;
  camera.maxZ = 1000;

  return camera;
}

export function createDefaultLights(scene: Scene) {
  const hemiLight = new HemisphericLight(
    "hemiLight",
    new Vector3(0, 1, 0),
    scene
  );
  hemiLight.intensity = 0.6;
  hemiLight.diffuse = new Color3(1, 1, 1);
  hemiLight.groundColor = new Color3(0.1, 0.1, 0.15);

  const dirLight = new DirectionalLight(
    "dirLight",
    new Vector3(-1, -2, 1),
    scene
  );
  dirLight.intensity = 0.8;
  dirLight.diffuse = new Color3(1, 0.95, 0.9);

  return { hemiLight, dirLight };
}

export function createGrid(
  scene: Scene,
  size = 20,
  subdivisions = 20
): void {
  const gridColor = new Color3(0.3, 0.3, 0.3);
  const halfSize = size / 2;
  const step = size / subdivisions;

  // Build grid line pairs
  const linePairs: { start: Vector3; end: Vector3; color: Color3 }[] = [];

  for (let i = 0; i <= subdivisions; i++) {
    const pos = -halfSize + i * step;
    const isCenter = Math.abs(pos) < 0.001;

    // Horizontal lines (along X)
    const hColor = isCenter ? new Color3(0.8, 0.2, 0.2) : gridColor;
    linePairs.push({
      start: new Vector3(-halfSize, 0, pos),
      end: new Vector3(halfSize, 0, pos),
      color: hColor,
    });

    // Vertical lines (along Z)
    const vColor = isCenter ? new Color3(0.2, 0.2, 0.8) : gridColor;
    linePairs.push({
      start: new Vector3(pos, 0, -halfSize),
      end: new Vector3(pos, 0, halfSize),
      color: vColor,
    });
  }

  // Create individual lines with MeshBuilder for simplicity
  for (const lp of linePairs) {
    const lines = MeshBuilder.CreateLines(
      `grid_line_${lp.start.x}_${lp.start.z}`,
      {
        points: [lp.start, lp.end],
      },
      scene
    );
    lines.color = lp.color;
    lines.alpha = 0.3;
    lines.isPickable = false;
  }

  // Axis indicators
  const axes = [
    { points: [Vector3.Zero(), new Vector3(2, 0, 0)], color: new Color3(1, 0.2, 0.2) },
    { points: [Vector3.Zero(), new Vector3(0, 2, 0)], color: new Color3(0.2, 1, 0.2) },
    { points: [Vector3.Zero(), new Vector3(0, 0, 2)], color: new Color3(0.2, 0.2, 1) },
  ];

  for (const axis of axes) {
    const axisLine = MeshBuilder.CreateLines(
      `axis_${axis.points[1].x}_${axis.points[1].y}_${axis.points[1].z}`,
      { points: axis.points },
      scene
    );
    axisLine.color = axis.color;
    axisLine.alpha = 0.8;
    axisLine.isPickable = false;
  }
}
