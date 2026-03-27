/**
 * 3MF export — produces a valid 3D Manufacturing Format (.3mf) file.
 *
 * 3MF is a ZIP-based format containing XML files per the 3MF spec.
 * We use fflate (transitive dep from Babylon.js) for ZIP creation.
 *
 * Spec: https://3mf.io/specification/
 */

import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { Scene } from "@babylonjs/core/scene.js";

// 3MF XML namespaces
const NS_3MF = "http://schemas.microsoft.com/3dmanufacturing/core/2015/02";
const NS_REL = "http://schemas.openxmlformats.org/package/2006/relationships";

interface Vertex {
  x: number;
  y: number;
  z: number;
}

interface Triangle {
  v1: number;
  v2: number;
  v3: number;
}

interface MeshData {
  vertices: Vertex[];
  triangles: Triangle[];
}

/**
 * Extract mesh data from a Babylon.js Mesh.
 */
function extractMeshData(mesh: Mesh): MeshData {
  const positions = mesh.getVerticesData("position");
  const indices = mesh.getIndices();

  if (!positions || !indices) {
    return { vertices: [], triangles: [] };
  }

  // Apply world transform
  const worldMatrix = mesh.getWorldMatrix();

  const vertices: Vertex[] = [];
  for (let i = 0; i < positions.length; i += 3) {
    const v = Vector3.TransformCoordinates(
      new Vector3(positions[i], positions[i + 1], positions[i + 2]),
      worldMatrix,
    );
    vertices.push({
      x: Math.round(v.x * 1e6) / 1e6,
      y: Math.round(v.y * 1e6) / 1e6,
      z: Math.round(v.z * 1e6) / 1e6,
    });
  }

  const triangles: Triangle[] = [];
  for (let i = 0; i < indices.length; i += 3) {
    triangles.push({
      v1: indices[i],
      v2: indices[i + 1],
      v3: indices[i + 2],
    });
  }

  return { vertices, triangles };
}

/**
 * Build the 3D model XML content for a single mesh.
 */
function buildModelXml(meshes: MeshData[]): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<model unit="millimeter" xml:lang="en-US" xmlns="${NS_3MF}">\n`;
  xml += `  <resources>\n`;

  let objectId = 1;
  for (const mesh of meshes) {
    xml += `    <object id="${objectId}" type="model">\n`;
    xml += `      <mesh>\n`;
    xml += `        <vertices>\n`;
    for (const v of mesh.vertices) {
      xml += `          <vertex x="${v.x}" y="${v.y}" z="${v.z}" />\n`;
    }
    xml += `        </vertices>\n`;
    xml += `        <triangles>\n`;
    for (const t of mesh.triangles) {
      xml += `          <triangle v1="${t.v1}" v2="${t.v2}" v3="${t.v3}" />\n`;
    }
    xml += `        </triangles>\n`;
    xml += `      </mesh>\n`;
    xml += `    </object>\n`;
    objectId++;
  }

  xml += `  </resources>\n`;
  xml += `  <build>\n`;

  for (let i = 1; i <= meshes.length; i++) {
    xml += `    <item objectid="${i}" />\n`;
  }

  xml += `  </build>\n`;
  xml += `</model>\n`;

  return xml;
}

/**
 * Build the .rels XML content.
 */
function buildRelsXml(): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<Relationships xmlns="${NS_REL}">\n`;
  xml += `  <Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel" />\n`;
  xml += `</Relationships>\n`;

  return xml;
}

/**
 * Build the [Content_Types].xml content.
 */
function buildContentTypesXml(): string {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">\n`;
  xml += `  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml" />\n`;
  xml += `  <Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml" />\n`;
  xml += `</Types>\n`;

  return xml;
}

function encodeStr(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Export meshes to 3MF format.
 */
export async function exportTo3MF(
  meshes: Mesh[],
  filename = "model.3mf",
): Promise<void> {
  const meshDataList = meshes
    .map((m) => extractMeshData(m))
    .filter((d) => d.vertices.length > 0 && d.triangles.length > 0);

  if (meshDataList.length === 0) return;

  // Dynamic import of fflate (transitive dep from Babylon.js)
  const fflate = await import("fflate");

  const modelXml = buildModelXml(meshDataList);
  const relsXml = buildRelsXml();
  const contentTypesXml = buildContentTypesXml();

  const zipData: Record<string, Uint8Array> = {
    "[Content_Types].xml": encodeStr(contentTypesXml),
    "_rels/.rels": encodeStr(relsXml),
    "3D/3dmodel.model": encodeStr(modelXml),
  };

  const zipped = fflate.zipSync(zipData, { level: 6 });
  const blob = new Blob([zipped.buffer as ArrayBuffer], { type: "model/3mf" });
  downloadBlob(blob, filename);
}

/**
 * Export the full scene to 3MF.
 */
export async function exportSceneTo3MF(
  scene: Scene,
  filename = "scene.3mf",
): Promise<void> {
  const meshes = scene.meshes.filter(
    (m) => m.isVisible && m instanceof Mesh && m.metadata?.entityId,
  ) as Mesh[];

  await exportTo3MF(meshes, filename);
}

/**
 * Export selected meshes to 3MF, or all visible meshes if nothing is selected.
 */
export async function exportSelectedTo3MF(
  scene: Scene,
  selectedIds: Set<string>,
  filename = "model.3mf",
): Promise<void> {
  let meshes: Mesh[];

  if (selectedIds.size > 0) {
    meshes = scene.meshes.filter(
      (m) =>
        m.isVisible &&
        m instanceof Mesh &&
        m.metadata?.entityId &&
        selectedIds.has(m.metadata.entityId as string),
    ) as Mesh[];
  } else {
    meshes = scene.meshes.filter(
      (m) => m.isVisible && m instanceof Mesh && m.metadata?.entityId,
    ) as Mesh[];
    filename = "scene.3mf";
  }

  if (meshes.length > 0) {
    await exportTo3MF(meshes, filename);
  }
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
