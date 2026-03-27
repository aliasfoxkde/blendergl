import { useState, useEffect } from "react";
import { useSceneStore } from "@/editor/stores/sceneStore";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { useMaterialStore } from "@/editor/stores/materialStore";
import { useEditModeStore } from "@/editor/stores/editModeStore";
import { usePoseModeStore } from "@/editor/stores/poseModeStore";
import { useArmatureStore } from "@/editor/stores/armatureStore";
import { useAnimationStore } from "@/editor/stores/animationStore";
import { useSettingsStore } from "@/editor/stores/settingsStore";
import { formatAnalysis, estimatePrint, analyzeMesh, repairMesh } from "@/editor/utils/meshAnalysis";
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
    return (
      <div className="flex-1 overflow-y-auto">
        <PoseModePanel />
        <ArmatureSection entityId={activeEntityId} />
        <AnimationSection />
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

function SettingsPanel() {
  const snapIncrement = useSettingsStore((s) => s.snapIncrement);
  const setSnapIncrement = useSettingsStore((s) => s.setSnapIncrement);
  const angleSnap = useSettingsStore((s) => s.angleSnap);
  const setAngleSnap = useSettingsStore((s) => s.setAngleSnap);
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
      </Section>
      <PrintSettingsSection />
      <div className="px-3 py-4 text-center">
        <p className="text-[10px] text-gray-600">Select an object to edit its properties</p>
      </div>
    </div>
  );
}

function TextureUpload({ entityId }: { entityId: string }) {
  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      // Store texture data in material store (as emissive texture hint for now)
      useMaterialStore.getState().updateMaterial(entityId, {
        emissive: `texture:${base64}`,
        emissiveIntensity: 1,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div className="flex items-center gap-1">
      <label className="flex-1 cursor-pointer bg-[#1a1a1a] border border-[#444] rounded px-2 py-0.5 text-[10px] text-gray-400 hover:text-gray-200 hover:border-blue-500 transition text-center">
        Upload
        <input type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      </label>
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