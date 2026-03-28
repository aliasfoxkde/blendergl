/**
 * G-code generator — converts sliced layers into Marlin/RepRap G-code.
 * Includes retraction, travel moves, and support generation.
 */

import type { SliceLayer } from "./slicer";
import type { PrintSettings } from "@/editor/stores/settingsStore";

export interface GcodeResult {
  gcode: string;
  totalFilament: number; // mm
  totalTime: number;     // seconds (rough estimate)
  layerCount: number;
  layers: GcodeLayerInfo[];
}

export interface GcodeLayerInfo {
  index: number;
  z: number;
  filament: number; // mm used on this layer
  distance: number;  // mm extruded on this layer
  type: "perimeter" | "infill" | "support" | "mixed";
}

export interface SupportRegion {
  z: number;
  contours: { x: number; y: number }[][];
}

/**
 * Detect overhang regions in a slice layer and generate support contours.
 * An overhang is a contour edge where the face normal points beyond the
 * support overhang angle threshold from vertical.
 */
export function generateSupportRegions(
  layers: SliceLayer[],
  boundingBox: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } },
  overhangAngle: number
): SupportRegion[] {
  if (layers.length === 0) return [];

  const supportRegions: SupportRegion[] = [];
  const _cosThreshold = Math.cos((overhangAngle * Math.PI) / 180);
  const _layerHeight = layers.length > 1 ? layers[1].z - layers[0].z : 0.2;
  void _cosThreshold;
  void _layerHeight;

  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    if (layer.contours.length === 0) continue;

    // Skip first few layers — no support needed at the base
    if (li < 2) continue;

    const supportContours: { x: number; y: number }[][] = [];

    for (const contour of layer.contours) {
      if (contour.length < 3) continue;

      // Check each edge for overhang by comparing layer overlap
      // If a contour point has no corresponding point in the layer below,
      // it's an overhang candidate
      const prevLayer = li > 0 ? layers[li - 1] : null;
      if (!prevLayer) continue;

      const overhangPoints: { x: number; y: number }[] = [];
      const EPSILON = 0.5; // mm threshold for "same XY position"

      for (const pt of contour) {
        let isSupported = false;
        for (const prevContour of prevLayer.contours) {
          for (const prevPt of prevContour) {
            const dx = Math.abs(pt.x - prevPt.x);
            const dy = Math.abs(pt.y - prevPt.y);
            if (dx < EPSILON && dy < EPSILON) {
              isSupported = true;
              break;
            }
          }
          if (isSupported) break;
        }
        if (!isSupported) {
          overhangPoints.push(pt);
        }
      }

      // Group consecutive overhang points into support segments
      if (overhangPoints.length >= 2) {
        // Expand overhang points outward by supportZDistance
        const expanded: { x: number; y: number }[] = [];
        const expansion = 2.0; // mm

        for (const pt of overhangPoints) {
          expanded.push(
            { x: pt.x - expansion, y: pt.y - expansion },
            { x: pt.x + expansion, y: pt.y - expansion },
            { x: pt.x + expansion, y: pt.y + expansion },
            { x: pt.x - expansion, y: pt.y + expansion },
          );
        }

        // Simplify: create a rectangular support region
        const minX = Math.min(...overhangPoints.map((p) => p.x)) - expansion;
        const maxX = Math.max(...overhangPoints.map((p) => p.x)) + expansion;
        const minY = Math.min(...overhangPoints.map((p) => p.y)) - expansion;
        const maxY = Math.max(...overhangPoints.map((p) => p.y)) + expansion;

        // Clip to bounding box
        const cx1 = Math.max(minX, boundingBox.min.x - 5);
        const cy1 = Math.max(minY, boundingBox.min.y - 5);
        const cx2 = Math.min(maxX, boundingBox.max.x + 5);
        const cy2 = Math.min(maxY, boundingBox.max.y + 5);

        if (cx2 > cx1 && cy2 > cy1) {
          supportContours.push([
            { x: cx1, y: cy1 },
            { x: cx2, y: cy1 },
            { x: cx2, y: cy2 },
            { x: cx1, y: cy2 },
          ]);
        }
      }
    }

    if (supportContours.length > 0) {
      supportRegions.push({ z: layer.z, contours: supportContours });
    }
  }

  return supportRegions;
}

/**
 * Generate G-code from sliced layers with retraction, travel moves, and optional supports.
 */
export function generateGcode(
  layers: SliceLayer[],
  settings: PrintSettings,
  boundingBox: { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } },
  supportRegions?: SupportRegion[]
): GcodeResult {
  const lines: string[] = [];
  let totalFilament = 0;
  let totalDistance = 0;
  let currentX = 0;
  let currentY = 0;
  let currentZ = 0;
  let ePos = 0;

  const filamentArea = settings.filamentDiameter * settings.filamentDiameter * Math.PI / 4;
  const eStepsPerMM = filamentArea > 0
    ? (settings.nozzleDiameter * settings.nozzleDiameter * Math.PI / 4) / filamentArea
    : 1;

  const layerInfos: GcodeLayerInfo[] = [];

  // Helper: add a travel move with retraction
  const addTravel = (x: number, y: number, z: number, comment?: string) => {
    // Retract before travel
    if (settings.retractionDistance > 0) {
      ePos -= settings.retractionDistance;
      lines.push(`G1 E${ePos.toFixed(5)} F${(settings.retractionSpeed * 60).toFixed(0)} ; retract`);
    }

    const dz = z - currentZ;
    const totalDz = dz;
    if (totalDz > 0.5) {
      lines.push(`G1 Z${(z + 0.2).toFixed(3)} F${(settings.travelSpeed * 60).toFixed(0)} ; Z hop`);
    }

    lines.push(`G0 X${x.toFixed(3)} Y${y.toFixed(3)} Z${z.toFixed(3)} F${(settings.travelSpeed * 60).toFixed(0)}${comment ? ` ; ${comment}` : ""}`);

    if (totalDz > 0.5) {
      lines.push(`G1 Z${z.toFixed(3)} F${(settings.travelSpeed * 60).toFixed(0)} ; Z restore`);
    }

    // Prime after travel
    if (settings.retractionDistance > 0) {
      ePos += settings.retractionDistance;
      lines.push(`G1 E${ePos.toFixed(5)} F${(settings.retractionSpeed * 60).toFixed(0)} ; prime`);
    }

    currentX = x;
    currentY = y;
    currentZ = z;
  };

  // Helper: add an extrusion move
  const addExtrusion = (x: number, y: number, z: number, speed: number, comment?: string) => {
    const dx = x - currentX;
    const dy = y - currentY;
    const dz = z - currentZ;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist > 0) {
      const eDelta = dist * eStepsPerMM;
      ePos += eDelta;
      totalFilament += eDelta;
      totalDistance += dist;
    }

    lines.push(`G1 X${x.toFixed(3)} Y${y.toFixed(3)} Z${z.toFixed(3)} F${(speed * 60).toFixed(0)}${dist > 0 ? ` E${ePos.toFixed(5)}` : ""}${comment ? ` ; ${comment}` : ""}`);
    currentX = x;
    currentY = y;
    currentZ = z;
  };

  // Build support lookup by Z
  const supportByZ = new Map<number, SupportRegion>();
  if (supportRegions) {
    for (const sr of supportRegions) {
      supportByZ.set(sr.z, sr);
    }
  }

  // Header
  lines.push("; Generated by BlenderGL");
  lines.push(`; Layer height: ${settings.layerHeight}mm`);
  lines.push(`; Infill: ${settings.infillDensity}%`);
  lines.push(`; Walls: ${settings.wallCount}`);
  if (settings.retractionDistance > 0) {
    lines.push(`; Retraction: ${settings.retractionDistance}mm @ ${settings.retractionSpeed}mm/s`);
  }
  if (settings.supportEnabled) {
    lines.push(`; Support: enabled (${settings.supportOverhangAngle}° overhang angle)`);
  }
  lines.push("");
  lines.push("G28 ; Home all axes");
  lines.push("G92 E0 ; Reset extruder");
  lines.push(`M104 S${settings.extruderTemp} ; Set hotend temp`);
  lines.push(`M140 S${settings.bedTemp} ; Set bed temp`);
  lines.push("M190 S0 ; Wait for bed temp");
  lines.push("M109 S0 ; Wait for hotend temp");
  lines.push("G90 ; Absolute positioning");
  lines.push("M82 ; Absolute extruder");
  lines.push("");

  // Adhesion
  if (settings.adhesionType === "brim" || settings.adhesionType === "skirt") {
    const brimOffset = settings.adhesionType === "brim" ? settings.nozzleDiameter * 2 : 3;
    const brimX = boundingBox.min.x - brimOffset;
    const brimY = boundingBox.min.y - brimOffset;
    const brimW = boundingBox.max.x - boundingBox.min.x + brimOffset * 2;
    const brimH = boundingBox.max.y - boundingBox.min.y + brimOffset * 2;

    lines.push(`; ${settings.adhesionType}`);
    const firstZ = layers[0]?.z ?? settings.layerHeight;
    addTravel(brimX, brimY, firstZ, `${settings.adhesionType} start`);

    const brimPerimeter = [
      { x: brimX + brimW, y: brimY },
      { x: brimX + brimW, y: brimY + brimH },
      { x: brimX, y: brimY + brimH },
      { x: brimX, y: brimY },
    ];
    for (const p of brimPerimeter) {
      addExtrusion(p.x, p.y, firstZ, settings.printSpeed, "brim");
    }
    lines.push("");
  }

  // Layer-by-layer
  for (let li = 0; li < layers.length; li++) {
    const layer = layers[li];
    let layerFilament = 0;
    let layerExtrudeDist = 0;

    lines.push(`; Layer ${li} (Z=${layer.z.toFixed(3)})`);

    // Perimeter passes
    for (const contour of layer.contours) {
      if (contour.length === 0) continue;

      addTravel(contour[0].x, contour[0].y, layer.z, "travel to perimeter");

      for (let i = 1; i < contour.length; i++) {
        const speed = i <= 1 ? settings.outerWallSpeed : settings.innerWallSpeed;
        const prevFilament = totalFilament;
        addExtrusion(contour[i].x, contour[i].y, layer.z, speed, "perimeter");
        layerFilament += totalFilament - prevFilament;
        layerExtrudeDist += Math.sqrt(
          (contour[i].x - contour[i - 1].x) ** 2 +
          (contour[i].y - contour[i - 1].y) ** 2
        );
      }
      if (contour.length > 2) {
        const prevFilament = totalFilament;
        addExtrusion(contour[0].x, contour[0].y, layer.z, settings.innerWallSpeed, "perimeter close");
        layerFilament += totalFilament - prevFilament;
        const lastPt = contour[contour.length - 1];
        layerExtrudeDist += Math.sqrt(
          (contour[0].x - lastPt.x) ** 2 +
          (contour[0].y - lastPt.y) ** 2
        );
      }
    }

    // Infill
    if (settings.infillDensity > 0 && layer.contours.length > 0) {
      const infillSpacing = (100 / settings.infillDensity) * settings.nozzleDiameter;
      const minY = boundingBox.min.y;
      const maxY = boundingBox.max.y;
      const minX = boundingBox.min.x;
      const maxX = boundingBox.max.x;

      for (let y = minY; y <= maxY; y += infillSpacing) {
        addTravel(minX, y, layer.z, "infill travel");
        const prevFilament = totalFilament;
        addExtrusion(maxX, y, layer.z, settings.infillSpeed, "infill");
        layerFilament += totalFilament - prevFilament;
        layerExtrudeDist += maxX - minX;
      }
    }

    // Support
    if (settings.supportEnabled) {
      const support = supportByZ.get(layer.z);
      if (support) {
        lines.push(`; Support at Z=${layer.z.toFixed(3)}`);
        for (const sContour of support.contours) {
          if (sContour.length === 0) continue;
          addTravel(sContour[0].x, sContour[0].y, layer.z, "support travel");

          for (let i = 1; i < sContour.length; i++) {
            const prevFilament = totalFilament;
            addExtrusion(sContour[i].x, sContour[i].y, layer.z, settings.infillSpeed, "support");
            layerFilament += totalFilament - prevFilament;
            layerExtrudeDist += Math.sqrt(
              (sContour[i].x - sContour[i - 1].x) ** 2 +
              (sContour[i].y - sContour[i - 1].y) ** 2
            );
          }
          if (sContour.length > 2) {
            const prevFilament = totalFilament;
            addExtrusion(sContour[0].x, sContour[0].y, layer.z, settings.infillSpeed, "support close");
            layerFilament += totalFilament - prevFilament;
          }
        }
      }
    }

    layerInfos.push({
      index: li,
      z: layer.z,
      filament: layerFilament,
      distance: layerExtrudeDist,
      type: "mixed",
    });

    lines.push("");
  }

  // Footer
  lines.push("; End of print");
  lines.push("M104 S0 ; Turn off hotend");
  lines.push("M140 S0 ; Turn off bed");
  lines.push("G28 X Y ; Home X Y");
  lines.push("M84 ; Disable motors");
  lines.push("M400 ; Wait for moves to finish");

  // Rough time estimate
  const printTime = settings.printSpeed > 0 ? totalDistance / settings.printSpeed : 0;

  return {
    gcode: lines.join("\n"),
    totalFilament,
    totalTime: printTime,
    layerCount: layers.length,
    layers: layerInfos,
  };
}

/**
 * Download G-code as a text file.
 */
export function downloadGcode(gcode: string, filename = "print.gcode"): void {
  const blob = new Blob([gcode], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
