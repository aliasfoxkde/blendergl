import { useCallback, useRef, useState } from "react";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { useCollectionStore } from "@/editor/stores/collectionStore";

export function SceneHierarchy() {
  const entities = useSceneStore((s) => s.entities);
  const scene = useSceneStore((s) => s.scene);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const select = useSelectionStore((s) => s.select);
  const removeEntity = useSceneStore((s) => s.removeEntity);
  const setParent = useSceneStore((s) => s.setParent);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const dragIdRef = useRef<string | null>(null);

  const rootEntities = scene.rootEntityIds
    .map((id) => entities[id])
    .filter(Boolean);

  const handleClick = useCallback(
    (id: string, e: React.MouseEvent) => {
      select(id, e.shiftKey);
    },
    [select]
  );

  const handleDelete = useCallback(
    (id: string) => {
      removeEntity(id);
      useSelectionStore.getState().deselectAll();
    },
    [removeEntity]
  );

  const handleDragStart = useCallback((id: string) => {
    dragIdRef.current = id;
  }, []);

  const handleDragOver = useCallback((id: string) => {
    setDragOverId(id);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback(
    (targetId: string) => {
      const dragId = dragIdRef.current;
      dragIdRef.current = null;
      setDragOverId(null);
      if (!dragId || dragId === targetId) return;

      // Prevent creating a cycle: check if targetId is a descendant of dragId
      const dragEntity = entities[dragId];
      if (!dragEntity) return;

      let current: string | null = targetId;
      while (current) {
        if (current === dragId) return; // cycle detected
        current = entities[current]?.parentId ?? null;
      }

      setParent(dragId, targetId);
    },
    [entities, setParent]
  );

  const handleDropOnRoot = useCallback(() => {
    const dragId = dragIdRef.current;
    dragIdRef.current = null;
    setDragOverId(null);
    if (!dragId) return;
    setParent(dragId, null);
  }, [setParent]);

  if (rootEntities.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-1">
        <CollectionsSection />
        <div className="flex items-center justify-center p-4">
          <p className="text-xs text-gray-500 text-center">
            No objects in scene.
            <br />
            Use the toolbar to add primitives.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto p-1"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDropOnRoot}
    >
      <CollectionsSection />
      {rootEntities.map((entity) => (
        <EntityItem
          key={entity.id}
          id={entity.id}
          name={entity.name}
          visible={entity.visible}
          locked={entity.locked}
          selected={selectedIds.includes(entity.id)}
          onClick={handleClick}
          onDelete={handleDelete}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          isDragOver={dragOverId === entity.id}
          depth={0}
          entities={entities}
          selectedIds={selectedIds}
        />
      ))}
    </div>
  );
}

function CollectionsSection() {
  const collections = useCollectionStore((s) => s.collections);
  const collectionOrder = useCollectionStore((s) => s.collectionOrder);
  const activeCollectionId = useCollectionStore((s) => s.activeCollectionId);
  const createCollection = useCollectionStore((s) => s.createCollection);
  const removeCollection = useCollectionStore((s) => s.removeCollection);
  const toggleCollectionVisibility = useCollectionStore((s) => s.toggleCollectionVisibility);
  const setActiveCollection = useCollectionStore((s) => s.setActiveCollection);

  if (collectionOrder.length === 0) {
    return (
      <div className="mb-1">
        <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase tracking-wider text-gray-500">
          <span>Collections</span>
          <button
            onClick={() => createCollection("Collection 1")}
            className="text-gray-500 hover:text-white transition"
            title="New Collection"
          >
            +
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-1">
      <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase tracking-wider text-gray-500">
        <span>Collections</span>
        <button
          onClick={() => createCollection(`Collection ${collectionOrder.length + 1}`)}
          className="text-gray-500 hover:text-white transition"
          title="New Collection"
        >
          +
        </button>
      </div>
      {collectionOrder.map((colId) => {
        const col = collections[colId];
        if (!col) return null;
        const isActive = colId === activeCollectionId;
        return (
          <div
            key={colId}
            className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer text-xs group ${
              isActive ? "bg-blue-500/20 text-blue-300" : "text-gray-300 hover:bg-white/5"
            }`}
            onClick={() => setActiveCollection(colId)}
          >
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: col.color }}
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCollectionVisibility(colId);
              }}
              className="w-3 text-center text-gray-500 hover:text-white"
            >
              {col.visible ? "👁" : "⊘"}
            </button>
            <span className="flex-1 truncate">{col.name}</span>
            <span className="text-[10px] text-gray-500">{col.entityIds.length}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeCollection(colId);
              }}
              className="w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition"
              title="Remove Collection"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

function EntityItem({
  id,
  name,
  visible,
  locked,
  selected,
  onClick,
  onDelete,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver,
  depth,
  entities,
  selectedIds,
}: {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  selected: boolean;
  onClick: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (id: string) => void;
  onDragLeave: () => void;
  onDrop: (id: string) => void;
  isDragOver: boolean;
  depth: number;
  entities: Record<string, { id: string; name: string; visible: boolean; locked: boolean; childrenIds: string[] }>;
  selectedIds: string[];
}) {
  const entity = entities[id];
  const children = entity?.childrenIds
    .map((cid) => entities[cid])
    .filter(Boolean) ?? [];

  return (
    <div>
      <div
        draggable
        className={`flex items-center gap-1 px-1 py-0.5 rounded text-xs cursor-pointer transition ${
          selected
            ? "bg-blue-500/20 text-blue-300"
            : "text-gray-400 hover:bg-[#2a2a2a] hover:text-gray-200"
        } ${isDragOver ? "ring-1 ring-blue-400" : ""}`}
        style={{ paddingLeft: `${depth * 12 + 4}px` }}
        onClick={(e) => onClick(id, e)}
        onDragStart={() => onDragStart(id)}
        onDragOver={(e) => {
          e.preventDefault();
          onDragOver(id);
        }}
        onDragLeave={onDragLeave}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDrop(id);
        }}
      >
        {/* Visibility icon */}
        <span className={`w-3 text-center ${visible ? "" : "opacity-30"}`}>
          {visible ? "👁" : "⊘"}
        </span>

        {/* Lock icon */}
        {locked && <span className="w-3 text-center text-yellow-500">🔒</span>}

        {/* Name */}
        <span className="flex-1 truncate">{name}</span>

        {/* Delete button */}
        <button
          className="w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 transition"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
          title="Delete"
        >
          ×
        </button>
      </div>

      {/* Render children recursively */}
      {children.map((child) => (
        <EntityItem
          key={child.id}
          id={child.id}
          name={child.name}
          visible={child.visible}
          locked={child.locked}
          selected={selectedIds.includes(child.id)}
          onClick={onClick}
          onDelete={onDelete}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          isDragOver={false}
          depth={depth + 1}
          entities={entities}
          selectedIds={selectedIds}
        />
      ))}
    </div>
  );
}
