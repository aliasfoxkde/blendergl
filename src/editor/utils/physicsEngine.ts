/**
 * Lightweight physics engine using Babylon.js transforms.
 * No external WASM dependency — uses simple Euler integration for
 * rigid body dynamics with sphere/box collision detection.
 */

import type { Scene, AbstractMesh } from "@babylonjs/core";
import { Color3, MeshBuilder, StandardMaterial } from "@babylonjs/core";
import type { Vec3, PhysicsBodyData } from "@/editor/types";
import { sceneRef } from "@/editor/utils/sceneRef";

export interface SweepTestResult {
  hit: boolean;
  entityId: string | null;
  distance: number;
  normal: Vec3;
  point: Vec3;
}

export interface OverlapTestResult {
  hit: boolean;
  entityIds: string[];
}

interface PhysicsObject {
  mesh: AbstractMesh;
  data: PhysicsBodyData;
  velocity: Vec3;
  angularVelocity: Vec3;
  isGrounded: boolean;
}

class PhysicsEngine {
  private objects: Map<string, PhysicsObject> = new Map();
  private scene: Scene | null = null;
  private gravity: Vec3 = { x: 0, y: -9.81, z: 0 };
  private fixedTimeStep: number = 1 / 60;
  private maxSubSteps: number = 4;
  private accumulator: number = 0;
  private groundY: number = 0;
  private running: boolean = false;
  private animFrameId: number = 0;
  private lastTime: number = 0;
  private onCollisionCallbacks: Map<string, (other: string) => void> = new Map();

  init(gravity: Vec3, fixedTimeStep: number, maxSubSteps: number): void {
    this.gravity = gravity;
    this.fixedTimeStep = fixedTimeStep;
    this.maxSubSteps = maxSubSteps;
  }

  start(): void {
    this.scene = sceneRef.current;
    if (!this.scene) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  pause(): void {
    this.running = false;
  }

  resume(): void {
    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      this.loop();
    }
  }

  addBody(entityId: string, mesh: AbstractMesh, data: PhysicsBodyData): void {
    if (data.motionType === "static" || data.motionType === "kinematic") {
      this.objects.set(entityId, {
        mesh,
        data,
        velocity: { x: 0, y: 0, z: 0 },
        angularVelocity: { x: 0, y: 0, z: 0 },
        isGrounded: false,
      });
    } else {
      this.objects.set(entityId, {
        mesh,
        data,
        velocity: { x: 0, y: 0, z: 0 },
        angularVelocity: { x: 0, y: 0, z: 0 },
        isGrounded: false,
      });
    }
  }

  removeBody(entityId: string): void {
    this.objects.delete(entityId);
  }

  setVelocity(entityId: string, vel: Vec3): void {
    const obj = this.objects.get(entityId);
    if (obj) {
      obj.velocity = { ...vel };
    }
  }

  getVelocity(entityId: string): Vec3 {
    const obj = this.objects.get(entityId);
    return obj ? { ...obj.velocity } : { x: 0, y: 0, z: 0 };
  }

  isGrounded(entityId: string): boolean {
    return this.objects.get(entityId)?.isGrounded ?? false;
  }

  onCollision(entityId: string, callback: (other: string) => void): void {
    this.onCollisionCallbacks.set(entityId, callback);
  }

  applyForce(entityId: string, force: Vec3): void {
    const obj = this.objects.get(entityId);
    if (obj && obj.data.motionType === "dynamic") {
      const invMass = obj.data.mass > 0 ? 1 / obj.data.mass : 0;
      obj.velocity.x += force.x * invMass;
      obj.velocity.y += force.y * invMass;
      obj.velocity.z += force.z * invMass;
    }
  }

  applyImpulse(entityId: string, impulse: Vec3): void {
    this.applyForce(entityId, {
      x: impulse.x * this.fixedTimeStep,
      y: impulse.y * this.fixedTimeStep,
      z: impulse.z * this.fixedTimeStep,
    });
  }

  reset(): void {
    this.objects.clear();
    this.accumulator = 0;
    this.onCollisionCallbacks.clear();
  }

  /** Simple AABB overlap check */
  checkOverlap(posA: Vec3, halfA: Vec3, posB: Vec3, halfB: Vec3): boolean {
    return (
      Math.abs(posA.x - posB.x) < halfA.x + halfB.x &&
      Math.abs(posA.y - posB.y) < halfA.y + halfB.y &&
      Math.abs(posA.z - posB.z) < halfA.z + halfB.z
    );
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    let frameTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    // Clamp to avoid spiral of death
    if (frameTime > 0.25) frameTime = 0.25;

    this.accumulator += frameTime;

    let steps = 0;
    while (this.accumulator >= this.fixedTimeStep && steps < this.maxSubSteps) {
      this.fixedUpdate(this.fixedTimeStep);
      this.accumulator -= this.fixedTimeStep;
      steps++;
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private fixedUpdate(dt: number): void {
    const entries = Array.from(this.objects.entries());

    for (const [id, obj] of entries) {
      if (obj.data.motionType !== "dynamic") continue;

      // Apply gravity
      obj.velocity.x += this.gravity.x * dt;
      obj.velocity.y += this.gravity.y * dt;
      obj.velocity.z += this.gravity.z * dt;

      // Apply damping
      const linDamp = 1 - obj.data.linearDamping * dt;
      const angDamp = 1 - obj.data.angularDamping * dt;
      obj.velocity.x *= linDamp;
      obj.velocity.y *= linDamp;
      obj.velocity.z *= linDamp;
      obj.angularVelocity.x *= angDamp;
      obj.angularVelocity.y *= angDamp;
      obj.angularVelocity.z *= angDamp;

      // Integrate position
      const mesh = obj.mesh;
      mesh.position.x += obj.velocity.x * dt;
      mesh.position.y += obj.velocity.y * dt;
      mesh.position.z += obj.velocity.z * dt;

      // Integrate rotation
      mesh.rotation.x += obj.angularVelocity.x * dt;
      mesh.rotation.y += obj.angularVelocity.y * dt;
      mesh.rotation.z += obj.angularVelocity.z * dt;

      // Ground collision
      const boundingInfo = mesh.getBoundingInfo();
      const minY = mesh.position.y - (boundingInfo ? boundingInfo.boundingBox.extendSizeWorld.y : 0.5);
      obj.isGrounded = false;

      if (minY < this.groundY) {
        mesh.position.y += this.groundY - minY;
        if (obj.velocity.y < 0) {
          obj.velocity.y *= -obj.data.restitution;
          // Stop tiny bounces
          if (Math.abs(obj.velocity.y) < 0.1) {
            obj.velocity.y = 0;
          }
          // Apply friction to horizontal velocity
          obj.velocity.x *= (1 - obj.data.friction);
          obj.velocity.z *= (1 - obj.data.friction);
          obj.isGrounded = true;
        }
        // Stop angular velocity on ground
        obj.angularVelocity.x *= 0.95;
        obj.angularVelocity.z *= 0.95;
      }

      // Slope handling
      if (obj.isGrounded) {
        this.applySlopeHandling(id);
      }
    }

    // Object-to-object collision (dynamic vs static/dynamic)
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const [idA, objA] = entries[i];
        const [idB, objB] = entries[j];

        // Skip if both are static
        if (objA.data.motionType === "static" && objB.data.motionType === "static") continue;

        // Skip if layers don't match
        if (!(objA.data.collisionLayer & objB.data.collisionMask) &&
            !(objB.data.collisionLayer & objA.data.collisionMask)) continue;

        // Trigger volumes only detect overlap
        if (objA.data.isTrigger || objB.data.isTrigger) {
          const halfA = this.getHalfExtents(objA);
          const halfB = this.getHalfExtents(objB);
          const posA = objA.mesh.position;
          const posB = objB.mesh.position;
          const overlapping = this.checkOverlap(
            { x: posA.x, y: posA.y, z: posA.z },
            halfA,
            { x: posB.x, y: posB.y, z: posB.z },
            halfB,
          );
          if (overlapping) {
            const cbA = this.onCollisionCallbacks.get(idA);
            const cbB = this.onCollisionCallbacks.get(idB);
            if (cbA && objA.data.isTrigger) cbA(idB);
            if (cbB && objB.data.isTrigger) cbB(idA);
          }
          continue;
        }

        // AABB collision response
        this.resolveCollision(idA, idB, objA, objB);
      }
    }
  }

  private getHalfExtents(obj: PhysicsObject): Vec3 {
    const bi = obj.mesh.getBoundingInfo();
    if (bi) {
      return {
        x: bi.boundingBox.extendSizeWorld.x,
        y: bi.boundingBox.extendSizeWorld.y,
        z: bi.boundingBox.extendSizeWorld.z,
      };
    }
    return { x: 0.5, y: 0.5, z: 0.5 };
  }

  /**
   * Sweep test — cast a shape along a direction and find first hit.
   * Returns the closest hit distance, normal, point, and entity ID.
   */
  sweepTest(
    entityId: string,
    direction: Vec3,
    maxDistance: number = 100,
  ): SweepTestResult {
    const obj = this.objects.get(entityId);
    if (!obj) return { hit: false, entityId: null, distance: 0, normal: { x: 0, y: 1, z: 0 }, point: { x: 0, y: 0, z: 0 } };

    const halfExt = this.getHalfExtents(obj);
    const startPos = obj.mesh.position;
    const dirLen = Math.sqrt(direction.x * direction.x + direction.y * direction.y + direction.z * direction.z);
    if (dirLen < 0.0001) return { hit: false, entityId: null, distance: 0, normal: { x: 0, y: 1, z: 0 }, point: { x: 0, y: 0, z: 0 } };

    const stepX = (direction.x / dirLen) * 0.1;
    const stepY = (direction.y / dirLen) * 0.1;
    const stepZ = (direction.z / dirLen) * 0.1;
    const steps = Math.floor(maxDistance / 0.1);

    for (let s = 1; s <= steps; s++) {
      const testPos: Vec3 = {
        x: startPos.x + stepX * s,
        y: startPos.y + stepY * s,
        z: startPos.z + stepZ * s,
      };

      for (const [otherId, otherObj] of this.objects) {
        if (otherId === entityId) continue;
        const otherHalf = this.getHalfExtents(otherObj);
        const otherPos = otherObj.mesh.position;
        if (this.checkOverlap(testPos, halfExt, { x: otherPos.x, y: otherPos.y, z: otherPos.z }, otherHalf)) {
          // Calculate normal (direction of separation)
          const overlapX = (halfExt.x + otherHalf.x) - Math.abs(testPos.x - otherPos.x);
          const overlapY = (halfExt.y + otherHalf.y) - Math.abs(testPos.y - otherPos.y);
          const overlapZ = (halfExt.z + otherHalf.z) - Math.abs(testPos.z - otherPos.z);
          const minOverlap = Math.min(overlapX, overlapY, overlapZ);
          const normal: Vec3 = { x: 0, y: 0, z: 0 };
          if (minOverlap === overlapX) normal.x = testPos.x < otherPos.x ? -1 : 1;
          else if (minOverlap === overlapY) normal.y = testPos.y < otherPos.y ? -1 : 1;
          else normal.z = testPos.z < otherPos.z ? -1 : 1;

          return {
            hit: true,
            entityId: otherId,
            distance: (s * 0.1),
            normal,
            point: { ...testPos },
          };
        }
      }
    }

    return { hit: false, entityId: null, distance: 0, normal: { x: 0, y: 1, z: 0 }, point: { x: 0, y: 0, z: 0 } };
  }

  /**
   * Overlap test — check if a shape at a given position overlaps any colliders.
   */
  overlapTest(
    position: Vec3,
    halfExtents: Vec3,
    excludeEntityId?: string,
  ): OverlapTestResult {
    const hits: string[] = [];

    for (const [id, obj] of this.objects) {
      if (id === excludeEntityId) continue;
      const objHalf = this.getHalfExtents(obj);
      const objPos = obj.mesh.position;
      if (this.checkOverlap(position, halfExtents, { x: objPos.x, y: objPos.y, z: objPos.z }, objHalf)) {
        hits.push(id);
      }
    }

    return { hit: hits.length > 0, entityIds: hits };
  }

  /**
   * Get the ground slope angle at an entity's position.
   * Used for slope handling in character controllers.
   * Returns angle in radians (0 = flat, PI/2 = vertical wall).
   */
  getSlopeAngle(entityId: string): number {
    const obj = this.objects.get(entityId);
    if (!obj || !obj.isGrounded) return 0;

    // Cast rays around the entity to sample ground normal
    const pos = obj.mesh.position;
    const offsets = [
      { x: -0.3, z: 0 }, { x: 0.3, z: 0 },
      { x: 0, z: -0.3 }, { x: 0, z: 0.3 },
    ];

    let normalX = 0;
    let normalY = 0;
    let normalZ = 0;
    let samples = 0;

    for (const offset of offsets) {
      const testX = pos.x + offset.x;
      const testZ = pos.z + offset.z;

      // Find ground height at this point
      let groundY = this.groundY;
      for (const [, otherObj] of this.objects) {
        if (otherObj.data.motionType !== "static") continue;
        const otherPos = otherObj.mesh.position;
        const otherHalf = this.getHalfExtents(otherObj);
        if (
          Math.abs(testX - otherPos.x) < otherHalf.x &&
          Math.abs(testZ - otherPos.z) < otherHalf.z
        ) {
          const topY = otherPos.y + otherHalf.y;
          if (topY > groundY && topY <= pos.y + 0.5) {
            groundY = topY;
          }
        }
      }

      // Estimate normal from height differences
      const dy = groundY - this.groundY;
      normalY += 1;
      normalX -= offset.x * dy * 3;
      normalZ -= offset.z * dy * 3;
      samples++;
    }

    if (samples === 0) return 0;

    // Normalize
    const len = Math.sqrt(normalX * normalX + normalY * normalY + normalZ * normalZ);
    if (len < 0.0001) return 0;

    // Slope angle = acos(normal.y)
    const slopeNormalY = normalY / len;
    return Math.acos(Math.min(1, Math.max(-1, slopeNormalY)));
  }

  /**
   * Get the max walkable slope angle (radians). Default: 45 degrees.
   */
  maxSlopeAngle: number = Math.PI / 4;

  /**
   * Apply slope handling to a dynamic body.
   * If the slope is too steep, the character slides down.
   */
  applySlopeHandling(entityId: string): void {
    const obj = this.objects.get(entityId);
    if (!obj || !obj.isGrounded || obj.data.motionType !== "dynamic") return;

    const slopeAngle = this.getSlopeAngle(entityId);

    if (slopeAngle > this.maxSlopeAngle) {
      // Too steep — apply sliding force
      const slideForce = Math.sin(slopeAngle - this.maxSlopeAngle) * 9.81;
      obj.velocity.x -= slideForce * 0.1;
      obj.velocity.z -= slideForce * 0.1;
    } else {
      // On walkable slope — adjust velocity to follow slope
      const slopeFactor = 1 - Math.sin(slopeAngle) * 0.3;
      obj.velocity.x *= slopeFactor;
      obj.velocity.z *= slopeFactor;
    }
  }

  // ---- Debug visualization ----

  private debugEnabled: boolean = false;
  private debugMeshes: AbstractMesh[] = [];

  setDebugEnabled(enabled: boolean): void {
    this.debugEnabled = enabled;
    if (!enabled) {
      this.clearDebugMeshes();
    }
  }

  isDebugEnabled(): boolean {
    return this.debugEnabled;
  }

  private clearDebugMeshes(): void {
    const scene = sceneRef.current;
    if (scene) {
      for (const mesh of this.debugMeshes) {
        mesh.dispose();
      }
    }
    this.debugMeshes = [];
  }

  /**
   * Render wireframe colliders for all physics bodies.
   */
  renderDebugVisuals(): void {
    if (!this.debugEnabled) return;

    this.clearDebugMeshes();

    const scene = this.scene;
    if (!scene) return;

    for (const [id, obj] of this.objects) {
      const half = this.getHalfExtents(obj);
      const isDynamic = obj.data.motionType === "dynamic";
      const isTrigger = obj.data.isTrigger;

      const debugMesh = MeshBuilder.CreateBox(
        `debug_${id}`,
        { width: half.x * 2, height: half.y * 2, depth: half.z * 2 },
        scene,
      );
      debugMesh.position = obj.mesh.position.clone();
      debugMesh.rotation = obj.mesh.rotation.clone();

      const mat = new StandardMaterial(`debugMat_${id}`, scene);
      mat.wireframe = true;

      if (isTrigger) {
        mat.diffuseColor = new Color3(0, 1, 1);
      } else if (isDynamic) {
        mat.diffuseColor = new Color3(1, 0.3, 0.3);
      } else {
        mat.diffuseColor = new Color3(0.3, 1, 0.3);
      }
      mat.alpha = 0.4;
      debugMesh.material = mat;
      debugMesh.isPickable = false;

      this.debugMeshes.push(debugMesh);
    }
  }

  private resolveCollision(_idA: string, _idB: string, objA: PhysicsObject, objB: PhysicsObject): void {
    const halfA = this.getHalfExtents(objA);
    const halfB = this.getHalfExtents(objB);
    const posA = objA.mesh.position;
    const posB = objB.mesh.position;

    if (!this.checkOverlap(
      { x: posA.x, y: posA.y, z: posA.z },
      halfA,
      { x: posB.x, y: posB.y, z: posB.z },
      halfB,
    )) return;

    // Calculate overlap on each axis
    const overlapX = (halfA.x + halfB.x) - Math.abs(posA.x - posB.x);
    const overlapY = (halfA.y + halfB.y) - Math.abs(posA.y - posB.y);
    const overlapZ = (halfA.z + halfB.z) - Math.abs(posA.z - posB.z);

    // Resolve along minimum overlap axis
    const minOverlap = Math.min(overlapX, overlapY, overlapZ);
    const normal: Vec3 = { x: 0, y: 0, z: 0 };

    if (minOverlap === overlapX) {
      normal.x = posA.x < posB.x ? -1 : 1;
    } else if (minOverlap === overlapY) {
      normal.y = posA.y < posB.y ? -1 : 1;
    } else {
      normal.z = posA.z < posB.z ? -1 : 1;
    }

    // Separate objects
    const separation = minOverlap * 0.5;
    if (objA.data.motionType === "dynamic") {
      objA.mesh.position.x += normal.x * separation;
      objA.mesh.position.y += normal.y * separation;
      objA.mesh.position.z += normal.z * separation;
    }
    if (objB.data.motionType === "dynamic") {
      objB.mesh.position.x -= normal.x * separation;
      objB.mesh.position.y -= normal.y * separation;
      objB.mesh.position.z -= normal.z * separation;
    }

    // Velocity response for dynamic objects
    const restitution = Math.max(objA.data.restitution, objB.data.restitution);
    const relVelX = objA.velocity.x - objB.velocity.x;
    const relVelY = objA.velocity.y - objB.velocity.y;
    const relVelZ = objA.velocity.z - objB.velocity.z;
    const relVelAlongNormal = relVelX * normal.x + relVelY * normal.y + relVelZ * normal.z;

    if (relVelAlongNormal > 0) return; // Moving apart

    const invMassA = objA.data.motionType === "dynamic" ? (objA.data.mass > 0 ? 1 / objA.data.mass : 0) : 0;
    const invMassB = objB.data.motionType === "dynamic" ? (objB.data.mass > 0 ? 1 / objB.data.mass : 0) : 0;
    const invMassSum = invMassA + invMassB;
    if (invMassSum === 0) return;

    const j = -(1 + restitution) * relVelAlongNormal / invMassSum;

    if (objA.data.motionType === "dynamic") {
      objA.velocity.x += j * invMassA * normal.x;
      objA.velocity.y += j * invMassA * normal.y;
      objA.velocity.z += j * invMassA * normal.z;
    }
    if (objB.data.motionType === "dynamic") {
      objB.velocity.x -= j * invMassB * normal.x;
      objB.velocity.y -= j * invMassB * normal.y;
      objB.velocity.z -= j * invMassB * normal.z;
    }
  }
}

// Singleton
export const physicsEngine = new PhysicsEngine();
