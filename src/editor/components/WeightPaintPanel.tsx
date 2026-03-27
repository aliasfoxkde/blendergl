import { useWeightPaintStore } from "@/editor/stores/weightPaintStore";
import { useArmatureStore } from "@/editor/stores/armatureStore";
import { usePoseModeStore } from "@/editor/stores/poseModeStore";

export function WeightPaintPanel() {
  const settings = useWeightPaintStore((s) => s.settings);
  const activeEntityId = useWeightPaintStore((s) => s.activeEntityId);
  const showHeatmap = useWeightPaintStore((s) => s.showWeightHeatmap);
  const setMode = useWeightPaintStore((s) => s.setMode);
  const setBrushRadius = useWeightPaintStore((s) => s.setBrushRadius);
  const setBrushStrength = useWeightPaintStore((s) => s.setBrushStrength);
  const setBrushFalloff = useWeightPaintStore((s) => s.setBrushFalloff);
  const setActiveBone = useWeightPaintStore((s) => s.setActiveBone);
  const toggleNormalizeWeights = useWeightPaintStore((s) => s.toggleNormalizeWeights);
  const toggleMirrorX = useWeightPaintStore((s) => s.toggleMirrorX);
  const toggleShowHeatmap = useWeightPaintStore((s) => s.toggleShowHeatmap);
  const autoWeight = useWeightPaintStore((s) => s.autoWeight);

  const activeArmatureEntityId = usePoseModeStore((s) => s.activeArmatureEntityId);
  const armData = useArmatureStore((s) =>
    activeArmatureEntityId ? s.armatures[activeArmatureEntityId] : null,
  );

  if (!activeEntityId) {
    return (
      <div className="p-3 text-xs text-gray-500 italic">
        Select a mesh to enter weight paint mode.
      </div>
    );
  }

  return (
    <div className="space-y-3 text-xs p-3">
      {/* Active Bone Selector */}
      <div>
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Active Bone
        </div>
        {armData ? (
          <select
            value={settings.activeBoneId ?? ""}
            onChange={(e) => setActiveBone(e.target.value || null)}
            className="w-full bg-[#333] text-white text-[10px] px-1 py-0.5 rounded border border-[#444]"
          >
            <option value="">Select bone...</option>
            {Object.values(armData.bones).map((bone) => (
              <option key={bone.id} value={bone.id}>
                {bone.name}
              </option>
            ))}
          </select>
        ) : (
          <div className="text-gray-600 text-[10px] italic">No armature selected</div>
        )}
      </div>

      {/* Brush Mode */}
      <div>
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Brush Mode
        </div>
        <div className="grid grid-cols-3 gap-1">
          {(["paint", "blur", "multiply"] as const).map((mode) => (
            <button
              key={mode}
              className={`px-1.5 py-1 rounded text-[9px] capitalize transition ${
                settings.mode === mode
                  ? "bg-blue-600/40 text-blue-200 border border-blue-500/50"
                  : "bg-[#333] text-gray-300 hover:bg-[#444] border border-[#444]"
              }`}
              onClick={() => setMode(mode)}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Brush Settings */}
      <div>
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Brush Settings
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 w-16">Radius</span>
            <input
              type="range"
              min={1}
              max={200}
              value={settings.brushRadius}
              className="flex-1 h-1 accent-blue-500"
              onChange={(e) => setBrushRadius(Number(e.target.value))}
            />
            <span className="text-gray-500 w-8 text-right tabular-nums">
              {settings.brushRadius}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400 w-16">Strength</span>
            <input
              type="range"
              min={0.01}
              max={1}
              step={0.01}
              value={settings.brushStrength}
              className="flex-1 h-1 accent-blue-500"
              onChange={(e) => setBrushStrength(Number(e.target.value))}
            />
            <span className="text-gray-500 w-8 text-right tabular-nums">
              {settings.brushStrength.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Falloff */}
      <div>
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Falloff
        </div>
        <div className="grid grid-cols-3 gap-1">
          {(["smooth", "sharp", "spike"] as const).map((falloff) => (
            <button
              key={falloff}
              className={`px-1.5 py-1 rounded text-[9px] capitalize transition ${
                settings.brushFalloff === falloff
                  ? "bg-blue-600/40 text-blue-200 border border-blue-500/50"
                  : "bg-[#333] text-gray-300 hover:bg-[#444] border border-[#444]"
              }`}
              onClick={() => setBrushFalloff(falloff)}
            >
              {falloff}
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div>
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Options
        </div>
        <div className="space-y-1">
          <label className="flex items-center justify-between text-gray-400">
            <span>Normalize Weights</span>
            <button
              className={`w-7 h-4 rounded-full transition ${settings.normalizeWeights ? "bg-blue-500" : "bg-[#444]"}`}
              onClick={toggleNormalizeWeights}
            >
              <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${settings.normalizeWeights ? "translate-x-3.5" : "translate-x-0.5"}`} />
            </button>
          </label>
          <label className="flex items-center justify-between text-gray-400">
            <span>Mirror X</span>
            <button
              className={`w-7 h-4 rounded-full transition ${settings.mirrorX ? "bg-blue-500" : "bg-[#444]"}`}
              onClick={toggleMirrorX}
            >
              <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${settings.mirrorX ? "translate-x-3.5" : "translate-x-0.5"}`} />
            </button>
          </label>
          <label className="flex items-center justify-between text-gray-400">
            <span>Show Heatmap</span>
            <button
              className={`w-7 h-4 rounded-full transition ${showHeatmap ? "bg-blue-500" : "bg-[#444]"}`}
              onClick={toggleShowHeatmap}
            >
              <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${showHeatmap ? "translate-x-3.5" : "translate-x-0.5"}`} />
            </button>
          </label>
        </div>
      </div>

      {/* Auto-Weight */}
      {armData && (
        <div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Auto-Weight
          </div>
          <button
            className="px-2 py-1 bg-green-600/30 text-green-200 rounded hover:bg-green-600/50 transition text-[10px]"
            onClick={() => {
              // Auto-weight requires vertex positions from the mesh
              // For now, provide a placeholder implementation
              const bonePositions: Record<string, { restPosition: { x: number; y: number; z: number } }> = {};
              for (const [id, bone] of Object.entries(armData.bones)) {
                bonePositions[id] = { restPosition: bone.restPosition };
              }
              autoWeight(activeEntityId, bonePositions, new Float32Array(0));
            }}
          >
            Generate Weights (Envelope)
          </button>
        </div>
      )}
    </div>
  );
}
