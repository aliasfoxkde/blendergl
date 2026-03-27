import {
  Scene,
  AbstractMesh,
  GizmoManager,
  PositionGizmo,
  ScaleGizmo,
} from "@babylonjs/core";
import type { TransformMode } from "@/editor/types";

export class TransformGizmoController {
  private gizmoManager: GizmoManager;
  private _mode: TransformMode = "translate";

  constructor(scene: Scene) {
    this.gizmoManager = new GizmoManager(scene);
    this.gizmoManager.positionGizmoEnabled = true;
    this.gizmoManager.rotationGizmoEnabled = false;
    this.gizmoManager.scaleGizmoEnabled = false;
    this.gizmoManager.usePointerToAttachGizmos = false;
    this.gizmoManager.clearGizmoOnEmptyPointerEvent = true;

    // Disable default gizmo behavior - we handle attachment ourselves
    this.gizmoManager.attachableMeshes = null;
  }

  get mode(): TransformMode {
    return this._mode;
  }

  set mode(value: TransformMode) {
    this._mode = value;
    this.gizmoManager.positionGizmoEnabled = value === "translate";
    this.gizmoManager.rotationGizmoEnabled = value === "rotate";
    this.gizmoManager.scaleGizmoEnabled = value === "scale";
  }

  attachToMesh(mesh: AbstractMesh | null): void {
    this.gizmoManager.attachToMesh(mesh);
  }

  setSnapEnabled(enabled: boolean): void {
    if (this.gizmoManager.gizmos) {
      const posGizmo = this.gizmoManager.gizmos.positionGizmo as
        | PositionGizmo
        | undefined;
      if (posGizmo) {
        posGizmo.snapDistance = enabled ? 0.5 : 0;
        posGizmo.updateGizmoRotationToMatchAttachedMesh = false;
      }

      const scaleGizmo = this.gizmoManager.gizmos.scaleGizmo as
        | ScaleGizmo
        | undefined;
      if (scaleGizmo) {
        scaleGizmo.snapDistance = enabled ? 0.1 : 0;
      }
    }
  }

  setSnapDistance(distance: number): void {
    if (this.gizmoManager.gizmos) {
      const posGizmo = this.gizmoManager.gizmos.positionGizmo as
        | PositionGizmo
        | undefined;
      if (posGizmo) {
        posGizmo.snapDistance = distance;
      }
    }
  }

  setAxisConstraint(axis: "x" | "y" | "z" | "all"): void {
    if (this.gizmoManager.gizmos) {
      const xGizmo = this.gizmoManager.gizmos.positionGizmo?.xGizmo;
      const yGizmo = this.gizmoManager.gizmos.positionGizmo?.yGizmo;
      const zGizmo = this.gizmoManager.gizmos.positionGizmo?.zGizmo;

      if (xGizmo) xGizmo.isEnabled = axis === "x" || axis === "all";
      if (yGizmo) yGizmo.isEnabled = axis === "y" || axis === "all";
      if (zGizmo) zGizmo.isEnabled = axis === "z" || axis === "all";
    }
  }

  dispose(): void {
    this.gizmoManager.dispose();
  }
}
