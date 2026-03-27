import { useSceneStore } from "@/editor/stores/sceneStore";
import { useSelectionStore } from "@/editor/stores/selectionStore";

export function PropertiesPanel() {
  const activeEntityId = useSelectionStore((s) => s.activeEntityId);
  const entities = useSceneStore((s) => s.entities);
  const updateEntityTransform = useSceneStore((s) => s.updateEntityTransform);
  const updateEntityName = useSceneStore((s) => s.updateEntityName);

  const entity = activeEntityId ? entities[activeEntityId] : null;

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

  const { transform } = entity;

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Entity name */}
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
