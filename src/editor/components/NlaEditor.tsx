import { useAnimationStore } from "@/editor/stores/animationStore";

export function NlaEditor() {
  const clips = useAnimationStore((s) => s.clips);
  const blendState = useAnimationStore((s) => s.blendState);
  const startBlend = useAnimationStore((s) => s.startBlend);
  const setBlendFactor = useAnimationStore((s) => s.setBlendFactor);
  const stopBlend = useAnimationStore((s) => s.stopBlend);
  const activeClipId = useAnimationStore((s) => s.activeClipId);
  const setActiveClip = useAnimationStore((s) => s.setActiveClip);

  const clipList = Object.values(clips);
  if (clipList.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto p-3 text-xs text-gray-500 italic">
        No animation clips. Create clips in the Animation panel.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 text-xs space-y-3">
      {/* Clip Strips */}
      <div>
        <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
          NLA Strips
        </div>
        <div className="space-y-1">
          {clipList.map((clip) => {
            const isActive = clip.id === activeClipId;
            const isBlendA = blendState?.clipA === clip.id;
            const isBlendB = blendState?.clipB === clip.id;

            return (
              <div
                key={clip.id}
                className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer transition ${
                  isActive
                    ? "bg-blue-600/30 border border-blue-500/50"
                    : isBlendA
                    ? "bg-green-600/30 border border-green-500/50"
                    : isBlendB
                    ? "bg-orange-600/30 border border-orange-500/50"
                    : "bg-[#2a2a3a] border border-[#333] hover:bg-[#333]"
                }`}
                onClick={() => setActiveClip(clip.id)}
              >
                <div className="flex-1">
                  <span className="text-gray-300">{clip.name}</span>
                  <span className="text-gray-600 ml-2">
                    {clip.durationFrames}f
                  </span>
                </div>
                {isActive && (
                  <span className="text-blue-400 text-[9px]">ACTIVE</span>
                )}
                {isBlendA && (
                  <span className="text-green-400 text-[9px]">A</span>
                )}
                {isBlendB && (
                  <span className="text-orange-400 text-[9px]">B</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Blend Controls */}
      {clipList.length >= 2 && (
        <div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Blend
          </div>
          {blendState ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-12">Factor</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={blendState.factor}
                  className="flex-1 h-1 accent-blue-500"
                  onChange={(e) => setBlendFactor(Number(e.target.value))}
                />
                <span className="text-gray-500 w-10 text-right tabular-nums">
                  {blendState.factor.toFixed(2)}
                </span>
              </div>
              <div className="flex gap-1">
                <button
                  className="px-2 py-1 bg-red-600/30 text-red-200 rounded hover:bg-red-600/50 transition text-[10px]"
                  onClick={stopBlend}
                >
                  Stop Blend
                </button>
              </div>
            </div>
          ) : (
            <div className="text-gray-600 text-[10px] italic">
              Select two clips below to blend between them.
            </div>
          )}
        </div>
      )}

      {/* Quick Blend Buttons */}
      {clipList.length >= 2 && !blendState && (
        <div>
          <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
            Quick Blend
          </div>
          <div className="grid grid-cols-2 gap-1">
            {clipList.slice(0, 4).map((clipA, i) =>
              clipList.slice(i + 1, 5).map((clipB) => (
                <button
                  key={`${clipA.id}-${clipB.id}`}
                  className="px-1.5 py-1 bg-[#333] text-gray-300 hover:bg-[#444] rounded transition text-[9px] truncate"
                  onClick={() => startBlend(clipA.id, clipB.id)}
                >
                  {clipA.name} + {clipB.name}
                </button>
              )),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
