import { useSceneStore } from "@/editor/stores/sceneStore";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { useMaterialStore } from "@/editor/stores/materialStore";
import { useEditModeStore } from "@/editor/stores/editModeStore";

export function PropertiesPanel() {
  const activeEntityId = useSelectionStore((s) => s.activeEntityId);
  const entities = useSceneStore((s) => s.entities);
  const updateEntityTransform = useSceneStore((s) => s.updateEntityTransform);
  const updateEntityName = useSceneStore((s) => s.updateEntityName);
  const materials = useMaterialStore((s) => s.materials);
  const updateMaterial = useMaterialStore((s) => s.updateMaterial);

  const editorMode = useSelectionStore((s) => s.editorMode);
  const {
    elementMode,
    selectedVertices,
    selectedEdges,
    selectedFaces,
    deselectAll,
  } = useEditModeStore();

  const entity = activeEntityId ? entities[activeEntityId] : null;

  // Edit mode: show selection stats
  if (editorMode === "edit") {
    return (
      <div className="flex-1 overflow-y-auto">
        <Section title="Edit Mode">
          <PropertyRow label="Mode">
            <span className="text-xs text-blue-400 capitalize">{elementMode}</span>
          </PropertyRow>
          <PropertyRow label="Vertices">
            <span className="text-xs text-gray-300">{selectedVertices.size} selected</span>
          </PropertyRow>
          <PropertyRow label="Edges">
            <span className="text-xs text-gray-300">{selectedEdges.size} selected</span>
          </PropertyRow>
          <PropertyRow label="Faces">
            <span className="text-xs text-gray-300">{selectedFaces.size} selected</span>
          </PropertyRow>
        </Section>
        <div className="px-3 py-2">
          <button
            className="w-full text-xs text-gray-400 hover:text-white py-1 transition"
            onClick={deselectAll}
          >
            Deselect All
          </button>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-gray-500 text-center">
          No object selected.
          <br />
          Click an object in the viewport or scene hierarchy.
        </p>
      </div>
    );
  }

  const material = materials[entity.id];
  const { transform } = entity;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Entity info */}
      <Section title="Object">
        <PropertyRow label="Name">
          <input
            type="text"
            value={entity.name}
            onChange={(e) => updateEntityName(entity.id, e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#444] rounded px-2 py-1 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
          />
        </PropertyRow>
        <PropertyRow label="Visible">
          <input
            type="checkbox"
            checked={entity.visible}
            onChange={(e) =>
              useSceneStore.getState().updateEntityVisibility(entity.id, e.target.checked)
            }
            className="accent-blue-500"
          />
        </PropertyRow>
        <PropertyRow label="Locked">
          <input
            type="checkbox"
            checked={entity.locked}
            onChange={(e) =>
              useSceneStore.getState().updateEntityLock(entity.id, e.target.checked)
            }
            className="accent-yellow-500"
          />
        </PropertyRow>
      </Section>

      {/* Transform */}
      <Section title="Transform">
        <TransformInput
          label="Position"
          value={transform.position}
          onChange={(v) => updateEntityTransform(entity.id, { position: v })}
          color="blue"
        />
        <TransformInput
          label="Rotation"
          value={transform.rotation}
          onChange={(v) => updateEntityTransform(entity.id, { rotation: v })}
          color="green"
          step={1}
        />
        <TransformInput
          label="Scale"
          value={transform.scale}
          onChange={(v) => updateEntityTransform(entity.id, { scale: v })}
          color="red"
          step={0.1}
        />
      </Section>

      {/* Material */}
      <Section title="Material">
        <PropertyRow label="Color">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={material?.albedo ?? "#888888"}
              onChange={(e) => updateMaterial(entity.id, { albedo: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer border border-[#444] bg-transparent"
            />
            <input
              type="text"
              value={material?.albedo ?? "#888888"}
              onChange={(e) => updateMaterial(entity.id, { albedo: e.target.value })}
              className="flex-1 bg-[#1a1a1a] border border-[#444] rounded px-2 py-0.5 text-xs text-gray-200 focus:border-blue-500 focus:outline-none font-mono"
            />
          </div>
        </PropertyRow>
        <SliderRow
          label="Metallic"
          value={material?.metallic ?? 0}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateMaterial(entity.id, { metallic: v })}
        />
        <SliderRow
          label="Roughness"
          value={material?.roughness ?? 0.5}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateMaterial(entity.id, { roughness: v })}
        />
        <PropertyRow label="Emissive">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={material?.emissive ?? "#000000"}
              onChange={(e) => updateMaterial(entity.id, { emissive: e.target.value })}
              className="w-6 h-6 rounded cursor-pointer border border-[#444] bg-transparent"
            />
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={material?.emissiveIntensity ?? 0}
              onChange={(e) => updateMaterial(entity.id, { emissiveIntensity: parseFloat(e.target.value) })}
              className="flex-1 accent-orange-500"
            />
            <span className="text-[10px] text-gray-500 w-6 text-right">
              {(material?.emissiveIntensity ?? 0).toFixed(1)}
            </span>
          </div>
        </PropertyRow>
        <SliderRow
          label="Opacity"
          value={material?.opacity ?? 1}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => updateMaterial(entity.id, { opacity: v })}
        />
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[#333]">
      <div className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-[#282828]">
        {title}
      </div>
      <div className="px-3 py-2 space-y-1.5">{children}</div>
    </div>
  );
}

function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-14 shrink-0">{label}</span>
      <div className="flex-1">{children}</div>
    </div>
  );
}

interface Vec3Value {
  x: number;
  y: number;
  z: number;
}

function TransformInput({
  label,
  value,
  onChange,
  color,
  step = 0.1,
}: {
  label: string;
  value: Vec3Value;
  onChange: (v: Vec3Value) => void;
  color: string;
  step?: number;
}) {
  const handleChange = (axis: "x" | "y" | "z", val: string) => {
    const num = parseFloat(val) || 0;
    onChange({ ...value, [axis]: num });
  };

  const colorClasses: Record<string, string> = {
    blue: "text-blue-400",
    green: "text-green-400",
    red: "text-red-400",
  };

  return (
    <div>
      <div className="text-[10px] text-gray-500 mb-0.5">{label}</div>
      <div className="flex gap-1">
        {(["x", "y", "z"] as const).map((axis) => (
          <div key={axis} className="flex-1 flex items-center gap-0.5">
            <span
              className={`text-[10px] font-bold ${colorClasses[color]}`}
            >
              {axis.toUpperCase()}
            </span>
            <input
              type="number"
              value={value[axis]}
              step={step}
              onChange={(e) => handleChange(axis, e.target.value)}
              className="w-full bg-[#1a1a1a] border border-[#444] rounded px-1 py-0.5 text-[10px] text-gray-200 focus:border-blue-500 focus:outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <PropertyRow label={label}>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="flex-1 accent-blue-500"
        />
        <span className="text-[10px] text-gray-500 w-8 text-right font-mono">
          {value.toFixed(2)}
        </span>
      </div>
    </PropertyRow>
  );
}
