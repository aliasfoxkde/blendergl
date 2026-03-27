import type { NodePreset } from "./nodePresets";

export type ShaderPreset = NodePreset;

/**
 * Load a preset into the node graph store.
 * The indices in connections reference the nth node in the nodes array.
 */
export const SHADER_PRESETS: ShaderPreset[] = [
  {
    name: "Default PBR",
    nodes: [
      { type: "color_input", position: { x: 50, y: 50 }, values: { value: [0.8, 0.8, 0.8] } },
      { type: "value_input", position: { x: 50, y: 180 }, values: { value: 0 } },
      { type: "value_input", position: { x: 50, y: 260 }, values: { value: 0.5 } },
      { type: "principled_bsdf", position: { x: 300, y: 100 } },
      { type: "material_output", position: { x: 550, y: 100 } },
    ],
    connections: [
      { sourceNodeId: 0, sourcePortId: "color", targetNodeId: 3, targetPortId: "baseColor" },
      { sourceNodeId: 1, sourcePortId: "value", targetNodeId: 3, targetPortId: "metallic" },
      { sourceNodeId: 2, sourcePortId: "value", targetNodeId: 3, targetPortId: "roughness" },
      { sourceNodeId: 3, sourcePortId: "surface", targetNodeId: 4, targetPortId: "surface" },
    ],
  },
  {
    name: "Gold Metal",
    nodes: [
      { type: "color_input", position: { x: 50, y: 80 }, values: { value: [1.0, 0.76, 0.34] } },
      { type: "value_input", position: { x: 50, y: 200 }, values: { value: 1.0 } },
      { type: "value_input", position: { x: 50, y: 280 }, values: { value: 0.2 } },
      { type: "principled_bsdf", position: { x: 300, y: 100 } },
      { type: "material_output", position: { x: 550, y: 100 } },
    ],
    connections: [
      { sourceNodeId: 0, sourcePortId: "color", targetNodeId: 3, targetPortId: "baseColor" },
      { sourceNodeId: 1, sourcePortId: "value", targetNodeId: 3, targetPortId: "metallic" },
      { sourceNodeId: 2, sourcePortId: "value", targetNodeId: 3, targetPortId: "roughness" },
      { sourceNodeId: 3, sourcePortId: "surface", targetNodeId: 4, targetPortId: "surface" },
    ],
  },
  {
    name: "Plastic Red",
    nodes: [
      { type: "color_input", position: { x: 50, y: 80 }, values: { value: [0.8, 0.05, 0.05] } },
      { type: "value_input", position: { x: 50, y: 200 }, values: { value: 0 } },
      { type: "value_input", position: { x: 50, y: 280 }, values: { value: 0.3 } },
      { type: "principled_bsdf", position: { x: 300, y: 100 } },
      { type: "material_output", position: { x: 550, y: 100 } },
    ],
    connections: [
      { sourceNodeId: 0, sourcePortId: "color", targetNodeId: 3, targetPortId: "baseColor" },
      { sourceNodeId: 1, sourcePortId: "value", targetNodeId: 3, targetPortId: "metallic" },
      { sourceNodeId: 2, sourcePortId: "value", targetNodeId: 3, targetPortId: "roughness" },
      { sourceNodeId: 3, sourcePortId: "surface", targetNodeId: 4, targetPortId: "surface" },
    ],
  },
  {
    name: "Marble",
    nodes: [
      { type: "noise_texture", position: { x: 50, y: 50 }, values: { scale: 5, detail: 4, roughness: 0.5 } },
      { type: "color_input", position: { x: 50, y: 220 }, values: { value: [0.9, 0.85, 0.8] } },
      { type: "value_input", position: { x: 50, y: 320 }, values: { value: 0.05 } },
      { type: "value_input", position: { x: 50, y: 400 }, values: { value: 0.15 } },
      { type: "mix_color", position: { x: 300, y: 120 }, values: { factor: 0.7 } },
      { type: "principled_bsdf", position: { x: 500, y: 150 } },
      { type: "material_output", position: { x: 750, y: 150 } },
    ],
    connections: [
      { sourceNodeId: 0, sourcePortId: "color", targetNodeId: 4, targetPortId: "a" },
      { sourceNodeId: 1, sourcePortId: "color", targetNodeId: 4, targetPortId: "b" },
      { sourceNodeId: 4, sourcePortId: "result", targetNodeId: 5, targetPortId: "baseColor" },
      { sourceNodeId: 2, sourcePortId: "value", targetNodeId: 5, targetPortId: "metallic" },
      { sourceNodeId: 3, sourcePortId: "value", targetNodeId: 5, targetPortId: "roughness" },
      { sourceNodeId: 5, sourcePortId: "surface", targetNodeId: 6, targetPortId: "surface" },
    ],
  },
  {
    name: "Emission Glow",
    nodes: [
      { type: "color_input", position: { x: 50, y: 50 }, values: { value: [0.2, 0.8, 1.0] } },
      { type: "value_input", position: { x: 50, y: 170 }, values: { value: 2.0 } },
      { type: "emission", position: { x: 300, y: 80 } },
      { type: "material_output", position: { x: 550, y: 80 } },
    ],
    connections: [
      { sourceNodeId: 0, sourcePortId: "color", targetNodeId: 2, targetPortId: "color" },
      { sourceNodeId: 1, sourcePortId: "value", targetNodeId: 2, targetPortId: "strength" },
      { sourceNodeId: 2, sourcePortId: "surface", targetNodeId: 3, targetPortId: "surface" },
    ],
  },
  {
    name: "Wood",
    nodes: [
      { type: "noise_texture", position: { x: 50, y: 50 }, values: { scale: 10, detail: 2, roughness: 0.8 } },
      { type: "color_input", position: { x: 50, y: 220 }, values: { value: [0.6, 0.35, 0.15] } },
      { type: "color_input", position: { x: 50, y: 320 }, values: { value: [0.35, 0.2, 0.08] } },
      { type: "mix_color", position: { x: 300, y: 150 }, values: { factor: 0.5 } },
      { type: "value_input", position: { x: 300, y: 320 }, values: { value: 0 } },
      { type: "value_input", position: { x: 300, y: 400 }, values: { value: 0.6 } },
      { type: "principled_bsdf", position: { x: 500, y: 200 } },
      { type: "material_output", position: { x: 750, y: 200 } },
    ],
    connections: [
      { sourceNodeId: 0, sourcePortId: "color", targetNodeId: 3, targetPortId: "factor" },
      { sourceNodeId: 1, sourcePortId: "color", targetNodeId: 3, targetPortId: "a" },
      { sourceNodeId: 2, sourcePortId: "color", targetNodeId: 3, targetPortId: "b" },
      { sourceNodeId: 3, sourcePortId: "result", targetNodeId: 6, targetPortId: "baseColor" },
      { sourceNodeId: 4, sourcePortId: "value", targetNodeId: 6, targetPortId: "metallic" },
      { sourceNodeId: 5, sourcePortId: "value", targetNodeId: 6, targetPortId: "roughness" },
      { sourceNodeId: 6, sourcePortId: "surface", targetNodeId: 7, targetPortId: "surface" },
    ],
  },
];
