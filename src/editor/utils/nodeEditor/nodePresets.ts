/**
 * Node presets for compositing, geometry, and logic graph types.
 */

export interface NodePreset {
  name: string;
  nodes: Array<{
    type: string;
    position: { x: number; y: number };
    values?: Record<string, number | string | number[]>;
  }>;
  connections: Array<{
    sourceNodeId: number;
    sourcePortId: string;
    targetNodeId: number;
    targetPortId: string;
  }>;
}

// ---- Compositing Presets ----

export const COMPOSITING_PRESETS: NodePreset[] = [
  {
    name: "Basic Composite",
    nodes: [
      { type: "render_layer", position: { x: 50, y: 50 }, values: { layer: "diffuse" } },
      { type: "composite_output", position: { x: 300, y: 50 } },
    ],
    connections: [
      { sourceNodeId: 0, sourcePortId: "image", targetNodeId: 1, targetPortId: "image" },
    ],
  },
  {
    name: "Bloom Effect",
    nodes: [
      { type: "render_layer", position: { x: 50, y: 50 } },
      { type: "bloom_node", position: { x: 300, y: 30 }, values: { threshold: 0.8, intensity: 0.5, radius: 5 } },
      { type: "comp_blur", position: { x: 300, y: 200 }, values: { size: 3 } },
      { type: "alpha_over", position: { x: 550, y: 80 } },
      { type: "composite_output", position: { x: 800, y: 80 } },
    ],
    connections: [
      { sourceNodeId: 0, sourcePortId: "image", targetNodeId: 1, targetPortId: "image" },
      { sourceNodeId: 0, sourcePortId: "image", targetNodeId: 2, targetPortId: "image" },
      { sourceNodeId: 1, sourcePortId: "image", targetNodeId: 3, targetPortId: "fg" },
      { sourceNodeId: 2, sourcePortId: "image", targetNodeId: 3, targetPortId: "bg" },
      { sourceNodeId: 3, sourcePortId: "image", targetNodeId: 4, targetPortId: "image" },
    ],
  },
  {
    name: "Color Grading",
    nodes: [
      { type: "render_layer", position: { x: 50, y: 50 } },
      { type: "color_balance", position: { x: 300, y: 30 }, values: { lift: [0, 0, 0], gamma: [1, 1, 1], gain: [1, 1, 1] } },
      { type: "brightness_contrast", position: { x: 300, y: 200 }, values: { brightness: 0, contrast: 0.2 } },
      { type: "composite_output", position: { x: 550, y: 100 } },
    ],
    connections: [
      { sourceNodeId: 0, sourcePortId: "image", targetNodeId: 1, targetPortId: "image" },
      { sourceNodeId: 1, sourcePortId: "image", targetNodeId: 2, targetPortId: "image" },
      { sourceNodeId: 2, sourcePortId: "image", targetNodeId: 3, targetPortId: "image" },
    ],
  },
  {
    name: "Cinematic",
    nodes: [
      { type: "render_layer", position: { x: 50, y: 50 } },
      { type: "brightness_contrast", position: { x: 250, y: 30 }, values: { brightness: -0.05, contrast: 0.3 } },
      { type: "color_balance", position: { x: 450, y: 30 }, values: { lift: [0, 0, 0.02], gamma: [0.95, 0.95, 1], gain: [1.1, 1.05, 0.95] } },
      { type: "hue_saturation", position: { x: 250, y: 200 }, values: { hue: 0, saturation: 0.8, value: 0.95 } },
      { type: "bloom_node", position: { x: 450, y: 200 }, values: { threshold: 0.9, intensity: 0.3, radius: 4 } },
      { type: "alpha_over", position: { x: 650, y: 100 } },
      { type: "composite_output", position: { x: 900, y: 100 } },
    ],
    connections: [
      { sourceNodeId: 0, sourcePortId: "image", targetNodeId: 1, targetPortId: "image" },
      { sourceNodeId: 1, sourcePortId: "image", targetNodeId: 2, targetPortId: "image" },
      { sourceNodeId: 0, sourcePortId: "image", targetNodeId: 3, targetPortId: "image" },
      { sourceNodeId: 0, sourcePortId: "image", targetNodeId: 4, targetPortId: "image" },
      { sourceNodeId: 2, sourcePortId: "image", targetNodeId: 5, targetPortId: "fg" },
      { sourceNodeId: 4, sourcePortId: "image", targetNodeId: 5, targetPortId: "bg" },
      { sourceNodeId: 5, sourcePortId: "image", targetNodeId: 6, targetPortId: "image" },
    ],
  },
  {
    name: "Vintage",
    nodes: [
      { type: "render_layer", position: { x: 50, y: 50 } },
      { type: "hue_saturation", position: { x: 250, y: 50 }, values: { hue: 0.3, saturation: 0.6, value: 0.9 } },
      { type: "color_balance", position: { x: 450, y: 50 }, values: { lift: [0.05, 0.02, 0], gamma: [1, 0.95, 0.9], gain: [1, 0.95, 0.9] } },
      { type: "brightness_contrast", position: { x: 650, y: 50 }, values: { brightness: 0.05, contrast: 0.15 } },
      { type: "composite_output", position: { x: 900, y: 50 } },
    ],
    connections: [
      { sourceNodeId: 0, sourcePortId: "image", targetNodeId: 1, targetPortId: "image" },
      { sourceNodeId: 1, sourcePortId: "image", targetNodeId: 2, targetPortId: "image" },
      { sourceNodeId: 2, sourcePortId: "image", targetNodeId: 3, targetPortId: "image" },
      { sourceNodeId: 3, sourcePortId: "image", targetNodeId: 4, targetPortId: "image" },
    ],
  },
  {
    name: "Stylized",
    nodes: [
      { type: "render_layer", position: { x: 50, y: 50 } },
      { type: "hue_saturation", position: { x: 250, y: 50 }, values: { hue: 0, saturation: 1.5, value: 1.1 } },
      { type: "brightness_contrast", position: { x: 450, y: 50 }, values: { brightness: 0, contrast: 0.5 } },
      { type: "composite_output", position: { x: 700, y: 50 } },
    ],
    connections: [
      { sourceNodeId: 0, sourcePortId: "image", targetNodeId: 1, targetPortId: "image" },
      { sourceNodeId: 1, sourcePortId: "image", targetNodeId: 2, targetPortId: "image" },
      { sourceNodeId: 2, sourcePortId: "image", targetNodeId: 3, targetPortId: "image" },
    ],
  },
];

// ---- Geometry Presets ----

export const GEOMETRY_PRESETS: NodePreset[] = [
  {
    name: "Array Pattern",
    nodes: [
      { type: "mesh_primitive", position: { x: 50, y: 50 }, values: { type: "cube", size: 1, segments: 1 } },
      { type: "gen_grid", position: { x: 50, y: 250 }, values: { size: 10, subdivisions: 5 } },
      { type: "instance_on_points", position: { x: 350, y: 100 }, values: { scale: 0.5 } },
      { type: "group_output", position: { x: 600, y: 100 } },
    ],
    connections: [
      { sourceNodeId: 0, sourcePortId: "geometry", targetNodeId: 2, targetPortId: "instance" },
      { sourceNodeId: 1, sourcePortId: "points", targetNodeId: 2, targetPortId: "points" },
      { sourceNodeId: 2, sourcePortId: "geometry", targetNodeId: 3, targetPortId: "geometry" },
    ],
  },
  {
    name: "Random Scatter",
    nodes: [
      { type: "mesh_primitive", position: { x: 50, y: 50 }, values: { type: "sphere", size: 1, segments: 8 } },
      { type: "gen_grid", position: { x: 50, y: 250 }, values: { size: 10, subdivisions: 10 } },
      { type: "instance_on_points", position: { x: 350, y: 100 }, values: { scale: 0.8 } },
      { type: "set_scale", position: { x: 350, y: 250 }, values: { scale: [1, 0.5, 1] } },
      { type: "group_output", position: { x: 600, y: 150 } },
    ],
    connections: [
      { sourceNodeId: 0, sourcePortId: "geometry", targetNodeId: 2, targetPortId: "instance" },
      { sourceNodeId: 1, sourcePortId: "points", targetNodeId: 2, targetPortId: "points" },
      { sourceNodeId: 2, sourcePortId: "geometry", targetNodeId: 3, targetPortId: "geometry" },
      { sourceNodeId: 3, sourcePortId: "geometry", targetNodeId: 4, targetPortId: "geometry" },
    ],
  },
  {
    name: "Subdivide Mesh",
    nodes: [
      { type: "mesh_primitive", position: { x: 50, y: 50 }, values: { type: "cube", size: 2, segments: 1 } },
      { type: "geo_subdivide", position: { x: 300, y: 50 }, values: { level: 2 } },
      { type: "set_material", position: { x: 550, y: 50 }, values: { material: [0.8, 0.2, 0.2] } },
      { type: "group_output", position: { x: 800, y: 50 } },
    ],
    connections: [
      { sourceNodeId: 0, sourcePortId: "geometry", targetNodeId: 1, targetPortId: "geometry" },
      { sourceNodeId: 1, sourcePortId: "geometry", targetNodeId: 2, targetPortId: "geometry" },
      { sourceNodeId: 2, sourcePortId: "geometry", targetNodeId: 3, targetPortId: "geometry" },
    ],
  },
  {
    name: "Curve Based",
    nodes: [
      { type: "gen_curve", position: { x: 50, y: 50 }, values: { resolution: 20 } },
      { type: "mesh_primitive", position: { x: 50, y: 250 }, values: { type: "sphere", size: 0.5, segments: 8 } },
      { type: "instance_on_points", position: { x: 350, y: 100 }, values: { scale: 1 } },
      { type: "group_output", position: { x: 600, y: 100 } },
    ],
    connections: [
      { sourceNodeId: 1, sourcePortId: "geometry", targetNodeId: 2, targetPortId: "instance" },
      { sourceNodeId: 0, sourcePortId: "points", targetNodeId: 2, targetPortId: "points" },
      { sourceNodeId: 2, sourcePortId: "geometry", targetNodeId: 3, targetPortId: "geometry" },
    ],
  },
];

// ---- Logic Presets ----

export const LOGIC_PRESETS: NodePreset[] = [
  {
    name: "Basic Movement",
    nodes: [
      { type: "event_start", position: { x: 50, y: 100 } },
      { type: "action_move", position: { x: 250, y: 100 }, values: { direction: [0, 0, 1], speed: 5 } },
    ],
    connections: [
      { sourceNodeId: 0, sourcePortId: "exec", targetNodeId: 1, targetPortId: "exec" },
    ],
  },
  {
    name: "Input Control",
    nodes: [
      { type: "event_update", position: { x: 50, y: 50 } },
      { type: "event_input", position: { x: 50, y: 200 }, values: { key: "KeyW" } },
      { type: "action_move", position: { x: 300, y: 200 }, values: { direction: [0, 0, 1], speed: 5 } },
      { type: "event_input", position: { x: 50, y: 350 }, values: { key: "KeyS" } },
      { type: "action_move", position: { x: 300, y: 350 }, values: { direction: [0, 0, -1], speed: 5 } },
    ],
    connections: [
      { sourceNodeId: 1, sourcePortId: "exec", targetNodeId: 2, targetPortId: "exec" },
      { sourceNodeId: 3, sourcePortId: "exec", targetNodeId: 4, targetPortId: "exec" },
    ],
  },
  {
    name: "Variable Counter",
    nodes: [
      { type: "event_start", position: { x: 50, y: 50 } },
      { type: "action_set_variable", position: { x: 250, y: 50 }, values: { name: "counter", value: 0 } },
      { type: "for_loop", position: { x: 450, y: 50 }, values: { count: 10 } },
      { type: "debug_print", position: { x: 700, y: 50 }, values: { message: "Count: ", value: 0 } },
      { type: "get_variable", position: { x: 700, y: 200 }, values: { name: "counter" } },
    ],
    connections: [
      { sourceNodeId: 0, sourcePortId: "exec", targetNodeId: 1, targetPortId: "exec" },
      { sourceNodeId: 1, sourcePortId: "exec", targetNodeId: 2, targetPortId: "body" },
      { sourceNodeId: 2, sourcePortId: "completed", targetNodeId: 3, targetPortId: "exec" },
    ],
  },
  {
    name: "Branch Logic",
    nodes: [
      { type: "event_start", position: { x: 50, y: 100 } },
      { type: "get_variable", position: { x: 250, y: 30 }, values: { name: "health" } },
      { type: "logic_compare", position: { x: 450, y: 30 }, values: { a: 0, b: 0, operator: ">" } },
      { type: "branch", position: { x: 650, y: 50 } },
      { type: "debug_print", position: { x: 850, y: 20 }, values: { message: "Alive!" } },
      { type: "debug_print", position: { x: 850, y: 170 }, values: { message: "Dead!" } },
    ],
    connections: [
      { sourceNodeId: 0, sourcePortId: "exec", targetNodeId: 2, targetPortId: "exec" },
      { sourceNodeId: 1, sourcePortId: "value", targetNodeId: 2, targetPortId: "b" },
      { sourceNodeId: 2, sourcePortId: "result", targetNodeId: 3, targetPortId: "condition" },
      { sourceNodeId: 3, sourcePortId: "true", targetNodeId: 4, targetPortId: "exec" },
      { sourceNodeId: 3, sourcePortId: "false", targetNodeId: 5, targetPortId: "exec" },
    ],
  },
];
