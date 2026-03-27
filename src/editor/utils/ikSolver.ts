/**
 * IK (Inverse Kinematics) solver using CCD (Cyclic Coordinate Descent).
 * Solves for bone rotations to reach a target position.
 */

import type { BoneData, Vec3 } from "@/editor/types";

/**
 * Solve IK using CCD algorithm.
 * Iteratively adjusts bone rotations to move end-effector toward target.
 *
 * @param bones - All bones in the armature (as Record)
 * @param rootBoneId - ID of the root bone to start the chain from
 * @param endBoneId - ID of the end-effector bone
 * @param targetWorld - Target position in world space
 * @param boneWorldTransforms - Current world transforms for each bone (position + forward)
 * @param maxIterations - Max CCD iterations (default 10)
 * @param tolerance - Distance threshold to consider solved (default 0.01)
 * @returns Updated bone rotations as Record<boneId, Vec3>
 */
export function solveCCD(
  bones: Record<string, BoneData>,
  rootBoneId: string,
  endBoneId: string,
  targetWorld: Vec3,
  boneWorldTransforms: Record<string, { position: Vec3; forward: Vec3 }>,
  maxIterations = 10,
  tolerance = 0.01,
): Record<string, Vec3> {
  // Build chain from end to root
  const chain = buildBoneChain(bones, rootBoneId, endBoneId);
  if (chain.length < 2) return {};

  // Copy current rotations
  const rotations: Record<string, Vec3> = {};
  for (const boneId of chain) {
    rotations[boneId] = { ...bones[boneId].restRotation };
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    // Get current end-effector position (approximation using chain of positions)
    const endPos = getEndEffectorPosition(chain, boneWorldTransforms);

    const dx = targetWorld.x - endPos.x;
    const dy = targetWorld.y - endPos.y;
    const dz = targetWorld.z - endPos.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance < tolerance) break;

    // CCD: iterate from end to root
    for (let i = chain.length - 1; i >= 1; i--) {
      const boneId = chain[i];
      const boneWorld = boneWorldTransforms[boneId];
      if (!boneWorld) continue;

      const bonePos = boneWorld.position;
      const endEff = getEndEffectorPosition(chain, boneWorldTransforms);

      // Vector from bone to end-effector
      const toEnd = {
        x: endEff.x - bonePos.x,
        y: endEff.y - bonePos.y,
        z: endEff.z - bonePos.z,
      };

      // Vector from bone to target
      const toTarget = {
        x: targetWorld.x - bonePos.x,
        y: targetWorld.y - bonePos.y,
        z: targetWorld.z - bonePos.z,
      };

      // Angle between the two vectors
      const dot = toEnd.x * toTarget.x + toEnd.y * toTarget.y + toEnd.z * toTarget.z;
      const cross = {
        x: toEnd.y * toTarget.z - toEnd.z * toTarget.y,
        y: toEnd.z * toTarget.x - toEnd.x * toTarget.z,
        z: toEnd.x * toTarget.y - toEnd.y * toTarget.x,
      };
      const lenEnd = Math.sqrt(toEnd.x * toEnd.x + toEnd.y * toEnd.y + toEnd.z * toEnd.z);
      const lenTarget = Math.sqrt(toTarget.x * toTarget.x + toTarget.y * toTarget.y + toTarget.z * toTarget.z);

      if (lenEnd < 0.001 || lenTarget < 0.001) continue;

      const angle = Math.atan2(
        Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z),
        dot,
      );

      // Apply rotation delta (CCD rotates around bone's local axis)
      rotations[boneId].z += angle;
    }
  }

  return rotations;
}

/**
 * Look-at constraint: rotate bone to point at target.
 */
export function solveLookAt(
  boneWorldTransform: { position: Vec3; forward: Vec3 },
  targetWorld: Vec3,
): Vec3 {
  const pos = boneWorldTransform.position;
  const dx = targetWorld.x - pos.x;
  const dz = targetWorld.z - pos.z;

  return {
    x: 0,
    y: Math.atan2(-dx, dz),
    z: 0,
  };
}

/**
 * Build a chain of bone IDs from root to end.
 */
function buildBoneChain(
  bones: Record<string, BoneData>,
  rootId: string,
  endId: string,
): string[] {
  const chain: string[] = [];
  let current: string = endId;

  while (current) {
    chain.push(current);
    if (current === rootId) break;
    const bone = bones[current];
    if (!bone) break;
    current = bone.parentId ?? "";
  }

  chain.reverse();
  return chain;
}

/**
 * Approximate end-effector position by summing bone positions + lengths.
 */
function getEndEffectorPosition(
  chain: string[],
  boneWorldTransforms: Record<string, { position: Vec3; forward: Vec3 }>,
): Vec3 {
  let pos = { x: 0, y: 0, z: 0 };

  for (const boneId of chain) {
    const boneWorld = boneWorldTransforms[boneId];
    if (boneWorld) {
      pos = { ...boneWorld.position };
    }
  }

  // Use last bone's forward direction to approximate end position
  if (chain.length > 0) {
    const lastBone = boneWorldTransforms[chain[chain.length - 1]];
    if (lastBone) {
      pos = { ...lastBone.position };
      pos.x += lastBone.forward.x;
      pos.y += lastBone.forward.y;
      pos.z += lastBone.forward.z;
    }
  }

  return pos;
}

/**
 * Two-bone IK (analytical solution for simple chains).
 * More accurate than CCD for 2-bone chains.
 */
export function solveTwoBoneIK(
  shoulderPos: Vec3,
  upperArmLength: number,
  forearmLength: number,
  targetPos: Vec3,
): { shoulderAngle: number; elbowAngle: number } {
  const dx = targetPos.x - shoulderPos.x;
  const dy = targetPos.y - shoulderPos.y;
  const dz = targetPos.z - shoulderPos.z;
  const distToTarget = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const l1 = upperArmLength;
  const l2 = forearmLength;

  // Clamp distance to reachable range
  const maxReach = l1 + l2 - 0.001;
  const minReach = Math.abs(l1 - l2) + 0.001;
  const clampedDist = Math.max(minReach, Math.min(maxReach, distToTarget));

  // Law of cosines for elbow angle
  const cosElbow = (l1 * l1 + l2 * l2 - clampedDist * clampedDist) / (2 * l1 * l2);
  const elbowAngle = Math.acos(Math.max(-1, Math.min(1, cosElbow)));

  // Shoulder angle (elevation)
  const baseAngle = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
  const cosAlpha = (l1 * l1 + clampedDist * clampedDist - l2 * l2) / (2 * l1 * clampedDist);
  const alpha = Math.acos(Math.max(-1, Math.min(1, cosAlpha)));
  const shoulderAngle = baseAngle + alpha;

  return {
    shoulderAngle,
    elbowAngle: Math.PI - elbowAngle,
  };
}

/**
 * Get world transform for each bone in an armature (chain of parent->child).
 */
export function computeBoneWorldTransforms(
  bones: Record<string, BoneData>,
  rootBoneIds: string[],
): Record<string, { position: Vec3; forward: Vec3 }> {
  const transforms: Record<string, { position: Vec3; forward: Vec3 }> = {};

  function computeBone(boneId: string, parentTransform: { position: Vec3; forward: Vec3 } | null): { position: Vec3; forward: Vec3 } {
    const bone = bones[boneId];
    if (!bone) return { position: { x: 0, y: 0, z: 0 }, forward: { x: 0, y: 1, z: 0 } };

    const boneLength = bone.length || 0.5;
    const basePos = parentTransform ? parentTransform.position : { x: 0, y: 0, z: 0 };

    // Simple forward direction based on rotation (simplified)
    const ry = bone.restRotation.y;
    const rx = bone.restRotation.x;
    const forward = {
      x: -Math.sin(ry) * Math.cos(rx),
      y: Math.sin(rx),
      z: -Math.cos(ry) * Math.cos(rx),
    };

    const position = {
      x: basePos.x + forward.x * boneLength,
      y: basePos.y + forward.y * boneLength,
      z: basePos.z + forward.z * boneLength,
    };

    transforms[boneId] = { position, forward };

    // Recurse into children
    for (const [childId, childBone] of Object.entries(bones)) {
      if (childBone.parentId === boneId) {
        computeBone(childId, transforms[boneId]);
      }
    }

    return transforms[boneId];
  }

  for (const rootId of rootBoneIds) {
    computeBone(rootId, null);
  }

  return transforms;
}
