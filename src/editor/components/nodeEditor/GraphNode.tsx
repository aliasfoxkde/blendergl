/**
 * GraphNode — renders a single node with header, ports, and inline controls.
 */

import { useCallback, useRef } from "react";
import { getNodeTypeDefinition } from "@/editor/utils/nodeEditor/nodeRegistry";
import type { GraphNode as GraphNodeType } from "@/editor/types/nodeEditor";
import { PORT_COLORS, CATEGORY_COLORS } from "@/editor/types/nodeEditor";

interface GraphNodeProps {
  node: GraphNodeType;
  selected: boolean;
  zoom: number;
  onMove: (id: string, position: { x: number; y: number }) => void;
  onSelect: (id: string, addToSelection: boolean) => void;
  onRemove: (id: string) => void;
  onPortDragStart: (nodeId: string, portId: string, portType: "input" | "output", dataType: string, x: number, y: number) => void;
  onDisconnectInput: (nodeId: string, portId: string) => void;
  onValueChange: (nodeId: string, portId: string, value: number | string | number[]) => void;
}

const NODE_WIDTH = 200;

export function GraphNodeView({
  node,
  selected,
  zoom,
  onMove,
  onSelect,
  onRemove,
  onPortDragStart,
  onDisconnectInput,
  onValueChange,
}: GraphNodeProps) {
  const def = getNodeTypeDefinition(node.type);
  const dragRef = useRef<{ startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);
  const categoryColor = def ? (CATEGORY_COLORS[def.category] ?? "#404040") : "#404040";

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if ((e.target as HTMLElement).closest(".port-dot")) return;
      e.stopPropagation();
      onSelect(node.id, e.shiftKey);
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        nodeX: node.position.x,
        nodeY: node.position.y,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        if (!dragRef.current) return;
        const dx = (ev.clientX - dragRef.current.startX) / zoom;
        const dy = (ev.clientY - dragRef.current.startY) / zoom;
        onMove(node.id, {
          x: dragRef.current.nodeX + dx,
          y: dragRef.current.nodeY + dy,
        });
      };

      const handleMouseUp = () => {
        dragRef.current = null;
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [node.id, node.position.x, node.position.y, zoom, onMove, onSelect]
  );

  const portHeight = 22;
  const headerHeight = 28;
  const inputPorts = def?.inputs ?? [];
  const outputPorts = def?.outputs ?? [];
  const maxPorts = Math.max(inputPorts.length, outputPorts.length);
  const bodyHeight = maxPorts * portHeight;

  const renderValueControl = (portId: string, value: number | string | number[]) => {
    if (typeof value === "number") {
      return (
        <input
          type="number"
          step={0.1}
          value={value}
          onChange={(e) => onValueChange(node.id, portId, parseFloat(e.target.value) || 0)}
          className="w-16 bg-[#2a2a2a] text-[10px] text-gray-300 border border-[#444] rounded px-1 py-0.5 outline-none focus:border-blue-500"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      );
    }
    if (Array.isArray(value) && value.length >= 3) {
      return (
        <div className="flex items-center gap-1">
          <div
            className="w-4 h-4 rounded-sm border border-[#555]"
            style={{
              backgroundColor: `rgb(${Math.round(value[0] * 255)}, ${Math.round(value[1] * 255)}, ${Math.round(value[2] * 255)})`,
            }}
          />
          <span className="text-[9px] text-gray-400">
            {value.map((v) => v.toFixed(2)).join(", ")}
          </span>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="absolute select-none"
      style={{
        left: node.position.x,
        top: node.position.y,
        width: NODE_WIDTH,
      }}
      >
      <div
        className={`rounded-lg overflow-hidden shadow-lg border-2 ${
          selected ? "border-blue-500" : "border-[#444]"
        }`}
        style={{ background: "#2a2a2a" }}
        onMouseDown={handleMouseDown}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-2 cursor-grab active:cursor-grabbing"
          style={{
            height: headerHeight,
            backgroundColor: categoryColor,
          }}
        >
          <span className="text-xs font-semibold text-white truncate">{def?.label ?? node.type}</span>
          <button
            className="text-white/60 hover:text-white text-xs leading-none"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(node.id);
            }}
            title="Remove node"
          >
            ×
          </button>
        </div>

        {/* Ports */}
        <div className="relative" style={{ minHeight: bodyHeight }}>
          {/* Input ports */}
          <div className="absolute left-0 top-0 bottom-0 w-1/2">
            {inputPorts.map((port) => {
              const portColor = PORT_COLORS[port.dataType] ?? "#808080";
              const value = node.values[port.id];
              return (
                <div
                  key={port.id}
                  className="flex items-center justify-end pr-3 relative"
                  style={{ height: portHeight }}
                >
                  {/* Port dot (on left edge) */}
                  <div
                    className="port-dot absolute left-0 -translate-x-1/2 w-3 h-3 rounded-full border-2 cursor-crosshair z-10 hover:scale-125 transition-transform"
                    style={{
                      borderColor: portColor,
                      backgroundColor: value !== undefined ? portColor : "transparent",
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      onPortDragStart(node.id, port.id, "input", port.dataType, rect.left, rect.top);
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDisconnectInput(node.id, port.id);
                    }}
                    title={`${port.name} (${port.dataType})`}
                  />
                  <span className="text-[10px] text-gray-400 mr-1">{port.name}</span>
                  {renderValueControl(port.id, value)}
                </div>
              );
            })}
          </div>

          {/* Output ports */}
          <div className="absolute right-0 top-0 bottom-0 w-1/2">
            {outputPorts.map((port) => {
              const portColor = PORT_COLORS[port.dataType] ?? "#808080";
              return (
                <div
                  key={port.id}
                  className="flex items-center pl-3 relative"
                  style={{ height: portHeight }}
                >
                  <span className="text-[10px] text-gray-400 mr-1">{port.name}</span>
                  {/* Port dot (on right edge) */}
                  <div
                    className="port-dot absolute right-0 translate-x-1/2 w-3 h-3 rounded-full border-2 cursor-crosshair z-10 hover:scale-125 transition-transform"
                    style={{
                      borderColor: portColor,
                      backgroundColor: portColor,
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      onPortDragStart(node.id, port.id, "output", port.dataType, rect.left + rect.width, rect.top + rect.height / 2);
                    }}
                    title={`${port.name} (${port.dataType})`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
