import { useSceneStore } from "@/editor/stores/sceneStore";
import { useSelectionStore } from "@/editor/stores/selectionStore";

export function SceneHierarchy() {
  const entities = useSceneStore((s) => s.entities);
  const scene = useSceneStore((s) => s.scene);
  const selectedIds = useSelectionStore((s) => s.selectedIds);
  const select = useSelectionStore((s) => s.select);
  const removeEntity = useSceneStore((s) => s.removeEntity);

  const rootEntities = scene.rootEntityIds
    .map((id) => entities[id])
    .filter(Boolean);

  const handleClick = (id: string, e: React.MouseEvent) => {
    select(id, e.shiftKey);
  };

  const handleDelete = (id: string) => {
    removeEntity(id);
    useSelectionStore.getState().deselectAll();
  };

  if (rootEntities.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-gray-500 text-center">
          No objects in scene.
          <br />
          Use the toolbar to add primitives.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-1">
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
          depth={0}
        />
      ))}
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
  depth,
}: {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  selected: boolean;
  onClick: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string) => void;
  depth: number;
}) {
  return (
    <div
      className={`flex items-center gap-1 px-1 py-0.5 rounded text-xs cursor-pointer transition ${
        selected
          ? "bg-blue-500/20 text-blue-300"
          : "text-gray-400 hover:bg-[#2a2a2a] hover:text-gray-200"
      }`}
      style={{ paddingLeft: `${depth * 12 + 4}px` }}
      onClick={(e) => onClick(id, e)}
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
  );
}
