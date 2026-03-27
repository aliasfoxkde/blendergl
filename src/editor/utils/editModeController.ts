import {
  Mesh,
  Vector3,
  Color4,
  Color3,
  StandardMaterial,
  MeshBuilder,
  VertexData,
} from "@babylonjs/core";
import type { Scene } from "@babylonjs/core";
import type { IndicesArray } from "@babylonjs/core";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";

/**
 * Controller for edit-mode mesh manipulation.
 * Wraps Babylon.js vertex buffer access and provides selection overlay rendering.
 */
export class EditModeController {
  private mesh: Mesh | null = null;
  private scene: Scene | null = null;

  // Selection overlay meshes
  private faceOverlayMesh: Mesh | null = null;
  private edgeOverlayLines: LinesMesh | null = null;
  private vertexPointMeshes: Mesh[] = [];

  // Materials
  private vertexHighlightMat: StandardMaterial | null = null;
  private faceHighlightMat: StandardMaterial | null = null;

  attachToMesh(mesh: Mesh, scene: Scene): void {
    this.dispose();
    this.mesh = mesh;
    this.scene = scene;

    // Ensure vertex data is updatable (mark each kind individually)
    mesh.markVerticesDataAsUpdatable("position");
    mesh.markVerticesDataAsUpdatable("normal");
    mesh.markVerticesDataAsUpdatable("uv");

    // Create highlight materials
    this.vertexHighlightMat = new StandardMaterial(
      "editVertexHighlight",
      scene
    );
    this.vertexHighlightMat.diffuseColor = new Color3(1, 0.8, 0);
    this.vertexHighlightMat.emissiveColor = new Color3(0.4, 0.3, 0);
    this.vertexHighlightMat.disableLighting = true;

    this.faceHighlightMat = new StandardMaterial(
      "editFaceHighlight",
      scene
    );
    this.faceHighlightMat.diffuseColor = new Color3(0.3, 0.5, 1);
    this.faceHighlightMat.emissiveColor = new Color3(0.1, 0.2, 0.5);
    this.faceHighlightMat.alpha = 0.4;
    this.faceHighlightMat.disableLighting = true;
    this.faceHighlightMat.needDepthPrePass = false;

    // Enable wireframe overlay on the mesh itself
    this.showWireframeOverlay();
  }

  // --- Vertex Data Access ---

  getPositions(): Float32Array | null {
    if (!this.mesh) return null;
    const positions = this.mesh.getVerticesData("position");
    return positions ? new Float32Array(positions) : null;
  }

  getIndices(): IndicesArray | null {
    if (!this.mesh) return null;
    const indices = this.mesh.getIndices();
    return indices ? (indices.slice() as IndicesArray) : null;
  }

  getVertexCount(): number {
    return this.mesh?.getTotalVertices() ?? 0;
  }

  getFaceCount(): number {
    const indices = this.getIndices();
    return indices ? indices.length / 3 : 0;
  }

  getFaceVertexIndices(faceId: number): [number, number, number] {
    const indices = this.mesh?.getIndices();
    if (!indices) return [0, 0, 0];
    const i = faceId * 3;
    return [indices[i], indices[i + 1], indices[i + 2]];
  }

  getVertexPosition(vertexIndex: number): Vector3 {
    const positions = this.mesh?.getVerticesData("position");
    if (!positions) return Vector3.Zero();
    return new Vector3(
      positions[vertexIndex * 3],
      positions[vertexIndex * 3 + 1],
      positions[vertexIndex * 3 + 2]
    );
  }

  getClosestVertex(worldPoint: Vector3): number {
    const positions = this.mesh?.getVerticesData("position");
    if (!positions || !this.mesh) return -1;

    // Transform world point to local space
    const inverseMatrix = this.mesh.getWorldMatrix().invert();
    const localPoint = Vector3.TransformCoordinates(worldPoint, inverseMatrix);

    let closestIdx = 0;
    let closestDist = Infinity;

    const count = positions.length / 3;
    for (let i = 0; i < count; i++) {
      const dx = positions[i * 3] - localPoint.x;
      const dy = positions[i * 3 + 1] - localPoint.y;
      const dz = positions[i * 3 + 2] - localPoint.z;
      const dist = dx * dx + dy * dy + dz * dz;
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = i;
      }
    }

    return closestIdx;
  }

  /**
   * Determine which edge of a triangle face is closest to a pick point
   * using barycentric coordinates.
   */
  getEdgeFromBarycentric(
    faceId: number,
    bu: number,
    bv: number
  ): [number, number] {
    const [v0, v1, v2] = this.getFaceVertexIndices(faceId);
    const bw = 1 - bu - bv;

    // Find the smallest barycentric coordinate → closest to that edge
    const bary = [
      { weight: bu, edge: [v1, v2] as [number, number] },
      { weight: bv, edge: [v2, v0] as [number, number] },
      { weight: bw, edge: [v0, v1] as [number, number] },
    ];

    bary.sort((a, b) => a.weight - b.weight);
    return bary[0].edge;
  }

  // --- Vertex Data Modification ---

  applyPositions(positions: Float32Array): void {
    if (!this.mesh) return;
    this.mesh.updateVerticesData("position", positions);
  }

  applyIndices(indices: IndicesArray): void {
    if (!this.mesh) return;
    const pos = this.mesh.getVerticesData("position");
    const totalVerts = pos ? pos.length / 3 : 0;
    this.mesh.setIndices(indices, totalVerts);
  }

  rebuildNormals(): void {
    if (!this.mesh) return;
    const positions = this.mesh.getVerticesData("position");
    const indices = this.mesh.getIndices();
    if (!positions || !indices) return;

    const normals = new Float32Array(positions.length);
    VertexData.ComputeNormals(positions, indices, normals);
    this.mesh.updateVerticesData("normal", normals);
  }

  /**
   * Delete selected faces by removing them from the index buffer.
   * Does NOT remove orphaned vertices (keeps mesh intact for simplicity).
   */
  deleteFaces(faceIds: number[]): {
    oldIndices: IndicesArray;
    newIndices: IndicesArray;
  } {
    const indices = this.getIndices();
    if (!indices) {
      return { oldIndices: [], newIndices: [] };
    }

    const faceSet = new Set(faceIds);
    const oldIndices = indices.slice() as IndicesArray;
    const newIndices: number[] = [];

    for (let f = 0; f < oldIndices.length / 3; f++) {
      if (!faceSet.has(f)) {
        newIndices.push(
          oldIndices[f * 3],
          oldIndices[f * 3 + 1],
          oldIndices[f * 3 + 2]
        );
      }
    }

    return {
      oldIndices: oldIndices as IndicesArray,
      newIndices: newIndices as IndicesArray,
    };
  }

  /**
   * Extrude selected faces along their normals.
   */
  extrudeFaces(faceIds: number[], distance: number): {
    oldPositions: Float32Array;
    oldIndices: IndicesArray;
    newPositions: Float32Array;
    newIndices: IndicesArray;
  } {
    const positions = this.getPositions();
    const indices = this.getIndices();
    if (!positions || !indices) {
      return {
        oldPositions: new Float32Array(),
        oldIndices: [],
        newPositions: new Float32Array(),
        newIndices: [],
      };
    }

    const faceSet = new Set(faceIds);
    const oldPositions = new Float32Array(positions);
    const oldIndices = indices.slice() as IndicesArray;

    // Collect unique vertex indices from selected faces
    const faceVertexSet = new Set<number>();
    for (const faceId of faceIds) {
      const [v0, v1, v2] = this.getFaceVertexIndices(faceId);
      faceVertexSet.add(v0);
      faceVertexSet.add(v1);
      faceVertexSet.add(v2);
    }

    const faceVertexList = Array.from(faceVertexSet);
    const vertexCount = positions.length / 3;

    // Map old vertex index → new vertex index
    const newVertexMap = new Map<number, number>();
    for (let i = 0; i < faceVertexList.length; i++) {
      newVertexMap.set(faceVertexList[i], vertexCount + i);
    }

    // Compute averaged normals for selected face vertices
    const normals = this.mesh?.getVerticesData("normal");
    const faceNormals = new Map<number, Vector3>();

    for (const faceId of faceIds) {
      const [v0, v1, v2] = this.getFaceVertexIndices(faceId);
      const p0 = new Vector3(
        positions[v0 * 3],
        positions[v0 * 3 + 1],
        positions[v0 * 3 + 2]
      );
      const p1 = new Vector3(
        positions[v1 * 3],
        positions[v1 * 3 + 1],
        positions[v1 * 3 + 2]
      );
      const p2 = new Vector3(
        positions[v2 * 3],
        positions[v2 * 3 + 1],
        positions[v2 * 3 + 2]
      );

      let normal: Vector3;
      if (normals) {
        normal = new Vector3(
          normals[v0 * 3] + normals[v1 * 3] + normals[v2 * 3],
          normals[v0 * 3 + 1] + normals[v1 * 3 + 1] + normals[v2 * 3 + 2],
          normals[v0 * 3 + 2] + normals[v1 * 3 + 2] + normals[v2 * 3 + 2]
        ).normalize();
      } else {
        const edge1 = p1.subtract(p0);
        const edge2 = p2.subtract(p0);
        normal = Vector3.Cross(edge1, edge2).normalize();
      }

      for (const v of [v0, v1, v2]) {
        const existing = faceNormals.get(v);
        if (existing) {
          faceNormals.set(v, existing.add(normal));
        } else {
          faceNormals.set(v, normal.clone());
        }
      }
    }

    // Normalize averaged normals
    for (const [v, n] of faceNormals) {
      faceNormals.set(v, n.normalize());
    }

    // Build new positions: old positions + offset copies
    const newPositions = new Float32Array(
      positions.length + faceVertexList.length * 3
    );
    newPositions.set(positions);

    for (let i = 0; i < faceVertexList.length; i++) {
      const vIdx = faceVertexList[i];
      const normal = faceNormals.get(vIdx) ?? new Vector3(0, 1, 0);
      const newIdx = vertexCount + i;

      newPositions[newIdx * 3] = positions[vIdx * 3] + normal.x * distance;
      newPositions[newIdx * 3 + 1] = positions[vIdx * 3 + 1] + normal.y * distance;
      newPositions[newIdx * 3 + 2] = positions[vIdx * 3 + 2] + normal.z * distance;
    }

    // Build new indices: old indices + side quads + cap faces
    const newIndicesList: number[] = [];

    for (let f = 0; f < oldIndices.length / 3; f++) {
      const v0 = oldIndices[f * 3];
      const v1 = oldIndices[f * 3 + 1];
      const v2 = oldIndices[f * 3 + 2];

      if (faceSet.has(f)) {
        const nv0 = newVertexMap.get(v0)!;
        const nv1 = newVertexMap.get(v1)!;
        const nv2 = newVertexMap.get(v2)!;

        // Side quads (two triangles per edge)
        newIndicesList.push(v0, v1, nv1, v0, nv1, nv0);
        newIndicesList.push(v1, v2, nv2, v1, nv2, nv1);
        newIndicesList.push(v2, v0, nv0, v2, nv0, nv2);

        // Cap face (offset vertices, same winding)
        newIndicesList.push(nv0, nv1, nv2);
      } else {
        // Keep non-selected faces as-is
        newIndicesList.push(v0, v1, v2);
      }
    }

    return {
      oldPositions,
      oldIndices,
      newPositions,
      newIndices: newIndicesList as IndicesArray,
    };
  }

  // --- Wireframe Overlay ---

  showWireframeOverlay(): void {
    if (!this.mesh) return;
    this.mesh.enableEdgesRendering();
    this.mesh.edgesWidth = 1.0;
    this.mesh.edgesColor = new Color4(0.5, 0.5, 0.5, 1);
  }

  hideWireframeOverlay(): void {
    if (!this.mesh) return;
    this.mesh.disableEdgesRendering();
  }

  // --- Selection Overlay ---

  updateSelectionOverlay(
    vertexIds: number[],
    faceIds: number[],
    edgeKeys: string[]
  ): void {
    if (!this.mesh || !this.scene) return;

    this.clearOverlays();

    const positions = this.mesh.getVerticesData("position");
    const indices = this.mesh.getIndices();
    if (!positions || !indices) return;

    // Vertex overlay: small spheres at selected vertices
    if (vertexIds.length > 0 && this.vertexHighlightMat) {
      for (const vIdx of vertexIds) {
        if (vIdx * 3 + 2 < positions.length) {
          const sphere = MeshBuilder.CreateSphere(
            `vtx_${vIdx}`,
            { diameter: 0.06, segments: 6 },
            this.scene
          );
          sphere.position = new Vector3(
            positions[vIdx * 3],
            positions[vIdx * 3 + 1],
            positions[vIdx * 3 + 2]
          );
          sphere.material = this.vertexHighlightMat;
          sphere.isPickable = false;
          this.vertexPointMeshes.push(sphere);
        }
      }
    }

    // Face overlay: highlight selected faces
    if (faceIds.length > 0 && this.faceHighlightMat) {
      const facePositions: number[] = [];
      const faceIndices: number[] = [];

      for (const fId of faceIds) {
        const baseIdx = fId * 3;
        if (baseIdx + 2 < indices.length) {
          const v0 = indices[baseIdx];
          const v1 = indices[baseIdx + 1];
          const v2 = indices[baseIdx + 2];

          const p0 = new Vector3(
            positions[v0 * 3],
            positions[v0 * 3 + 1],
            positions[v0 * 3 + 2]
          );
          const p1 = new Vector3(
            positions[v1 * 3],
            positions[v1 * 3 + 1],
            positions[v1 * 3 + 2]
          );
          const p2 = new Vector3(
            positions[v2 * 3],
            positions[v2 * 3 + 1],
            positions[v2 * 3 + 2]
          );

          // Offset slightly along normal to prevent z-fighting
          const edge1 = p1.subtract(p0);
          const edge2 = p2.subtract(p0);
          const normal = Vector3.Cross(edge1, edge2).normalize();
          const offset = 0.002;

          const basePointIdx = facePositions.length / 3;
          facePositions.push(
            p0.x + normal.x * offset,
            p0.y + normal.y * offset,
            p0.z + normal.z * offset,
            p1.x + normal.x * offset,
            p1.y + normal.y * offset,
            p1.z + normal.z * offset,
            p2.x + normal.x * offset,
            p2.y + normal.y * offset,
            p2.z + normal.z * offset
          );
          faceIndices.push(basePointIdx, basePointIdx + 1, basePointIdx + 2);
        }
      }

      if (facePositions.length > 0) {
        const faceVertexData = new VertexData();
        faceVertexData.positions = facePositions;
        faceVertexData.indices = faceIndices;

        this.faceOverlayMesh = new Mesh("faceOverlay", this.scene) as Mesh;
        faceVertexData.applyToMesh(this.faceOverlayMesh);
        this.faceOverlayMesh.material = this.faceHighlightMat;
        this.faceOverlayMesh.isPickable = false;
      }
    }

    // Edge overlay: highlight selected edges as lines
    if (edgeKeys.length > 0) {
      const linesPoints: Vector3[] = [];
      for (const key of edgeKeys) {
        const [v1Str, v2Str] = key.split("-");
        const v1 = parseInt(v1Str, 10);
        const v2 = parseInt(v2Str, 10);
        if (
          v1 * 3 + 2 < positions.length &&
          v2 * 3 + 2 < positions.length
        ) {
          linesPoints.push(
            new Vector3(
              positions[v1 * 3],
              positions[v1 * 3 + 1],
              positions[v1 * 3 + 2]
            ),
            new Vector3(
              positions[v2 * 3],
              positions[v2 * 3 + 1],
              positions[v2 * 3 + 2]
            )
          );
        }
      }

      if (linesPoints.length >= 2) {
        this.edgeOverlayLines = MeshBuilder.CreateLines(
          "edgeOverlay",
          { points: linesPoints },
          this.scene
        );
        this.edgeOverlayLines.color = new Color3(1, 0.5, 0);
        this.edgeOverlayLines.isPickable = false;
      }
    }
  }

  private clearOverlays(): void {
    for (const m of this.vertexPointMeshes) {
      m.dispose();
    }
    this.vertexPointMeshes = [];

    if (this.faceOverlayMesh) {
      this.faceOverlayMesh.dispose();
      this.faceOverlayMesh = null;
    }
    if (this.edgeOverlayLines) {
      this.edgeOverlayLines.dispose();
      this.edgeOverlayLines = null;
    }
  }

  dispose(): void {
    this.clearOverlays();
    this.hideWireframeOverlay();

    this.vertexHighlightMat?.dispose();
    this.faceHighlightMat?.dispose();

    this.vertexHighlightMat = null;
    this.faceHighlightMat = null;
    this.mesh = null;
    this.scene = null;
  }
}
