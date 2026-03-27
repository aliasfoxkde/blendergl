/**
 * Basic mesh slicer — intersects a triangle mesh with horizontal planes
 * at each layer height to produce closed contour polylines.
 */

export interface SliceLayer {
  z: number;
  contours: Vec2[][]; // Array of closed polylines (each is an array of [x,y] points)
}

export interface Vec2 {
  x: number;
  y: number;
}

/**
 * Slice a mesh into horizontal layers.
 *
 * @param positions  Flat [x,y,z, x,y,z, ...] vertex buffer
 * @param indices    Triangle index buffer
 * @param minZ       Bottom of the model
 * @param maxZ       Top of the model
 * @param layerHeight Distance between layers (mm)
 * @returns Array of slice layers, each containing closed contours
 */
export function sliceMesh(
  positions: Float32Array | number[],
  indices: Uint16Array | Uint32Array | Int32Array | number[],
  minZ: number,
  maxZ: number,
  layerHeight: number
): SliceLayer[] {
  const layers: SliceLayer[] = [];
  const layerCount = Math.ceil((maxZ - minZ) / layerHeight);

  for (let l = 0; l <= layerCount; l++) {
    const z = minZ + l * layerHeight;
    const segments: { start: Vec2; end: Vec2; contourId: number }[] = [];

    // Intersect each triangle with the z-plane
    for (let i = 0; i < indices.length; i += 3) {
      const i0 = indices[i];
      const i1 = indices[i + 1];
      const i2 = indices[i + 2];

      const v0z = positions[i0 * 3 + 2];
      const v1z = positions[i1 * 3 + 2];
      const v2z = positions[i2 * 3 + 2];

      // Skip triangles that don't cross the plane
      if ((v0z >= z && v1z >= z && v2z >= z) ||
          (v0z <= z && v1z <= z && v2z <= z)) {
        continue;
      }

      // Find the two edges that cross the plane
      const verts = [
        { x: positions[i0 * 3], y: positions[i0 * 3 + 1], z: v0z },
        { x: positions[i1 * 3], y: positions[i1 * 3 + 1], z: v1z },
        { x: positions[i2 * 3], y: positions[i2 * 3 + 1], z: v2z },
      ];

      const intersections: Vec2[] = [];
      const edges: [number, number][] = [[0, 1], [1, 2], [2, 0]];

      for (const [a, b] of edges) {
        const va = verts[a];
        const vb = verts[b];

        if ((va.z - z) * (vb.z - z) < 0) {
          // Edge crosses the plane — interpolate
          const t = (z - va.z) / (vb.z - va.z);
          intersections.push({
            x: va.x + t * (vb.x - va.x),
            y: va.y + t * (vb.y - va.y),
          });
        } else if (Math.abs(va.z - z) < 1e-10) {
          intersections.push({ x: va.x, y: va.y });
        }
      }

      // A valid triangle intersection produces exactly 2 points (a segment)
      if (intersections.length === 2) {
        segments.push({ start: intersections[0], end: intersections[1], contourId: -1 });
      }
    }

    // Chain segments into closed contours
    const contours = chainSegments(segments);
    if (contours.length > 0) {
      layers.push({ z, contours });
    }
  }

  return layers;
}

/**
 * Chain line segments into closed contour polylines.
 */
function chainSegments(
  segments: { start: Vec2; end: Vec2; contourId: number }[]
): Vec2[][] {
  if (segments.length === 0) return [];

  const EPSILON = 0.001;
  const contours: Vec2[][] = [];
  const used = new Set<number>();

  // Try to close contours first — find segments whose endpoints match
  const findMatching = (
    point: Vec2,
    excludeIdx: number,
    startOrEnd: "start" | "end"
  ): number => {
    for (let i = 0; i < segments.length; i++) {
      if (used.has(i) || i === excludeIdx) continue;
      const seg = segments[i];
      const target = startOrEnd === "start" ? seg.start : seg.end;
      if (Math.abs(target.x - point.x) < EPSILON && Math.abs(target.y - point.y) < EPSILON) {
        return i;
      }
    }
    return -1;
  };

  while (true) {
    // Find an unused segment to start a contour
    let startIdx = -1;
    for (let i = 0; i < segments.length; i++) {
      if (!used.has(i)) {
        startIdx = i;
        break;
      }
    }
    if (startIdx === -1) break;

    const contour: Vec2[] = [];
    let currentIdx = startIdx;
    let currentPoint = segments[startIdx].start;
    contour.push(currentPoint);

    let closed = false;
    let safety = segments.length + 1;

    while (safety-- > 0) {
      used.add(currentIdx);
      const seg = segments[currentIdx];
      const nextPoint = seg.end;
      contour.push(nextPoint);

      // Check if next point closes the contour back to start
      if (contour.length > 2 &&
          Math.abs(nextPoint.x - contour[0].x) < EPSILON &&
          Math.abs(nextPoint.y - contour[0].y) < EPSILON) {
        contour.pop(); // Remove duplicate closing point
        closed = true;
        break;
      }

      // Find next segment
      const nextIdx = findMatching(nextPoint, currentIdx, "start");
      if (nextIdx === -1) break;
      currentIdx = nextIdx;
    }

    if (contour.length > 2) {
      contours.push(contour);
    }

    if (!closed) {
      // Try reverse direction
      used.delete(startIdx);
      const reverseContour: Vec2[] = [];
      currentPoint = segments[startIdx].end;
      reverseContour.push(currentPoint);
      used.add(startIdx);

      // Try from end
      let nextIdx = findMatching(currentPoint, startIdx, "start");
      if (nextIdx !== -1) {
        currentIdx = nextIdx;
        safety = segments.length + 1;
        while (safety-- > 0) {
          used.add(currentIdx);
          const seg = segments[currentIdx];
          const np = seg.end;
          reverseContour.push(np);

          if (reverseContour.length > 2 &&
              Math.abs(np.x - reverseContour[0].x) < EPSILON &&
              Math.abs(np.y - reverseContour[0].y) < EPSILON) {
            reverseContour.pop();
            break;
          }

          nextIdx = findMatching(np, currentIdx, "start");
          if (nextIdx === -1) break;
          currentIdx = nextIdx;
        }

        if (reverseContour.length > 2) {
          contours.push(reverseContour);
        }
      }
    }
  }

  return contours;
}
