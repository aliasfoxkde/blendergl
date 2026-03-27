/**
 * Graph utility functions for the node editor.
 *
 * Topological sort, port type checking, serialization helpers.
 */

import type { PortDataType, GraphConnection, GraphNode } from "@/editor/types/nodeEditor";
import { getNodeTypeDefinition } from "./nodeRegistry";

// ---- Port compatibility ----

export function arePortsCompatible(outputType: PortDataType, inputType: PortDataType): boolean {
  if (inputType === "any") return true;
  if (outputType === "any") return true;
  return outputType === inputType;
}

// ---- Topological sort (BFS from output nodes) ----

export function topologicalSort(nodes: Record<string, GraphNode>, connections: Record<string, GraphConnection>): string[] {
  // Find output nodes (no outgoing connections to other nodes)
  const nodeIds = Object.keys(nodes);
  const hasInputs = new Set<string>();

  for (const conn of Object.values(connections)) {
    hasInputs.add(conn.targetNodeId);
  }

  // Start from nodes that have no inputs (source nodes)
  const visited = new Set<string>();
  const result: string[] = [];

  // Build adjacency: node → nodes it feeds into
  const downstream = new Map<string, Set<string>>();
  for (const id of nodeIds) {
    downstream.set(id, new Set());
  }
  for (const conn of Object.values(connections)) {
    downstream.get(conn.sourceNodeId)?.add(conn.targetNodeId);
  }

  // BFS from output nodes, reversing the graph
  // We want to process inputs before outputs, so we reverse
  const inDegree = new Map<string, number>();
  for (const id of nodeIds) {
    inDegree.set(id, 0);
  }
  for (const conn of Object.values(connections)) {
    inDegree.set(conn.targetNodeId, (inDegree.get(conn.targetNodeId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const id of nodeIds) {
    if (inDegree.get(id) === 0) {
      queue.push(id);
    }
  }

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    result.push(id);

    for (const conn of Object.values(connections)) {
      if (conn.sourceNodeId === id) {
        const newDeg = (inDegree.get(conn.targetNodeId) ?? 1) - 1;
        inDegree.set(conn.targetNodeId, newDeg);
        if (newDeg === 0) {
          queue.push(conn.targetNodeId);
        }
      }
    }
  }

  return result;
}

// ---- Get input connections for a node ----

export function getInputConnections(
  nodeId: string,
  connections: Record<string, GraphConnection>
): GraphConnection[] {
  return Object.values(connections).filter((c) => c.targetNodeId === nodeId);
}

// ---- Get output connections for a node ----

export function getOutputConnections(
  nodeId: string,
  connections: Record<string, GraphConnection>
): GraphConnection[] {
  return Object.values(connections).filter((c) => c.sourceNodeId === nodeId);
}

// ---- Check if a port is already connected ----

export function getExistingConnectionForInput(
  nodeId: string,
  portId: string,
  connections: Record<string, GraphConnection>
): GraphConnection | undefined {
  return Object.values(connections).find(
    (c) => c.targetNodeId === nodeId && c.targetPortId === portId
  );
}

// ---- Get default values for a node type ----

export function getDefaultValues(type: string): Record<string, number | string | number[]> {
  const def = getNodeTypeDefinition(type);
  if (!def) return {};
  const values: Record<string, number | string | number[]> = {};
  for (const inp of def.inputs) {
    values[inp.id] = inp.defaultValue;
  }
  return values;
}

// ---- Bezier curve path for connections ----

export function getConnectionPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): string {
  const dx = Math.abs(x2 - x1);
  const cpOffset = Math.max(dx * 0.5, 50);
  return `M ${x1} ${y1} C ${x1 + cpOffset} ${y1}, ${x2 - cpOffset} ${y2}, ${x2} ${y2}`;
}
