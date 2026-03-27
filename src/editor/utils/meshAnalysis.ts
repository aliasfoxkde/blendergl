import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export interface MeshAnalysis {
  vertexCount: number;
  faceCount: number;
  edgeCount: number;
  dimensions: { x: number; y: number; z: number };
  volume: number;
  surfaceArea: number;
  boundingBox: {
    min: { x: number; y: number; z: number };
    max: { x: number; y: number; z: number };
  };
  isManifold: boolean;
  nonManifoldEdges: number;
  openEdges: number;
  degenerateFaces: number;
}

/**
 * Analyze a Babylon.js mesh for 3D printing suitability.
 */
export function analyzeMesh(mesh: Mesh): MeshAnalysis {
  const positions = mesh.getVerticesData("position");
  const indices = mesh.getIndices();

  if (!positions || !indices) {
    return emptyAnalysis();
  }

  const vertexCount = mesh.getTotalVertices();
  const faceCount = indices.length / 3;

  // Bounding box
  const min = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
  const max = new Vector3(-Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE);

  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    if (x < min.x) min.x = x;
    if (y < min.y) min.y = y;
    if (z < min.z) min.z = z;
    if (x > max.x) max.x = x;
    if (y > max.y) max.y = y;
    if (z > max.z) max.z = z;
  }

  const dimensions = {
    x: max.x - min.x,
    y: max.y - min.y,
    z: max.z - min.z,
  };

  // Volume using divergence theorem (signed volume)
  let volume = 0;
  for (let i = 0; i < faceCount; i++) {
    const i0 = indices[i * 3];
    const i1 = indices[i * 3 + 1];
    const i2 = indices[i * 3 + 2];

    const v0x = positions[i0 * 3];
    const v0y = positions[i0 * 3 + 1];
    const v0z = positions[i0 * 3 + 2];
    const v1x = positions[i1 * 3];
    const v1y = positions[i1 * 3 + 1];
    const v1z = positions[i1 * 3 + 2];
    const v2x = positions[i2 * 3];
    const v2y = positions[i2 * 3 + 1];
    const v2z = positions[i2 * 3 + 2];

    volume +=
      v0x * (v1y * v2z - v1z * v2y) -
      v0y * (v1x * v2z - v1z * v2x) +
      v0z * (v1x * v2y - v1y * v2x);
  }
  volume = Math.abs(volume) / 6;

  // Surface area
  let surfaceArea = 0;
  for (let i = 0; i < faceCount; i++) {
    const i0 = indices[i * 3];
    const i1 = indices[i * 3 + 1];
    const i2 = indices[i * 3 + 2];

    const v0 = new Vector3(positions[i0 * 3], positions[i0 * 3 + 1], positions[i0 * 3 + 2]);
    const v1 = new Vector3(positions[i1 * 3], positions[i1 * 3 + 1], positions[i1 * 3 + 2]);
    const v2 = new Vector3(positions[i2 * 3], positions[i2 * 3 + 1], positions[i2 * 3 + 2]);

    const edge1 = v1.subtract(v0);
    const edge2 = v2.subtract(v0);
    const cross = Vector3.Cross(edge1, edge2);
    surfaceArea += cross.length() / 2;
  }

  // Edge analysis (for manifold check)
  const edgeCount = getUniqueEdgeCount(indices as number[]);
  const { nonManifoldEdges, openEdges, degenerateFaces } = checkManifold(
    positions as Float32Array,
    indices as number[],
    faceCount
  );
  const isManifold = nonManifoldEdges === 0 && openEdges === 0;

  return {
    vertexCount,
    faceCount,
    edgeCount,
    dimensions,
    volume,
    surfaceArea,
    boundingBox: {
      min: { x: min.x, y: min.y, z: min.z },
      max: { x: max.x, y: max.y, z: max.z },
    },
    isManifold,
    nonManifoldEdges,
    openEdges,
    degenerateFaces,
  };
}

/**
 * Get the number of unique edges in an index buffer.
 */
function getUniqueEdgeCount(indices: Uint16Array | Uint32Array | number[]): number {
  const edgeSet = new Set<string>();
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];
    edgeSet.add(`${Math.min(i0, i1)}-${Math.max(i0, i1)}`);
    edgeSet.add(`${Math.min(i1, i2)}-${Math.max(i1, i2)}`);
    edgeSet.add(`${Math.min(i0, i2)}-${Math.max(i0, i2)}`);
  }
  return edgeSet.size;
}

/**
 * Check mesh manifold-ness.
 * A manifold mesh has:
 * - Every edge shared by exactly 2 faces
 * - All faces wound consistently
 * - No degenerate (zero-area) faces
 */
function checkManifold(
  positions: Float32Array,
  indices: Uint16Array | Uint32Array | number[],
  faceCount: number
): { nonManifoldEdges: number; openEdges: number; degenerateFaces: number } {
  // Count edge references
  const edgeCount = new Map<string, number>();
  let degenerateFaces = 0;

  for (let i = 0; i < faceCount; i++) {
    const i0 = indices[i * 3];
    const i1 = indices[i * 3 + 1];
    const i2 = indices[i * 3 + 2];

    // Check for degenerate faces (zero area)
    const v0x = positions[i0 * 3 + 1] - positions[i0 * 3];
    const v0y = positions[i0 * 3 + 2] - positions[i0 * 3];
    const v1x = positions[i1 * 3 + 1] - positions[i0 * 3];
    const v1y = positions[i1 * 3 + 2] - positions[i1 * 3 + 1];
    const v2x = positions[i2 * 3 + 1] - positions[i2 * 3];
    const v2y = positions[i2 * 3 + 2] - positions[i2 * 3 + 2];
    const cross = v0x * v1y - v0y * v1x;
    const area = cross * 2 + v0x * v2y - v0y * v2x;
    if (Math.abs(area) < 1e-10) {
      degenerateFaces++;
    }

    // Count directed edges
    const edges: [number, number][] = [
      [i0, i1],
      [i1, i2],
      [i2, i0],
    ];
    for (const [a, b] of edges) {
      const key = `${a}-${b}`;
      edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
    }
  }

  let nonManifoldEdges = 0;
  let openEdges = 0;
  for (const count of edgeCount.values()) {
    if (count === 1) openEdges++;
    else if (count > 2) nonManifoldEdges++;
  }

  return { nonManifoldEdges, openEdges, degenerateFaces };
}

function emptyAnalysis(): MeshAnalysis {
  return {
    vertexCount: 0,
    faceCount: 0,
    edgeCount: 0,
    dimensions: { x: 0, y: 0, z: 0 },
    volume: 0,
    surfaceArea: 0,
    boundingBox: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
    },
    isManifold: false,
    nonManifoldEdges: 0,
    openEdges: 0,
    degenerateFaces: 0,
  };
}

/**
 * Format analysis for display.
 */
export function formatAnalysis(analysis: MeshAnalysis): string {
  const lines = [
    `Vertices: ${analysis.vertexCount.toLocaleString()}`,
    `Faces: ${analysis.faceCount.toLocaleString()}`,
    `Edges: ${analysis.edgeCount.toLocaleString()}`,
    `Dimensions: ${analysis.dimensions.x.toFixed(2)} × ${analysis.dimensions.y.toFixed(2)} × ${analysis.dimensions.z.toFixed(2)} mm`,
    `Volume: ${analysis.volume.toFixed(2)} mm³`,
    `Surface: ${analysis.surfaceArea.toFixed(2)} mm²`,
    `Manifold: ${analysis.isManifold ? "Yes" : "No"}`,
  ];
  if (analysis.nonManifoldEdges > 0) {
    lines.push(`Non-manifold edges: ${analysis.nonManifoldEdges}`);
  }
  if (analysis.openEdges > 0) {
    lines.push(`Open edges: ${analysis.openEdges}`);
  }
  if (analysis.degenerateFaces > 0) {
    lines.push(`Degenerate faces: ${analysis.degenerateFaces}`);
  }
  return lines.join("\n");
}

/**
 * Estimate print time and material usage from volume.
 * Uses conservative FDM estimates.
 */
export function estimatePrint(
  analysis: MeshAnalysis,
  settings?: {
    layerHeight?: number;
    infillDensity?: number;
    printSpeed?: number;
  }
): { estimatedTimeMinutes: number; estimatedMaterialGrams: number; estimatedMaterialMeters: number } {
  const layerHeight = settings?.layerHeight ?? 0.2;
  const infillDensity = (settings?.infillDensity ?? 20) / 100;
  const printSpeed = settings?.printSpeed ?? 50; // mm/s

  // Approximate wall volume (shell only, ~3 perimeters)
  const surfaceArea = analysis.surfaceArea;
  const shellThickness = 1.2; // ~3 perimeters at 0.4mm nozzle
  const shellVolume = surfaceArea * shellThickness;

  // Infill volume
  const infillVolume = analysis.volume * infillDensity;

  const totalVolume = shellVolume + infillVolume;
  const filamentDensity = 1.24; // g/cm³ (PLA)
  const filamentDiameter = 1.75; // mm

  const materialGrams = totalVolume * filamentDensity;
  const materialMeters = (materialGrams / (filamentDensity * Math.PI * (filamentDiameter / 2) ** 2)) * 1000;

  // Rough time estimate: volume / (speed * layer height * width)
  const layers = Math.ceil(analysis.dimensions.z / layerHeight);
  const perimeterPerLayer = Math.sqrt(surfaceArea) * 4;
  const timePerLayer = perimeterPerLayer / printSpeed;
  const estimatedTimeMinutes = (layers * timePerLayer) / 60;

  return {
    estimatedTimeMinutes: Math.round(estimatedTimeMinutes),
    estimatedMaterialGrams: Math.round(materialGrams),
    estimatedMaterialMeters: Math.round(materialMeters),
  };
}

/**
 * Repair common mesh issues for 3D printing.
 * Returns the number of repairs made.
 */
export function repairMesh(mesh: Mesh): { repairs: number; details: string[] } {
  const positions = mesh.getVerticesData("position") as Float32Array | null;
  const indices = mesh.getIndices();
  const normals = mesh.getVerticesData("normal");

  if (!positions || !indices) {
    return { repairs: 0, details: ["No vertex data to repair"] };
  }

  const repairs: string[] = [];
  let newPositions = new Float32Array(positions);
  let newIndices = new Int32Array(indices);
  let newNormals = normals ? new Float32Array(normals) : null;

  // 1. Remove degenerate faces (zero-area triangles)
  const validFaces: number[][] = [];
  let degenerateCount = 0;

  for (let i = 0; i < newIndices.length; i += 3) {
    const i0 = newIndices[i];
    const i1 = newIndices[i + 1];
    const i2 = newIndices[i + 2];

    // Skip degenerate (all same vertex)
    if (i0 === i1 || i1 === i2 || i0 === i2) {
      degenerateCount++;
      continue;
    }

    // Check area
    const v0 = new Vector3(newPositions[i0 * 3], newPositions[i0 * 3 + 1], newPositions[i0 * 3 + 2]);
    const v1 = new Vector3(newPositions[i1 * 3], newPositions[i1 * 3 + 1], newPositions[i1 * 3 + 2]);
    const v2 = new Vector3(newPositions[i2 * 3], newPositions[i2 * 3 + 1], newPositions[i2 * 3 + 2]);

    const edge1 = v1.subtract(v0);
    const edge2 = v2.subtract(v0);
    const cross = Vector3.Cross(edge1, edge2);

    if (cross.lengthSquared() < 1e-20) {
      degenerateCount++;
      continue;
    }

    validFaces.push([i0, i1, i2]);
  }

  if (degenerateCount > 0) {
    repairs.push(`Removed ${degenerateCount} degenerate faces`);
    newIndices = new Int32Array(validFaces.length * 3);
    for (let i = 0; i < validFaces.length; i++) {
      newIndices[i * 3] = validFaces[i][0];
      newIndices[i * 3 + 1] = validFaces[i][1];
      newIndices[i * 3 + 2] = validFaces[i][2];
    }
  }

  // 2. Merge duplicate vertices
  const vertexMap = new Map<string, number>();
  const remappedPositions: number[] = [];
  const indexRemap = new Map<number, number>();

  for (let i = 0; i < newPositions.length / 3; i++) {
    const x = newPositions[i * 3];
    const y = newPositions[i * 3 + 1];
    const z = newPositions[i * 3 + 2];
    const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;

    if (vertexMap.has(key)) {
      indexRemap.set(i, vertexMap.get(key)!);
    } else {
      const newIndex = remappedPositions.length / 3;
      vertexMap.set(key, newIndex);
      indexRemap.set(i, newIndex);
      remappedPositions.push(x, y, z);
    }
  }

  if (indexRemap.size < newPositions.length / 3) {
    const merged = newPositions.length / 3 - indexRemap.size;
    repairs.push(`Merged ${merged} duplicate vertices`);
    newPositions = new Float32Array(remappedPositions);
    for (let i = 0; i < newIndices.length; i++) {
      newIndices[i] = indexRemap.get(newIndices[i]) ?? newIndices[i];
    }
  }

  // 3. Recompute normals
  const faceNormals: Vector3[] = [];
  for (let i = 0; i < newIndices.length; i += 3) {
    const i0 = newIndices[i];
    const i1 = newIndices[i + 1];
    const i2 = newIndices[i + 2];

    const v0 = new Vector3(newPositions[i0 * 3], newPositions[i0 * 3 + 1], newPositions[i0 * 3 + 2]);
    const v1 = new Vector3(newPositions[i1 * 3], newPositions[i1 * 3 + 1], newPositions[i1 * 3 + 2]);
    const v2 = new Vector3(newPositions[i2 * 3], newPositions[i2 * 3 + 1], newPositions[i2 * 3 + 2]);

    const edge1 = v1.subtract(v0);
    const edge2 = v2.subtract(v0);
    const normal = Vector3.Cross(edge1, edge2);
    if (normal.lengthSquared() > 1e-20) {
      normal.normalize();
    }
    faceNormals.push(normal);
  }

  // Average face normals at each vertex
  newNormals = new Float32Array(newPositions.length);
  const normalCount = new Float32Array(newPositions.length / 3);

  for (let i = 0; i < newIndices.length / 3; i++) {
    const faceNormal = faceNormals[i];
    for (let j = 0; j < 3; j++) {
      const vi = newIndices[i * 3 + j];
      newNormals[vi * 3] += faceNormal.x;
      newNormals[vi * 3 + 1] += faceNormal.y;
      newNormals[vi * 3 + 2] += faceNormal.z;
      normalCount[vi]++;
    }
  }

  for (let i = 0; i < normalCount.length; i++) {
    if (normalCount[i] > 0) {
      const nx = newNormals[i * 3] / normalCount[i];
      const ny = newNormals[i * 3 + 1] / normalCount[i];
      const nz = newNormals[i * 3 + 2] / normalCount[i];
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      if (len > 1e-10) {
        newNormals[i * 3] = nx / len;
        newNormals[i * 3 + 1] = ny / len;
        newNormals[i * 3 + 2] = nz / len;
      }
    }
  }

  repairs.push("Recomputed vertex normals");

  // Apply repaired data to mesh
  mesh.setVerticesData("position", newPositions);
  mesh.setIndices(newIndices);
  mesh.setVerticesData("normal", newNormals);

  return { repairs: repairs.length, details: repairs };
}
