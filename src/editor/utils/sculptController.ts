import {
  Mesh,
  Vector3,
  Color3,
  Color4,
  StandardMaterial,
  MeshBuilder,
  VertexData,
} from "@babylonjs/core";
import type { Scene } from "@babylonjs/core";
import type { Camera } from "@babylonjs/core";
import type { PickingInfo } from "@babylonjs/core/Collisions/pickingInfo";
import type { FalloffType, SculptBrushType, SculptSymmetry } from "@/editor/types";

/**
 * Core brush engine for sculpt mode.
 * Provides 7 brush types, falloff computation, adjacency map,
 * brush cursor visualization, and undo data capture.
 */
export class SculptController {
  private mesh: Mesh | null = null;
  private scene: Scene | null = null;

  // Adjacency map: vertex index → set of neighboring vertex indices
  private adjacencyMap: Map<number, Set<number>> = new Map();

  // Stroke state
  private strokeActive = false;
  private lastDabPosition: Vector3 | null = null;
  private grabSnapshot: Float32Array | null = null;
  private grabStartWorld: Vector3 | null = null;

  // Undo data: positions before stroke started
  private strokeStartPositions: Float32Array | null = null;

  // Brush cursor
  private cursorMesh: Mesh | null = null;
  private cursorMaterial: StandardMaterial | null = null;

  // ---- Attach / Detach ----

  attach(mesh: Mesh, scene: Scene): void {
    this.dispose();
    this.mesh = mesh;
    this.scene = scene;

    mesh.markVerticesDataAsUpdatable("position");
    mesh.markVerticesDataAsUpdatable("normal");

    this.buildAdjacencyMap();

    // Enable wireframe overlay
    mesh.enableEdgesRendering();
    mesh.edgesWidth = 1.0;
    mesh.edgesColor = new Color4(0.4, 0.4, 0.4, 1);

    // Create brush cursor material
    this.cursorMaterial = new StandardMaterial(
      "sculptCursorMat",
      scene
    );
    this.cursorMaterial.diffuseColor = new Color3(1, 1, 1);
    this.cursorMaterial.emissiveColor = new Color3(0.8, 0.8, 0.8);
    this.cursorMaterial.disableLighting = true;
    this.cursorMaterial.alpha = 0.6;
  }

  dispose(): void {
    this.strokeActive = false;
    this.lastDabPosition = null;
    this.grabSnapshot = null;
    this.grabStartWorld = null;
    this.strokeStartPositions = null;

    if (this.cursorMesh) {
      this.cursorMesh.dispose();
      this.cursorMesh = null;
    }
    if (this.cursorMaterial) {
      this.cursorMaterial.dispose();
      this.cursorMaterial = null;
    }

    if (this.mesh) {
      this.mesh.disableEdgesRendering();
    }

    this.adjacencyMap.clear();
    this.mesh = null;
    this.scene = null;
  }

  // ---- Adjacency Map ----

  private buildAdjacencyMap(): void {
    this.adjacencyMap.clear();
    const indices = this.mesh?.getIndices();
    if (!indices) return;

    for (let i = 0; i < indices.length; i += 3) {
      const v0 = indices[i];
      const v1 = indices[i + 1];
      const v2 = indices[i + 2];

      this.addNeighbor(v0, v1);
      this.addNeighbor(v0, v2);
      this.addNeighbor(v1, v0);
      this.addNeighbor(v1, v2);
      this.addNeighbor(v2, v0);
      this.addNeighbor(v2, v1);
    }
  }

  private addNeighbor(a: number, b: number): void {
    let neighbors = this.adjacencyMap.get(a);
    if (!neighbors) {
      neighbors = new Set();
      this.adjacencyMap.set(a, neighbors);
    }
    neighbors.add(b);
  }

  // ---- Falloff Functions ----

  static falloff(t: number, type: FalloffType): number {
    const clamped = Math.max(0, Math.min(1, t));
    switch (type) {
      case "smooth":
        return clamped * clamped * (3 - 2 * clamped);
      case "sharp":
        return 1 - clamped * clamped;
      case "spike":
        return clamped * clamped * (3 - 2 * clamped) * (1 - clamped * clamped);
      default:
        return 1 - clamped;
    }
  }

  // ---- Find Affected Vertices ----

  private getAffectedVertices(
    center: Vector3,
    radius: number,
    falloff: FalloffType
  ): { vertexIndices: number[]; weights: number[] } {
    if (!this.mesh) return { vertexIndices: [], weights: [] };

    const positions = this.mesh.getVerticesData("position");
    if (!positions) return { vertexIndices: [], weights: [] };

    const inverseMatrix = this.mesh.getWorldMatrix().invert();
    const localCenter = Vector3.TransformCoordinates(center, inverseMatrix);

    const vertexIndices: number[] = [];
    const weights: number[] = [];

    const vertexCount = positions.length / 3;
    const radiusSq = radius * radius;

    for (let i = 0; i < vertexCount; i++) {
      const dx = positions[i * 3] - localCenter.x;
      const dy = positions[i * 3 + 1] - localCenter.y;
      const dz = positions[i * 3 + 2] - localCenter.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq);
        const t = dist / radius;
        const weight = SculptController.falloff(t, falloff);
        if (weight > 0.001) {
          vertexIndices.push(i);
          weights.push(weight);
        }
      }
    }

    return { vertexIndices, weights };
  }

  // ---- Stroke Lifecycle ----

  beginStroke(pickResult: PickingInfo, _camera: Camera, brushType: SculptBrushType): void {
    if (!this.mesh || !pickResult.pickedPoint) return;

    this.strokeActive = true;
    this.lastDabPosition = null;

    // Snapshot positions for undo
    const positions = this.mesh.getVerticesData("position");
    if (positions) {
      this.strokeStartPositions = new Float32Array(positions);
    }

    // For grab brush, snapshot positions for delta tracking
    if (brushType === "grab") {
      this.grabSnapshot = positions ? new Float32Array(positions) : null;
      this.grabStartWorld = pickResult.pickedPoint.clone();
    }
  }

  continueStroke(
    pickResult: PickingInfo,
    brushType: SculptBrushType,
    radius: number,
    strength: number,
    falloff: FalloffType,
    spacing: number,
    symmetry: SculptSymmetry,
    pressure: number
  ): void {
    if (!this.strokeActive || !this.mesh || !pickResult.pickedPoint) return;

    const center = pickResult.pickedPoint;

    // Check spacing
    const minDist = radius * spacing;
    if (this.lastDabPosition) {
      const dist = Vector3.Distance(center, this.lastDabPosition);
      if (dist < minDist && brushType !== "grab") return;
    }

    // Apply brush at primary position
    this.applyBrushDab(center, brushType, radius, strength, falloff, pressure);

    // Apply symmetry
    if (symmetry.x) {
      this.applyBrushDab(
        new Vector3(-center.x, center.y, center.z),
        brushType, radius, strength, falloff, pressure
      );
    }
    if (symmetry.y) {
      this.applyBrushDab(
        new Vector3(center.x, -center.y, center.z),
        brushType, radius, strength, falloff, pressure
      );
    }
    if (symmetry.z) {
      this.applyBrushDab(
        new Vector3(center.x, center.y, -center.z),
        brushType, radius, strength, falloff, pressure
      );
    }

    this.lastDabPosition = center.clone();
  }

  endStroke(): { oldPositions: Float32Array; newPositions: Float32Array } | null {
    this.strokeActive = false;
    this.lastDabPosition = null;
    this.grabSnapshot = null;
    this.grabStartWorld = null;

    if (!this.mesh || !this.strokeStartPositions) return null;

    const newPositions = this.mesh.getVerticesData("position");
    if (!newPositions) return null;

    const result = {
      oldPositions: this.strokeStartPositions,
      newPositions: new Float32Array(newPositions),
    };

    this.strokeStartPositions = null;
    return result;
  }

  // ---- Brush Dab Application ----

  private applyBrushDab(
    worldCenter: Vector3,
    brushType: SculptBrushType,
    radius: number,
    strength: number,
    falloff: FalloffType,
    pressure: number
  ): void {
    if (!this.mesh) return;

    const { vertexIndices, weights } = this.getAffectedVertices(worldCenter, radius, falloff);
    if (vertexIndices.length === 0) return;

    const positions = this.mesh.getVerticesData("position") as Float32Array | null;
    if (!positions) return;

    const inverseMatrix = this.mesh.getWorldMatrix().invert();
    const localCenter = Vector3.TransformCoordinates(worldCenter, inverseMatrix);

    // Compute normal at brush center (average of affected vertex normals)
    const normals = this.mesh.getVerticesData("normal") as Float32Array | null;
    const normal = this.getAverageNormal(vertexIndices, normals);

    const effectiveStrength = strength * pressure;

    switch (brushType) {
      case "sculpt":
        this.applySculptBrush(positions, vertexIndices, weights, localCenter, normal, effectiveStrength);
        break;
      case "smooth":
        this.applySmoothBrush(positions, vertexIndices, weights, effectiveStrength);
        break;
      case "grab":
        this.applyGrabBrush(positions, vertexIndices, weights, localCenter, effectiveStrength);
        break;
      case "inflate":
        this.applyInflateBrush(positions, vertexIndices, weights, localCenter, effectiveStrength);
        break;
      case "pinch":
        this.applyPinchBrush(positions, vertexIndices, weights, localCenter, effectiveStrength);
        break;
      case "flatten":
        this.applyFlattenBrush(positions, vertexIndices, weights, localCenter, normal, effectiveStrength);
        break;
      case "crease":
        this.applyCreaseBrush(positions, vertexIndices, weights, localCenter, normal, effectiveStrength);
        break;
    }

    this.mesh.updateVerticesData("position", positions);
    this.rebuildNormals();
  }

  // ---- Brush Implementations ----

  private applySculptBrush(
    positions: Float32Array,
    vertexIndices: number[],
    weights: number[],
    _localCenter: Vector3,
    normal: Vector3,
    strength: number
  ): void {
    // Pull vertices inward (toward center) along their normals
    for (let i = 0; i < vertexIndices.length; i++) {
      const vIdx = vertexIndices[i];
      const w = weights[i];
      const offset = -strength * w * 0.1; // negative = pull inward

      // Use vertex normal if available
      const nx = normal.x * offset;
      const ny = normal.y * offset;
      const nz = normal.z * offset;

      positions[vIdx * 3] += nx;
      positions[vIdx * 3 + 1] += ny;
      positions[vIdx * 3 + 2] += nz;
    }
  }

  private applySmoothBrush(
    positions: Float32Array,
    vertexIndices: number[],
    weights: number[],
    strength: number
  ): void {
    // Laplacian smoothing: move toward average of neighbors
    for (let i = 0; i < vertexIndices.length; i++) {
      const vIdx = vertexIndices[i];
      const w = weights[i];
      const neighbors = this.adjacencyMap.get(vIdx);
      if (!neighbors || neighbors.size === 0) continue;

      // Compute average neighbor position
      let avgX = 0;
      let avgY = 0;
      let avgZ = 0;
      for (const nIdx of neighbors) {
        avgX += positions[nIdx * 3];
        avgY += positions[nIdx * 3 + 1];
        avgZ += positions[nIdx * 3 + 2];
      }
      avgX /= neighbors.size;
      avgY /= neighbors.size;
      avgZ /= neighbors.size;

      // Move toward average
      const factor = strength * w * 0.5;
      positions[vIdx * 3] += (avgX - positions[vIdx * 3]) * factor;
      positions[vIdx * 3 + 1] += (avgY - positions[vIdx * 3 + 1]) * factor;
      positions[vIdx * 3 + 2] += (avgZ - positions[vIdx * 3 + 2]) * factor;
    }
  }

  private applyGrabBrush(
    positions: Float32Array,
    vertexIndices: number[],
    weights: number[],
    localCenter: Vector3,
    strength: number
  ): void {
    if (!this.grabSnapshot || !this.grabStartWorld) return;

    // Compute delta from grab start to current center (in local space)
    const inverseMatrix = this.mesh?.getWorldMatrix().invert();
    if (!inverseMatrix) return;

    const currentLocalCenter = Vector3.TransformCoordinates(
      this.lastDabPosition ?? localCenter,
      inverseMatrix
    );
    const startLocalCenter = Vector3.TransformCoordinates(
      this.grabStartWorld,
      inverseMatrix
    );

    const deltaX = currentLocalCenter.x - startLocalCenter.x;
    const deltaY = currentLocalCenter.y - startLocalCenter.y;
    const deltaZ = currentLocalCenter.z - startLocalCenter.z;

    for (let i = 0; i < vertexIndices.length; i++) {
      const vIdx = vertexIndices[i];
      const w = weights[i];

      // Move from snapshot position by delta weighted by falloff
      positions[vIdx * 3] = this.grabSnapshot[vIdx * 3] + deltaX * w * strength * 3;
      positions[vIdx * 3 + 1] = this.grabSnapshot[vIdx * 3 + 1] + deltaY * w * strength * 3;
      positions[vIdx * 3 + 2] = this.grabSnapshot[vIdx * 3 + 2] + deltaZ * w * strength * 3;
    }
  }

  private applyInflateBrush(
    positions: Float32Array,
    vertexIndices: number[],
    weights: number[],
    localCenter: Vector3,
    strength: number
  ): void {
    // Push vertices outward from brush center (radial)
    for (let i = 0; i < vertexIndices.length; i++) {
      const vIdx = vertexIndices[i];
      const w = weights[i];

      const dx = positions[vIdx * 3] - localCenter.x;
      const dy = positions[vIdx * 3 + 1] - localCenter.y;
      const dz = positions[vIdx * 3 + 2] - localCenter.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist > 0.0001) {
        const factor = strength * w * 0.1;
        positions[vIdx * 3] += (dx / dist) * factor;
        positions[vIdx * 3 + 1] += (dy / dist) * factor;
        positions[vIdx * 3 + 2] += (dz / dist) * factor;
      }
    }
  }

  private applyPinchBrush(
    positions: Float32Array,
    vertexIndices: number[],
    weights: number[],
    localCenter: Vector3,
    strength: number
  ): void {
    // Pull vertices toward brush center
    for (let i = 0; i < vertexIndices.length; i++) {
      const vIdx = vertexIndices[i];
      const w = weights[i];

      const dx = positions[vIdx * 3] - localCenter.x;
      const dy = positions[vIdx * 3 + 1] - localCenter.y;
      const dz = positions[vIdx * 3 + 2] - localCenter.z;

      const factor = -strength * w * 0.15;
      positions[vIdx * 3] += dx * factor;
      positions[vIdx * 3 + 1] += dy * factor;
      positions[vIdx * 3 + 2] += dz * factor;
    }
  }

  private applyFlattenBrush(
    positions: Float32Array,
    vertexIndices: number[],
    weights: number[],
    localCenter: Vector3,
    normal: Vector3,
    strength: number
  ): void {
    // Project vertices onto average plane at brush center
    // Average plane: point = localCenter, normal = normal
    const d = normal.x * localCenter.x + normal.y * localCenter.y + normal.z * localCenter.z;

    for (let i = 0; i < vertexIndices.length; i++) {
      const vIdx = vertexIndices[i];
      const w = weights[i];

      const px = positions[vIdx * 3];
      const py = positions[vIdx * 3 + 1];
      const pz = positions[vIdx * 3 + 2];

      // Signed distance from plane
      const dist = normal.x * px + normal.y * py + normal.z * pz - d;

      // Move vertex toward plane
      const factor = strength * w * 0.5;
      positions[vIdx * 3] -= normal.x * dist * factor;
      positions[vIdx * 3 + 1] -= normal.y * dist * factor;
      positions[vIdx * 3 + 2] -= normal.z * dist * factor;
    }
  }

  private applyCreaseBrush(
    positions: Float32Array,
    vertexIndices: number[],
    weights: number[],
    localCenter: Vector3,
    normal: Vector3,
    strength: number
  ): void {
    // Sharpen: push along normal based on distance from center
    for (let i = 0; i < vertexIndices.length; i++) {
      const vIdx = vertexIndices[i];
      const w = weights[i];

      const dx = positions[vIdx * 3] - localCenter.x;
      const dy = positions[vIdx * 3 + 1] - localCenter.y;
      const dz = positions[vIdx * 3 + 2] - localCenter.z;

      // Signed distance along normal
      const normalDist = dx * normal.x + dy * normal.y + dz * normal.z;
      const factor = strength * w * 0.15;

      // Push positive side outward, negative side inward (crease effect)
      const sign = normalDist >= 0 ? 1 : -1;
      positions[vIdx * 3] += normal.x * sign * factor;
      positions[vIdx * 3 + 1] += normal.y * sign * factor;
      positions[vIdx * 3 + 2] += normal.z * sign * factor;
    }
  }

  // ---- Helpers ----

  private getAverageNormal(
    vertexIndices: number[],
    normals: Float32Array | null
  ): Vector3 {
    if (!normals || vertexIndices.length === 0) {
      return new Vector3(0, 1, 0);
    }

    let nx = 0;
    let ny = 0;
    let nz = 0;

    for (const vIdx of vertexIndices) {
      nx += normals[vIdx * 3];
      ny += normals[vIdx * 3 + 1];
      nz += normals[vIdx * 3 + 2];
    }

    const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (len > 0.0001) {
      nx /= len;
      ny /= len;
      nz /= len;
    } else {
      nx = 0;
      ny = 1;
      nz = 0;
    }

    return new Vector3(nx, ny, nz);
  }

  private rebuildNormals(): void {
    if (!this.mesh) return;
    const positions = this.mesh.getVerticesData("position");
    const indices = this.mesh.getIndices();
    if (!positions || !indices) return;

    const normals = new Float32Array(positions.length);
    VertexData.ComputeNormals(positions, indices, normals);
    this.mesh.updateVerticesData("normal", normals);
  }

  // ---- Brush Cursor ----

  updateBrushCursor(
    pickResult: PickingInfo | null,
    radius: number,
    visible: boolean
  ): void {
    if (!this.scene || !this.cursorMaterial) return;

    // Remove old cursor
    if (this.cursorMesh) {
      this.cursorMesh.dispose();
      this.cursorMesh = null;
    }

    if (!visible || !pickResult?.pickedPoint) return;

    const center = pickResult.pickedPoint;
    const normal = pickResult.getNormal(true, true);

    // Create a torus ring on the surface
    const segments = 48;
    const ringPoints: Vector3[] = [];

    // Build a coordinate frame on the surface
    if (!normal) return;
    const up = normal.normalize();
    let right = Vector3.Cross(up, Vector3.Forward());
    if (right.length() < 0.001) {
      right = Vector3.Cross(up, Vector3.Right());
    }
    right = right.normalize();
    const forward = Vector3.Cross(right, up).normalize();

    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const point = center
        .add(right.scale(x))
        .add(forward.scale(z))
        .add(up.scale(0.01)); // Slight offset to prevent z-fighting

      ringPoints.push(point);
    }

    this.cursorMesh = MeshBuilder.CreateLines(
      "sculptCursor",
      { points: ringPoints },
      this.scene
    );
    (this.cursorMesh as unknown as { color: Color3 }).color = new Color3(
      1,
      1,
      1
    );
    this.cursorMesh.isPickable = false;
  }

  hideBrushCursor(): void {
    if (this.cursorMesh) {
      this.cursorMesh.dispose();
      this.cursorMesh = null;
    }
  }

  // ---- Utility ----

  getMesh(): Mesh | null {
    return this.mesh;
  }

  getVertexCount(): number {
    return this.mesh?.getTotalVertices() ?? 0;
  }

  getFaceCount(): number {
    const indices = this.mesh?.getIndices();
    return indices ? indices.length / 3 : 0;
  }
}
