import { useRef, useCallback, useEffect } from "react";
import { useAnimationStore } from "@/editor/stores/animationStore";

interface TimelineProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Timeline({ isOpen, onToggle }: TimelineProps) {
  const playbackState = useAnimationStore((s) => s.playbackState);
  const currentFrame = useAnimationStore((s) => s.currentFrame);
  const framesPerSecond = useAnimationStore((s) => s.framesPerSecond);
  const isLooping = useAnimationStore((s) => s.isLooping);
  const clips = useAnimationStore((s) => s.clips);
  const activeClipId = useAnimationStore((s) => s.activeClipId);
  const activeClip = activeClipId ? clips[activeClipId] : null;
  const duration = activeClip?.durationFrames ?? 60;

  const scrubBarRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const {
    setPlaybackState,
    setCurrentFrame,
    stepForward,
    stepBackward,
    toggleLoop,
    setActiveClip,
  } = useAnimationStore.getState();

  // Playback loop
  useEffect(() => {
    if (playbackState !== "playing") {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    lastTimeRef.current = performance.now();
    const frameDuration = 1000 / framesPerSecond;

    const tick = () => {
      const now = performance.now();
      const elapsed = now - lastTimeRef.current;

      if (elapsed >= frameDuration) {
        lastTimeRef.current = now;
        const framesToAdvance = Math.min(Math.floor(elapsed / frameDuration), 5);
        const state = useAnimationStore.getState();
        const clipDuration = state.activeClipId
          ? state.clips[state.activeClipId]?.durationFrames ?? 60
          : 60;
        let nextFrame = state.currentFrame + framesToAdvance;

        if (nextFrame >= clipDuration) {
          if (state.isLooping) {
            nextFrame = nextFrame % clipDuration;
          } else {
            nextFrame = clipDuration - 1;
            useAnimationStore.getState().setPlaybackState("stopped");
          }
        }

        useAnimationStore.getState().setCurrentFrame(nextFrame);
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [playbackState, framesPerSecond, isLooping, activeClipId, duration]);

  // Scrub bar dragging
  const handleScrubMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      updateScrubPosition(e);
    },
    []
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) {
        updateScrubPosition(e);
      }
    };
    const handleMouseUp = () => {
      isDragging.current = false;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const updateScrubPosition = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (!scrubBarRef.current) return;
    const rect = scrubBarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const fraction = x / rect.width;
    const frame = Math.round(fraction * (duration - 1));
    useAnimationStore.getState().setCurrentFrame(frame);
  }, [duration]);

  const handlePlay = useCallback(() => {
    if (playbackState === "playing") {
      setPlaybackState("paused");
    } else {
      setPlaybackState("playing");
    }
  }, [playbackState, setPlaybackState]);

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="absolute bottom-8 right-4 z-10
          px-3 py-1.5 bg-[#333] hover:bg-[#444] border border-[#555] rounded-t
          text-xs text-gray-300 transition flex items-center gap-1.5"
        title="Open Timeline"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <path d="M1 3.5C1 2.672 1.672 2 2.5 2h11C14.328 2 15 2.672 15 3.5v9c0 .828-.672 1.5-1.5 1.5h-11C2.672 14 2 13.328 2 12.5v-9zM6 7l4 2.5-4 2.5V7z" />
        </svg>
        Timeline
      </button>
    );
  }

  const clipList = Object.values(clips);

  return (
    <div className="absolute bottom-0 right-0 z-10 bg-[#1e1e1e] border-t border-[#444] flex flex-col" style={{ height: "80px" }}>
      {/* Transport bar */}
      <div className="flex items-center gap-2 px-3 py-1 bg-[#2a2a2a] border-b border-[#444] shrink-0">
        {/* Close */}
        <button onClick={onToggle} className="text-gray-400 hover:text-gray-200 transition" title="Close Timeline">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 1l8 8M9 1l-8 8" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={handlePlay}
          className={`w-6 h-6 flex items-center justify-center rounded transition ${
            playbackState === "playing"
              ? "bg-[#555] text-white"
              : "bg-green-600 hover:bg-green-500 text-white"
          }`}
          title={playbackState === "playing" ? "Pause" : "Play"}
        >
          {playbackState === "playing" ? (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <rect x="1" y="1" width="3" height="8" rx="0.5" />
              <rect x="6" y="1" width="3" height="8" rx="0.5" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
              <path d="M2 1l7 4-7 4V1z" />
            </svg>
          )}
        </button>

        {/* Stop */}
        <button
          onClick={() => { setPlaybackState("stopped"); setCurrentFrame(0); }}
          className="text-gray-400 hover:text-gray-200 text-xs transition"
          title="Stop"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect x="1" y="1" width="8" height="8" rx="1" />
          </svg>
        </button>

        {/* Step backward */}
        <button onClick={stepBackward} className="text-gray-400 hover:text-gray-200 text-xs transition" title="Previous Frame">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M7 1L2 5l5 4V1z" />
          </svg>
        </button>

        {/* Step forward */}
        <button onClick={stepForward} className="text-gray-400 hover:text-gray-200 text-xs transition" title="Next Frame">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <path d="M3 1l5 4-5 4V1z" />
          </svg>
        </button>

        {/* Jump to start */}
        <button
          onClick={() => setCurrentFrame(0)}
          className="text-gray-400 hover:text-gray-200 text-xs transition"
          title="Jump to Start"
        >
          |◁
        </button>

        {/* Jump to end */}
        <button
          onClick={() => setCurrentFrame(Math.max(0, duration - 1))}
          className="text-gray-400 hover:text-gray-200 text-xs transition"
          title="Jump to End"
        >
          ▷|
        </button>

        {/* Frame counter */}
        <span className="text-xs text-gray-300 font-mono min-w-[60px]">
          {currentFrame}/{Math.max(1, duration)}
        </span>

        {/* FPS */}
        <select
          value={framesPerSecond}
          onChange={(e) => useAnimationStore.getState().setFramesPerSecond(Number(e.target.value))}
          className="bg-[#333] text-gray-300 text-xs px-1 py-0.5 rounded border border-[#555]"
          title="Frames per second"
        >
          <option value={24}>24 fps</option>
          <option value={25}>25 fps</option>
          <option value={30}>30 fps</option>
          <option value={60}>60 fps</option>
        </select>

        {/* Loop */}
        <button
          onClick={toggleLoop}
          className={`text-xs px-1.5 py-0.5 rounded transition ${
            isLooping ? "bg-blue-600 text-white" : "bg-[#333] text-gray-400 hover:text-gray-200"
          }`}
          title="Toggle Loop"
        >
          {isLooping ? "Loop" : "Once"}
        </button>

        {/* Clip selector */}
        <select
          value={activeClipId ?? ""}
          onChange={(e) => setActiveClip(e.target.value || null)}
          className="bg-[#333] text-gray-300 text-xs px-1.5 py-0.5 rounded border border-[#555] ml-2"
          title="Animation Clip"
        >
          <option value="">No Clip</option>
          {clipList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Scrub bar */}
      <div
        ref={scrubBarRef}
        className="flex-1 relative mx-3 mb-1 cursor-pointer"
        onMouseDown={handleScrubMouseDown}
      >
        {/* Track background */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1 bg-[#444] rounded-full" />
        {/* Progress */}
        <div
          className="absolute top-1/2 -translate-y-1/2 left-0 h-1 bg-blue-500 rounded-full"
          style={{ width: `${duration > 0 ? (currentFrame / Math.max(1, duration - 1)) * 100 : 0}%` }}
        />
        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-red-500 -translate-x-1/2 z-10"
          style={{ left: `${duration > 0 ? (currentFrame / Math.max(1, duration - 1)) * 100 : 0}%` }}
        />
        {/* Tick marks */}
        {duration <= 120 && Array.from({ length: Math.min(duration, 120) }, (_, i) => (
          <div
            key={i}
            className="absolute top-1/2 -translate-y-1/2 w-px h-2 bg-[#666]"
            style={{ left: `${duration > 1 ? (i / (duration - 1)) * 100 : 0}%` }}
          />
        ))}
      </div>
    </div>
  );
}
