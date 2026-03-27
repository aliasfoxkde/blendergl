/**
 * AddNodeMenu — context menu for adding nodes to the graph.
 */

import { useState, useRef, useEffect, useMemo } from "react";
import { getAllNodeCategories, getNodeTypesByCategory, searchNodes } from "@/editor/utils/nodeEditor/nodeRegistry";
import { CATEGORY_COLORS } from "@/editor/types/nodeEditor";

interface AddNodeMenuProps {
  x: number;
  y: number;
  onAddNode: (type: string) => void;
  onClose: () => void;
}

export function AddNodeMenu({ x, y, onAddNode, onClose }: AddNodeMenuProps) {
  const [query, setQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const categories = useMemo(() => getAllNodeCategories(), []);
  const results = useMemo(() => {
    if (query.trim()) {
      return searchNodes(query.trim());
    }
    if (filterCategory) {
      return getNodeTypesByCategory(filterCategory);
    }
    return categories.flatMap((cat) => getNodeTypesByCategory(cat));
  }, [query, filterCategory, categories]);

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-[#2a2a2a] border border-[#444] rounded-lg shadow-2xl overflow-hidden"
      style={{ left: x, top: y, width: 220, maxHeight: 400 }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Search input */}
      <div className="p-2 border-b border-[#444]">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search nodes..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setFilterCategory(null);
          }}
          className="w-full bg-[#1a1a1a] text-xs text-gray-300 border border-[#444] rounded px-2 py-1.5 outline-none focus:border-blue-500"
        />
      </div>

      {/* Category tabs (when not searching) */}
      {!query.trim() && (
        <div className="flex gap-1 px-2 py-1 border-b border-[#444] overflow-x-auto">
          <button
            className={`text-[10px] px-2 py-0.5 rounded ${filterCategory === null ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
            onClick={() => setFilterCategory(null)}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              className={`text-[10px] px-2 py-0.5 rounded capitalize ${filterCategory === cat ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Node list */}
      <div className="overflow-y-auto" style={{ maxHeight: 300 }}>
        {results.map((nodeDef) => (
          <button
            key={nodeDef.type}
            className="w-full text-left px-3 py-1.5 hover:bg-[#3a3a3a] flex items-center gap-2 transition-colors"
            onClick={() => {
              onAddNode(nodeDef.type);
              onClose();
            }}
          >
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: CATEGORY_COLORS[nodeDef.category] ?? "#808080" }}
            />
            <span className="text-xs text-gray-300 truncate">{nodeDef.label}</span>
          </button>
        ))}
        {results.length === 0 && (
          <div className="px-3 py-4 text-xs text-gray-500 text-center">No matching nodes</div>
        )}
      </div>
    </div>
  );
}
