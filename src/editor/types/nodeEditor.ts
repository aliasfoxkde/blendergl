/**
 * Node Editor types for the visual graph system.
 *
 * Provides type definitions for node graphs, node instances,
 * connections, ports, and the node type registry.
 */

// ---- Port types ----

export type PortDataType =
  | "float"
  | "vec2"
  | "vec3"
  | "vec4"
  | "color"
  | "texture"
  | "boolean"
  | "any";

export interface PortDefinition {
  id: string;
  name: string;
  dataType: PortDataType;
  defaultValue: number | string | number[];
}

// ---- Node type definitions (registry) ----

export interface NodeTypeDefinition {
  type: string;
  category: string;
  label: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
}

// ---- Runtime graph instances ----

export interface GraphNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  values: Record<string, number | string | number[]>;
}

export interface GraphConnection {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

export type NodeGraphType = "shader" | "compositing" | "geometry" | "logic";

// ---- Serialized graph data ----

export interface GraphData {
  graphType: NodeGraphType;
  nodes: Record<string, GraphNode>;
  connections: Record<string, GraphConnection>;
}

// ---- Port color map ----

export const PORT_COLORS: Record<PortDataType, string> = {
  float: "#a0a0a0",
  vec2: "#c080e0",
  vec3: "#8060e0",
  vec4: "#6040c0",
  color: "#e0a040",
  texture: "#40c060",
  boolean: "#e06060",
  any: "#808080",
};

// ---- Category color map ----

export const CATEGORY_COLORS: Record<string, string> = {
  output: "#404040",
  shader: "#c06040",
  input: "#4080c0",
  math: "#60a040",
  vector: "#8060e0",
  color: "#e0a040",
  texture: "#40c060",
};
