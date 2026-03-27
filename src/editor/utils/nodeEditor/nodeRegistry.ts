/**
 * Node type registry for the node editor.
 *
 * Defines all available node types, their ports, and default values.
 * Supports shader, compositing, geometry, and logic graph types.
 */

import type { NodeTypeDefinition, PortDataType, NodeGraphType } from "@/editor/types/nodeEditor";

// ---- Helpers ----

function input(id: string, name: string, dataType: PortDataType, defaultValue: number | string | number[]): import("@/editor/types/nodeEditor").PortDefinition {
  return { id, name, dataType, defaultValue };
}

function output(id: string, name: string, dataType: PortDataType): import("@/editor/types/nodeEditor").PortDefinition {
  return { id, name, dataType, defaultValue: 0 };
}

function nodeDef(type: string, category: string, label: string, graphType: NodeGraphType, inputs: import("@/editor/types/nodeEditor").PortDefinition[], outputs: import("@/editor/types/nodeEditor").PortDefinition[]): NodeTypeDefinition & { graphType: NodeGraphType } {
  return { type, category, label, inputs, outputs, graphType };
}

// ---- Node definitions ----

const SHADER_NODES: NodeTypeDefinition[] = [
  // Output
  {
    type: "material_output",
    category: "output",
    label: "Material Output",
    inputs: [input("surface", "Surface", "any", 0)],
    outputs: [],
  },

  // Shaders
  {
    type: "principled_bsdf",
    category: "shader",
    label: "Principled BSDF",
    inputs: [
      input("baseColor", "Base Color", "color", [0.8, 0.8, 0.8]),
      input("metallic", "Metallic", "float", 0),
      input("roughness", "Roughness", "float", 0.5),
      input("normal", "Normal", "vec3", [0, 0, 1]),
      input("emissive", "Emissive", "color", [0, 0, 0]),
      input("opacity", "Opacity", "float", 1),
    ],
    outputs: [output("surface", "Surface", "any")],
  },
  {
    type: "emission",
    category: "shader",
    label: "Emission",
    inputs: [
      input("color", "Color", "color", [1, 1, 1]),
      input("strength", "Strength", "float", 1),
    ],
    outputs: [output("surface", "Surface", "any")],
  },

  // Input
  {
    type: "color_input",
    category: "input",
    label: "Color",
    inputs: [input("value", "Value", "color", [1, 1, 1])],
    outputs: [output("color", "Color", "color")],
  },
  {
    type: "value_input",
    category: "input",
    label: "Value",
    inputs: [input("value", "Value", "float", 0)],
    outputs: [output("value", "Value", "float")],
  },
  {
    type: "normal_input",
    category: "input",
    label: "Normal",
    inputs: [input("value", "Value", "vec3", [0, 0, 1])],
    outputs: [output("normal", "Normal", "vec3")],
  },

  // Math
  {
    type: "math_add",
    category: "math",
    label: "Add",
    inputs: [input("a", "A", "float", 0), input("b", "B", "float", 0)],
    outputs: [output("result", "Result", "float")],
  },
  {
    type: "math_subtract",
    category: "math",
    label: "Subtract",
    inputs: [input("a", "A", "float", 0), input("b", "B", "float", 0)],
    outputs: [output("result", "Result", "float")],
  },
  {
    type: "math_multiply",
    category: "math",
    label: "Multiply",
    inputs: [input("a", "A", "float", 0), input("b", "B", "float", 0)],
    outputs: [output("result", "Result", "float")],
  },
  {
    type: "math_divide",
    category: "math",
    label: "Divide",
    inputs: [input("a", "A", "float", 0), input("b", "B", "float", 1)],
    outputs: [output("result", "Result", "float")],
  },
  {
    type: "math_power",
    category: "math",
    label: "Power",
    inputs: [input("base", "Base", "float", 0), input("exponent", "Exponent", "float", 1)],
    outputs: [output("result", "Result", "float")],
  },
  {
    type: "math_mix",
    category: "math",
    label: "Mix",
    inputs: [input("a", "A", "float", 0), input("b", "B", "float", 1), input("factor", "Factor", "float", 0.5)],
    outputs: [output("result", "Result", "float")],
  },
  {
    type: "math_clamp",
    category: "math",
    label: "Clamp",
    inputs: [input("value", "Value", "float", 0), input("min", "Min", "float", 0), input("max", "Max", "float", 1)],
    outputs: [output("result", "Result", "float")],
  },

  // Vector
  {
    type: "combine_xyz",
    category: "vector",
    label: "Combine XYZ",
    inputs: [input("x", "X", "float", 0), input("y", "Y", "float", 0), input("z", "Z", "float", 0)],
    outputs: [output("vector", "Vector", "vec3")],
  },
  {
    type: "separate_xyz",
    category: "vector",
    label: "Separate XYZ",
    inputs: [input("vector", "Vector", "vec3", [0, 0, 0])],
    outputs: [output("x", "X", "float"), output("y", "Y", "float"), output("z", "Z", "float")],
  },

  // Color
  {
    type: "mix_color",
    category: "color",
    label: "Mix Color",
    inputs: [input("a", "A", "color", [0, 0, 0]), input("b", "B", "color", [1, 1, 1]), input("factor", "Factor", "float", 0.5)],
    outputs: [output("result", "Result", "color")],
  },

  // Texture
  {
    type: "checker_texture",
    category: "texture",
    label: "Checker Texture",
    inputs: [
      input("color1", "Color 1", "color", [0, 0, 0]),
      input("color2", "Color 2", "color", [1, 1, 1]),
      input("scale", "Scale", "float", 5),
    ],
    outputs: [output("color", "Color", "color")],
  },
  {
    type: "noise_texture",
    category: "texture",
    label: "Noise Texture",
    inputs: [
      input("scale", "Scale", "float", 5),
      input("detail", "Detail", "float", 2),
      input("roughness", "Roughness", "float", 0.5),
    ],
    outputs: [output("color", "Color", "color"), output("fac", "Fac", "float")],
  },
  {
    type: "gradient_texture",
    category: "texture",
    label: "Gradient Texture",
    inputs: [
      input("color1", "Color 1", "color", [0, 0, 0]),
      input("color2", "Color 2", "color", [1, 1, 1]),
    ],
    outputs: [output("color", "Color", "color")],
  },
];

// ---- Compositing Nodes (Phase 16.3) ----

const COMPOSITING_NODES: NodeTypeDefinition[] = [
  // Output
  nodeDef("composite_output", "output", "Composite Output", "compositing",
    [input("image", "Image", "color", [0, 0, 0, 1])],
    []
  ),
  nodeDef("viewer_output", "output", "Viewer", "compositing",
    [input("image", "Image", "color", [0, 0, 0, 1])],
    []
  ),
  nodeDef("file_output", "output", "File Output", "compositing",
    [input("image", "Image", "color", [0, 0, 0, 1]), input("filepath", "File Path", "any", "")],
    []
  ),

  // Input
  nodeDef("render_layer", "input", "Render Layer", "compositing",
    [input("layer", "Layer", "any", "diffuse")],
    [output("image", "Image", "color"), output("depth", "Depth", "float"), output("alpha", "Alpha", "float")]
  ),
  nodeDef("image_input", "input", "Image", "compositing",
    [input("filepath", "File Path", "any", "")],
    [output("image", "Image", "color"), output("alpha", "Alpha", "float")]
  ),
  nodeDef("mask_input", "input", "Mask", "compositing",
    [input("value", "Value", "float", 1)],
    [output("mask", "Mask", "float")]
  ),

  // Process
  nodeDef("comp_blur", "process", "Blur", "compositing",
    [input("image", "Image", "color", [0, 0, 0, 1]), input("size", "Size", "float", 5)],
    [output("image", "Image", "color")]
  ),
  nodeDef("comp_sharpen", "process", "Sharpen", "compositing",
    [input("image", "Image", "color", [0, 0, 0, 1]), input("strength", "Strength", "float", 1)],
    [output("image", "Image", "color")]
  ),
  nodeDef("brightness_contrast", "process", "Brightness/Contrast", "compositing",
    [input("image", "Image", "color", [0, 0, 0, 1]), input("brightness", "Brightness", "float", 0), input("contrast", "Contrast", "float", 0)],
    [output("image", "Image", "color")]
  ),
  nodeDef("color_balance", "process", "Color Balance", "compositing",
    [input("image", "Image", "color", [0, 0, 0, 1]), input("lift", "Lift", "color", [0, 0, 0]), input("gamma", "Gamma", "color", [1, 1, 1]), input("gain", "Gain", "color", [1, 1, 1])],
    [output("image", "Image", "color")]
  ),
  nodeDef("hue_saturation", "process", "Hue/Saturation", "compositing",
    [input("image", "Image", "color", [0, 0, 0, 1]), input("hue", "Hue", "float", 0), input("saturation", "Saturation", "float", 1), input("value", "Value", "float", 1)],
    [output("image", "Image", "color")]
  ),

  // Mix
  nodeDef("alpha_over", "mix", "Alpha Over", "compositing",
    [input("fg", "Foreground", "color", [1, 1, 1, 1]), input("bg", "Background", "color", [0, 0, 0, 1]), input("mix", "Mix", "float", 1)],
    [output("image", "Image", "color")]
  ),
  nodeDef("multiply_node", "mix", "Multiply", "compositing",
    [input("a", "A", "color", [1, 1, 1, 1]), input("b", "B", "color", [1, 1, 1, 1])],
    [output("image", "Image", "color")]
  ),
  nodeDef("screen_node", "mix", "Screen", "compositing",
    [input("a", "A", "color", [0, 0, 0, 1]), input("b", "B", "color", [0, 0, 0, 1])],
    [output("image", "Image", "color")]
  ),
  nodeDef("add_node", "mix", "Add", "compositing",
    [input("a", "A", "color", [0, 0, 0, 1]), input("b", "B", "color", [0, 0, 0, 1])],
    [output("image", "Image", "color")]
  ),
  nodeDef("subtract_node", "mix", "Subtract", "compositing",
    [input("a", "A", "color", [1, 1, 1, 1]), input("b", "B", "color", [0, 0, 0, 1])],
    [output("image", "Image", "color")]
  ),

  // Filter
  nodeDef("glare_node", "filter", "Glare", "compositing",
    [input("image", "Image", "color", [0, 0, 0, 1]), input("threshold", "Threshold", "float", 1), input("quality", "Quality", "float", 0.5)],
    [output("image", "Image", "color")]
  ),
  nodeDef("bloom_node", "filter", "Bloom", "compositing",
    [input("image", "Image", "color", [0, 0, 0, 1]), input("threshold", "Threshold", "float", 0.8), input("intensity", "Intensity", "float", 0.5), input("radius", "Radius", "float", 5)],
    [output("image", "Image", "color")]
  ),
  nodeDef("dof_node", "filter", "Depth of Field", "compositing",
    [input("image", "Image", "color", [0, 0, 0, 1]), input("depth", "Depth", "float", 1), input("fStop", "F-Stop", "float", 4), input("focalDist", "Focal Distance", "float", 10)],
    [output("image", "Image", "color")]
  ),
  nodeDef("fog_node", "filter", "Fog", "compositing",
    [input("image", "Image", "color", [0, 0, 0, 1]), input("depth", "Depth", "float", 1), input("color", "Fog Color", "color", [0.5, 0.5, 0.6]), input("start", "Start", "float", 10), input("end", "End", "float", 50)],
    [output("image", "Image", "color")]
  ),
];

// ---- Geometry Nodes (Phase 16.4) ----

const GEOMETRY_NODES: NodeTypeDefinition[] = [
  // Output
  nodeDef("group_output", "output", "Group Output", "geometry",
    [input("geometry", "Geometry", "any", 0)],
    []
  ),
  nodeDef("set_material", "output", "Set Material", "geometry",
    [input("geometry", "Geometry", "any", 0), input("material", "Material", "color", [0.8, 0.8, 0.8])],
    [output("geometry", "Geometry", "any")]
  ),

  // Input
  nodeDef("object_info", "input", "Object Info", "geometry",
    [input("object", "Object", "any", "")],
    [output("geometry", "Geometry", "any"), output("position", "Position", "vec3"), output("rotation", "Rotation", "vec3")]
  ),
  nodeDef("collection_info", "input", "Collection Info", "geometry",
    [input("collection", "Collection", "any", "")],
    [output("geometry", "Geometry", "any"), output("count", "Count", "float")]
  ),
  nodeDef("mesh_primitive", "input", "Mesh Primitive", "geometry",
    [input("type", "Type", "any", "cube"), input("size", "Size", "float", 1), input("segments", "Segments", "float", 1)],
    [output("geometry", "Geometry", "any")]
  ),

  // Transform
  nodeDef("geo_transform", "transform", "Transform", "geometry",
    [input("geometry", "Geometry", "any", 0), input("translation", "Translation", "vec3", [0, 0, 0]), input("rotation", "Rotation", "vec3", [0, 0, 0]), input("scale", "Scale", "vec3", [1, 1, 1])],
    [output("geometry", "Geometry", "any")]
  ),
  nodeDef("set_position", "transform", "Set Position", "geometry",
    [input("geometry", "Geometry", "any", 0), input("position", "Position", "vec3", [0, 0, 0])],
    [output("geometry", "Geometry", "any")]
  ),
  nodeDef("set_rotation", "transform", "Set Rotation", "geometry",
    [input("geometry", "Geometry", "any", 0), input("rotation", "Rotation", "vec3", [0, 0, 0])],
    [output("geometry", "Geometry", "any")]
  ),
  nodeDef("set_scale", "transform", "Set Scale", "geometry",
    [input("geometry", "Geometry", "any", 0), input("scale", "Scale", "vec3", [1, 1, 1])],
    [output("geometry", "Geometry", "any")]
  ),

  // Mesh
  nodeDef("geo_subdivide", "mesh", "Subdivide", "geometry",
    [input("geometry", "Geometry", "any", 0), input("level", "Level", "float", 1)],
    [output("geometry", "Geometry", "any")]
  ),
  nodeDef("geo_extrude", "mesh", "Extrude", "geometry",
    [input("geometry", "Geometry", "any", 0), input("offset", "Offset", "float", 0.1)],
    [output("geometry", "Geometry", "any")]
  ),
  nodeDef("geo_delete", "mesh", "Delete", "geometry",
    [input("geometry", "Geometry", "any", 0), input("mode", "Mode", "any", "vertices")],
    [output("geometry", "Geometry", "any")]
  ),
  nodeDef("geo_boolean", "mesh", "Boolean", "geometry",
    [input("geometryA", "Geometry A", "any", 0), input("geometryB", "Geometry B", "any", 0), input("operation", "Operation", "any", "union")],
    [output("geometry", "Geometry", "any")]
  ),
  nodeDef("geo_merge", "mesh", "Merge", "geometry",
    [input("geometryA", "Geometry A", "any", 0), input("geometryB", "Geometry B", "any", 0)],
    [output("geometry", "Geometry", "any")]
  ),

  // Generate
  nodeDef("gen_grid", "generate", "Grid", "geometry",
    [input("size", "Size", "float", 10), input("subdivisions", "Subdivisions", "float", 10)],
    [output("geometry", "Geometry", "any"), output("points", "Points", "vec3")]
  ),
  nodeDef("gen_circle", "generate", "Circle", "geometry",
    [input("radius", "Radius", "float", 1), input("segments", "Segments", "float", 32)],
    [output("geometry", "Geometry", "any"), output("points", "Points", "vec3")]
  ),
  nodeDef("gen_curve", "generate", "Curve", "geometry",
    [input("points", "Points", "vec3", [0, 0, 0]), input("resolution", "Resolution", "float", 10)],
    [output("geometry", "Geometry", "any")]
  ),
  nodeDef("instance_on_points", "generate", "Instance on Points", "geometry",
    [input("geometry", "Geometry", "any", 0), input("instance", "Instance", "any", 0), input("points", "Points", "vec3", [0, 0, 0]), input("scale", "Scale", "float", 1)],
    [output("geometry", "Geometry", "any")]
  ),
];

// ---- Logic Nodes (Phase 16.5) ----

const LOGIC_NODES: NodeTypeDefinition[] = [
  // Event
  nodeDef("event_start", "event", "On Start", "logic",
    [],
    [output("exec", "Exec", "any")]
  ),
  nodeDef("event_update", "event", "On Update", "logic",
    [input("frequency", "Frequency", "float", 1)],
    [output("exec", "Exec", "any"), output("deltaTime", "Delta Time", "float")]
  ),
  nodeDef("event_collision", "event", "On Collision", "logic",
    [],
    [output("exec", "Exec", "any"), output("other", "Other Entity", "any"), output("contactPoint", "Contact Point", "vec3")]
  ),
  nodeDef("event_input", "event", "On Input", "logic",
    [input("key", "Key", "any", "Space")],
    [output("exec", "Exec", "any")]
  ),

  // Action
  nodeDef("action_move", "action", "Move", "logic",
    [input("entity", "Entity", "any", ""), input("direction", "Direction", "vec3", [0, 0, 1]), input("speed", "Speed", "float", 5)],
    [output("exec", "Exec", "any")]
  ),
  nodeDef("action_rotate", "action", "Rotate", "logic",
    [input("entity", "Entity", "any", ""), input("axis", "Axis", "vec3", [0, 1, 0]), input("speed", "Speed", "float", 90)],
    [output("exec", "Exec", "any")]
  ),
  nodeDef("action_apply_force", "action", "Apply Force", "logic",
    [input("entity", "Entity", "any", ""), input("force", "Force", "vec3", [0, 10, 0])],
    [output("exec", "Exec", "any")]
  ),
  nodeDef("action_set_variable", "action", "Set Variable", "logic",
    [input("name", "Name", "any", "health"), input("value", "Value", "float", 100)],
    [output("exec", "Exec", "any")]
  ),
  nodeDef("action_play_animation", "action", "Play Animation", "logic",
    [input("entity", "Entity", "any", ""), input("animation", "Animation", "any", "walk")],
    [output("exec", "Exec", "any")]
  ),

  // Flow Control
  nodeDef("branch", "flow", "Branch", "logic",
    [input("condition", "Condition", "boolean", 0)],
    [output("true", "True", "any"), output("false", "False", "any")]
  ),
  nodeDef("for_loop", "flow", "For Loop", "logic",
    [input("count", "Count", "float", 10)],
    [output("body", "Body", "any"), output("index", "Index", "float"), output("completed", "Completed", "any")]
  ),
  nodeDef("while_loop", "flow", "While Loop", "logic",
    [input("condition", "Condition", "boolean", 0)],
    [output("body", "Body", "any"), output("completed", "Completed", "any")]
  ),
  nodeDef("sequence", "flow", "Sequence", "logic",
    [],
    [output("then_0", "Then 0", "any"), output("then_1", "Then 1", "any"), output("then_2", "Then 2", "any")]
  ),
  nodeDef("delay", "flow", "Delay", "logic",
    [input("seconds", "Seconds", "float", 1)],
    [output("exec", "Exec", "any")]
  ),

  // Variable
  nodeDef("get_variable", "variable", "Get Variable", "logic",
    [input("name", "Name", "any", "health")],
    [output("value", "Value", "float")]
  ),
  nodeDef("set_global_variable", "variable", "Set Global Variable", "logic",
    [input("name", "Name", "any", "score"), input("value", "Value", "float", 0)],
    [output("exec", "Exec", "any")]
  ),
  nodeDef("get_global_variable", "variable", "Get Global Variable", "logic",
    [input("name", "Name", "any", "score")],
    [output("value", "Value", "float")]
  ),

  // Math
  nodeDef("logic_compare", "math", "Compare", "logic",
    [input("a", "A", "float", 0), input("b", "B", "float", 0), input("operator", "Operator", "any", ">")],
    [output("result", "Result", "boolean")]
  ),
  nodeDef("logic_arithmetic", "math", "Arithmetic", "logic",
    [input("a", "A", "float", 0), input("b", "B", "float", 0), input("operator", "Operator", "any", "+")],
    [output("result", "Result", "float")]
  ),
  nodeDef("logic_random", "math", "Random", "logic",
    [input("min", "Min", "float", 0), input("max", "Max", "float", 1)],
    [output("value", "Value", "float")]
  ),

  // Entity
  nodeDef("get_property", "entity", "Get Property", "logic",
    [input("entity", "Entity", "any", ""), input("property", "Property", "any", "position")],
    [output("value", "Value", "any")]
  ),
  nodeDef("set_property", "entity", "Set Property", "logic",
    [input("entity", "Entity", "any", ""), input("property", "Property", "any", "position"), input("value", "Value", "any", 0)],
    [output("exec", "Exec", "any")]
  ),
  nodeDef("find_by_name", "entity", "Find By Name", "logic",
    [input("name", "Name", "any", "")],
    [output("entity", "Entity", "any")]
  ),
  nodeDef("spawn_entity", "entity", "Spawn", "logic",
    [input("prefab", "Prefab", "any", ""), input("position", "Position", "vec3", [0, 0, 0])],
    [output("entity", "Entity", "any"), output("exec", "Exec", "any")]
  ),

  // Debug
  nodeDef("debug_print", "debug", "Print", "logic",
    [input("message", "Message", "any", ""), input("value", "Value", "any", 0)],
    [output("exec", "Exec", "any")]
  ),
  nodeDef("debug_watch", "debug", "Watch", "logic",
    [input("value", "Value", "any", 0)],
    [output("value", "Value", "any")]
  ),
  nodeDef("debug_breakpoint", "debug", "Breakpoint", "logic",
    [input("condition", "Condition", "boolean", 0)],
    [output("exec", "Exec", "any")]
  ),
];

// ---- All nodes combined ----

const ALL_NODES: NodeTypeDefinition[] = [
  ...SHADER_NODES,
  ...COMPOSITING_NODES,
  ...GEOMETRY_NODES,
  ...LOGIC_NODES,
];

// ---- Registry map ----

const registryMap = new Map<string, NodeTypeDefinition>();
for (const def of ALL_NODES) {
  registryMap.set(def.type, def);
}

// ---- Public API ----

export function getNodeTypeDefinition(type: string): NodeTypeDefinition | undefined {
  return registryMap.get(type);
}

export function getAllNodeTypes(): NodeTypeDefinition[] {
  return ALL_NODES;
}

export function getNodeTypesForGraph(graphType: NodeGraphType): NodeTypeDefinition[] {
  return ALL_NODES.filter((n) => !n.graphType || n.graphType === graphType);
}

export function getNodeTypesByCategory(category: string): NodeTypeDefinition[] {
  return ALL_NODES.filter((n) => n.category === category);
}

export function getAllNodeCategories(): string[] {
  const categories = new Set(ALL_NODES.map((n) => n.category));
  return Array.from(categories);
}

export function searchNodes(query: string, graphType?: NodeGraphType): NodeTypeDefinition[] {
  const q = query.toLowerCase();
  return ALL_NODES.filter(
    (n) =>
      (!graphType || !n.graphType || n.graphType === graphType) &&
      (n.label.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q))
  );
}
