import { describe, it, expect, beforeEach } from "vitest";
import { useEditModeStore } from "@/editor/stores/editModeStore";

beforeEach(() => {
  useEditModeStore.setState({
    activeMeshEntityId: null,
    elementMode: "face",
    selectedVertices: new Set(),
    selectedEdges: new Set(),
    selectedFaces: new Set(),
  });
});

describe("editModeStore", () => {
  describe("enterEditMode / exitEditMode", () => {
    it("enters edit mode with entity ID", () => {
      useEditModeStore.getState().enterEditMode("mesh_1");
      expect(useEditModeStore.getState().activeMeshEntityId).toBe("mesh_1");
    });

    it("clears selections on enter", () => {
      useEditModeStore.getState().selectFace(0);
      useEditModeStore.getState().enterEditMode("mesh_1");
      expect(useEditModeStore.getState().selectedFaces.size).toBe(0);
    });

    it("exits edit mode and clears state", () => {
      useEditModeStore.getState().enterEditMode("mesh_1");
      useEditModeStore.getState().selectVertex(0);
      useEditModeStore.getState().exitEditMode();
      expect(useEditModeStore.getState().activeMeshEntityId).toBeNull();
      expect(useEditModeStore.getState().selectedVertices.size).toBe(0);
    });
  });

  describe("element mode", () => {
    it("defaults to face mode", () => {
      expect(useEditModeStore.getState().elementMode).toBe("face");
    });

    it("switches element mode and clears selections", () => {
      useEditModeStore.getState().selectFace(0);
      useEditModeStore.getState().setElementMode("vertex");
      expect(useEditModeStore.getState().elementMode).toBe("vertex");
      expect(useEditModeStore.getState().selectedFaces.size).toBe(0);
    });

    it("switches to edge mode", () => {
      useEditModeStore.getState().setElementMode("edge");
      expect(useEditModeStore.getState().elementMode).toBe("edge");
    });
  });

  describe("vertex selection", () => {
    it("selects a vertex (non-additive clears others)", () => {
      useEditModeStore.getState().selectVertex(0);
      useEditModeStore.getState().selectVertex(1);
      expect(useEditModeStore.getState().selectedVertices.size).toBe(1);
      expect(useEditModeStore.getState().selectedVertices.has(1)).toBe(true);
    });

    it("additively selects vertices", () => {
      useEditModeStore.getState().selectVertex(0);
      useEditModeStore.getState().selectVertex(1, true);
      expect(useEditModeStore.getState().selectedVertices.size).toBe(2);
    });

    it("toggles vertex off on re-select", () => {
      useEditModeStore.getState().selectVertex(0);
      useEditModeStore.getState().selectVertex(0, true);
      expect(useEditModeStore.getState().selectedVertices.size).toBe(0);
    });
  });

  describe("edge selection", () => {
    it("selects an edge with normalized key", () => {
      useEditModeStore.getState().selectEdge(5, 2);
      expect(useEditModeStore.getState().selectedEdges.has("2-5")).toBe(true);
    });

    it("additively selects edges", () => {
      useEditModeStore.getState().selectEdge(0, 1);
      useEditModeStore.getState().selectEdge(2, 3, true);
      expect(useEditModeStore.getState().selectedEdges.size).toBe(2);
    });
  });

  describe("face selection", () => {
    it("selects a face", () => {
      useEditModeStore.getState().selectFace(3);
      expect(useEditModeStore.getState().selectedFaces.has(3)).toBe(true);
    });

    it("toggles face off on re-select", () => {
      useEditModeStore.getState().selectFace(3);
      useEditModeStore.getState().selectFace(3, true);
      expect(useEditModeStore.getState().selectedFaces.size).toBe(0);
    });
  });

  describe("deselectAll", () => {
    it("clears all selections", () => {
      useEditModeStore.getState().selectVertex(0);
      useEditModeStore.getState().selectEdge(1, 2);
      useEditModeStore.getState().selectFace(3);
      useEditModeStore.getState().deselectAll();
      expect(useEditModeStore.getState().selectedVertices.size).toBe(0);
      expect(useEditModeStore.getState().selectedEdges.size).toBe(0);
      expect(useEditModeStore.getState().selectedFaces.size).toBe(0);
    });
  });

  describe("selectAll", () => {
    it("selects all vertices in vertex mode", () => {
      useEditModeStore.getState().setElementMode("vertex");
      useEditModeStore.getState().selectAll(10);
      expect(useEditModeStore.getState().selectedVertices.size).toBe(10);
    });

    it("selects all faces in face mode", () => {
      useEditModeStore.getState().selectAll(0, 5);
      expect(useEditModeStore.getState().selectedFaces.size).toBe(5);
    });
  });
});
