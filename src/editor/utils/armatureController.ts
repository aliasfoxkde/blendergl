/**
 * Armature Controller — manages Babylon.js Skeleton/Bone instances.
 *
 * Creates, modifies, and visualizes armatures attached to entity meshes.
 * Follows the EditModeController pattern for overlay rendering.
 */

import {
  Mesh,
  Vector3,
  Color3,
  Color4,
  StandardMaterial,
  MeshBuilder,
} from "@babylonjs/core";
import { Bone, Skeleton } from "@babylonjs/core/Bones";
import type { Scene } from "@babylonjs/core";
import type { LinesMesh } from "@babylonjs/core/Meshes/linesMesh";
import type { BoneData, ArmatureComponent, BoneTransform, SkinWeights, Vec3 } from "@/editor/types";

// Module-level ref for cross-component access (follows editModeRef pattern)
export const armatureControllerRef: { current: ArmatureController | null } = {
  current: null,
};

export class ArmatureController {
  private skeleton: Skeleton | null = null;
  private scene: Scene | null = null;

  // Visualization
  private boneLines: LinesMesh | null = null;
  private jointSpheres: Mesh[] = [];
  private boneHighlightMat: StandardMaterial | null = null;
  private activeBoneMat: StandardMaterial | null = null;

  attach(entityId: string, scene: Scene): void {
    this.dispose();
    this.scene = scene;

    // Create Babylon.js skeleton
    this.skeleton = new Skeleton("armature_" + entityId, "", scene);

    // Create highlight materials
    this.boneHighlightMat = new StandardMaterial("boneHighlight", scene);
    this.boneHighlightMat.diffuseColor = new Color3(0.1, 0.8, 0.1);
    this.boneHighlightMat.emissiveColor = new Color3(0.05, 0.3, 0.05);
    this.boneHighlightMat.disableLighting = true;

    this.activeBoneMat = new StandardMaterial("activeBone", scene);
    this.activeBoneMat.diffuseColor = new Color3(1, 0.6, 0);
    this.activeBoneMat.emissiveColor = new Color3(0.4, 0.2, 0);
    this.activeBoneMat.disableLighting = true;

    armatureControllerRef.current = this;
  }

  /** Add a bone to the skeleton. Returns the Babylon.js Bone. */
  addBone(boneData: BoneData): Bone | null {
    if (!this.skeleton || !this.scene) return null;

    const parentBone = boneData.parentId
      ? this.skeleton.bones.find((b) => b.metadata?.boneId === boneData.parentId) ?? null
      : null;

    const bone = new Bone(
      boneData.name,
      this.skeleton,
      parentBone,
      null, // default transform matrix
      null, // no rest pose
      null  // no bind pose
    );
    bone.setPosition(new Vector3(boneData.restPosition.x, boneData.restPosition.y, boneData.restPosition.z));
    bone.metadata = { boneId: boneData.id };

    return bone;
  }

  /** Remove a bone from the skeleton. */
  removeBone(boneId: string): void {
    if (!this.skeleton) return;
    const bone = this.skeleton.bones.find((b) => b.metadata?.boneId === boneId);
    if (bone) {
      this.skeleton.bones = this.skeleton.bones.filter((b) => b !== bone);
    }
  }

  /** Set a bone's pose transform (position offset + rotation in Euler degrees). */
  setBonePose(boneId: string, position?: Vec3, rotation?: Vec3): void {
    if (!this.skeleton) return;
    const bone = this.skeleton.bones.find((b) => b.metadata?.boneId === boneId);
    if (!bone) return;
    if (position) {
      bone.setPosition(new Vector3(position.x, position.y, position.z));
    }
    if (rotation) {
      // Convert Euler degrees to radians
      const degToRad = (d: number) => (d * Math.PI) / 180;
      bone.setRotation(
        new Vector3(degToRad(rotation.x), degToRad(rotation.y), degToRad(rotation.z))
      );
    }
  }

  /** Get a bone's current pose transform. */
  getBonePose(boneId: string): BoneTransform | null {
    if (!this.skeleton) return null;
    const bone = this.skeleton.bones.find((b) => b.metadata?.boneId === boneId);
    if (!bone) return null;

    const pos = bone.getPosition();
    const rot = bone.getRotation();
    const radToDeg = (r: number) => (r * 180) / Math.PI;

    return {
      position: { x: pos.x, y: pos.y, z: pos.z },
      rotation: { x: radToDeg(rot.x), y: radToDeg(rot.y), z: radToDeg(rot.z) },
      scale: { x: 1, y: 1, z: 1 },
    };
  }

  /** Reset all bones to rest pose. */
  resetToRestPose(armData: ArmatureComponent): void {
    if (!this.skeleton) return;
    for (const bone of this.skeleton.bones) {
      const boneId = bone.metadata?.boneId;
      const boneData = boneId ? armData.bones[boneId] : null;
      if (boneData) {
        bone.setPosition(
          new Vector3(boneData.restPosition.x, boneData.restPosition.y, boneData.restPosition.z)
        );
        bone.setRotation(Vector3.Zero());
      }
    }
  }

  /** Get all bone poses as a map for animation evaluation. */
  getAllBonePoses(armData: ArmatureComponent): Record<string, BoneTransform> {
    const poses: Record<string, BoneTransform> = {};
    for (const [boneId] of Object.entries(armData.bones)) {
      const pose = this.getBonePose(boneId);
      if (pose) {
        poses[boneId] = pose;
      }
    }
    return poses;
  }

  /** Apply evaluated animation poses to all bones. */
  applyPoses(poseMap: Record<string, BoneTransform>): void {
    for (const [boneId, pose] of Object.entries(poseMap)) {
      this.setBonePose(boneId, pose.position, pose.rotation);
    }
  }

  /** Get the Babylon.js Skeleton (for attaching to meshes). */
  getSkeleton(): Skeleton | null {
    return this.skeleton;
  }

  /**
   * Apply skinned mesh rendering to a Babylon.js mesh.
   * Sets mesh.skeleton and mesh.bonesMatrices from vertex weights.
   */
  applySkinning(
    mesh: Mesh,
    skinWeights: SkinWeights,
    _armData: ArmatureComponent,
  ): boolean {
    if (!this.skeleton) return false;

    const bones = this.skeleton.bones;
    if (bones.length === 0) return false;

    // Map bone IDs to skeleton indices
    const boneIdToIndex = new Map<string, number>();
    for (let i = 0; i < bones.length; i++) {
      const boneId = bones[i].metadata?.boneId as string | undefined;
      if (boneId) {
        boneIdToIndex.set(boneId, i);
      }
    }


    // Set numBoneInfluences to max bones per vertex (4 for StandardMaterial)
    mesh.numBoneInfluencers = 4;

    // Attach skeleton to mesh
    mesh.skeleton = this.skeleton;

    // Return skeleton to rest pose
    this.skeleton.returnToRest();

    // Set vertex bone data (indices and weights)
    // Babylon.js expects: mesh.boneMatrices + mesh.metadata.bonesData
    const vertexCount = mesh.getTotalVertices();
    if (vertexCount === 0) return false;

    // Build per-vertex bone indices and weights arrays
    const boneIndices = new Float32Array(vertexCount * 4);
    const boneWeights = new Float32Array(vertexCount * 4);

    // Get all bone IDs that have weights
    const weightedBoneIds = Object.keys(skinWeights.boneWeights);

    for (let v = 0; v < vertexCount; v++) {
      // Collect (weight, boneIndex) pairs for this vertex
      const pairs: [number, number][] = [];
      for (const boneId of weightedBoneIds) {
        const weights = skinWeights.boneWeights[boneId];
        if (!weights || v >= weights.length) continue;
        const w = weights[v];
        if (w <= 0) continue;
        const boneIndex = boneIdToIndex.get(boneId);
        if (boneIndex === undefined) continue;
        pairs.push([w, boneIndex]);
      }

      // Sort by weight descending, take top 4
      pairs.sort((a, b) => b[0] - a[0]);
      const topN = pairs.slice(0, 4);

      // Normalize weights
      let totalW = 0;
      for (const [w] of topN) totalW += w;

      for (let j = 0; j < 4; j++) {
        const idx = v * 4 + j;
        if (j < topN.length) {
          boneWeights[idx] = totalW > 0 ? topN[j][0] / totalW : 0;
          boneIndices[idx] = topN[j][1];
        } else {
          boneWeights[idx] = 0;
          boneIndices[idx] = 0;
        }
      }
    }

    // Set bone indices and weights as vertex buffer
    mesh.setVerticesData("boneIndices", boneIndices);
    mesh.setVerticesData("boneWeights", boneWeights);

    return true;
  }

  /**
   * Remove skinning from a mesh.
   */
  removeSkinning(mesh: Mesh): void {
    mesh.skeleton = null;
    mesh.numBoneInfluencers = 0;
  }

  /** Update bone visualization overlay. */
  updateVisualization(
    armData: ArmatureComponent,
    selectedBoneIds: Set<string>,
    activeBoneId: string | null
  ): void {
    if (!this.scene) return;

    // Dispose old visualization
    this.clearVisualization();

    const bonePositions: Vector3[] = [];
    const boneColors: Color3[] = [];

    for (const [boneId, boneData] of Object.entries(armData.bones)) {
      // Get bone world position (tip = rest position + length along Y)
      const bone = this.skeleton?.bones.find((b) => b.metadata?.boneId === boneId);
      const worldPos = bone
        ? bone.getAbsolutePosition().clone()
        : new Vector3(boneData.restPosition.x, boneData.restPosition.y, boneData.restPosition.z);

      // Bone start (parent joint or rest position)
      let startPos: Vector3;
      if (boneData.parentId && bone?.getParent()) {
        startPos = bone.getParent()!.getAbsolutePosition().clone();
      } else {
        startPos = new Vector3(boneData.restPosition.x, boneData.restPosition.y, boneData.restPosition.z);
      }

      // Bone end (start + direction * length)
      let dir = worldPos.subtract(startPos);
      if (dir.length() < 0.001) {
        dir = new Vector3(0, 1, 0); // Default up
      }
      dir.normalize();
      const endPos = startPos.add(dir.scale(boneData.length));

      bonePositions.push(startPos, endPos);

      // Color: yellow for selected, orange for active, gray for normal
      if (activeBoneId === boneId) {
        boneColors.push(new Color3(1, 0.6, 0), new Color3(1, 0.6, 0));
      } else if (selectedBoneIds.has(boneId)) {
        boneColors.push(new Color3(0.9, 0.9, 0.1), new Color3(0.9, 0.9, 0.1));
      } else {
        boneColors.push(new Color3(0.6, 0.6, 0.6), new Color3(0.6, 0.6, 0.6));
      }

      // Joint sphere at bone start
      const sphere = MeshBuilder.CreateSphere(
        `joint_${boneId}`,
        { diameter: activeBoneId === boneId ? 0.2 : selectedBoneIds.has(boneId) ? 0.16 : 0.1 },
        this.scene
      );
      sphere.position = startPos;
      sphere.material = activeBoneId === boneId
        ? this.activeBoneMat
        : selectedBoneIds.has(boneId)
          ? this.boneHighlightMat
          : null;
      sphere.isPickable = false;
      this.jointSpheres.push(sphere);
    }

    if (bonePositions.length >= 2) {
      // Create bone lines
      const lineSystem = MeshBuilder.CreateLineSystem(
        "boneLines",
        { lines: bonePositions.map((p, i) => [p, bonePositions[i + 1] ?? p]).filter((_, i) => i % 2 === 0), colors: boneColors.map((c) => [new Color4(c.r, c.g, c.b, 1), new Color4(c.r, c.g, c.b, 1)]) },
        this.scene
      );
      lineSystem.isPickable = false;
      this.boneLines = lineSystem as LinesMesh;
    }
  }

  /** Clear visualization overlays. */
  clearVisualization(): void {
    if (this.boneLines) {
      this.boneLines.dispose();
      this.boneLines = null;
    }
    for (const sphere of this.jointSpheres) {
      sphere.dispose();
    }
    this.jointSpheres = [];
  }

  /** Pick bone by world position (find closest bone to click point). */
  pickBone(worldPos: Vector3, armData: ArmatureComponent): string | null {
    let closestId: string | null = null;
    let closestDist = 0.5; // Max pick distance

    for (const [boneId, boneData] of Object.entries(armData.bones)) {
      const bone = this.skeleton?.bones.find((b) => b.metadata?.boneId === boneId);
      const pos = bone
        ? bone.getAbsolutePosition().clone()
        : new Vector3(boneData.restPosition.x, boneData.restPosition.y, boneData.restPosition.z);

      const dist = Vector3.Distance(worldPos, pos);
      if (dist < closestDist) {
        closestDist = dist;
        closestId = boneId;
      }
    }

    return closestId;
  }

  /** Dispose all resources. */
  dispose(): void {
    this.clearVisualization();
    if (this.boneHighlightMat) {
      this.boneHighlightMat.dispose();
      this.boneHighlightMat = null;
    }
    if (this.activeBoneMat) {
      this.activeBoneMat.dispose();
      this.activeBoneMat = null;
    }
    this.skeleton = null;
    this.scene = null;
    armatureControllerRef.current = null;
  }
}
