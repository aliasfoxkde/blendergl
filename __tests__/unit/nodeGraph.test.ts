import { describe, it, expect, beforeEach } from "vitest";
import { useNodeGraphStore } from "@/editor/stores/nodeGraphStore";

describe("Node Graph Store", () => {
  beforeEach(() => {
    // Clear all nodes, connections, frames
    const state = useNodeGraphStore.getState();
    for (const id of Object.keys(state.nodes)) {
      useNodeGraphStore.getState().removeNode(id);
    }
    for (const id of Object.keys(state.connections)) {
      useNodeGraphStore.getState().removeConnection(id);
    }
    for (const id of Object.keys(state.frames)) {
      useNodeGraphStore.getState().removeFrame(id);
    }
  });

  it("starts with empty state", () => {
    const state = useNodeGraphStore.getState();
    expect(Object.keys(state.nodes)).toHaveLength(0);
    expect(Object.keys(state.connections)).toHaveLength(0);
    expect(Object.keys(state.frames)).toHaveLength(0);
    expect(state.graphType).toBe("shader");
  });

  it("adds a node", () => {
    const { addNode } = useNodeGraphStore.getState();
    const id = addNode("value_input", { x: 100, y: 200 });

    expect(id).toBeTruthy();
    expect(useNodeGraphStore.getState().nodes[id!]).toBeDefined();
    expect(useNodeGraphStore.getState().nodes[id!].type).toBe("value_input");
    expect(useNodeGraphStore.getState().nodes[id!].position.x).toBe(100);
    expect(useNodeGraphStore.getState().nodes[id!].position.y).toBe(200);
  });

  it("returns null for unknown node type", () => {
    const { addNode } = useNodeGraphStore.getState();
    const id = addNode("nonexistent_type", { x: 0, y: 0 });
    expect(id).toBeNull();
  });

  it("removes a node", () => {
    const { addNode, removeNode } = useNodeGraphStore.getState();
    const id = addNode("value_input", { x: 0, y: 0 })!;
    removeNode(id);

    expect(Object.keys(useNodeGraphStore.getState().nodes)).toHaveLength(0);
  });

  it("removing a node also removes its connections", () => {
    const { addNode, removeNode, addConnection } = useNodeGraphStore.getState();
    const a = addNode("value_input", { x: 0, y: 0 })!;
    const b = addNode("math_add", { x: 100, y: 0 })!;
    addConnection(a, "value", b, "a");

    removeNode(a);

    expect(Object.keys(useNodeGraphStore.getState().nodes)).toHaveLength(1);
    expect(Object.keys(useNodeGraphStore.getState().connections)).toHaveLength(0);
  });

  it("moves a node", () => {
    const { addNode, moveNode } = useNodeGraphStore.getState();
    const id = addNode("value_input", { x: 0, y: 0 })!;
    moveNode(id, { x: 50, y: 75 });

    expect(useNodeGraphStore.getState().nodes[id].position.x).toBe(50);
    expect(useNodeGraphStore.getState().nodes[id].position.y).toBe(75);
  });

  it("adds a connection", () => {
    const { addNode, addConnection } = useNodeGraphStore.getState();
    const a = addNode("value_input", { x: 0, y: 0 })!;
    const b = addNode("math_add", { x: 100, y: 0 })!;

    const connId = addConnection(a, "value", b, "a");

    expect(connId).toBeTruthy();
    expect(Object.keys(useNodeGraphStore.getState().connections)).toHaveLength(1);
  });

  it("removes a connection", () => {
    const { addNode, addConnection, removeConnection } = useNodeGraphStore.getState();
    const a = addNode("value_input", { x: 0, y: 0 })!;
    const b = addNode("math_add", { x: 100, y: 0 })!;
    const connId = addConnection(a, "value", b, "a")!;

    removeConnection(connId);
    expect(Object.keys(useNodeGraphStore.getState().connections)).toHaveLength(0);
  });

  it("sets graph type via deserialize", () => {
    const { deserialize } = useNodeGraphStore.getState();
    deserialize({
      graphType: "compositing",
      nodes: {},
      connections: {},
    });
    expect(useNodeGraphStore.getState().graphType).toBe("compositing");
  });

  it("adds a frame", () => {
    const { addFrame } = useNodeGraphStore.getState();
    const frameId = addFrame("My Frame", { x: 0, y: 0 }, { width: 300, height: 200 });

    expect(frameId).toBeTruthy();
    expect(Object.keys(useNodeGraphStore.getState().frames)).toHaveLength(1);
  });

  it("removes a frame", () => {
    const { addFrame, removeFrame } = useNodeGraphStore.getState();
    const frameId = addFrame("Frame", { x: 0, y: 0 })!;
    removeFrame(frameId);

    expect(Object.keys(useNodeGraphStore.getState().frames)).toHaveLength(0);
  });

  it("sets node value", () => {
    const { addNode, setNodeValue } = useNodeGraphStore.getState();
    const id = addNode("value_input", { x: 0, y: 0 })!;
    setNodeValue(id, "value", 42);

    expect(useNodeGraphStore.getState().nodes[id].values["value"]).toBe(42);
  });

  it("clipboard copy and paste", () => {
    const { addNode, selectNode, copySelected, pasteNodes } = useNodeGraphStore.getState();
    const a = addNode("value_input", { x: 10, y: 20 })!;
    const b = addNode("math_add", { x: 50, y: 60 })!;

    selectNode(a);
    selectNode(b, true); // addToSelection
    copySelected();
    pasteNodes({ x: 200, y: 200 });

    expect(Object.keys(useNodeGraphStore.getState().nodes)).toHaveLength(4);
  });

  it("adds color_input node", () => {
    const { addNode } = useNodeGraphStore.getState();
    const id = addNode("color_input", { x: 0, y: 0 })!;
    expect(useNodeGraphStore.getState().nodes[id].type).toBe("color_input");
  });

  it("adds math_multiply node", () => {
    const { addNode } = useNodeGraphStore.getState();
    const id = addNode("math_multiply", { x: 0, y: 0 })!;
    expect(useNodeGraphStore.getState().nodes[id].type).toBe("math_multiply");
  });
});
