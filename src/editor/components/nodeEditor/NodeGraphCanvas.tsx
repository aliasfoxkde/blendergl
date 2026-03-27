/**
 * NodeGraphCanvas — SVG+HTML canvas for the node graph editor.
 *
 * Handles pan, zoom, selection, node dragging, connection drawing,
 * and grid rendering.
 */

import { useCallback, useRef, useState } from "react";
import { useNodeGraphStore } from "@/editor/stores/nodeGraphStore";
import { getNodeTypeDefinition } from "@/editor/utils/nodeEditor/nodeRegistry";
import { GraphNodeView } from "./GraphNode";
import { GraphConnectionView, TempConnection } from "./GraphConnection";
import { AddNodeMenu } from "./AddNodeMenu";
import type { PortDataType } from "@/editor/types/nodeEditor";

interface NodeGraphCanvasProps {
  width: number;
  height: number;
}

const GRID_SIZE = 20;
const NODE_WIDTH = 200;
const PORT_HEIGHT = 22;
const HEADER_HEIGHT = 28;

interface DragState {
  type: "connection";
  sourceNodeId: string;
  sourcePortId: string;
  sourcePortType: "input" | "output";
  dataType: PortDataType;
  startX: number;
  startY: number;
}

export function NodeGraphCanvas({ width, height }: NodeGraphCanvasProps) {
  const nodes = useNodeGraphStore((s) => s.nodes);
  const connections = useNodeGraphStore((s) => s.connections);
  const selectedNodeIds = useNodeGraphStore((s) => s.selectedNodeIds);
  const selectedConnectionIds = useNodeGraphStore((s) => s.selectedConnectionIds);
  const viewOffset = useNodeGraphStore((s) => s.viewOffset);
  const viewZoom = useNodeGraphStore((s) => s.viewZoom);

  const addNode = useNodeGraphStore((s) => s.addNode);
  const removeNode = useNodeGraphStore((s) => s.removeNode);
  const moveNode = useNodeGraphStore((s) => s.moveNode);
  const setNodeValue = useNodeGraphStore((s) => s.setNodeValue);
  const addConnection = useNodeGraphStore((s) => s.addConnection);
  const disconnectInput = useNodeGraphStore((s) => s.disconnectInput);
  const selectNode = useNodeGraphStore((s) => s.selectNode);
  const selectConnection = useNodeGraphStore((s) => s.selectConnection);
  const deselectAll = useNodeGraphStore((s) => s.deselectAll);
  const setViewOffset = useNodeGraphStore((s) => s.setViewOffset);
  const setViewZoom = useNodeGraphStore((s) => s.setViewZoom);

  const containerRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [dragEnd, setDragEnd] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [panning, setPanning] = useState<{ startX: number; startY: number; ox: number; oy: number } | null>(null);

  // Convert screen coords to graph coords
  const screenToGraph = useCallback(
    (sx: number, sy: number) => ({
      x: (sx - viewOffset.x) / viewZoom,
      y: (sy - viewOffset.y) / viewZoom,
    }),
    [viewOffset, viewZoom]
  );

  // Get port position in graph space
  const getPortPosition = useCallback(
    (nodeId: string, portId: string, portType: "input" | "output") => {
      const node = nodes[nodeId];
      if (!node) return null;
      const def = getNodeTypeDefinition(node.type);
      if (!def) return null;

      const ports = portType === "input" ? def.inputs : def.outputs;
      const idx = ports.findIndex((p) => p.id === portId);
      if (idx < 0) return null;

      if (portType === "input") {
        return {
          x: node.position.x,
          y: node.position.y + HEADER_HEIGHT + idx * PORT_HEIGHT + PORT_HEIGHT / 2,
        };
      } else {
        return {
          x: node.position.x + NODE_WIDTH,
          y: node.position.y + HEADER_HEIGHT + idx * PORT_HEIGHT + PORT_HEIGHT / 2,
        };
      }
    },
    [nodes]
  );

  // Handle mouse move for connection dragging and panning
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (drag) {
        setDragEnd({ x: e.clientX, y: e.clientY });
      }
      if (panning) {
        setViewOffset({
          x: panning.ox + (e.clientX - panning.startX),
          y: panning.oy + (e.clientY - panning.startY),
        });
      }
    },
    [drag, panning, setViewOffset]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      if (panning) {
        setPanning(null);
        return;
      }

      if (drag) {
        // Check if we're over a compatible port
        const target = document.elementFromPoint(e.clientX, e.clientY);
        if (target && (target as Element).closest(".port-dot")) {
          // Find the node and port from DOM proximity
          const nodeElements = containerRef.current?.querySelectorAll("[data-node-id]");
          let found = false;
          nodeElements?.forEach((el) => {
            if (found) return;
            const nodeId = (el as HTMLElement).dataset.nodeId;
            if (!nodeId) return;
            const def = getNodeTypeDefinition(nodes[nodeId]?.type ?? "");
            if (!def) return;

            const ports = drag.sourcePortType === "output" ? def.inputs : def.outputs;
            for (const port of ports) {
              if (found) return;
              const portPos = getPortPosition(nodeId, port.id, drag.sourcePortType === "output" ? "input" : "output");
              if (!portPos) return;

              const screenX = portPos.x * viewZoom + viewOffset.x;
              const screenY = portPos.y * viewZoom + viewOffset.y;
              const dist = Math.sqrt((e.clientX - screenX) ** 2 + (e.clientY - screenY) ** 2);
              if (dist < 15 * viewZoom) {
                if (drag.sourcePortType === "output") {
                  addConnection(drag.sourceNodeId, drag.sourcePortId, nodeId, port.id);
                } else {
                  addConnection(nodeId, port.id, drag.sourceNodeId, drag.sourcePortId);
                }
                found = true;
              }
            }
          });
        }
        setDrag(null);
      }
    },
    [drag, panning, viewZoom, viewOffset, nodes, getPortPosition, addConnection]
  );

  // Scroll to zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const delta = -e.deltaY * 0.001;
      const newZoom = Math.max(0.1, Math.min(3, viewZoom * (1 + delta)));
      const scale = newZoom / viewZoom;
      setViewOffset({
        x: mouseX - scale * (mouseX - viewOffset.x),
        y: mouseY - scale * (mouseY - viewOffset.y),
      });
      setViewZoom(newZoom);
    },
    [viewZoom, viewOffset, setViewOffset, setViewZoom]
  );

  // Right-click to open add menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      setMenuPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    []
  );

  const handleAddNode = useCallback(
    (type: string) => {
      if (!menuPos || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const graphPos = screenToGraph(menuPos.x + rect.left, menuPos.y + rect.top);
      addNode(type, { x: graphPos.x - NODE_WIDTH / 2, y: graphPos.y - 20 });
    },
    [menuPos, screenToGraph, addNode]
  );

  // Port drag start handler
  const handlePortDragStart = useCallback(
    (nodeId: string, portId: string, portType: "input" | "output", dataType: string, x: number, y: number) => {
      setDrag({
        type: "connection",
        sourceNodeId: nodeId,
        sourcePortId: portId,
        sourcePortType: portType,
        dataType: dataType as PortDataType,
        startX: x,
        startY: y,
      });
      setDragEnd({ x, y });
    },
    []
  );

  // Compute connection screen positions
  const connectionPaths = Object.values(connections).map((conn) => {
    const srcPos = getPortPosition(conn.sourceNodeId, conn.sourcePortId, "output");
    const tgtPos = getPortPosition(conn.targetNodeId, conn.targetPortId, "input");
    if (!srcPos || !tgtPos) return null;

    const srcDef = getNodeTypeDefinition(nodes[conn.sourceNodeId]?.type ?? "");
    const srcPort = srcDef?.outputs.find((p) => p.id === conn.sourcePortId);
    const dataType = srcPort?.dataType ?? "any";

    return {
      conn,
      x1: srcPos.x,
      y1: srcPos.y,
      x2: tgtPos.x,
      y2: tgtPos.y,
      dataType,
    };
  }).filter((p): p is NonNullable<typeof p> => p !== null);

  // Compute temp connection position
  let tempConn = null;
  if (drag) {
    const srcPos = getPortPosition(drag.sourceNodeId, drag.sourcePortId, drag.sourcePortType);
    if (srcPos) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const endGraph = screenToGraph(dragEnd.x - rect.left, dragEnd.y - rect.top);
        if (drag.sourcePortType === "output") {
          tempConn = { x1: srcPos.x, y1: srcPos.y, x2: endGraph.x, y2: endGraph.y, dataType: drag.dataType };
        } else {
          tempConn = { x1: endGraph.x, y1: endGraph.y, x2: srcPos.x, y2: srcPos.y, dataType: drag.dataType };
        }
      }
    }
  }

  // Grid rendering
  const gridDots: { cx: number; cy: number }[] = [];
  const startX = Math.floor(-viewOffset.x / (GRID_SIZE * viewZoom)) * GRID_SIZE;
  const startY = Math.floor(-viewOffset.y / (GRID_SIZE * viewZoom)) * GRID_SIZE;
  const endX = startX + Math.ceil(width / (GRID_SIZE * viewZoom)) * GRID_SIZE + GRID_SIZE * 2;
  const endY = startY + Math.ceil(height / (GRID_SIZE * viewZoom)) * GRID_SIZE + GRID_SIZE * 2;
  for (let gx = startX; gx < endX; gx += GRID_SIZE) {
    for (let gy = startY; gy < endY; gy += GRID_SIZE) {
      gridDots.push({ cx: gx, cy: gy });
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-[#1a1a2e]"
      style={{ cursor: panning ? "grabbing" : drag ? "crosshair" : "default" }}
      onMouseDown={(e) => {
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
          // Middle-click or Alt+click: pan
          e.preventDefault();
          setPanning({ startX: e.clientX, startY: e.clientY, ox: viewOffset.x, oy: viewOffset.y });
          return;
        }
        if (e.button === 0 && !(e.target as Element).closest(".port-dot") && !(e.target as Element).closest("[data-node-id]")) {
          deselectAll();
        }
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      onContextMenu={handleContextMenu}
    >
      {/* SVG layer: grid, connections */}
      <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: "none" }}>
        {/* Grid dots */}
        {gridDots.map((dot, i) => (
          <circle
            key={i}
            cx={dot.cx * viewZoom + viewOffset.x}
            cy={dot.cy * viewZoom + viewOffset.y}
            r={1}
            fill="#333"
          />
        ))}

        {/* Connections */}
        {connectionPaths.map(({ conn, x1, y1, x2, y2, dataType }) => (
          <GraphConnectionView
            key={conn.id}
            id={conn.id}
            x1={x1 * viewZoom + viewOffset.x}
            y1={y1 * viewZoom + viewOffset.y}
            x2={x2 * viewZoom + viewOffset.x}
            y2={y2 * viewZoom + viewOffset.y}
            dataType={dataType}
            selected={selectedConnectionIds.includes(conn.id)}
            onClick={selectConnection}
          />
        ))}

        {/* Temp connection while dragging */}
        {tempConn && (
          <TempConnection
            x1={tempConn.x1 * viewZoom + viewOffset.x}
            y1={tempConn.y1 * viewZoom + viewOffset.y}
            x2={tempConn.x2 * viewZoom + viewOffset.x}
            y2={tempConn.y2 * viewZoom + viewOffset.y}
            dataType={tempConn.dataType}
          />
        )}
      </svg>

      {/* HTML layer: nodes */}
      <div
        className="absolute inset-0"
        style={{
          transform: `translate(${viewOffset.x}px, ${viewOffset.y}px) scale(${viewZoom})`,
          transformOrigin: "0 0",
        }}
      >
        {Object.values(nodes).map((node) => (
          <GraphNodeView
            key={node.id}
            node={node}
            selected={selectedNodeIds.includes(node.id)}
            zoom={viewZoom}
            onMove={moveNode}
            onSelect={selectNode}
            onRemove={removeNode}
            onPortDragStart={handlePortDragStart}
            onDisconnectInput={disconnectInput}
            onValueChange={setNodeValue}
          />
        ))}
      </div>

      {/* Add node menu */}
      {menuPos && (
        <AddNodeMenu
          x={menuPos.x}
          y={menuPos.y}
          onAddNode={handleAddNode}
          onClose={() => setMenuPos(null)}
        />
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-2 right-2 text-[10px] text-gray-500 pointer-events-none">
        {Math.round(viewZoom * 100)}%
      </div>
    </div>
  );
}
