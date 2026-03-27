import { useState } from "react";
import { usePoseModeStore } from "@/editor/stores/poseModeStore";
import { useArmatureStore } from "@/editor/stores/armatureStore";
import type { Vec3 } from "@/editor/types";

export function PoseLibraryPanel() {
  const poseLibrary = usePoseModeStore((s) => s.poseLibrary);
  const savePose = usePoseModeStore((s) => s.savePose);
  const deletePose = usePoseModeStore((s) => s.deletePose);
  const applyPose = usePoseModeStore((s) => s.applyPose);
  const blendPoses = usePoseModeStore((s) => s.blendPoses);
  const activeArmatureEntityId = usePoseModeStore((s) => s.activeArmatureEntityId);
  const armData = useArmatureStore((s) =>
    activeArmatureEntityId ? s.armatures[activeArmatureEntityId] : null,
  );

  const [newPoseName, setNewPoseName] = useState("");
  const [blendPoseA, setBlendPoseA] = useState<string>("");
  const [blendPoseB, setBlendPoseB] = useState<string>("");
  const [blendFactor, setBlendFactor] = useState(0.5);
  const [blendResult, setBlendResult] = useState<Record<string, Vec3> | null>(null);

  const handleSavePose = () => {
    if (!newPoseName.trim() || !armData) return;

    const boneRotations: Record<string, Vec3> = {};
    const bonePositions: Record<string, Vec3> = {};
    for (const [boneId, bone] of Object.entries(armData.bones)) {
      boneRotations[boneId] = { ...bone.restRotation };
      bonePositions[boneId] = { ...bone.restPosition };
    }

    savePose(newPoseName.trim(), boneRotations, bonePositions);
    setNewPoseName("");
  };

  const handleApplyPose = (name: string) => {
    const poseData = applyPose(name);
    if (poseData && armData) {
      // Apply rotations to armature bones
      for (const [boneId, rotation] of Object.entries(poseData.boneRotations)) {
        const bone = armData.bones[boneId];
        if (bone) {
          bone.restRotation = { ...rotation };
        }
      }
    }
  };

  const handleBlend = () => {
    if (!blendPoseA || !blendPoseB) return;
    const result = blendPoses(blendPoseA, blendPoseB, blendFactor);
    setBlendResult(result);
  };

  const handleApplyBlend = () => {
    if (!blendResult || !armData) return;
    for (const [boneId, rotation] of Object.entries(blendResult)) {
      const bone = armData.bones[boneId];
      if (bone) {
        bone.restRotation = { ...rotation };
      }
    }
  };

  return (
    <div className="space-y-3 text-xs">
      {/* Save Pose */}
      <div>
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Save Pose
        </div>
        <div className="flex gap-1">
          <input
            type="text"
            value={newPoseName}
            onChange={(e) => setNewPoseName(e.target.value)}
            placeholder="Pose name..."
            className="flex-1 bg-[#333] text-white text-[10px] px-2 py-1 rounded border border-[#444] placeholder-gray-600"
            onKeyDown={(e) => e.key === "Enter" && handleSavePose()}
          />
          <button
            className="px-2 py-1 bg-green-600/30 text-green-200 rounded hover:bg-green-600/50 transition text-[10px]"
            onClick={handleSavePose}
          >
            Save
          </button>
        </div>
      </div>

      {/* Pose Library */}
      {poseLibrary.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Saved Poses ({poseLibrary.length})
          </div>
          <div className="space-y-1">
            {poseLibrary.map((pose) => (
              <div
                key={pose.name}
                className="flex items-center gap-1 px-2 py-1 bg-[#2a2a3a] rounded border border-[#333] hover:bg-[#333] transition"
              >
                <span className="flex-1 text-gray-300">{pose.name}</span>
                <button
                  className="px-1.5 py-0.5 bg-blue-600/30 text-blue-200 rounded hover:bg-blue-600/50 transition text-[9px]"
                  onClick={() => handleApplyPose(pose.name)}
                >
                  Apply
                </button>
                <button
                  className="px-1.5 py-0.5 bg-red-600/30 text-red-200 rounded hover:bg-red-600/50 transition text-[9px]"
                  onClick={() => deletePose(pose.name)}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blend Poses */}
      {poseLibrary.length >= 2 && (
        <div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Blend Poses
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-6">A</span>
              <select
                value={blendPoseA}
                onChange={(e) => setBlendPoseA(e.target.value)}
                className="flex-1 bg-[#333] text-white text-[10px] px-1 py-0.5 rounded border border-[#444]"
              >
                <option value="">Select pose...</option>
                {poseLibrary.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-6">B</span>
              <select
                value={blendPoseB}
                onChange={(e) => setBlendPoseB(e.target.value)}
                className="flex-1 bg-[#333] text-white text-[10px] px-1 py-0.5 rounded border border-[#444]"
              >
                <option value="">Select pose...</option>
                {poseLibrary.map((p) => (
                  <option key={p.name} value={p.name}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-6">Mix</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={blendFactor}
                className="flex-1 h-1 accent-blue-500"
                onChange={(e) => setBlendFactor(Number(e.target.value))}
              />
              <span className="text-gray-500 w-10 text-right tabular-nums">
                {blendFactor.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-1">
              <button
                className="flex-1 px-2 py-1 bg-blue-600/30 text-blue-200 rounded hover:bg-blue-600/50 transition text-[10px]"
                onClick={handleBlend}
              >
                Blend
              </button>
              {blendResult && (
                <button
                  className="flex-1 px-2 py-1 bg-green-600/30 text-green-200 rounded hover:bg-green-600/50 transition text-[10px]"
                  onClick={handleApplyBlend}
                >
                  Apply Blend
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Export */}
      {poseLibrary.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Export
          </div>
          <button
            className="px-2 py-1 bg-[#333] text-gray-300 hover:bg-[#444] rounded transition text-[10px]"
            onClick={() => {
              const json = JSON.stringify(poseLibrary, null, 2);
              const blob = new Blob([json], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "pose_library.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            Export Poses (JSON)
          </button>
        </div>
      )}
    </div>
  );
}
