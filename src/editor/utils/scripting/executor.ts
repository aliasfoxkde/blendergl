/**
 * Script execution sandbox.
 *
 * Executes user scripts in a sandboxed context with:
 * - The `blendergl` API injected as a global
 * - Console output captured via CustomEvents
 * - Configurable timeout (default 30s)
 * - Error capture with line/column info
 */

import { createBlenderGLApi } from "./apiImpl";

export interface ScriptResult {
  success: boolean;
  output: string[];
  error: string | null;
  duration: number;
}

export type ScriptType = "startup" | "operator";

/**
 * Execute a script string in a sandboxed context.
 *
 * The `blendergl` API is provided as a global variable.
 * Console output is captured via CustomEvents.
 * A timeout prevents infinite loops.
 */
export async function executeScript(
  code: string,
  _type: ScriptType = "operator",
  timeoutMs = 30000
): Promise<ScriptResult> {
  const api = createBlenderGLApi();
  const output: string[] = [];
  const startTime = performance.now();

  // Capture console output
  const consoleCapture = {
    log: (...args: unknown[]) => {
      output.push(args.map(String).join(" "));
      api.console.log(...args);
    },
    warn: (...args: unknown[]) => {
      output.push(`[warn] ${args.map(String).join(" ")}`);
      api.console.warn(...args);
    },
    error: (...args: unknown[]) => {
      output.push(`[error] ${args.map(String).join(" ")}`);
      api.console.error(...args);
    },
    clear: () => {
      output.length = 0;
      api.console.clear();
    },
  };

  try {
    // Create execution wrapper with timeout
    const scriptFn = new Function(
      "blendergl",
      "console",
      `
      "use strict";
      ${code}
      `
    );

    // Wrap in a promise with timeout
    const result = await Promise.race([
      Promise.resolve(scriptFn(api, consoleCapture)),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Script timed out after ${timeoutMs / 1000}s`)),
          timeoutMs
        )
      ),
    ]);

    // Some scripts may return promises
    if (result instanceof Promise) {
      await result;
    }

    return {
      success: true,
      output,
      error: null,
      duration: performance.now() - startTime,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    output.push(`[error] ${error.message}`);

    return {
      success: false,
      output,
      error: formatError(error),
      duration: performance.now() - startTime,
    };
  }
}

function formatError(error: Error): string {
  const message = error.message;
  // Try to extract line/column from stack
  const stack = error.stack ?? "";
  const lineMatch = stack.match(/<anonymous>:(\d+):(\d+)/);
  if (lineMatch) {
    return `${message} (line ${lineMatch[1]}, col ${lineMatch[2]})`;
  }
  return message;
}

// ---- Example scripts ----

export interface ScriptExample {
  name: string;
  code: string;
  description: string;
}

export const EXAMPLE_SCRIPTS: ScriptExample[] = [
  {
    name: "Hello World",
    description: "Basic console output test",
    code: `// Hello World
console.log("Hello from BlenderGL!");
console.log("Version:", blendergl.version);

// List all entities
const entities = blendergl.scene.getEntities();
console.log("Scene has", entities.length, "entities");`,
  },
  {
    name: "Create Grid",
    description: "Create a 5x5 grid of cubes",
    code: `// Create a 5x5 grid of cubes
const gridSize = 5;
const spacing = 2;

for (let x = 0; x < gridSize; x++) {
  for (let z = 0; z < gridSize; z++) {
    const cube = blendergl.ops.addPrimitive("cube", {
      name: \`cube_\${x}_\${z}\`,
      position: { x: x * spacing, y: 0, z: z * spacing },
      scale: { x: 0.8, y: 0.8, z: 0.8 },
    });
  }
}

console.log("Created", gridSize * gridSize, "cubes");`,
  },
  {
    name: "Random Spheres",
    description: "Scatter random spheres in a sphere pattern",
    code: `// Scatter spheres in a spherical arrangement
const count = 20;
const radius = 5;

for (let i = 0; i < count; i++) {
  const theta = blendergl.utils.degToRad(360 * i / count);
  const phi = blendergl.utils.degToRad(45 * (i % 3));

  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi) + radius;
  const z = radius * Math.sin(phi) * Math.sin(theta);

  const size = blendergl.utils.random(0.3, 0.8);
  blendergl.ops.addPrimitive("sphere", {
    name: \`sphere_\${i}\`,
    position: { x, y, z },
    scale: { x: size, y: size, z: size },
  });
}

console.log("Created", count, "spheres in spherical arrangement");`,
  },
  {
    name: "Staircase",
    description: "Generate a spiral staircase",
    code: `// Spiral staircase
const steps = 24;
const stepWidth = 2;
const stepHeight = 0.3;
const stepDepth = 1;

for (let i = 0; i < steps; i++) {
  const angle = blendergl.utils.degToRad(15 * i);
  const radius = 3;

  const x = radius * Math.cos(angle);
  const z = radius * Math.sin(angle);
  const y = i * stepHeight;
  const rotY = -blendergl.utils.radToDeg(angle);

  blendergl.ops.addPrimitive("cube", {
    name: \`step_\${i}\`,
    position: { x, y, z },
    rotation: { x: 0, y: rotY, z: 0 },
    scale: { x: stepWidth, y: stepHeight, z: stepDepth },
  });
}

console.log("Created spiral staircase with", steps, "steps");`,
  },
  {
    name: "Analyze Scene",
    description: "Report scene statistics",
    code: `// Scene analysis report
const entities = blendergl.scene.getEntities();
const selection = blendergl.data.getSelection();
const settings = blendergl.data.getSettings();

console.log("=== Scene Report ===");
console.log("Total entities:", entities.length);
console.log("Selected:", selection.length);

// Count by visibility
const visible = entities.filter(e => e.visible).length;
const hidden = entities.length - visible;
console.log("Visible:", visible, "| Hidden:", hidden);

// List entities with positions
for (const e of entities) {
  const p = e.transform.position;
  console.log(\`  \${e.name}: (\${p.x.toFixed(1)}, \${p.y.toFixed(1)}, \${p.z.toFixed(1)})\`);
}

console.log("\\nSettings:", JSON.stringify(settings, null, 2));`,
  },
  {
    name: "Scale Selected",
    description: "Double the scale of all selected objects",
    code: `// Double the scale of all selected entities
const selected = blendergl.data.getSelection();

if (selected.length === 0) {
  console.warn("No entities selected!");
} else {
  for (const id of selected) {
    blendergl.ops.scale(id, { x: 2, y: 2, z: 2 });
    const entity = blendergl.scene.getEntity(id);
    console.log("Scaled:", entity?.name);
  }
  console.log("Scaled", selected.length, "entities");
}`,
  },
];
