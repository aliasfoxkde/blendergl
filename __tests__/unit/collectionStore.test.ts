import { describe, it, expect, beforeEach } from "vitest";
import { useCollectionStore } from "@/editor/stores/collectionStore";

beforeEach(() => {
  useCollectionStore.setState({
    collections: {},
    collectionOrder: [],
    activeCollectionId: null,
  });
});

describe("collectionStore", () => {
  describe("createCollection / removeCollection", () => {
    it("creates a collection with defaults", () => {
      const id = useCollectionStore.getState().createCollection("Lights");
      const col = useCollectionStore.getState().collections[id];
      expect(col.name).toBe("Lights");
      expect(col.entityIds).toEqual([]);
      expect(col.visible).toBe(true);
      expect(col.locked).toBe(false);
    });

    it("sets the new collection as active", () => {
      const id = useCollectionStore.getState().createCollection("Test");
      expect(useCollectionStore.getState().activeCollectionId).toBe(id);
    });

    it("adds to collectionOrder", () => {
      useCollectionStore.getState().createCollection("A");
      useCollectionStore.getState().createCollection("B");
      expect(useCollectionStore.getState().collectionOrder.length).toBe(2);
    });

    it("removes a collection", () => {
      const id = useCollectionStore.getState().createCollection("Test");
      useCollectionStore.getState().removeCollection(id);
      expect(useCollectionStore.getState().collections[id]).toBeUndefined();
      expect(useCollectionStore.getState().collectionOrder).not.toContain(id);
    });

    it("sets active to last collection on remove", () => {
      const a = useCollectionStore.getState().createCollection("A");
      const b = useCollectionStore.getState().createCollection("B");
      useCollectionStore.getState().removeCollection(b);
      expect(useCollectionStore.getState().activeCollectionId).toBe(a);
    });

    it("sets active to null when last collection removed", () => {
      const id = useCollectionStore.getState().createCollection("Only");
      useCollectionStore.getState().removeCollection(id);
      expect(useCollectionStore.getState().activeCollectionId).toBeNull();
    });
  });

  describe("renameCollection", () => {
    it("renames a collection", () => {
      const id = useCollectionStore.getState().createCollection("Old");
      useCollectionStore.getState().renameCollection(id, "New");
      expect(useCollectionStore.getState().collections[id].name).toBe("New");
    });
  });

  describe("entity management", () => {
    it("adds entity to collection", () => {
      const id = useCollectionStore.getState().createCollection("Col");
      useCollectionStore.getState().addEntityToCollection("e1", id);
      expect(useCollectionStore.getState().collections[id].entityIds).toContain("e1");
    });

    it("does not add duplicate entity", () => {
      const id = useCollectionStore.getState().createCollection("Col");
      useCollectionStore.getState().addEntityToCollection("e1", id);
      useCollectionStore.getState().addEntityToCollection("e1", id);
      expect(useCollectionStore.getState().collections[id].entityIds.length).toBe(1);
    });

    it("removes entity from collection", () => {
      const id = useCollectionStore.getState().createCollection("Col");
      useCollectionStore.getState().addEntityToCollection("e1", id);
      useCollectionStore.getState().removeEntityFromCollection("e1", id);
      expect(useCollectionStore.getState().collections[id].entityIds).not.toContain("e1");
    });

    it("moves entity between collections", () => {
      const a = useCollectionStore.getState().createCollection("A");
      const b = useCollectionStore.getState().createCollection("B");
      useCollectionStore.getState().addEntityToCollection("e1", a);
      useCollectionStore.getState().moveEntityToCollection("e1", a, b);
      expect(useCollectionStore.getState().collections[a].entityIds).not.toContain("e1");
      expect(useCollectionStore.getState().collections[b].entityIds).toContain("e1");
    });
  });

  describe("visibility / lock / color", () => {
    it("sets visibility", () => {
      const id = useCollectionStore.getState().createCollection("Col");
      useCollectionStore.getState().setCollectionVisibility(id, false);
      expect(useCollectionStore.getState().collections[id].visible).toBe(false);
    });

    it("toggles visibility", () => {
      const id = useCollectionStore.getState().createCollection("Col");
      useCollectionStore.getState().toggleCollectionVisibility(id);
      expect(useCollectionStore.getState().collections[id].visible).toBe(false);
      useCollectionStore.getState().toggleCollectionVisibility(id);
      expect(useCollectionStore.getState().collections[id].visible).toBe(true);
    });

    it("sets locked", () => {
      const id = useCollectionStore.getState().createCollection("Col");
      useCollectionStore.getState().setCollectionLocked(id, true);
      expect(useCollectionStore.getState().collections[id].locked).toBe(true);
    });

    it("sets color", () => {
      const id = useCollectionStore.getState().createCollection("Col");
      useCollectionStore.getState().setCollectionColor(id, "#ff0000");
      expect(useCollectionStore.getState().collections[id].color).toBe("#ff0000");
    });
  });

  describe("queries", () => {
    it("gets entities in collection", () => {
      const id = useCollectionStore.getState().createCollection("Col");
      useCollectionStore.getState().addEntityToCollection("e1", id);
      useCollectionStore.getState().addEntityToCollection("e2", id);
      expect(useCollectionStore.getState().getEntitiesInCollection(id)).toEqual(["e1", "e2"]);
    });

    it("gets collection for entity", () => {
      const id = useCollectionStore.getState().createCollection("Col");
      useCollectionStore.getState().addEntityToCollection("e1", id);
      expect(useCollectionStore.getState().getCollectionForEntity("e1")).toBe(id);
      expect(useCollectionStore.getState().getCollectionForEntity("missing")).toBeNull();
    });
  });

  describe("reorder", () => {
    it("moves collection up", () => {
      const a = useCollectionStore.getState().createCollection("A");
      const b = useCollectionStore.getState().createCollection("B");
      expect(useCollectionStore.getState().collectionOrder).toEqual([a, b]);
      useCollectionStore.getState().moveCollectionUp(a);
      expect(useCollectionStore.getState().collectionOrder).toEqual([b, a]);
    });

    it("moves collection down", () => {
      const a = useCollectionStore.getState().createCollection("A");
      const b = useCollectionStore.getState().createCollection("B");
      useCollectionStore.getState().moveCollectionDown(b);
      expect(useCollectionStore.getState().collectionOrder).toEqual([b, a]);
    });
  });
});
