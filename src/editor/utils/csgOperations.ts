/**
 * Boolean operations (CSG) using manifold-3d WASM library.
 * Supports union, difference, and intersection of triangle meshes.
 */

import { Mesh as BabylonMesh } from "@babylonjs/core/Meshes/mesh.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";

export type BooleanOp = "union" | "difference" | "intersection";
type BabylonMeshType = InstanceType<typeof BabylonMesh>;

interface ManifoldMeshOpts {
  numProp: number;
  vertProperties: Float32Array;
  triVerts: Uint32Array;
}

/**
 * Perform a boolean operation on two Babylon.js meshes.
 * Returns a new mesh with the result.
 */
export async function booleanOperation(
  meshA: BabylonMeshType,
  meshB: BabylonMeshType,
  op: BooleanOp,
  scene: Scene
): Promise<BabylonMeshType | null> {
  const manifoldModule = await import("manifold-3d");
  const { Manifold, Mesh: ManifoldMesh } = manifoldModule;

  const meshDataA = babylonToManifoldMesh(meshA);
  const meshDataB = babylonToManifoldMesh(meshB);

  const mA = new Manifold(new ManifoldMesh(meshDataA));
  const mB = new Manifold(new ManifoldMesh(meshDataB));

  let result: any;
  switch (op) {
    case "union":
      result = Manifold.union(mA, mB);
      break;
    case "difference":
      result = Manifold.difference(mA, mB);
      break;
    case "intersection":
      result = Manifold.intersection(mA, mB);
      break;
    default:
      throw new Error(`Unknown boolean operation: ${op}`);
  }

  if (result.status() !== "NoError") {
    console.error(`Boolean ${op} failed: ${result.status()}`);
    return null;
  }

  const outputMesh = result.getMesh();
  if (!outputMesh || outputMesh.triVerts.length === 0) {
    return null;
  }

  return manifoldMeshToBabylon(outputMesh, scene);
}

/**
 * Convert Babylon.js mesh to manifold-3d Mesh format.
 */
function babylonToManifoldMesh(mesh: BabylonMeshType): ManifoldMeshOpts {
  const positions = mesh.getVerticesData("position") as Float32Array | null;
  const indices = mesh.getIndices();

  if (!positions || !indices) {
    return { numProp: 3, vertProperties: new Float32Array(0), triVerts: new Uint32Array(0) };
  }

  // Apply world matrix to positions
  const worldMatrix = mesh.getWorldMatrix();
  const vertProperties = new Float32Array(positions.length);
  const tempVec = Vector3.Zero();

  for (let i = 0; i < positions.length / 3; i++) {
    tempVec.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
    Vector3.TransformCoordinatesToRef(tempVec, worldMatrix, tempVec);
    vertProperties[i * 3] = tempVec.x;
    vertProperties[i * 3 + 1] = tempVec.y;
    vertProperties[i * 3 + 2] = tempVec.z;
  }

  const triVerts = new Uint32Array(indices.length);
  triVerts.set(indices);

  return { numProp: 3, vertProperties, triVerts };
}

/**
 * Convert manifold-3d result mesh back to a Babylon.js mesh.
 */
function manifoldMeshToBabylon(meshData: any, scene: Scene): BabylonMeshType {
  const mesh = new BabylonMesh(`csg_${Date.now()}`, scene);

  // Extract position data (numProp = 3 means just x,y,z per vertex)
  const vertCount = meshData.vertProperties.length / meshData.numProp;
  const positions = new Float32Array(vertCount * 3);
  for (let i = 0; i < vertCount; i++) {
    positions[i * 3] = meshData.vertProperties[i * meshData.numProp];
    positions[i * 3 + 1] = meshData.vertProperties[i * meshData.numProp + 1];
    positions[i * 3 + 2] = meshData.vertProperties[i * meshData.numProp + 2];
  }

  mesh.setVerticesData("position", positions);
  mesh.setIndices(meshData.triVerts);

  const mat = new StandardMaterial(`mat_csg_${Date.now()}`, scene);
  mat.diffuseColor = new Color3(0.6, 0.6, 0.6);
  mat.specularColor = new Color3(0.2, 0.2, 0.2);
  mesh.material = mat;

  return mesh;
}
