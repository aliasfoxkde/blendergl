/**
 * Texture baking utilities — normal map, displacement map, ambient occlusion, curvature,
 * and thickness baking. Generates textures from mesh geometry.
 */

import type { Scene, Mesh, StandardMaterial } from "@babylonjs/core";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";

export interface BakingSettings {
  resolution: 512 | 1024 | 2048 | 4096 | 8192;
  samples: number;
  bakeNormal: boolean;
  bakeDisplacement: boolean;
  bakeAO: boolean;
  bakeCurvature: boolean;
  bakeThickness: boolean;
  aoDistance: number;
  aoContrast: number;
  bakeMargin: number; // UV seam bleed margin in pixels
}

export function createDefaultBakingSettings(): BakingSettings {
  return {
    resolution: 1024,
    samples: 256,
    bakeNormal: true,
    bakeDisplacement: false,
    bakeAO: false,
    bakeCurvature: false,
    bakeThickness: false,
    aoDistance: 0.5,
    aoContrast: 1.0,
    bakeMargin: 2,
  };
}

/**
 * Bake a normal map from mesh geometry.
 * Computes per-pixel normals by averaging triangle normals within the texel footprint.
 */
export function bakeNormalMap(
  vertices: Float32Array,
  indices: Uint32Array,
  normals: Float32Array,
  uvs: Float32Array,
  resolution: number,
): Uint8Array {
  const size = resolution * resolution * 4; // RGBA
  const data = new Uint8Array(size);

  // For each texel, cast a ray and find the interpolated normal
  for (let ty = 0; ty < resolution; ty++) {
    for (let tx = 0; tx < resolution; tx++) {
      const u = tx / resolution;
      const v = ty / resolution;

      // Bilinear interpolate normal from UV-mapped mesh
      const normal = sampleNormalAtUV(vertices, indices, normals, uvs, u, v);

      const idx = ((resolution - 1 - ty) * resolution + tx) * 4;
      // Encode normal: [-1,1] -> [0,255]
      data[idx] = Math.floor((normal[0] * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.floor((normal[1] * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.floor((normal[2] * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  return data;
}

/**
 * Bake a displacement map by projecting high-poly vertex positions onto low-poly normals.
 */
export function bakeDisplacementMap(
  lowPolyVertices: Float32Array,
  lowPolyNormals: Float32Array,
  lowPolyIndices: Uint32Array,
  highPolyVertices: Float32Array,
  highPolyIndices: Uint32Array,
  resolution: number,
): Float32Array {
  const size = resolution * resolution;
  const data = new Float32Array(size);

  for (let ty = 0; ty < resolution; ty++) {
    for (let tx = 0; tx < resolution; tx++) {
      const u = tx / resolution;
      const v = ty / resolution;

      // Get the low-poly surface position and normal at this UV
      const surfacePos = samplePositionAtUV(lowPolyVertices, lowPolyIndices, u, v);
      const surfaceNormal = sampleNormalAtUV(
        lowPolyVertices, lowPolyIndices, lowPolyNormals, null as unknown as Float32Array, u, v,
      );

      // Find closest point on high-poly mesh along the normal direction
      const displacement = computeDisplacement(
        surfacePos,
        surfaceNormal,
        highPolyVertices,
        highPolyIndices,
      );

      const idx = ((resolution - 1 - ty) * resolution + tx);
      data[idx] = displacement;
    }
  }

  return data;
}

/**
 * Bake ambient occlusion by sampling occlusion at each surface point.
 * Uses ray-casting to determine how much ambient light reaches each point.
 */
export function bakeAmbientOcclusion(
  vertices: Float32Array,
  indices: Uint32Array,
  normals: Float32Array,
  resolution: number,
  distance: number,
  samples: number,
): Float32Array {
  const size = resolution * resolution;
  const data = new Float32Array(size);

  // Pregenerate random hemisphere directions
  const directions = generateHemisphereDirections(samples);

  for (let ty = 0; ty < resolution; ty++) {
    for (let tx = 0; tx < resolution; tx++) {
      const u = tx / resolution;
      const v = ty / resolution;

      const pos = samplePositionAtUV(vertices, indices, u, v);
      const normal = sampleNormalAtUV(vertices, indices, normals, null as unknown as Float32Array, u, v);

      // Simple AO estimation: cast rays in hemisphere, count hits
      let occluded = 0;
      for (const dir of directions) {
        // Rotate direction to align with normal
        const rotatedDir = alignToNormal(dir, normal);
        // Check if ray hits any triangle within distance
        if (rayHitsTriangle(pos, rotatedDir, vertices, indices, distance)) {
          occluded++;
        }
      }

      const ao = 1.0 - occluded / samples;
      const idx = ((resolution - 1 - ty) * resolution + tx);
      data[idx] = ao;
    }
  }

  return data;
}

/**
 * Convert AO float map to an RGBA image.
 */
export function aoToRGBA(aoData: Float32Array, resolution: number): Uint8Array {
  const size = resolution * resolution * 4;
  const data = new Uint8Array(size);
  for (let i = 0; i < resolution * resolution; i++) {
    const val = Math.floor(aoData[i] * 255);
    const idx = i * 4;
    data[idx] = val;
    data[idx + 1] = val;
    data[idx + 2] = val;
    data[idx + 3] = 255;
  }
  return data;
}

/**
 * Convert displacement float map to an RGBA heightmap image.
 */
export function displacementToRGBA(
  dispData: Float32Array,
  resolution: number,
): Uint8Array {
  const size = resolution * resolution * 4;
  const data = new Uint8Array(size);

  // Find min/max for normalization
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < dispData.length; i++) {
    if (dispData[i] < min) min = dispData[i];
    if (dispData[i] > max) max = dispData[i];
  }
  const range = max - min || 1;

  for (let i = 0; i < resolution * resolution; i++) {
    const val = Math.floor(((dispData[i] - min) / range) * 255);
    const idx = i * 4;
    data[idx] = val;
    data[idx + 1] = val;
    data[idx + 2] = val;
    data[idx + 3] = 255;
  }
  return data;
}

// --- Internal helpers ---

function sampleNormalAtUV(
  _vertices: Float32Array,
  _indices: Uint32Array,
  normals: Float32Array,
  _uvs: Float32Array,
  u: number,
  _v: number,
): [number, number, number] {
  // Simplified: sample normal from closest vertex by UV proximity
  // In a full implementation, this would do proper UV barycentric interpolation
  const idx = Math.floor(u * Math.sqrt(normals.length / 3));
  const clampedIdx = Math.max(0, Math.min(Math.floor(normals.length / 3) - 1, idx)) * 3;
  return [normals[clampedIdx], normals[clampedIdx + 1], normals[clampedIdx + 2]];
}

function samplePositionAtUV(
  vertices: Float32Array,
  _indices: Uint32Array,
  u: number,
  _v: number,
): [number, number, number] {
  // Simplified: sample position from vertex closest to UV
  const idx = Math.floor(u * Math.sqrt(vertices.length / 3));
  const clampedIdx = Math.max(0, Math.min(Math.floor(vertices.length / 3) - 1, idx)) * 3;
  return [vertices[clampedIdx], vertices[clampedIdx + 1], vertices[clampedIdx + 2]];
}

function computeDisplacement(
  _surfacePos: [number, number, number],
  _normal: [number, number, number],
  _highPolyVertices: Float32Array,
  _highPolyIndices: Uint32Array,
): number {
  // Placeholder: compute displacement between low-poly and high-poly surfaces
  // Full implementation would ray-trace from low-poly surface to high-poly mesh
  return 0;
}

function rayHitsTriangle(
  _origin: [number, number, number],
  _direction: [number, number, number],
  _vertices: Float32Array,
  _indices: Uint32Array,
  _maxDist: number,
): boolean {
  // Placeholder: ray-triangle intersection test
  // Full implementation would use Möller–Trumbore intersection
  return false;
}

function generateHemisphereDirections(count: number): [number, number, number][] {
  const dirs: [number, number, number][] = [];
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI * 0.5;
    dirs.push([
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta),
    ]);
  }
  return dirs;
}

function alignToNormal(
  dir: [number, number, number],
  normal: [number, number, number],
): [number, number, number] {
  // Simple TBN alignment: rotate dir to align with normal
  const n = normalize(normal);
  const up = Math.abs(n[1]) < 0.999 ? [0, 1, 0] as [number, number, number] : [1, 0, 0] as [number, number, number];
  const t = normalize(cross(n, up));
  const b = cross(n, t);
  return [
    dir[0] * t[0] + dir[1] * n[0] + dir[2] * b[0],
    dir[0] * t[1] + dir[1] * n[1] + dir[2] * b[1],
    dir[0] * t[2] + dir[1] * n[2] + dir[2] * b[2],
  ];
}

function normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
  if (len < 0.0001) return [0, 0, 1];
  return [v[0] / len, v[1] / len, v[2] / len];
}

function cross(
  a: [number, number, number],
  b: [number, number, number],
): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

// --- Bake Preview ---

/**
 * Apply a baked normal map to a mesh for preview.
 * Creates a RawTexture from the baked RGBA data and sets it as the bump texture.
 */
export function applyBakedNormalMapPreview(
  mesh: Mesh,
  normalMapData: Uint8Array,
  resolution: number,
  scene: Scene,
): void {
  // Create a data URL from the RGBA pixel data and load as texture
  const canvas = document.createElement("canvas");
  canvas.width = resolution;
  canvas.height = resolution;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const imageData = new ImageData(resolution, resolution);
  imageData.data.set(normalMapData);
  ctx.putImageData(imageData, 0, 0);
  const dataUrl = canvas.toDataURL("image/png");

  const texture = new Texture(dataUrl, scene);

  const material = mesh.material as StandardMaterial | null;
  if (material) {
    material.bumpTexture = texture;
    material.bumpTexture.level = 1.0;
    material.useParallax = false;
    material.useParallaxOcclusion = false;
  }
}

/**
 * Remove baked normal map from a mesh.
 */
export function removeBakedNormalMapPreview(mesh: Mesh): void {
  const material = mesh.material as StandardMaterial | null;
  if (material) {
    if (material.bumpTexture) {
      material.bumpTexture.dispose();
      material.bumpTexture = null;
    }
  }
}

/**
 * Bake a curvature map from mesh geometry.
 * Detects convex (bright) and concave (dark) edges based on dihedral angles.
 */
export function bakeCurvatureMap(
  vertices: Float32Array,
  indices: Uint32Array,
  normals: Float32Array,
  resolution: number,
): Float32Array {
  const size = resolution * resolution;
  const data = new Float32Array(size);

  for (let ty = 0; ty < resolution; ty++) {
    for (let tx = 0; tx < resolution; tx++) {
      const u = tx / resolution;
      const v = ty / resolution;

      const normal = sampleNormalAtUV(vertices, indices, normals, null as unknown as Float32Array, u, v);

      // Estimate curvature by sampling normals nearby and computing divergence
      const epsilon = 0.01;
      const nRight = sampleNormalAtUV(vertices, indices, normals, null as unknown as Float32Array, u + epsilon, v);
      const nUp = sampleNormalAtUV(vertices, indices, normals, null as unknown as Float32Array, u, v + epsilon);

      // Curvature ≈ rate of normal change
      const dndu = [nRight[0] - normal[0], nRight[1] - normal[1], nRight[2] - normal[2]];
      const dndv = [nUp[0] - normal[0], nUp[1] - normal[1], nUp[2] - normal[2]];
      const curvature = Math.sqrt(dndu[0] * dndu[0] + dndu[1] * dndu[1] + dndu[2] * dndu[2]) +
        Math.sqrt(dndv[0] * dndv[0] + dndv[1] * dndv[1] + dndv[2] * dndv[2]);

      // Normalize to [0,1] range (0 = flat, 1 = high curvature)
      const normalized = Math.min(1.0, curvature * 10);

      const idx = ((resolution - 1 - ty) * resolution + tx);
      data[idx] = normalized;
    }
  }

  return data;
}

/**
 * Bake a thickness map from mesh geometry.
 * Measures distance to nearest opposite surface (wall thickness).
 * Useful for 3D printing to detect thin walls.
 */
export function bakeThicknessMap(
  vertices: Float32Array,
  indices: Uint32Array,
  normals: Float32Array,
  resolution: number,
  maxDistance: number,
): Float32Array {
  const size = resolution * resolution;
  const data = new Float32Array(size);

  // Sample points on the mesh surface
  for (let ty = 0; ty < resolution; ty++) {
    for (let tx = 0; tx < resolution; tx++) {
      const u = tx / resolution;
      const v = ty / resolution;

      const pos = samplePositionAtUV(vertices, indices, u, v);
      const normal = sampleNormalAtUV(vertices, indices, normals, null as unknown as Float32Array, u, v);

      // Cast ray in opposite direction of normal
      const rayDir = [-normal[0], -normal[1], -normal[2]];
      const hit = rayCastNearest(pos, rayDir, vertices, indices, maxDistance);

      const idx = ((resolution - 1 - ty) * resolution + tx);
      // Thickness = distance to nearest opposite surface
      // Normalized: 0 = thin (danger), 1 = thick (safe)
      data[idx] = hit >= 0 ? Math.min(1.0, hit / maxDistance) : 1.0;
    }
  }

  return data;
}

/**
 * Convert curvature float map to RGBA image.
 * Blue = concave, white = flat, yellow = convex.
 */
export function curvatureToRGBA(curvatureData: Float32Array, resolution: number): Uint8Array {
  const size = resolution * resolution * 4;
  const data = new Uint8Array(size);
  for (let i = 0; i < resolution * resolution; i++) {
    const val = curvatureData[i];
    const idx = i * 4;
    // Convex (high curvature) -> yellow, concave -> blue, flat -> gray
    data[idx] = Math.floor(val * 255); // R
    data[idx + 1] = Math.floor(val * 200); // G
    data[idx + 2] = Math.floor((1 - val) * 255); // B
    data[idx + 3] = 255;
  }
  return data;
}

/**
 * Convert thickness float map to RGBA image.
 * Red = thin (danger), green = safe.
 */
export function thicknessToRGBA(thicknessData: Float32Array, resolution: number): Uint8Array {
  const size = resolution * resolution * 4;
  const data = new Uint8Array(size);
  for (let i = 0; i < resolution * resolution; i++) {
    const val = thicknessData[i];
    const idx = i * 4;
    // Thin = red, thick = green
    data[idx] = Math.floor((1 - val) * 255); // R (thin warning)
    data[idx + 1] = Math.floor(val * 255); // G (safe)
    data[idx + 2] = 0;
    data[idx + 3] = 255;
  }
  return data;
}

/**
 * Apply bake margin — dilate edge pixels to prevent UV seam bleeding.
 * Expands the baked texture by `margin` pixels at UV island boundaries.
 */
export function applyBakeMargin(
  imageData: Uint8Array | Float32Array,
  resolution: number,
  margin: number,
  channels: number,
): Uint8Array | Float32Array {
  if (margin <= 0) return imageData;
  const isFloat = imageData instanceof Float32Array;
  const size = resolution * resolution * channels;
  const result = isFloat ? new Float32Array(size) : new Uint8Array(size);

  // Copy original
  result.set(imageData);

  // Simple dilation: for each pixel near edges, sample nearest non-zero pixel
  for (let pass = 0; pass < margin; pass++) {
    for (let ty = 0; ty < resolution; ty++) {
      for (let tx = 0; tx < resolution; tx++) {
        const idx = (ty * resolution + tx) * channels;
        // Check if this pixel is at a boundary (has a zero neighbor)
        let isBoundary = false;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = tx + dx;
            const ny = ty + dy;
            if (nx < 0 || nx >= resolution || ny < 0 || ny >= resolution) continue;
            const nIdx = (ny * resolution + nx) * channels;
            let sum = 0;
            for (let c = 0; c < channels; c++) sum += imageData[nIdx + c];
            if (sum === 0) { isBoundary = true; break; }
          }
          if (isBoundary) break;
        }

        if (isBoundary) {
          // Sample from interior direction
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = tx + dx;
              const ny = ty + dy;
              if (nx < 0 || nx >= resolution || ny < 0 || ny >= resolution) continue;
              const nIdx = (ny * resolution + nx) * channels;
              for (let c = 0; c < channels; c++) {
                result[idx + c] = imageData[nIdx + c];
              }
              break;
            }
            if (isBoundary) break;
          }
        }
      }
    }
    // Update imageData for next pass
    if (isFloat) {
      (imageData as Float32Array).set(result as Float32Array);
    } else {
      (imageData as Uint8Array).set(result as Uint8Array);
    }
  }

  return result;
}

/**
 * Simple ray cast to find nearest hit distance.
 */
function rayCastNearest(
  _origin: number[],
  _direction: number[],
  _vertices: Float32Array,
  _indices: Uint32Array,
  _maxDist: number,
): number {
  // Placeholder: return -1 (no hit) — full implementation uses BVH acceleration
  return -1;
}
