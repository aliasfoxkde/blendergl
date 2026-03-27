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

  // --- Advanced Mesh Operations ---

  /**
   * Subdivide all faces — each triangle becomes 4 triangles (midpoint subdivision).
   */
  subdivideAll(): {
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

    const oldPositions = new Float32Array(positions);
    const oldIndices = indices.slice() as IndicesArray;
    const vertexCount = positions.length / 3;

    // For each face, create 3 new midpoints and 4 new triangles
    const newPositions: number[] = [...positions];
    const newIndicesList: number[] = [];

    for (let f = 0; f < oldIndices.length / 3; f++) {
      const i0 = oldIndices[f * 3];
      const i1 = oldIndices[f * 3 + 1];
      const i2 = oldIndices[f * 3 + 2];

      // Midpoints
      const m01 = vertexCount + f * 3;
      const m12 = vertexCount + f * 3 + 1;
      const m20 = vertexCount + f * 3 + 2;

      newPositions.push(
        (positions[i0 * 3] + positions[i1 * 3]) / 2,
        (positions[i0 * 3 + 1] + positions[i1 * 3 + 1]) / 2,
        (positions[i0 * 3 + 2] + positions[i1 * 3 + 2]) / 2,
        (positions[i1 * 3] + positions[i2 * 3]) / 2,
        (positions[i1 * 3 + 1] + positions[i2 * 3 + 1]) / 2,
        (positions[i1 * 3 + 2] + positions[i2 * 3 + 2]) / 2,
        (positions[i2 * 3] + positions[i0 * 3]) / 2,
        (positions[i2 * 3 + 1] + positions[i0 * 3 + 1]) / 2,
        (positions[i2 * 3 + 2] + positions[i0 * 3 + 2]) / 2
      );

      // 4 triangles from original + 3 midpoints
      newIndicesList.push(i0, m01, m20);
      newIndicesList.push(i1, m12, m01);
      newIndicesList.push(i2, m20, m12);
      newIndicesList.push(m01, m12, m20);
    }

    return {
      oldPositions,
      oldIndices,
      newPositions: new Float32Array(newPositions),
      newIndices: newIndicesList as IndicesArray,
    };
  }

  /**
   * Merge selected vertices that are within threshold distance of each other.
   * Returns the first vertex index of each merged group.
   */
  mergeVertices(vertexIds: number[], threshold: number): {
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

    const oldPositions = new Float32Array(positions);
    const oldIndices = indices.slice() as IndicesArray;

    // Build merge map: for each vertex, find the canonical vertex to merge into
    const mergeMap = new Map<number, number>();

    for (const vId of vertexIds) {
      if (mergeMap.has(vId)) continue;
      let canonical = vId;

      for (const otherId of vertexIds) {
        if (otherId === vId || mergeMap.has(otherId)) continue;
        const dx = positions[vId * 3] - positions[otherId * 3];
        const dy = positions[vId * 3 + 1] - positions[otherId * 3 + 1];
        const dz = positions[vId * 3 + 2] - positions[otherId * 3 + 2];
        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < threshold) {
          canonical = Math.min(canonical, otherId);
        }
      }

      mergeMap.set(vId, canonical);
    }

    // Remap indices
    const newIndicesList: number[] = [];
    for (const idx of oldIndices) {
      const mapped = mergeMap.get(idx) ?? idx;
      newIndicesList.push(mapped);
    }

    return {
      oldPositions,
      oldIndices,
      newPositions: new Float32Array(positions),
      newIndices: newIndicesList as IndicesArray,
    };
  }

  /**
   * Inset selected faces inward by a fraction (0-1).
   * Creates new inner triangles for each selected face.
   */
  insetFaces(faceIds: number[], fraction: number): {
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

    const oldPositions = new Float32Array(positions);
    const oldIndices = indices.slice() as IndicesArray;
    const vertexCount = positions.length / 3;
    const faceSet = new Set(faceIds);
    const frac = Math.max(0.05, Math.min(0.95, fraction));

    const newPositions: number[] = [...positions];
    const newIndicesList: number[] = [];

    for (let f = 0; f < oldIndices.length / 3; f++) {
      const v0 = oldIndices[f * 3];
      const v1 = oldIndices[f * 3 + 1];
      const v2 = oldIndices[f * 3 + 2];

      if (faceSet.has(f)) {
        // Create inset vertices: move each vertex toward centroid by fraction
        const cx = (positions[v0 * 3] + positions[v1 * 3] + positions[v2 * 3]) / 3;
        const cy = (positions[v0 * 3 + 1] + positions[v1 * 3 + 1] + positions[v2 * 3 + 1]) / 3;
        const cz = (positions[v0 * 3 + 2] + positions[v1 * 3 + 2] + positions[v2 * 3 + 2]) / 3;

        const iv0 = vertexCount + f * 3;
        const iv1 = vertexCount + f * 3 + 1;
        const iv2 = vertexCount + f * 3 + 2;

        newPositions.push(
          positions[v0 * 3] + (cx - positions[v0 * 3]) * frac,
          positions[v0 * 3 + 1] + (cy - positions[v0 * 3 + 1]) * frac,
          positions[v0 * 3 + 2] + (cz - positions[v0 * 3 + 2]) * frac,
          positions[v1 * 3] + (cx - positions[v1 * 3]) * frac,
          positions[v1 * 3 + 1] + (cy - positions[v1 * 3 + 1]) * frac,
          positions[v1 * 3 + 2] + (cz - positions[v1 * 3 + 2]) * frac,
          positions[v2 * 3] + (cx - positions[v2 * 3]) * frac,
          positions[v2 * 3 + 1] + (cy - positions[v2 * 3 + 1]) * frac,
          positions[v2 * 3 + 2] + (cz - positions[v2 * 3 + 2]) * frac
        );

        // Original face (outer)
        newIndicesList.push(v0, v1, v2);
        // Inner face
        newIndicesList.push(iv0, iv1, iv2);
        // Side quads connecting outer to inner
        newIndicesList.push(v0, v1, iv1, v0, iv1, iv0);
        newIndicesList.push(v1, v2, iv2, v1, iv2, iv1);
        newIndicesList.push(v2, v0, iv0, v2, iv0, iv2);
      } else {
        newIndicesList.push(v0, v1, v2);
      }
    }

    return {
      oldPositions,
      oldIndices,
      newPositions: new Float32Array(newPositions),
      newIndices: newIndicesList as IndicesArray,
    };
  }

  /**
   * Bevel selected edges. Splits edge vertices apart along the face normal
   * and fills the gap with quads.
   */
  bevelEdges(edgeKeys: string[], amount: number): {
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

    const oldPositions = new Float32Array(positions);
    const oldIndices = indices.slice() as IndicesArray;
    const vertexCount = positions.length / 3;

    // Build edge-to-faces map
    const edgeFaces = new Map<string, number[]>();
    for (let f = 0; f < indices.length / 3; f++) {
      const v0 = indices[f * 3];
      const v1 = indices[f * 3 + 1];
      const v2 = indices[f * 3 + 2];
      const edges = [
        [Math.min(v0, v1), Math.max(v0, v1)],
        [Math.min(v1, v2), Math.max(v1, v2)],
        [Math.min(v2, v0), Math.max(v2, v0)],
      ];
      for (const [a, b] of edges) {
        const key = `${a}_${b}`;
        if (!edgeFaces.has(key)) edgeFaces.set(key, []);
        edgeFaces.get(key)!.push(f);
      }
    }

    // Get selected edge keys
    const selectedEdgeKeys = new Set<string>(edgeKeys);

    // Compute face normals
    const faceNormals: { x: number; y: number; z: number }[] = [];
    for (let f = 0; f < indices.length / 3; f++) {
      const v0 = indices[f * 3];
      const v1 = indices[f * 3 + 1];
      const v2 = indices[f * 3 + 2];
      const ax = positions[v1 * 3] - positions[v0 * 3];
      const ay = positions[v1 * 3 + 1] - positions[v0 * 3 + 1];
      const az = positions[v1 * 3 + 2] - positions[v0 * 3 + 2];
      const bx = positions[v2 * 3] - positions[v0 * 3];
      const by = positions[v2 * 3 + 1] - positions[v0 * 3 + 1];
      const bz = positions[v2 * 3 + 2] - positions[v0 * 3 + 2];
      const nx = ay * bz - az * by;
      const ny = az * bx - ax * bz;
      const nz = ax * by - ay * bx;
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
      faceNormals.push({ x: nx / len, y: ny / len, z: nz / len });
    }

    // For each vertex, compute displacement from all selected edges touching it
    const vertexOffset = new Map<number, { x: number; y: number; z: number }>();
    for (const key of selectedEdgeKeys) {
      const parts = key.split("_");
      const va = parseInt(parts[0]);
      const vb = parseInt(parts[1]);
      const faces = edgeFaces.get(key) ?? [];

      // Average normal of faces sharing this edge
      let avgNx = 0, avgNy = 0, avgNz = 0;
      for (const f of faces) {
        avgNx += faceNormals[f].x;
        avgNy += faceNormals[f].y;
        avgNz += faceNormals[f].z;
      }
      const nLen = Math.sqrt(avgNx * avgNx + avgNy * avgNy + avgNz * avgNz) || 1;
      avgNx /= nLen;
      avgNy /= nLen;
      avgNz /= nLen;

      // Each endpoint moves along the average face normal
      for (const v of [va, vb]) {
        const existing = vertexOffset.get(v);
        if (existing) {
          existing.x += avgNx * amount;
          existing.y += avgNy * amount;
          existing.z += avgNz * amount;
        } else {
          vertexOffset.set(v, { x: avgNx * amount, y: avgNy * amount, z: avgNz * amount });
        }
      }
    }

    // Build vertex mapping: original vertex -> new beveled vertex
    const vertexMap = new Map<number, number>();
    const newPositionsArr: number[] = [...positions];
    let nextVertex = vertexCount;

    for (const [vid, offset] of vertexOffset) {
      const newIdx = nextVertex++;
      vertexMap.set(vid, newIdx);
      newPositionsArr.push(
        positions[vid * 3] + offset.x,
        positions[vid * 3 + 1] + offset.y,
        positions[vid * 3 + 2] + offset.z
      );
    }

    // Rebuild indices: for faces touching selected edges, split to create bevel quads
    const newIndicesList: number[] = [];

    for (let f = 0; f < oldIndices.length / 3; f++) {
      const v0 = oldIndices[f * 3];
      const v1 = oldIndices[f * 3 + 1];
      const v2 = oldIndices[f * 3 + 2];

      // Check if any edge of this face is selected
      const e0Key = `${Math.min(v0, v1)}_${Math.max(v0, v1)}`;
      const e1Key = `${Math.min(v1, v2)}_${Math.max(v1, v2)}`;
      const e2Key = `${Math.min(v2, v0)}_${Math.max(v2, v0)}`;

      const hasSelectedEdge = selectedEdgeKeys.has(e0Key) || selectedEdgeKeys.has(e1Key) || selectedEdgeKeys.has(e2Key);

      if (!hasSelectedEdge) {
        newIndicesList.push(v0, v1, v2);
        continue;
      }

      // Map vertices to beveled versions where applicable
      const bv0 = vertexMap.has(v0) ? vertexMap.get(v0)! : v0;
      const bv1 = vertexMap.has(v1) ? vertexMap.get(v1)! : v1;
      const bv2 = vertexMap.has(v2) ? vertexMap.get(v2)! : v2;

      // Inner face (beveled)
      newIndicesList.push(bv0, bv1, bv2);

      // Side quads for each edge that is selected
      if (selectedEdgeKeys.has(e0Key)) {
        newIndicesList.push(v0, v1, bv1, v0, bv1, bv0);
      }
      if (selectedEdgeKeys.has(e1Key)) {
        newIndicesList.push(v1, v2, bv2, v1, bv2, bv1);
      }
      if (selectedEdgeKeys.has(e2Key)) {
        newIndicesList.push(v2, v0, bv0, v2, bv0, bv2);
      }
    }

    return {
      oldPositions,
      oldIndices,
      newPositions: new Float32Array(newPositionsArr),
      newIndices: newIndicesList as IndicesArray,
    };
  }
}
