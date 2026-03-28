/**
 * Node Graph store (Zustand + Immer).
 *
 * Manages the graph state: nodes, connections, selection, viewport.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { GraphNode, GraphConnection, NodeGraphType, GraphData } from "@/editor/types/nodeEditor";
import { getNodeTypeDefinition } from "@/editor/utils/nodeEditor/nodeRegistry";
import { arePortsCompatible, getDefaultValues, getExistingConnectionForInput } from "@/editor/utils/nodeEditor/nodeGraphUtils";

interface NodeGraphState {
  graphType: NodeGraphType;
  nodes: Record<string, GraphNode>;
  connections: Record<string, GraphConnection>;
  selectedNodeIds: string[];
  selectedConnectionIds: string[];
  viewOffset: { x: number; y: number };
  viewZoom: number;
  entityId: string | null; // which entity this graph belongs to
  clipboard: { nodes: Record<string, GraphNode>; connections: Record<string, GraphConnection> } | null;

  // Frame nodes
  frames: Record<string, { id: string; label: string; position: { x: number; y: number }; size: { width: number; height: number }; color: string }>;

  addNode: (type: string, position: { x: number; y: number }) => string | null;
  removeNode: (id: string) => void;
  moveNode: (id: string, position: { x: number; y: number }) => void;
  setNodeValue: (nodeId: string, portId: string, value: number | string | number[]) => void;
  addConnection: (sourceNodeId: string, sourcePortId: string, targetNodeId: string, targetPortId: string) => string | null;
  removeConnection: (id: string) => void;
  disconnectInput: (nodeId: string, portId: string) => void;
  selectNode: (id: string, addToSelection?: boolean) => void;
  selectConnection: (id: string, addToSelection?: boolean) => void;
  deselectAll: () => void;
  deleteSelected: () => void;
  setViewOffset: (offset: { x: number; y: number }) => void;
  setViewZoom: (zoom: number) => void;
  clear: () => void;
  setEntityId: (id: string | null) => void;
  serialize: () => GraphData;
  deserialize: (data: GraphData) => void;
  hasChanges: () => boolean;
  getNodeCount: () => number;
  copySelected: () => void;
  pasteNodes: (offset?: { x: number; y: number }) => void;
  duplicateSelected: () => void;
  selectAll: () => void;

  // Frame node actions
  addFrame: (label: string, position: { x: number; y: number }, size?: { width: number; height: number }) => string;
  removeFrame: (id: string) => void;
  resizeFrame: (id: string, size: { width: number; height: number }) => void;
  moveFrame: (id: string, position: { x: number; y: number }) => void;
}

export const useNodeGraphStore = create<NodeGraphState>()(
  immer((set, get) => ({
    graphType: "shader",
    nodes: {},
    connections: {},
    selectedNodeIds: [],
    selectedConnectionIds: [],
    viewOffset: { x: 0, y: 0 },
    viewZoom: 1,
    entityId: null,
    clipboard: null,
    frames: {},

    addNode: (type, position) => {
      const def = getNodeTypeDefinition(type);
      if (!def) return null;
      const id = crypto.randomUUID();
      set((state) => {
        state.nodes[id] = {
          id,
          type,
          position: { ...position },
          values: getDefaultValues(type),
        };
      });
      return id;
    },

    removeNode: (id) => {
      set((state) => {
        delete state.nodes[id];
        // Remove all connections involving this node
        for (const connId of Object.keys(state.connections)) {
          const conn = state.connections[connId];
          if (conn.sourceNodeId === id || conn.targetNodeId === id) {
            delete state.connections[connId];
          }
        }
        state.selectedNodeIds = state.selectedNodeIds.filter((n) => n !== id);
      });
    },

    moveNode: (id, position) => {
      set((state) => {
        const node = state.nodes[id];
        if (node) {
          node.position = { ...position };
        }
      });
    },

    setNodeValue: (nodeId, portId, value) => {
      set((state) => {
        const node = state.nodes[nodeId];
        if (node) {
          node.values[portId] = value;
        }
      });
    },

    addConnection: (sourceNodeId, sourcePortId, targetNodeId, targetPortId) => {
      const state = get();
      const sourceNode = state.nodes[sourceNodeId];
      const targetNode = state.nodes[targetNodeId];
      if (!sourceNode || !targetNode) return null;

      // Get port data types
      const sourceDef = getNodeTypeDefinition(sourceNode.type);
      const targetDef = getNodeTypeDefinition(targetNode.type);
      if (!sourceDef || !targetDef) return null;

      const sourcePort = sourceDef.outputs.find((p) => p.id === sourcePortId);
      const targetPort = targetDef.inputs.find((p) => p.id === targetPortId);
      if (!sourcePort || !targetPort) return null;

      // Check type compatibility
      if (!arePortsCompatible(sourcePort.dataType, targetPort.dataType)) return null;

      // Prevent self-connection
      if (sourceNodeId === targetNodeId) return null;

      // Prevent duplicate
      const existing = Object.values(state.connections).find(
        (c) =>
          c.sourceNodeId === sourceNodeId &&
          c.sourcePortId === sourcePortId &&
          c.targetNodeId === targetNodeId &&
          c.targetPortId === targetPortId
      );
      if (existing) return null;

      // Remove existing connection to this input (one input = one connection)
      const existingInput = getExistingConnectionForInput(targetNodeId, targetPortId, state.connections);

      const connId = crypto.randomUUID();
      set((s) => {
        if (existingInput) {
          delete s.connections[existingInput.id];
        }
        s.connections[connId] = {
          id: connId,
          sourceNodeId,
          sourcePortId,
          targetNodeId,
          targetPortId,
        };
      });
      return connId;
    },

    removeConnection: (id) => {
      set((state) => {
        delete state.connections[id];
        state.selectedConnectionIds = state.selectedConnectionIds.filter((c) => c !== id);
      });
    },

    disconnectInput: (nodeId, portId) => {
      set((state) => {
        for (const connId of Object.keys(state.connections)) {
          const conn = state.connections[connId];
          if (conn.targetNodeId === nodeId && conn.targetPortId === portId) {
            delete state.connections[connId];
            break;
          }
        }
      });
    },

    selectNode: (id, addToSelection = false) => {
      set((state) => {
        if (addToSelection) {
          if (!state.selectedNodeIds.includes(id)) {
            state.selectedNodeIds.push(id);
          }
        } else {
          state.selectedNodeIds = [id];
          state.selectedConnectionIds = [];
        }
      });
    },

    selectConnection: (id, addToSelection = false) => {
      set((state) => {
        if (addToSelection) {
          if (!state.selectedConnectionIds.includes(id)) {
            state.selectedConnectionIds.push(id);
          }
        } else {
          state.selectedConnectionIds = [id];
          state.selectedNodeIds = [];
        }
      });
    },

    deselectAll: () => {
      set((state) => {
        state.selectedNodeIds = [];
        state.selectedConnectionIds = [];
      });
    },

    deleteSelected: () => {
      set((state) => {
        for (const id of state.selectedNodeIds) {
          delete state.nodes[id];
          for (const connId of Object.keys(state.connections)) {
            const conn = state.connections[connId];
            if (conn.sourceNodeId === id || conn.targetNodeId === id) {
              delete state.connections[connId];
            }
          }
        }
        for (const id of state.selectedConnectionIds) {
          delete state.connections[id];
        }
        state.selectedNodeIds = [];
        state.selectedConnectionIds = [];
      });
    },

    setViewOffset: (offset) => {
      set((state) => {
        state.viewOffset = { ...offset };
      });
    },

    setViewZoom: (zoom) => {
      set((state) => {
        state.viewZoom = Math.max(0.1, Math.min(3, zoom));
      });
    },

    clear: () => {
      set((state) => {
        state.nodes = {};
        state.connections = {};
        state.selectedNodeIds = [];
        state.selectedConnectionIds = [];
      });
    },

    setEntityId: (id) => {
      set((state) => {
        state.entityId = id;
      });
    },

    serialize: () => {
      const state = get();
      return {
        graphType: state.graphType,
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        connections: JSON.parse(JSON.stringify(state.connections)),
      };
    },

    deserialize: (data) => {
      set((state) => {
        state.graphType = data.graphType;
        state.nodes = JSON.parse(JSON.stringify(data.nodes));
        state.connections = JSON.parse(JSON.stringify(data.connections));
        state.selectedNodeIds = [];
        state.selectedConnectionIds = [];
      });
    },

    hasChanges: () => {
      const state = get();
      return Object.keys(state.nodes).length > 0;
    },

    getNodeCount: () => {
      return Object.keys(get().nodes).length;
    },

    copySelected: () => {
      const state = get();
      if (state.selectedNodeIds.length === 0) return;
      const selectedSet = new Set(state.selectedNodeIds);
      const nodes: Record<string, GraphNode> = {};
      const connections: Record<string, GraphConnection> = {};
      for (const id of state.selectedNodeIds) {
        const node = state.nodes[id];
        if (node) nodes[id] = JSON.parse(JSON.stringify(node));
      }
      // Copy connections between selected nodes
      for (const [connId, conn] of Object.entries(state.connections)) {
        if (selectedSet.has(conn.sourceNodeId) && selectedSet.has(conn.targetNodeId)) {
          connections[connId] = JSON.parse(JSON.stringify(conn));
        }
      }
      set((s) => { s.clipboard = { nodes, connections }; });
    },

    pasteNodes: (offset) => {
      const state = get();
      if (!state.clipboard) return;
      const pasteOffset = offset ?? { x: 30, y: 30 };
      const idMap = new Map<string, string>(); // old id → new id
      const newIds: string[] = [];
      const newNodes: Record<string, typeof state.clipboard.nodes[string]> = {};
      const newConnections: Record<string, typeof state.clipboard.connections[string]> = {};

      for (const [oldId, node] of Object.entries(state.clipboard.nodes)) {
        const newId = crypto.randomUUID();
        idMap.set(oldId, newId);
        newNodes[newId] = {
          id: newId,
          type: node.type,
          position: { x: node.position.x + pasteOffset.x, y: node.position.y + pasteOffset.y },
          values: JSON.parse(JSON.stringify(node.values)),
        };
        newIds.push(newId);
      }

      for (const conn of Object.values(state.clipboard.connections)) {
        const newSrcId = idMap.get(conn.sourceNodeId);
        const newTgtId = idMap.get(conn.targetNodeId);
        if (newSrcId && newTgtId) {
          const connId = crypto.randomUUID();
          newConnections[connId] = {
            id: connId,
            sourceNodeId: newSrcId,
            sourcePortId: conn.sourcePortId,
            targetNodeId: newTgtId,
            targetPortId: conn.targetPortId,
          };
        }
      }

      // Batch all changes in a single set call
      set((s) => {
        Object.assign(s.nodes, newNodes);
        Object.assign(s.connections, newConnections);
        s.selectedNodeIds = newIds;
        s.selectedConnectionIds = [];
      });
    },

    duplicateSelected: () => {
      const state = get();
      if (state.selectedNodeIds.length === 0) return;
      state.copySelected();
      state.pasteNodes();
    },

    selectAll: () => {
      set((state) => {
        state.selectedNodeIds = Object.keys(state.nodes);
        state.selectedConnectionIds = Object.keys(state.connections);
      });
    },

    // Frame node actions
    addFrame: (label, position, size) => {
      const id = crypto.randomUUID();
      const colors = ["#334155", "#3b2f2f", "#2f3b2f", "#2f2f3b", "#3b3b2f"];
      const color = colors[Math.floor(Math.random() * colors.length)];
      set((state) => {
        state.frames[id] = {
          id,
          label,
          position: { ...position },
          size: size ?? { width: 400, height: 300 },
          color,
        };
      });
      return id;
    },

    removeFrame: (id) => {
      set((state) => { delete state.frames[id]; });
    },

    resizeFrame: (id, size) => {
      set((state) => {
        const frame = state.frames[id];
        if (frame) frame.size = { ...size };
      });
    },

    moveFrame: (id, position) => {
      set((state) => {
        const frame = state.frames[id];
        if (frame) frame.position = { ...position };
      });
    },
  }))
);
