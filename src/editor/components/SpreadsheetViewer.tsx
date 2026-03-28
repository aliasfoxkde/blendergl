/**
 * SpreadsheetViewer — inspect geometry data at node outputs.
 * Shows a table of vertex positions, normals, UVs, and attributes
 * for the currently selected node in the geometry node editor.
 */

import { useState, useMemo, useCallback } from "react";
import { useNodeGraphStore } from "@/editor/stores/nodeGraphStore";
import { getNodeTypeDefinition } from "@/editor/utils/nodeEditor/nodeRegistry";

interface DataEntry {
  index: number;
  position: string;
  normal?: string;
  uv?: string;
  color?: string;
}

export function SpreadsheetViewer() {
  const nodes = useNodeGraphStore((s) => s.nodes);
  const connections = useNodeGraphStore((s) => s.connections);
  const selectedNodeIds = useNodeGraphStore((s) => s.selectedNodeIds);
  const graphType = useNodeGraphStore((s) => s.graphType);

  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const activeNode = selectedNode ?? selectedNodeIds[0] ?? null;
  const node = activeNode ? nodes[activeNode] : null;
  const nodeDef = node ? getNodeTypeDefinition(node.type) : null;

  // Generate mock data for demonstration based on node type
  const data = useMemo<DataEntry[]>(() => {
    if (!node || !nodeDef) return [];

    // For geometry nodes, generate sample vertex data
    if (graphType === "geometry" && nodeDef.outputs.some((o) => o.dataType === "vec3")) {
      const count = 100;
      const entries: DataEntry[] = [];
      for (let i = 0; i < count; i++) {
        const seed = hashString(node.id + String(i));
        const px = (seededRandom(seed) * 2 - 1).toFixed(3);
        const py = (seededRandom(seed + 1) * 2 - 1).toFixed(3);
        const pz = (seededRandom(seed + 2) * 2 - 1).toFixed(3);
        const nx = (seededRandom(seed + 3) * 2 - 1).toFixed(3);
        const ny = (seededRandom(seed + 4) * 2 - 1).toFixed(3);
        const nz = (seededRandom(seed + 5) * 2 - 1).toFixed(3);
        const u = seededRandom(seed + 6).toFixed(4);
        const v = seededRandom(seed + 7).toFixed(4);

        entries.push({
          index: i,
          position: `(${px}, ${py}, ${pz})`,
          normal: `(${nx}, ${ny}, ${nz})`,
          uv: `(${u}, ${v})`,
        });
      }
      return entries;
    }

    // For shader/compositing nodes, show value outputs
    if (graphType === "shader" || graphType === "compositing") {
      const count = 10;
      const entries: DataEntry[] = [];
      for (let i = 0; i < count; i++) {
        const seed = hashString(node.id + String(i));
        const r = Math.floor(seededRandom(seed) * 255);
        const g = Math.floor(seededRandom(seed + 1) * 255);
        const b = Math.floor(seededRandom(seed + 2) * 255);
        entries.push({
          index: i,
          position: `(${seededRandom(seed).toFixed(3)})`,
          color: `rgb(${r}, ${g}, ${b})`,
        });
      }
      return entries;
    }

    return [];
  }, [node, nodeDef, graphType]);

  const totalPages = Math.ceil(data.length / pageSize);
  const pageData = data.slice(page * pageSize, (page + 1) * pageSize);

  // Build columns based on available data
  const columns = useMemo(() => {
    const cols: { key: string; label: string; width: string }[] = [
      { key: "index", label: "#", width: "w-10" },
    ];
    if (data.length > 0 && data[0].position) cols.push({ key: "position", label: "Position", width: "flex-1" });
    if (data.length > 0 && data[0].normal) cols.push({ key: "normal", label: "Normal", width: "flex-1" });
    if (data.length > 0 && data[0].uv) cols.push({ key: "uv", label: "UV", width: "w-24" });
    if (data.length > 0 && data[0].color) cols.push({ key: "color", label: "Color", width: "w-24" });
    return cols;
  }, [data]);

  // Count connected nodes (fan-in/fan-out)
  const fanIn = useMemo(() => {
    if (!activeNode) return 0;
    return Object.values(connections).filter((c) => c.targetNodeId === activeNode).length;
  }, [activeNode, connections]);

  const fanOut = useMemo(() => {
    if (!activeNode) return 0;
    return Object.values(connections).filter((c) => c.sourceNodeId === activeNode).length;
  }, [activeNode, connections]);

  const handleNodeSelect = useCallback((id: string) => {
    setSelectedNode(id);
    setPage(0);
  }, []);

  if (!node) {
    return (
      <div className="p-2 text-xs text-gray-500 text-center">
        Select a node to inspect its data.
      </div>
    );
  }

  return (
    <div className="p-2 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-medium">Spreadsheet</span>
        <span className="text-[10px] text-gray-400">{nodeDef?.label ?? node.type}</span>
      </div>

      {/* Node selector dropdown */}
      <select
        value={activeNode ?? ""}
        onChange={(e) => handleNodeSelect(e.target.value)}
        className="w-full bg-[#1a1a2e] border border-gray-700 rounded px-1 py-0.5 text-gray-300 text-[10px]"
      >
        {Object.entries(nodes).map(([id, n]) => {
          const def = getNodeTypeDefinition(n.type);
          return (
            <option key={id} value={id}>
              {def?.label ?? n.type} ({id.slice(0, 8)})
            </option>
          );
        })}
      </select>

      {/* Stats */}
      <div className="flex items-center gap-2 text-[10px] text-gray-400">
        <span>{data.length} entries</span>
        <span>|</span>
        <span>In: {fanIn}</span>
        <span>Out: {fanOut}</span>
      </div>

      {/* Table */}
      <div className="bg-[#0a0a0f] rounded border border-gray-700 overflow-hidden">
        <div className="max-h-48 overflow-y-auto">
          <table className="w-full text-[10px]">
            <thead className="sticky top-0 bg-[#1a1a2e]">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`text-left px-1 py-0.5 text-gray-400 font-medium ${col.width}`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageData.map((row, i) => (
                <tr
                  key={i}
                  className={i % 2 === 0 ? "bg-transparent" : "bg-white/[0.02]"}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-1 py-0 text-gray-300 font-mono truncate">
                      {col.key === "color" && row.color ? (
                        <span className="flex items-center gap-1">
                          <span
                            className="w-2 h-2 rounded-sm inline-block"
                            style={{ backgroundColor: row.color }}
                          />
                          {row.color}
                        </span>
                      ) : (
                        (row as unknown as Record<string, string | number>)[col.key]
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-[10px] text-gray-400">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded"
          >
            Prev
          </button>
          <span>Page {page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page >= totalPages - 1}
            className="px-1.5 py-0.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}
