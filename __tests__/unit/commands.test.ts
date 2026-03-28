import { describe, it, expect } from "vitest";
import { DuplicateCommand } from "@/editor/utils/commands/duplicateCommand";
import { DeleteFacesCommand } from "@/editor/utils/commands/deleteElementsCommand";
import { ExtrudeFacesCommand } from "@/editor/utils/commands/extrudeCommand";

describe("DuplicateCommand", () => {
  it("executes addFn, undo calls removeFn", () => {
    let added = false;
    const cmd = new DuplicateCommand(
      "Dup",
      () => { added = true; },
      () => { added = false; },
    );
    cmd.execute();
    expect(added).toBe(true);
    cmd.undo();
    expect(added).toBe(false);
  });

  it("has id and description", () => {
    const cmd = new DuplicateCommand("test desc", () => {}, () => {});
    expect(cmd.id).toContain("duplicate");
    expect(cmd.description).toBe("test desc");
  });
});

describe("DeleteFacesCommand", () => {
  it("applies new indices on execute, old on undo", () => {
    const applied: number[][] = [];
    const oldIndices = [0, 1, 2, 3, 4, 5] as unknown as number[] & { slice(): number[] & { __brand: unknown } };
    const newIndices = [0, 1, 2] as unknown as number[] & { slice(): number[] & { __brand: unknown } };

    const cmd = new DeleteFacesCommand(oldIndices, newIndices, (indices) => {
      applied.push([...indices] as unknown as number[]);
    });

    cmd.execute();
    expect(applied).toHaveLength(1);
    expect(applied[0]).toEqual([0, 1, 2]);

    cmd.undo();
    expect(applied).toHaveLength(2);
    expect(applied[1]).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("has id and description", () => {
    const cmd = new DeleteFacesCommand(
      [0, 1, 2, 3, 4, 5] as unknown as number[] & { slice(): number[] & { __brand: unknown } },
      [0, 1, 2] as unknown as number[] & { slice(): number[] & { __brand: unknown } },
      () => {},
    );
    expect(cmd.id).toContain("delete_faces");
    expect(cmd.description).toBe("Delete 1 faces");
  });
});

describe("ExtrudeFacesCommand", () => {
  it("applies new data on execute, old data on undo", () => {
    const applied: { positions: Float32Array; indices: number[] }[] = [];
    const oldPos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    const oldIdx = [0, 1, 2] as unknown as number[] & { slice(): number[] & { __brand: unknown } };
    const newPos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const newIdx = [0, 1, 2, 0, 2, 3] as unknown as number[] & { slice(): number[] & { __brand: unknown } };

    const cmd = new ExtrudeFacesCommand(
      { oldPositions: oldPos, oldIndices: oldIdx, newPositions: newPos, newIndices: newIdx },
      (positions, indices) => {
        applied.push({ positions: new Float32Array(positions), indices: [...indices] as unknown as number[] });
      },
    );

    cmd.execute();
    expect(applied).toHaveLength(1);
    expect(applied[0].positions.length).toBe(12);
    expect(applied[0].indices.length).toBe(6);

    cmd.undo();
    expect(applied).toHaveLength(2);
    expect(applied[1].positions.length).toBe(9);
    expect(applied[1].indices.length).toBe(3);
  });

  it("has id and description", () => {
    const cmd = new ExtrudeFacesCommand(
      {
        oldPositions: new Float32Array(9),
        oldIndices: [0, 1, 2] as unknown as number[] & { slice(): number[] & { __brand: unknown } },
        newPositions: new Float32Array(12),
        newIndices: [0, 1, 2, 0, 2, 3] as unknown as number[] & { slice(): number[] & { __brand: unknown } },
      },
      () => {},
    );
    expect(cmd.id).toContain("extrude_faces");
    expect(cmd.description).toBe("Extrude faces");
  });
});
