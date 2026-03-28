import { describe, it, expect, beforeEach } from "vitest";
import { createPrimitiveEntity, PRIMITIVE_TYPES } from "@/editor/utils/primitives";

describe("primitives", () => {
  describe("PRIMITIVE_TYPES", () => {
    it("contains all 6 primitive types", () => {
      expect(PRIMITIVE_TYPES).toEqual(["cube", "sphere", "plane", "cylinder", "cone", "torus"]);
    });
  });

  describe("createPrimitiveEntity", () => {
    it("creates a cube entity with defaults", () => {
      const entity = createPrimitiveEntity("cube");
      expect(entity.id).toBeTruthy();
      expect(entity.name).toMatch(/^Cube/);
      expect(entity.parentId).toBeNull();
      expect(entity.childrenIds).toEqual([]);
      expect(entity.visible).toBe(true);
      expect(entity.locked).toBe(false);
      expect(entity.components.mesh).toBeDefined();
      expect(entity.components.mesh?.geometryType).toBe("cube");
      expect(entity.transform.position).toEqual({ x: 0, y: 0, z: 0 });
    });

    it("creates each primitive type with correct base name", () => {
      // Use a unique type that hasn't been used yet to avoid counter effects
      for (const type of PRIMITIVE_TYPES) {
        const entity = createPrimitiveEntity(type);
        const capitalName = type.charAt(0).toUpperCase() + type.slice(1);
        expect(entity.name).toMatch(new RegExp(`^${capitalName}`));
        expect(entity.components.mesh?.geometryType).toBe(type);
      }
    });

    it("increments name counter for duplicates", () => {
      // PRIMITIVE_COUNTERS is module-level singleton; each prior test increments counters.
      // Use the base name pattern instead of exact name.
      const e1 = createPrimitiveEntity("cone");
      const e2 = createPrimitiveEntity("cone");
      const e3 = createPrimitiveEntity("cone");
      expect(e1.name).toMatch(/^Cone/);
      expect(e2.name).toContain("Cone");
      expect(e3.name).toContain("Cone");
      // Second and third should have suffixes (counter > 1)
      expect(e2.name).toMatch(/\.\d{3}$/);
      expect(e3.name).toMatch(/\.\d{3}$/);
      // All three names should be different
      expect(e1.name).not.toBe(e2.name);
      expect(e2.name).not.toBe(e3.name);
    });

    it("applies overrides", () => {
      const entity = createPrimitiveEntity("sphere", { name: "Custom", visible: false });
      expect(entity.name).toBe("Custom");
      expect(entity.visible).toBe(false);
      expect(entity.components.mesh?.geometryType).toBe("sphere");
    });

    it("generates unique IDs", () => {
      const ids = new Set(Array.from({ length: 100 }, () => createPrimitiveEntity("plane").id));
      expect(ids.size).toBe(100);
    });
  });
});
