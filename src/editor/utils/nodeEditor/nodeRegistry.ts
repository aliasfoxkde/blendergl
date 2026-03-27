/**
 * Node type registry for the node editor.
 *
 * Defines all available node types, their ports, and default values.
 * Shader-focused for Phase 16.2.
 */

import type { NodeTypeDefinition, PortDataType } from "@/editor/types/nodeEditor";

// ---- Helpers ----

function input(id: string, name: string, dataType: PortDataType, defaultValue: number | string | number[]): import("@/editor/types/nodeEditor").PortDefinition {
  return { id, name, dataType, defaultValue };
}

function output(id: string, name: string, dataType: PortDataType): import("@/editor/types/nodeEditor").PortDefinition {
  return { id, name, dataType, defaultValue: 0 };
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

// ---- Registry map ----

const registryMap = new Map<string, NodeTypeDefinition>();
for (const def of SHADER_NODES) {
  registryMap.set(def.type, def);
}

// ---- Public API ----

export function getNodeTypeDefinition(type: string): NodeTypeDefinition | undefined {
  return registryMap.get(type);
}

export function getAllNodeTypes(): NodeTypeDefinition[] {
  return SHADER_NODES;
}

export function getNodeTypesByCategory(category: string): NodeTypeDefinition[] {
  return SHADER_NODES.filter((n) => n.category === category);
}

export function getAllNodeCategories(): string[] {
  const categories = new Set(SHADER_NODES.map((n) => n.category));
  return Array.from(categories);
}

export function searchNodes(query: string): NodeTypeDefinition[] {
  const q = query.toLowerCase();
  return SHADER_NODES.filter(
    (n) =>
      n.label.toLowerCase().includes(q) ||
      n.type.toLowerCase().includes(q) ||
      n.category.toLowerCase().includes(q)
  );
}
