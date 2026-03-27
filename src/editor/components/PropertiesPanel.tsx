import { useState, useEffect } from "react";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { useMaterialStore } from "@/editor/stores/materialStore";
import { useEditModeStore } from "@/editor/stores/editModeStore";
import { usePoseModeStore } from "@/editor/stores/poseModeStore";
import { useArmatureStore } from "@/editor/stores/armatureStore";
import { useAnimationStore } from "@/editor/stores/animationStore";
import { useSculptModeStore } from "@/editor/stores/sculptModeStore";
import { useSettingsStore, PRINTER_PROFILES } from "@/editor/stores/settingsStore";
import { usePhysicsStore } from "@/editor/stores/physicsStore";
import { useConstraintStore } from "@/editor/stores/constraintStore";
import { PoseLibraryPanel } from "@/editor/components/PoseLibraryPanel";
import { NlaEditor } from "@/editor/components/NlaEditor";
import { WeightPaintPanel } from "@/editor/components/WeightPaintPanel";
import { exportAnimationToJSON } from "@/editor/utils/animationExport";
import { formatAnalysis, estimatePrint, analyzeMesh, repairMesh, fillHoles } from "@/editor/utils/meshAnalysis";
import { sliceMesh } from "@/editor/utils/gcode/slicer";
import { generateGcode, downloadGcode } from "@/editor/utils/gcode/gcodeGenerator";
import { sceneRef } from "@/editor/utils/sceneRef";
import type { Mesh } from "@babylonjs/core/Meshes/mesh.js";

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

  // Sculpt mode: show brush settings
  if (editorMode === "sculpt") {
    const brush = useSculptModeStore((s) => s.brush);
    const symmetry = useSculptModeStore((s) => s.symmetry);
    const setBrushRadius = useSculptModeStore((s) => s.setBrushRadius);
    const setBrushStrength = useSculptModeStore((s) => s.setBrushStrength);
    const setFalloff = useSculptModeStore((s) => s.setFalloff);
    const toggleSymmetryX = useSculptModeStore((s) => s.toggleSymmetryX);
    const toggleSymmetryY = useSculptModeStore((s) => s.toggleSymmetryY);
    const toggleSymmetryZ = useSculptModeStore((s) => s.toggleSymmetryZ);

    return (
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <Section title="Sculpt Mode">
          <PropertyRow label="Brush">
            <span className="text-xs text-purple-400 capitalize">{brush.type}</span>
          </PropertyRow>
          <PropertyRow label="Radius">
            <input
              type="range" min="0.01" max="3.0" step="0.01"
              value={brush.radius}
              onChange={(e) => setBrushRadius(parseFloat(e.target.value))}
              className="w-full h-1 accent-purple-500"
            />
            <span className="text-[10px] text-gray-400 w-8 text-right">{brush.radius.toFixed(2)}</span>
          </PropertyRow>
          <PropertyRow label="Strength">
            <input
              type="range" min="0.01" max="1.0" step="0.01"
              value={brush.strength}
              onChange={(e) => setBrushStrength(parseFloat(e.target.value))}
              className="w-full h-1 accent-purple-500"
            />
            <span className="text-[10px] text-gray-400 w-8 text-right">{brush.strength.toFixed(2)}</span>
          </PropertyRow>
          <PropertyRow label="Falloff">
            <select
              value={brush.falloff}
              onChange={(e) => setFalloff(e.target.value as "smooth" | "sharp" | "spike")}
              className="bg-[#333] text-xs text-gray-300 rounded px-1 py-0.5 border border-[#444] flex-1"
            >
              <option value="smooth">Smooth</option>
              <option value="sharp">Sharp</option>
              <option value="spike">Spike</option>
            </select>
          </PropertyRow>
        </Section>
        <Section title="Symmetry">
          <div className="flex gap-2">
            <button
              className={`px-2 py-1 text-[10px] rounded border transition ${symmetry.x ? "bg-purple-600/40 text-purple-300 border-purple-500/50" : "text-gray-400 border-[#444] hover:text-white"}`}
              onClick={toggleSymmetryX}
            >
              X
            </button>
            <button
              className={`px-2 py-1 text-[10px] rounded border transition ${symmetry.y ? "bg-purple-600/40 text-purple-300 border-purple-500/50" : "text-gray-400 border-[#444] hover:text-white"}`}
              onClick={toggleSymmetryY}
            >
              Y
            </button>
            <button
              className={`px-2 py-1 text-[10px] rounded border transition ${symmetry.z ? "bg-purple-600/40 text-purple-300 border-purple-500/50" : "text-gray-400 border-[#444] hover:text-white"}`}
              onClick={toggleSymmetryZ}
            >
              Z
            </button>
          </div>
        </Section>
        <Section title="Shortcuts">
          <div className="text-[10px] text-gray-500 space-y-0.5">
            <p><kbd className="text-gray-400">S</kbd> Sculpt  <kbd className="text-gray-400">Shift+S</kbd> Smooth</p>
            <p><kbd className="text-gray-400">G</kbd> Grab  <kbd className="text-gray-400">I</kbd> Inflate</p>
            <p><kbd className="text-gray-400">C</kbd> Crease  <kbd className="text-gray-400">F</kbd> Flatten</p>
            <p><kbd className="text-gray-400">P</kbd> Pinch</p>
            <p><kbd className="text-gray-400">[</kbd> / <kbd className="text-gray-400">]</kbd> Radius</p>
          </div>
        </Section>
      </div>
    );
  }

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

  // Pose mode: show bone info + armature
  if (editorMode === "pose") {
    const activeBoneId = usePoseModeStore.getState().activeBoneId;
    return (
      <div className="flex-1 overflow-y-auto">
        <PoseModePanel />
        <ArmatureSection entityId={activeEntityId} />
        <ConstraintSection boneId={activeBoneId} />
        <AnimationSection />
        <PoseLibrarySection />
        <NlaSection />
      </div>
    );
  }

  // Weight paint mode
  if (editorMode === "weight_paint") {
    return (
      <div className="flex-1 overflow-y-auto">
        <WeightPaintPanel />
      </div>
    );
  }

  if (!entity) {
    return <SettingsPanel />;
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
        <PropertyRow label="Texture">
          <TextureUpload entityId={entity.id} />
        </PropertyRow>
      </Section>

      {/* Mesh Info (3D Print) */}
      <MeshInfoSection entityId={entity.id} />

      {/* Armature */}
      <ArmatureSection entityId={entity.id} />

      {/* Animation */}
      <AnimationSection />

      {/* Physics */}
      <PhysicsSection entityId={entity.id} />

      {/* Game Script */}
      <GameScriptSection entityId={entity.id} />
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

// ---- Physics Section ----

function PhysicsSection({ entityId }: { entityId: string }) {
  const body = usePhysicsStore((s) => s.bodies[entityId]);
  const setBody = usePhysicsStore((s) => s.setBody);
  const enableBody = usePhysicsStore((s) => s.enableBody);
  const disableBody = usePhysicsStore((s) => s.disableBody);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-[#333]">
      <button
        className="w-full px-3 py-1.5 text-xs font-medium text-gray-400 bg-[#282828] flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex items-center gap-1.5">
          Physics
          {body?.enabled && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
        </span>
        <span className="text-[10px] text-gray-500">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-3 py-2 space-y-1.5">
          <PropertyRow label="Enable">
            <input
              type="checkbox"
              checked={body?.enabled ?? false}
              onChange={(e) => e.target.checked ? enableBody(entityId) : disableBody(entityId)}
              className="accent-blue-500"
            />
          </PropertyRow>
          <PropertyRow label="Type">
            <select
              value={body?.motionType ?? "dynamic"}
              onChange={(e) => setBody(entityId, { motionType: e.target.value as "static" | "dynamic" | "kinematic" })}
              className="w-full bg-[#1a1a1a] border border-[#444] rounded px-1.5 py-0.5 text-[10px] text-gray-300 focus:border-blue-500 focus:outline-none"
            >
              <option value="static">Static</option>
              <option value="dynamic">Dynamic</option>
              <option value="kinematic">Kinematic</option>
            </select>
          </PropertyRow>
          <PropertyRow label="Collider">
            <select
              value={body?.colliderShape ?? "box"}
              onChange={(e) => setBody(entityId, { colliderShape: e.target.value as "box" | "sphere" | "cylinder" | "capsule" | "convex_hull" | "mesh" })}
              className="w-full bg-[#1a1a1a] border border-[#444] rounded px-1.5 py-0.5 text-[10px] text-gray-300 focus:border-blue-500 focus:outline-none"
            >
              <option value="box">Box</option>
              <option value="sphere">Sphere</option>
              <option value="cylinder">Cylinder</option>
              <option value="capsule">Capsule</option>
              <option value="convex_hull">Convex Hull</option>
              <option value="mesh">Mesh</option>
            </select>
          </PropertyRow>
          <SliderRow label="Mass" value={body?.mass ?? 1} min={0.01} max={100} step={0.1} onChange={(v) => setBody(entityId, { mass: v })} />
          <SliderRow label="Friction" value={body?.friction ?? 0.5} min={0} max={1} step={0.01} onChange={(v) => setBody(entityId, { friction: v })} />
          <SliderRow label="Bounce" value={body?.restitution ?? 0} min={0} max={1} step={0.01} onChange={(v) => setBody(entityId, { restitution: v })} />
          <SliderRow label="Lin Damp" value={body?.linearDamping ?? 0} min={0} max={1} step={0.01} onChange={(v) => setBody(entityId, { linearDamping: v })} />
          <SliderRow label="Ang Damp" value={body?.angularDamping ?? 0.05} min={0} max={1} step={0.01} onChange={(v) => setBody(entityId, { angularDamping: v })} />
          <PropertyRow label="Trigger">
            <input
              type="checkbox"
              checked={body?.isTrigger ?? false}
              onChange={(e) => setBody(entityId, { isTrigger: e.target.checked })}
              className="accent-blue-500"
            />
          </PropertyRow>
          <PropertyRow label="Layer">
            <input
              type="number"
              value={body?.collisionLayer ?? 1}
              min={1}
              max={32}
              onChange={(e) => setBody(entityId, { collisionLayer: parseInt(e.target.value) || 1 })}
              className="w-full bg-[#1a1a1a] border border-[#444] rounded px-1.5 py-0.5 text-[10px] text-gray-300 focus:border-blue-500 focus:outline-none"
            />
          </PropertyRow>
          <PropertyRow label="Mask">
            <input
              type="number"
              value={body?.collisionMask ?? 1}
              min={1}
              max={32}
              onChange={(e) => setBody(entityId, { collisionMask: parseInt(e.target.value) || 1 })}
              className="w-full bg-[#1a1a1a] border border-[#444] rounded px-1.5 py-0.5 text-[10px] text-gray-300 focus:border-blue-500 focus:outline-none"
            />
          </PropertyRow>
        </div>
      )}
    </div>
  );
}

// ---- Game Script Section ----

function GameScriptSection({ entityId }: { entityId: string }) {
  const scripts = usePhysicsStore((s) => s.scripts[entityId] ?? []);
  const addScript = usePhysicsStore((s) => s.addScript);
  const removeScript = usePhysicsStore((s) => s.removeScript);
  const updateScript = usePhysicsStore((s) => s.updateScript);
  const [expanded, setExpanded] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const handleAddScript = () => {
    const id = `script_${Date.now()}`;
    addScript(entityId, {
      id,
      name: "New Script",
      source: `// Game script for this entity\n// Available: input, time, entity, transform, physics, log\n\nfunction onUpdate(dt) {\n  // Runs every frame\n}`,
      enabled: true,
    });
    setEditId(id);
  };

  return (
    <div className="border-b border-[#333]">
      <button
        className="w-full px-3 py-1.5 text-xs font-medium text-gray-400 bg-[#282828] flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <span>Game Scripts ({scripts.length})</span>
        <span className="text-[10px] text-gray-500">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-3 py-2 space-y-1.5">
          {scripts.map((script) => (
            <div key={script.id} className="border border-[#444] rounded bg-[#1a1a1a] p-1.5">
              <div className="flex items-center justify-between mb-1">
                <input
                  type="text"
                  value={script.name}
                  onChange={(e) => updateScript(entityId, script.id, { name: e.target.value })}
                  className="bg-transparent text-[10px] text-gray-300 flex-1 focus:outline-none"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={script.enabled}
                    onChange={(e) => updateScript(entityId, script.id, { enabled: e.target.checked })}
                    className="accent-blue-500"
                    title="Enabled"
                  />
                  <button
                    className="text-gray-500 hover:text-gray-300 text-[10px]"
                    onClick={() => setEditId(editId === script.id ? null : script.id)}
                  >
                    {editId === script.id ? "▲" : "▼"}
                  </button>
                  <button
                    className="text-gray-500 hover:text-red-400 text-[10px]"
                    onClick={() => { removeScript(entityId, script.id); if (editId === script.id) setEditId(null); }}
                  >
                    ×
                  </button>
                </div>
              </div>
              {editId === script.id && (
                <textarea
                  value={script.source}
                  onChange={(e) => updateScript(entityId, script.id, { source: e.target.value })}
                  className="w-full h-32 bg-[#0d0d0d] border border-[#444] rounded px-1.5 py-1 text-[10px] text-green-300 font-mono resize-y focus:border-blue-500 focus:outline-none"
                  spellCheck={false}
                />
              )}
            </div>
          ))}
          <button
            className="w-full py-1 text-[10px] text-gray-400 hover:text-white border border-dashed border-[#444] rounded hover:border-blue-500 transition"
            onClick={handleAddScript}
          >
            + Add Script
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Game Settings Section (in Settings Panel) ----

function GameSettingsSection() {
  const gameSettings = usePhysicsStore((s) => s.gameSettings);
  const setGameSettings = usePhysicsStore((s) => s.setGameSettings);
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-[#333]">
      <button
        className="w-full px-3 py-1.5 text-xs font-medium text-gray-400 bg-[#282828] flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <span>Game Settings</span>
        <span className="text-[10px] text-gray-500">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-3 py-2 space-y-1.5">
          <PropertyRow label="Gravity Y">
            <input
              type="number"
              value={gameSettings.gravity.y}
              step={0.1}
              onChange={(e) => setGameSettings({ gravity: { ...gameSettings.gravity, y: parseFloat(e.target.value) || 0 } })}
              className="w-full bg-[#1a1a1a] border border-[#444] rounded px-1.5 py-0.5 text-[10px] text-gray-300 focus:border-blue-500 focus:outline-none"
            />
          </PropertyRow>
          <PropertyRow label="Gravity X">
            <input
              type="number"
              value={gameSettings.gravity.x}
              step={0.1}
              onChange={(e) => setGameSettings({ gravity: { ...gameSettings.gravity, x: parseFloat(e.target.value) || 0 } })}
              className="w-full bg-[#1a1a1a] border border-[#444] rounded px-1.5 py-0.5 text-[10px] text-gray-300 focus:border-blue-500 focus:outline-none"
            />
          </PropertyRow>
          <PropertyRow label="Gravity Z">
            <input
              type="number"
              value={gameSettings.gravity.z}
              step={0.1}
              onChange={(e) => setGameSettings({ gravity: { ...gameSettings.gravity, z: parseFloat(e.target.value) || 0 } })}
              className="w-full bg-[#1a1a1a] border border-[#444] rounded px-1.5 py-0.5 text-[10px] text-gray-300 focus:border-blue-500 focus:outline-none"
            />
          </PropertyRow>
          <PropertyRow label="Time Step">
            <span className="text-[10px] text-gray-400">{gameSettings.fixedTimeStep.toFixed(4)}s (1/{Math.round(1 / gameSettings.fixedTimeStep)})</span>
          </PropertyRow>
          <PropertyRow label="Max Steps">
            <input
              type="number"
              value={gameSettings.maxSubSteps}
              min={1}
              max={16}
              onChange={(e) => setGameSettings({ maxSubSteps: parseInt(e.target.value) || 4 })}
              className="w-full bg-[#1a1a1a] border border-[#444] rounded px-1.5 py-0.5 text-[10px] text-gray-300 focus:border-blue-500 focus:outline-none"
            />
          </PropertyRow>
        </div>
      )}
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

function SettingsPanel() {
  const snapIncrement = useSettingsStore((s) => s.snapIncrement);
  const setSnapIncrement = useSettingsStore((s) => s.setSnapIncrement);
  const angleSnap = useSettingsStore((s) => s.angleSnap);
  const setAngleSnap = useSettingsStore((s) => s.setAngleSnap);
  const scaleSnap = useSettingsStore((s) => s.scaleSnap);
  const setScaleSnap = useSettingsStore((s) => s.setScaleSnap);
  const gridSize = useSceneStore((s) => s.scene.settings.gridSize);
  const gridSubdivisions = useSceneStore((s) => s.scene.settings.gridSubdivisions);
  const updateSettings = useSceneStore((s) => s.updateSettings);

  return (
    <div className="flex-1 overflow-y-auto">
      <Section title="Grid & Snap">
        <SliderRow
          label="Grid Size"
          value={gridSize}
          min={5}
          max={50}
          step={1}
          onChange={(v) => updateSettings({ gridSize: v })}
        />
        <SliderRow
          label="Subdivs"
          value={gridSubdivisions}
          min={4}
          max={40}
          step={1}
          onChange={(v) => updateSettings({ gridSubdivisions: v })}
        />
        <PropertyRow label="Snap Dist">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={snapIncrement}
              step={0.1}
              min={0.01}
              onChange={(e) => setSnapIncrement(parseFloat(e.target.value) || 0.5)}
              className="w-full bg-[#1a1a1a] border border-[#444] rounded px-2 py-0.5 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </PropertyRow>
        <PropertyRow label="Angle Snap">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={angleSnap}
              step={1}
              min={1}
              max={90}
              onChange={(e) => setAngleSnap(parseFloat(e.target.value) || 15)}
              className="w-full bg-[#1a1a1a] border border-[#444] rounded px-2 py-0.5 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            />
            <span className="text-[10px] text-gray-500">deg</span>
          </div>
        </PropertyRow>
        <PropertyRow label="Scale Snap">
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={scaleSnap}
              step={0.1}
              min={0.01}
              onChange={(e) => setScaleSnap(parseFloat(e.target.value) || 0.1)}
              className="w-full bg-[#1a1a1a] border border-[#444] rounded px-2 py-0.5 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </PropertyRow>
      </Section>
      <PrintSettingsSection />
      <GameSettingsSection />
      <div className="px-3 py-4 text-center">
        <p className="text-[10px] text-gray-600">Select an object to edit its properties</p>
      </div>
    </div>
  );
}

function TextureUpload({ entityId }: { entityId: string }) {
  const material = useMaterialStore((s) => s.materials[entityId]);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      useMaterialStore.getState().updateMaterial(entityId, {
        diffuseTexture: base64,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemove = () => {
    useMaterialStore.getState().updateMaterial(entityId, {
      diffuseTexture: undefined,
    });
  };

  return (
    <div className="flex items-center gap-1">
      <label className="flex-1 cursor-pointer bg-[#1a1a1a] border border-[#444] rounded px-2 py-0.5 text-[10px] text-gray-400 hover:text-gray-200 hover:border-blue-500 transition text-center">
        {material?.diffuseTexture ? "Replace" : "Upload"}
        <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      </label>
      {material?.diffuseTexture && (
        <button
          className="px-1.5 py-0.5 bg-[#1a1a1a] border border-[#444] rounded text-[10px] text-gray-400 hover:text-red-400 hover:border-red-500 transition"
          onClick={handleRemove}
        >
          Remove
        </button>
      )}
    </div>
  );
}

function MeshInfoSection({ entityId }: { entityId: string }) {
  const [info, setInfo] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [repairLog, setRepairLog] = useState<string | null>(null);
  const [slicing, setSlicing] = useState(false);
  const printSettings = useSettingsStore((s) => s.printSettings);

  const analyze = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    const mesh = scene.meshes.find(
      (m) => m.metadata?.entityId === entityId
    ) as Mesh | undefined;

    if (mesh) {
      const analysis = analyzeMesh(mesh);
      const print = estimatePrint(analysis, {
        layerHeight: printSettings.layerHeight,
        infillDensity: printSettings.infillDensity,
        printSpeed: printSettings.printSpeed,
      });
      setInfo(
        formatAnalysis(analysis) +
          `\n\nEst. time: ~${print.estimatedTimeMinutes} min` +
          `\nEst. material: ~${print.estimatedMaterialGrams}g` +
          `\nEst. filament: ~${(print.estimatedMaterialMeters / 1000).toFixed(1)}m`
      );
    }
  };

  useEffect(() => {
    analyze();
  }, [entityId]);

  const handleRepair = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    const mesh = scene.meshes.find(
      (m) => m.metadata?.entityId === entityId
    ) as Mesh | undefined;

    if (mesh) {
      // Fill holes first
      const positions = mesh.getVerticesData("position") as Float32Array | null;
      const indices = mesh.getIndices();
      if (positions && indices) {
        const fillResult = fillHoles(positions, Array.from(indices));
        if (fillResult.holesFilled > 0) {
          mesh.setIndices(fillResult.newIndices);
          setRepairLog(`Filled ${fillResult.holesFilled} hole(s)`);
        }
      }
      const result = repairMesh(mesh);
      setRepairLog(result.details.join("\n"));
      analyze();
    }
  };

  const handleSliceExport = () => {
    const scene = sceneRef.current;
    if (!scene) return;

    const mesh = scene.meshes.find(
      (m) => m.metadata?.entityId === entityId
    ) as Mesh | undefined;
    if (!mesh) return;

    setSlicing(true);
    // Run slicing in next frame to avoid blocking UI
    requestAnimationFrame(() => {
      try {
        const positions = mesh.getVerticesData("position");
        const indices = mesh.getIndices();
        if (!positions || !indices) return;

        const analysis = analyzeMesh(mesh);
        const layers = sliceMesh(
          positions as Float32Array,
          indices as number[],
          analysis.boundingBox.min.z,
          analysis.boundingBox.max.z,
          printSettings.layerHeight
        );

        const result = generateGcode(layers, printSettings, analysis.boundingBox);
        downloadGcode(result.gcode, `${entityId}.gcode`);
        setRepairLog(`Sliced: ${layers.length} layers, ${(result.totalTime / 60).toFixed(1)}min est.`);
      } catch (err) {
        setRepairLog(`Slice error: ${err}`);
      } finally {
        setSlicing(false);
      }
    });
  };

  return (
    <div className="border-b border-[#333]">
      <button
        className="w-full px-3 py-1.5 text-xs font-medium text-gray-400 bg-[#282828] flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <span>Mesh Info (3D Print)</span>
        <span className="text-[10px] text-gray-500">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-3 py-2 space-y-2">
          {info ? (
            <pre className="text-[10px] text-gray-400 whitespace-pre-wrap font-mono leading-relaxed">
              {info}
            </pre>
          ) : (
            <p className="text-[10px] text-gray-600">Analyzing...</p>
          )}
          {repairLog && (
            <pre className="text-[10px] text-green-400 whitespace-pre-wrap font-mono leading-relaxed">
              {repairLog}
            </pre>
          )}
          <div className="flex gap-1">
            <button
              className="flex-1 text-[10px] text-gray-400 hover:text-white bg-[#1a1a1a] border border-[#444] rounded px-2 py-1 transition"
              onClick={analyze}
            >
              Refresh
            </button>
            <button
              className="flex-1 text-[10px] text-gray-400 hover:text-white bg-[#1a1a1a] border border-[#444] rounded px-2 py-1 transition"
              onClick={handleRepair}
            >
              Repair Mesh
            </button>
          </div>
          <button
            className="w-full text-[10px] text-gray-400 hover:text-white bg-[#1a1a1a] border border-[#444] rounded px-2 py-1 transition disabled:opacity-50"
            onClick={handleSliceExport}
            disabled={slicing}
          >
            {slicing ? "Slicing..." : "Slice & Export G-code"}
          </button>
        </div>
      )}
    </div>
  );
}

function PrintSettingsSection() {
  const [expanded, setExpanded] = useState(false);
  const print = useSettingsStore((s) => s.printSettings);
  const setPrint = useSettingsStore((s) => s.setPrintSettings);

  return (
    <div className="border-b border-[#333]">
      <button
        className="w-full px-3 py-1.5 text-xs font-medium text-gray-400 bg-[#282828] flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <span>Print Settings</span>
        <span className="text-[10px] text-gray-500">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-3 py-2 space-y-1.5">
          <PropertyRow label="Printer">
            <select
              defaultValue=""
              onChange={(e) => {
                const profile = PRINTER_PROFILES.find((p) => p.name === e.target.value);
                if (profile) {
                  setPrint({
                    nozzleDiameter: profile.nozzleDiameter,
                    extruderTemp: Math.min(print.extruderTemp, profile.maxExtruderTemp),
                    bedTemp: Math.min(print.bedTemp, profile.maxBedTemp),
                  });
                }
              }}
              className="w-full bg-[#1a1a1a] border border-[#444] rounded px-2 py-0.5 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="" disabled>Select profile...</option>
              {PRINTER_PROFILES.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.bedSize.x}x{p.bedSize.y})
                </option>
              ))}
            </select>
          </PropertyRow>
          <SliderRow
            label="Layer Ht"
            value={print.layerHeight}
            min={0.05}
            max={0.4}
            step={0.05}
            onChange={(v) => setPrint({ layerHeight: v })}
          />
          <SliderRow
            label="Infill %"
            value={print.infillDensity}
            min={0}
            max={100}
            step={5}
            onChange={(v) => setPrint({ infillDensity: v })}
          />
          <PropertyRow label="Pattern">
            <select
              value={print.infillPattern}
              onChange={(e) => setPrint({ infillPattern: e.target.value as "grid" | "lines" | "triangles" | "gyroid" | "honeycomb" })}
              className="w-full bg-[#1a1a1a] border border-[#444] rounded px-2 py-0.5 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="grid">Grid</option>
              <option value="lines">Lines</option>
              <option value="triangles">Triangles</option>
              <option value="gyroid">Gyroid</option>
              <option value="honeycomb">Honeycomb</option>
            </select>
          </PropertyRow>
          <PropertyRow label="Walls">
            <input
              type="number"
              value={print.wallCount}
              min={1}
              max={10}
              onChange={(e) => setPrint({ wallCount: parseInt(e.target.value) || 3 })}
              className="w-full bg-[#1a1a1a] border border-[#444] rounded px-2 py-0.5 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            />
          </PropertyRow>
          <PropertyRow label="Top/Bot">
            <input
              type="number"
              value={print.topBottomLayers}
              min={0}
              max={20}
              onChange={(e) => setPrint({ topBottomLayers: parseInt(e.target.value) || 4 })}
              className="w-full bg-[#1a1a1a] border border-[#444] rounded px-2 py-0.5 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            />
          </PropertyRow>
          <PropertyRow label="Support">
            <input
              type="checkbox"
              checked={print.supportEnabled}
              onChange={(e) => setPrint({ supportEnabled: e.target.checked })}
              className="accent-blue-500"
            />
          </PropertyRow>
          {print.supportEnabled && (
            <SliderRow
              label="Overhang"
              value={print.supportOverhangAngle}
              min={20}
              max={80}
              step={5}
              onChange={(v) => setPrint({ supportOverhangAngle: v })}
            />
          )}
          <PropertyRow label="Adhesion">
            <select
              value={print.adhesionType}
              onChange={(e) => setPrint({ adhesionType: e.target.value as "none" | "skirt" | "brim" | "raft" })}
              className="w-full bg-[#1a1a1a] border border-[#444] rounded px-2 py-0.5 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="none">None</option>
              <option value="skirt">Skirt</option>
              <option value="brim">Brim</option>
              <option value="raft">Raft</option>
            </select>
          </PropertyRow>
          <Section title="Speeds (mm/s)">
            <SliderRow label="Print" value={print.printSpeed} min={10} max={200} step={5} onChange={(v) => setPrint({ printSpeed: v })} />
            <SliderRow label="Outer" value={print.outerWallSpeed} min={10} max={150} step={5} onChange={(v) => setPrint({ outerWallSpeed: v })} />
            <SliderRow label="Inner" value={print.innerWallSpeed} min={10} max={150} step={5} onChange={(v) => setPrint({ innerWallSpeed: v })} />
            <SliderRow label="Infill" value={print.infillSpeed} min={10} max={200} step={5} onChange={(v) => setPrint({ infillSpeed: v })} />
            <SliderRow label="Travel" value={print.travelSpeed} min={50} max={300} step={10} onChange={(v) => setPrint({ travelSpeed: v })} />
          </Section>
          <Section title="Temperatures (°C)">
            <SliderRow label="Hotend" value={print.extruderTemp} min={150} max={300} step={5} onChange={(v) => setPrint({ extruderTemp: v })} />
            <SliderRow label="Bed" value={print.bedTemp} min={0} max={120} step={5} onChange={(v) => setPrint({ bedTemp: v })} />
          </Section>
          <Section title="Hardware">
            <PropertyRow label="Nozzle">
              <input
                type="number"
                value={print.nozzleDiameter}
                min={0.1}
                max={1.0}
                step={0.1}
                onChange={(e) => setPrint({ nozzleDiameter: parseFloat(e.target.value) || 0.4 })}
                className="w-full bg-[#1a1a1a] border border-[#444] rounded px-2 py-0.5 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
              />
            </PropertyRow>
            <PropertyRow label="Filament">
              <input
                type="number"
                value={print.filamentDiameter}
                min={1.5}
                max={3.0}
                step={0.25}
                onChange={(e) => setPrint({ filamentDiameter: parseFloat(e.target.value) || 1.75 })}
                className="w-full bg-[#1a1a1a] border border-[#444] rounded px-2 py-0.5 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
              />
            </PropertyRow>
          </Section>
        </div>
      )}
    </div>
  );
}

function PoseModePanel() {
  const selectedBoneIds = usePoseModeStore((s) => s.selectedBoneIds);
  const activeBoneId = usePoseModeStore((s) => s.activeBoneId);
  const activeEntityId = usePoseModeStore((s) => s.activeArmatureEntityId);
  const armData = activeEntityId ? useArmatureStore((s) => s.armatures[activeEntityId]) : null;
  const currentFrame = useAnimationStore((s) => s.currentFrame);

  const activeBone = activeBoneId && armData ? armData.bones[activeBoneId] : null;

  return (
    <Section title="Pose Mode">
      <PropertyRow label="Frame">
        <span className="text-xs text-green-400 font-mono">{currentFrame}</span>
      </PropertyRow>
      <PropertyRow label="Bones">
        <span className="text-xs text-gray-300">{selectedBoneIds.size} selected</span>
      </PropertyRow>
      {activeBone && (
        <>
          <PropertyRow label="Bone">
            <span className="text-xs text-yellow-300">{activeBone.name}</span>
          </PropertyRow>
          <div className="text-[10px] text-gray-500 mt-1">
            Pos: ({activeBone.restPosition.x.toFixed(2)}, {activeBone.restPosition.y.toFixed(2)}, {activeBone.restPosition.z.toFixed(2)})
          </div>
          <div className="text-[10px] text-gray-500">
            Rot: ({activeBone.restRotation.x.toFixed(1)}, {activeBone.restRotation.y.toFixed(1)}, {activeBone.restRotation.z.toFixed(1)})
          </div>
          <div className="px-3 py-2">
            <button
              className="w-full text-[10px] text-gray-400 hover:text-white py-1 transition"
              onClick={() => usePoseModeStore.getState().deselectAll()}
            >
              Deselect All Bones
            </button>
          </div>
        </>
      )}
      <div className="px-3 py-1">
        <p className="text-[10px] text-gray-600">Press I to insert keyframe</p>
      </div>
    </Section>
  );
}

function ArmatureSection({ entityId }: { entityId: string | null }) {
  const armData = entityId ? useArmatureStore((s) => s.armatures[entityId]) : null;
  const [expanded, setExpanded] = useState(false);

  if (!armData) return null;

  const boneCount = Object.keys(armData.bones).length;

  return (
    <div className="border-b border-[#333]">
      <button
        className="w-full px-3 py-1.5 text-xs font-medium text-gray-400 bg-[#282828] flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <span>Armature ({boneCount} bones)</span>
        <span className="text-[10px] text-gray-500">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-3 py-2 space-y-1">
          <PropertyRow label="Roots">
            <span className="text-xs text-gray-300">{armData.rootBoneIds.length}</span>
          </PropertyRow>
          <div className="flex gap-1 mt-1">
            <button
              className="flex-1 text-[10px] text-gray-400 hover:text-white bg-[#1a1a1a] border border-[#444] rounded px-2 py-1 transition"
              onClick={() => {
                if (!entityId) return;
                const boneId = crypto.randomUUID();
                useArmatureStore.getState().addBone(entityId, {
                  id: boneId,
                  name: `Bone.${String(boneCount).padStart(3, "0")}`,
                  parentId: armData.rootBoneIds.length > 0 ? armData.rootBoneIds[0] : null,
                  length: 1,
                  restPosition: { x: 0, y: boneCount * 1, z: 0 },
                  restRotation: { x: 0, y: 0, z: 0 },
                  restScale: { x: 1, y: 1, z: 1 },
                });
              }}
            >
              Add Bone
            </button>
            <button
              className="flex-1 text-[10px] text-gray-400 hover:text-white bg-[#1a1a1a] border border-[#444] rounded px-2 py-1 transition"
              onClick={() => {
                if (entityId) useArmatureStore.getState().removeArmature(entityId);
              }}
            >
              Remove
            </button>
          </div>
          {Object.values(armData.bones).map((bone) => (
            <div key={bone.id} className="text-[10px] text-gray-400 py-0.5 border-t border-[#333]">
              {bone.name} {bone.parentId ? `(parent: ${armData.bones[bone.parentId]?.name ?? "?"})` : "(root)"}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AnimationSection() {
  const clips = useAnimationStore((s) => s.clips);
  const activeClipId = useAnimationStore((s) => s.activeClipId);
  const isPlayMode = useAnimationStore((s) => s.isPlayMode);
  const [expanded, setExpanded] = useState(false);
  const [newClipName, setNewClipName] = useState("Action");

  const activeClip = activeClipId ? clips[activeClipId] : null;

  return (
    <div className="border-b border-[#333]">
      <button
        className="w-full px-3 py-1.5 text-xs font-medium text-gray-400 bg-[#282828] flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <span>Animation ({Object.keys(clips).length} clips)</span>
        <span className="text-[10px] text-gray-500">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-3 py-2 space-y-1.5">
          {activeClip && (
            <>
              <PropertyRow label="Active">
                <span className="text-xs text-blue-300">{activeClip.name}</span>
              </PropertyRow>
              <PropertyRow label="Duration">
                <span className="text-xs text-gray-300">{activeClip.durationFrames} frames</span>
              </PropertyRow>
              <PropertyRow label="Tracks">
                <span className="text-xs text-gray-300">{activeClip.tracks.length}</span>
              </PropertyRow>
              <PropertyRow label="Mode">
                <button
                  className={`text-[10px] px-2 py-0.5 rounded transition ${
                    isPlayMode
                      ? "bg-green-600/30 text-green-200 border border-green-500/50"
                      : "bg-[#333] text-gray-400 border border-[#444] hover:text-white"
                  }`}
                  onClick={() => useAnimationStore.getState().togglePlayMode()}
                >
                  {isPlayMode ? "Play Mode" : "Edit Mode"}
                </button>
              </PropertyRow>
            </>
          )}

          <div className="flex gap-1 mt-1">
            <input
              type="text"
              value={newClipName}
              onChange={(e) => setNewClipName(e.target.value)}
              className="flex-1 bg-[#1a1a1a] border border-[#444] rounded px-2 py-0.5 text-[10px] text-gray-200 focus:border-blue-500 focus:outline-none"
            />
            <button
              className="text-[10px] text-gray-400 hover:text-white bg-[#1a1a1a] border border-[#444] rounded px-2 py-0.5 transition"
              onClick={() => {
                useAnimationStore.getState().createClip(newClipName || "Action");
              }}
            >
              New
            </button>
            <button
              className="text-[10px] text-gray-400 hover:text-white bg-[#1a1a1a] border border-[#444] rounded px-2 py-0.5 transition"
              onClick={() => {
                const json = exportAnimationToJSON(clips);
                const blob = new Blob([json], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "animation.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Export
            </button>
          </div>

          {Object.values(clips).length > 0 && (
            <div className="mt-1 space-y-0.5">
              {Object.values(clips).map((clip) => (
                <div
                  key={clip.id}
                  className={`text-[10px] px-1 py-0.5 rounded cursor-pointer transition ${
                    clip.id === activeClipId
                      ? "bg-blue-600/20 text-blue-300"
                      : "text-gray-400 hover:text-white hover:bg-[#333]"
                  }`}
                  onClick={() => useAnimationStore.getState().setActiveClip(clip.id)}
                >
                  {clip.name} ({clip.tracks.length} tracks, {clip.durationFrames}f)
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PoseLibrarySection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-[#333]">
      <button
        className="w-full px-3 py-1.5 text-xs font-medium text-gray-400 bg-[#282828] flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <span>Pose Library</span>
        <span className="text-[10px] text-gray-500">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && <PoseLibraryPanel />}
    </div>
  );
}

function NlaSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-[#333]">
      <button
        className="w-full px-3 py-1.5 text-xs font-medium text-gray-400 bg-[#282828] flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <span>NLA Editor</span>
        <span className="text-[10px] text-gray-500">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && <NlaEditor />}
    </div>
  );
}

function ConstraintSection({ boneId }: { boneId: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const constraints = useConstraintStore((s) => s.constraints);
  const addConstraint = useConstraintStore((s) => s.addConstraint);
  const removeConstraint = useConstraintStore((s) => s.removeConstraint);
  const setConstraintEnabled = useConstraintStore((s) => s.setConstraintEnabled);
  const setConstraintInfluence = useConstraintStore((s) => s.setConstraintInfluence);

  if (!boneId) return null;

  const boneConstraints = Object.values(constraints).filter((c) => c.boneId === boneId);

  return (
    <div className="border-b border-[#333]">
      <button
        className="w-full px-3 py-1.5 text-xs font-medium text-gray-400 bg-[#282828] flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <span>Constraints ({boneConstraints.length})</span>
        <span className="text-[10px] text-gray-500">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-3 py-2 space-y-1.5">
          <div className="flex gap-1 flex-wrap">
            {(["ik", "look_at", "track_to", "limit"] as const).map((type) => (
              <button
                key={type}
                className="text-[9px] px-1.5 py-0.5 bg-[#333] text-gray-300 hover:bg-[#444] rounded border border-[#444] capitalize transition"
                onClick={() =>
                  addConstraint({
                    type,
                    boneId,
                    enabled: true,
                    influence: 1.0,
                    targetBoneId: null,
                    targetPosition: null,
                    settings: {},
                  })
                }
              >
                + {type.replace("_", " ")}
              </button>
            ))}
          </div>
          {boneConstraints.map((c) => (
            <div key={c.id} className="bg-[#2a2a3a] rounded p-1.5 space-y-1 border border-[#333]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-300 capitalize">{c.type.replace("_", " ")}</span>
                <button
                  className="text-[9px] text-red-400 hover:text-red-300"
                  onClick={() => removeConstraint(c.id)}
                >
                  X
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-gray-500 w-8">On</span>
                <button
                  className={`w-5 h-3 rounded-full transition ${c.enabled ? "bg-blue-500" : "bg-[#444]"}`}
                  onClick={() => setConstraintEnabled(c.id, !c.enabled)}
                >
                  <div className={`w-2.5 h-2.5 bg-white rounded-full shadow transition-transform ${c.enabled ? "translate-x-2" : "translate-x-0.5"}`} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-gray-500 w-8">Inf</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={c.influence}
                  className="flex-1 h-0.5 accent-blue-500"
                  onChange={(e) => setConstraintInfluence(c.id, Number(e.target.value))}
                />
                <span className="text-gray-600 w-8 text-right tabular-nums text-[9px]">
                  {c.influence.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}