/**
 * Node graph commands for undo/redo support.
 *
 * Provides AddNodeCommand, RemoveNodeCommand, MoveNodeCommand,
 * AddConnectionCommand, RemoveConnectionCommand, and NodeGraphSnapshotCommand.
 */

import type { Command } from "@/editor/utils/undoRedo";
import type { GraphNode, GraphConnection, NodeGraphType } from "@/editor/types/nodeEditor";

interface GraphSnapshot {
  nodes: Record<string, GraphNode>;
  connections: Record<string, GraphConnection>;
  graphType: NodeGraphType;
}

// Add node command
export class AddNodeCommand implements Command {
  id: string;
  description: string;
  private removeFn: () => void;

  constructor(_nodeId: string, _nodeData: GraphNode, removeFn: () => void) {
    this.id = `add_node_${Date.now()}`;
    this.description = `Add node ${_nodeData.type}`;
    this.removeFn = removeFn;
  }

  execute(): void {
    // Node already added before command creation
  }

  undo(): void {
    this.removeFn();
  }
}

// Remove node command
export class RemoveNodeCommand implements Command {
  id: string;
  description: string;
  private addFn: (nodeId: string, nodeData: GraphNode, position: { x: number; y: number }) => void;

  constructor(description: string, addFn: (nodeId: string, nodeData: GraphNode, position: { x: number; y: number }) => void) {
    this.id = `remove_node_${Date.now()}`;
    this.description = description;
    this.addFn = addFn;
  }

  execute(): void {
    // Node already removed before command creation
  }

  undo(): void {
    this.addFn(this.id, {} as GraphNode, { x: 0, y: 0 });
  }
}

// Add connection command
export class AddConnectionCommand implements Command {
  id: string;
  description: string;
  private removeFn: () => void;

  constructor(_connId: string, removeFn: () => void) {
    this.id = `add_conn_${Date.now()}`;
    this.description = "Add connection";
    this.removeFn = removeFn;
  }

  execute(): void {
    // Connection already added before command creation
  }

  undo(): void {
    this.removeFn();
  }
}

// Node graph snapshot command (captures full state for batch operations)
export class NodeGraphSnapshotCommand implements Command {
  id: string;
  description: string;
  private beforeSnapshot: GraphSnapshot;
  private afterSnapshot: GraphSnapshot | null;
  private restoreFn: (snapshot: GraphSnapshot) => void;

  constructor(
    description: string,
    beforeSnapshot: GraphSnapshot,
    restoreFn: (snapshot: GraphSnapshot) => void
  ) {
    this.id = `node_snapshot_${Date.now()}`;
    this.description = description;
    this.beforeSnapshot = JSON.parse(JSON.stringify(beforeSnapshot));
    this.afterSnapshot = null;
    this.restoreFn = restoreFn;
  }

  execute(): void {
    if (this.afterSnapshot) {
      this.restoreFn(this.afterSnapshot);
    }
  }

  setAfterState(afterSnapshot: GraphSnapshot): void {
    this.afterSnapshot = JSON.parse(JSON.stringify(afterSnapshot));
  }

  undo(): void {
    this.restoreFn(this.beforeSnapshot);
  }
}

// Node group command (collapse/expand subgraph)
export class NodeGroupCommand implements Command {
  id: string;
  description: string;
  private beforeSnapshot: GraphSnapshot;
  private afterSnapshot: GraphSnapshot | null;
  private restoreFn: (snapshot: GraphSnapshot) => void;

  constructor(
    description: string,
    beforeSnapshot: GraphSnapshot,
    restoreFn: (snapshot: GraphSnapshot) => void
  ) {
    this.id = `node_group_${Date.now()}`;
    this.description = description;
    this.beforeSnapshot = JSON.parse(JSON.stringify(beforeSnapshot));
    this.afterSnapshot = null;
    this.restoreFn = restoreFn;
  }

  execute(): void {
    if (this.afterSnapshot) {
      this.restoreFn(this.afterSnapshot);
    }
  }

  setAfterState(afterSnapshot: GraphSnapshot): void {
    this.afterSnapshot = JSON.parse(JSON.stringify(afterSnapshot));
  }

  undo(): void {
    this.restoreFn(this.beforeSnapshot);
  }
}
