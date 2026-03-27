import { useRef, useCallback } from "react";
import { useAnimationStore } from "@/editor/stores/animationStore";
import { usePoseModeStore } from "@/editor/stores/poseModeStore";
import { useArmatureStore } from "@/editor/stores/armatureStore";

interface DopeSheetProps {
  clipId: string | null;
}

export function DopeSheet({ clipId }: DopeSheetProps) {
  const clip = useAnimationStore((s) => (clipId ? s.clips[clipId] : null));
  const activeArmatureEntityId = usePoseModeStore((s) => s.activeArmatureEntityId);
  const armData = useArmatureStore((s) =>
    activeArmatureEntityId ? s.armatures[activeArmatureEntityId] : null
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedKeyRef = useRef<{ trackId: string; keyIndex: number } | null>(null);

  const handleDeleteSelectedKey = useCallback(() => {
    if (!clipId || !selectedKeyRef.current) return;
    const { trackId, keyIndex } = selectedKeyRef.current;
    useAnimationStore.getState().removeKey(clipId, trackId, keyIndex);
    selectedKeyRef.current = null;
  }, [clipId]);

  if (!clip || !armData) {
    return (
      <div className="flex-1 overflow-y-auto p-3 text-xs text-gray-500 italic">
        {clipId ? "No armature attached" : "Select an animation clip to view keyframes"}
      </div>
    );
  }

  const tracks = clip.tracks;
  const duration = clip.durationFrames;

  // Build bone name lookup
  const boneNames: Record<string, string> = {};
  for (const [id, bone] of Object.entries(armData.bones)) {
    boneNames[id] = bone.name;
  }

  // Group tracks by bone for better display
  const boneOrder = Object.keys(armData.bones);
  const sortedTracks = [...tracks].sort((a, b) => {
    const aIdx = boneOrder.indexOf(a.boneId);
    const bIdx = boneOrder.indexOf(b.boneId);
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.property.localeCompare(b.property);
  });

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header with delete button */}
      <div className="flex items-center justify-between px-2 py-1 bg-[#252525] border-b border-[#444] shrink-0">
        <span className="text-xs text-gray-400 font-mono">
          {clip.name} — {tracks.length} tracks
        </span>
        <button
          onClick={handleDeleteSelectedKey}
          className="text-xs text-gray-500 hover:text-red-400 transition"
          title="Delete selected key"
        >
          Del
        </button>
      </div>

      {/* Dope sheet content */}
      <div ref={scrollRef} className="flex-1 overflow-auto min-h-0 relative">
        {/* Frame ruler */}
        <div className="sticky top-0 z-10 bg-[#1e1e1e] border-b border-[#333] flex">
          <div className="w-36 shrink-0 text-[10px] text-gray-500 px-1 py-0.5">
            Bone / Property
          </div>
          <div className="flex-1 flex relative min-h-[20px]">
            {Array.from({ length: Math.min(duration, 300) }, (_, i) => (
              <div
                key={i}
                className="shrink-0 text-[9px] text-gray-600 border-l border-[#333]"
                style={{ width: `${100 / Math.min(duration, 300)}%`, minWidth: "20px" }}
              >
                {i % 10 === 0 ? String(i) : ""}
              </div>
            ))}
          </div>
        </div>

        {/* Track rows */}
        <div className="relative">
          {/* Current frame indicator */}
          {duration > 0 && (
            <div
              className="absolute top-0 bottom-0 w-px bg-red-500 z-20 pointer-events-none"
              style={{
                left: `calc(36px + (100% - 36px) * ${useAnimationStore.getState().currentFrame / Math.max(1, duration - 1)})`,
              }}
            />
          )}

          {sortedTracks.map((track) => {
            const boneName = boneNames[track.boneId] ?? track.boneId;
            const shortProp = track.property.split(".")[1]?.toUpperCase() ?? track.property;
            const label = `${boneName} .${shortProp}`;

            return (
              <div key={track.id} className="flex border-b border-[#2a2a2a] hover:bg-[#252525]">
                {/* Track label */}
                <div className="w-36 shrink-0 text-[10px] text-gray-400 truncate px-1 py-1">
                  {label}
                </div>
                {/* Keyframe area */}
                <div className="flex-1 relative min-h-[20px]">
                  {/* Grid lines */}
                  {Array.from({ length: Math.min(duration, 300) }, (_, i) => (
                    <div
                      key={i}
                      className="shrink-0 border-l border-[#2a2a2a]"
                      style={{ width: `${100 / Math.min(duration, 300)}%`, minWidth: "20px" }}
                    />
                  ))}

                  {/* Keyframe diamonds */}
                  {track.keys.map((key, idx) => {
                    const left = duration > 1
                      ? (key.frame / (duration - 1)) * 100
                      : 0;
                    return (
                      <button
                        key={idx}
                        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2
                          w-2.5 h-2.5 rotate-45 bg-yellow-400 border border-yellow-600
                          hover:bg-yellow-300 transition cursor-pointer z-10"
                        style={{ left: `calc(${left}% * 0.95)` }}
                        title={`Frame ${key.frame}: ${key.value.toFixed(2)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          selectedKeyRef.current = { trackId: track.id, keyIndex: idx };
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}

          {sortedTracks.length === 0 && (
            <div className="flex-1 flex items-center justify-center py-8 text-xs text-gray-500 italic">
              No keyframes yet. Enter pose mode and press I to insert keys.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
