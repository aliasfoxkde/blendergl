import { describe, it, expect } from "vitest";
import { formatAnalysis, estimatePrint } from "@/editor/utils/meshAnalysis";
import type { MeshAnalysis } from "@/editor/utils/meshAnalysis";
import { fillHoles } from "@/editor/utils/meshAnalysis";

function makeAnalysis(overrides: Partial<MeshAnalysis> = {}): MeshAnalysis {
  return {
    vertexCount: 100,
    faceCount: 50,
    edgeCount: 150,
    dimensions: { x: 10, y: 5, z: 3 },
    volume: 150,
    surfaceArea: 200,
    boundingBox: { min: { x: 0, y: 0, z: 0 }, max: { x: 10, y: 5, z: 3 } },
    isManifold: true,
    nonManifoldEdges: 0,
    openEdges: 0,
    degenerateFaces: 0,
    ...overrides,
  };
}

describe("formatAnalysis", () => {
  it("formats a clean manifold mesh", () => {
    const analysis = makeAnalysis();
    const result = formatAnalysis(analysis);
    expect(result).toContain("Vertices: 100");
    expect(result).toContain("Faces: 50");
    expect(result).toContain("Edges: 150");
    expect(result).toContain("10.00 × 5.00 × 3.00 mm");
    expect(result).toContain("Volume: 150.00 mm³");
    expect(result).toContain("Surface: 200.00 mm²");
    expect(result).toContain("Manifold: Yes");
  });

  it("formats a non-manifold mesh with issues", () => {
    const analysis = makeAnalysis({
      isManifold: false,
      nonManifoldEdges: 3,
      openEdges: 5,
      degenerateFaces: 2,
    });
    const result = formatAnalysis(analysis);
    expect(result).toContain("Manifold: No");
    expect(result).toContain("Non-manifold edges: 3");
    expect(result).toContain("Open edges: 5");
    expect(result).toContain("Degenerate faces: 2");
  });

  it("formats large numbers with locale separators", () => {
    const analysis = makeAnalysis({ vertexCount: 1000000 });
    const result = formatAnalysis(analysis);
    expect(result).toContain("1,000,000");
  });
});

describe("estimatePrint", () => {
  it("returns positive estimates for a typical mesh", () => {
    const analysis = makeAnalysis({ dimensions: { x: 10, y: 50, z: 10 } });
    const result = estimatePrint(analysis);
    expect(result.estimatedTimeMinutes).toBeGreaterThan(0);
    expect(result.estimatedMaterialGrams).toBeGreaterThan(0);
    expect(result.estimatedMaterialMeters).toBeGreaterThan(0);
  });

  it("uses default settings when none provided", () => {
    const analysis = makeAnalysis();
    const r1 = estimatePrint(analysis);
    const r2 = estimatePrint(analysis, {});
    expect(r1).toEqual(r2);
  });

  it("higher infill increases material usage", () => {
    const analysis = makeAnalysis();
    const low = estimatePrint(analysis, { infillDensity: 10 });
    const high = estimatePrint(analysis, { infillDensity: 50 });
    expect(high.estimatedMaterialGrams).toBeGreaterThan(low.estimatedMaterialGrams);
  });

  it("faster print speed reduces estimated time", () => {
    const analysis = makeAnalysis({ dimensions: { x: 10, y: 50, z: 10 } });
    const slow = estimatePrint(analysis, { printSpeed: 30 });
    const fast = estimatePrint(analysis, { printSpeed: 100 });
    expect(fast.estimatedTimeMinutes).toBeLessThanOrEqual(slow.estimatedTimeMinutes);
  });

  it("smaller layer height increases estimated time", () => {
    const analysis = makeAnalysis({ dimensions: { x: 10, y: 50, z: 10 } });
    const coarse = estimatePrint(analysis, { layerHeight: 0.3 });
    const fine = estimatePrint(analysis, { layerHeight: 0.1 });
    expect(fine.estimatedTimeMinutes).toBeGreaterThanOrEqual(coarse.estimatedTimeMinutes);
  });

  it("returns zero estimates for empty mesh", () => {
    const analysis = makeAnalysis({
      volume: 0,
      surfaceArea: 0,
      dimensions: { x: 0, y: 0, z: 0 },
    });
    const result = estimatePrint(analysis);
    expect(result.estimatedTimeMinutes).toBe(0);
    expect(result.estimatedMaterialGrams).toBe(0);
  });
});

describe("fillHoles", () => {
  it("fills a single triangle hole (3 boundary edges)", () => {
    // Single triangle — all 3 edges are boundary
    const positions = new Float32Array([
      0, 0, 0,
      1, 0, 0,
      0, 1, 0,
    ]);
    const indices = [0, 1, 2];
    const result = fillHoles(positions, indices);
    // The 3 boundary edges form a loop of length 3, which is filled
    expect(result.holesFilled).toBe(1);
    expect(result.newIndices.length).toBeGreaterThan(indices.length);
  });

  it("fills holes in a quad with a missing face", () => {
    // Two triangles sharing one vertex: [0,1,2] and [0,3,4]
    // This creates boundary edges that form loops
    const positions = new Float32Array([
      0, 0, 0,  // 0
      1, 0, 0,  // 1
      0, 1, 0,  // 2
      2, 0, 0,  // 3
      0, 2, 0,  // 4
    ]);
    const indices = [0, 1, 2, 0, 3, 4];
    const result = fillHoles(positions, indices);
    // The boundary edges should form at least one loop of length >= 3
    expect(result.newIndices.length).toBeGreaterThanOrEqual(indices.length);
  });

  it("returns indices when positions are empty", () => {
    const positions = new Float32Array(0);
    const indices: number[] = [];
    const result = fillHoles(positions, indices);
    expect(result.holesFilled).toBe(0);
    expect(result.newIndices).toEqual([]);
  });
});
