/**
 * GraphConnection — renders a bezier curve between two ports.
 */

import { getConnectionPath } from "@/editor/utils/nodeEditor/nodeGraphUtils";
import type { PortDataType } from "@/editor/types/nodeEditor";
import { PORT_COLORS } from "@/editor/types/nodeEditor";

interface GraphConnectionProps {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dataType: PortDataType;
  selected?: boolean;
  onClick?: (id: string) => void;
}

export function GraphConnectionView({ id, x1, y1, x2, y2, dataType, selected, onClick }: GraphConnectionProps) {
  const path = getConnectionPath(x1, y1, x2, y2);
  const color = PORT_COLORS[dataType] ?? "#808080";

  return (
    <g
      className="cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(id);
      }}
    >
      {/* Shadow for visibility */}
      <path
        d={path}
        fill="none"
        stroke="#000"
        strokeWidth={selected ? 5 : 3}
        strokeOpacity={0.5}
      />
      {/* Main line */}
      <path
        d={path}
        fill="none"
        stroke={selected ? "#60a0ff" : color}
        strokeWidth={selected ? 3 : 2}
      />
    </g>
  );
}

// Temporary connection while dragging
interface TempConnectionProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dataType: PortDataType;
}

export function TempConnection({ x1, y1, x2, y2, dataType }: TempConnectionProps) {
  const path = getConnectionPath(x1, y1, x2, y2);
  const color = PORT_COLORS[dataType] ?? "#808080";

  return (
    <path
      d={path}
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeDasharray="6 4"
      strokeOpacity={0.7}
    />
  );
}
