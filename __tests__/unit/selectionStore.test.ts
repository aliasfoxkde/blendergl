import { describe, it, expect, beforeEach } from "vitest";
import { useSelectionStore } from "@/editor/stores/selectionStore";

beforeEach(() => {
  useSelectionStore.setState({
    selectedIds: [],
    activeEntityId: null,
    editorMode: "object",
    selectionMode: "object",
    transformMode: "translate",
    transformSpace: "world",
    hoveredEntityId: null,
  });
});

describe("selectionStore", () => {
  describe("select / deselect", () => {
    it("selects a single entity (non-additive)", () => {
      useSelectionStore.getState().select("a");
      useSelectionStore.getState().select("b");
      expect(useSelectionStore.getState().selectedIds).toEqual(["b"]);
    });

    it("selects additively", () => {
      useSelectionStore.getState().select("a");
      useSelectionStore.getState().select("b", true);
      expect(useSelectionStore.getState().selectedIds).toEqual(["a", "b"]);
    });

    it("sets active entity on select", () => {
      useSelectionStore.getState().select("x");
      expect(useSelectionStore.getState().activeEntityId).toBe("x");
    });

    it("does not add duplicate", () => {
      useSelectionStore.getState().select("a", true);
      useSelectionStore.getState().select("a", true);
      expect(useSelectionStore.getState().selectedIds).toEqual(["a"]);
    });

    it("deselects an entity", () => {
      useSelectionStore.getState().select("a", true);
      useSelectionStore.getState().select("b", true);
      useSelectionStore.getState().deselect("a");
      expect(useSelectionStore.getState().selectedIds).toEqual(["b"]);
    });

    it("updates active entity when deselected", () => {
      useSelectionStore.getState().select("a");
      useSelectionStore.getState().deselect("a");
      expect(useSelectionStore.getState().activeEntityId).toBeNull();
    });
  });

  describe("deselectAll / selectAll", () => {
    it("deselects all and clears active", () => {
      useSelectionStore.getState().select("a");
      useSelectionStore.getState().select("b", true);
      useSelectionStore.getState().deselectAll();
      expect(useSelectionStore.getState().selectedIds).toEqual([]);
      expect(useSelectionStore.getState().activeEntityId).toBeNull();
    });

    it("selects all from list", () => {
      useSelectionStore.getState().selectAll(["x", "y", "z"]);
      expect(useSelectionStore.getState().selectedIds).toEqual(["x", "y", "z"]);
    });
  });

  describe("mode management", () => {
    it("sets editor mode and resets selection mode for object", () => {
      useSelectionStore.getState().setEditorMode("edit");
      expect(useSelectionStore.getState().editorMode).toBe("edit");
    });

    it("resets selection mode when entering object mode", () => {
      useSelectionStore.getState().setSelectionMode("vertex");
      useSelectionStore.getState().setEditorMode("object");
      expect(useSelectionStore.getState().selectionMode).toBe("object");
    });

    it("sets transform mode", () => {
      useSelectionStore.getState().setTransformMode("rotate");
      expect(useSelectionStore.getState().transformMode).toBe("rotate");
    });

    it("sets transform space", () => {
      useSelectionStore.getState().setTransformSpace("local");
      expect(useSelectionStore.getState().transformSpace).toBe("local");
    });
  });

  describe("hover", () => {
    it("sets hovered entity", () => {
      useSelectionStore.getState().setHoveredEntity("hovered");
      expect(useSelectionStore.getState().hoveredEntityId).toBe("hovered");
    });

    it("clears hovered entity", () => {
      useSelectionStore.getState().setHoveredEntity("hovered");
      useSelectionStore.getState().setHoveredEntity(null);
      expect(useSelectionStore.getState().hoveredEntityId).toBeNull();
    });
  });
});
