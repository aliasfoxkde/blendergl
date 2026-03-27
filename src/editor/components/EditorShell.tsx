export function EditorShell() {
  return (
    <div className="w-full h-full flex flex-col bg-[#1a1a1a] text-white">
      {/* Toolbar */}
      <header className="h-10 bg-[#2a2a2a] border-b border-[#333] flex items-center px-3 gap-2 shrink-0">
        <span className="text-sm font-medium text-gray-300">
          BlenderGL Editor
        </span>
        <span className="text-xs text-gray-500 ml-auto">
          Phase 2 — Viewport coming soon
        </span>
      </header>

      {/* Main area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar placeholder */}
        <aside className="w-56 bg-[#222] border-r border-[#333] shrink-0 flex items-center justify-center">
          <span className="text-xs text-gray-500">Scene Hierarchy</span>
        </aside>

        {/* Viewport placeholder */}
        <main className="flex-1 flex items-center justify-center bg-[#1a1a2e]">
          <span className="text-sm text-gray-500">3D Viewport</span>
        </main>

        {/* Right sidebar placeholder */}
        <aside className="w-64 bg-[#222] border-l border-[#333] shrink-0 flex items-center justify-center">
          <span className="text-xs text-gray-500">Properties</span>
        </aside>
      </div>

      {/* Status bar */}
      <footer className="h-6 bg-[#2a2a2a] border-t border-[#333] flex items-center px-3 shrink-0">
        <span className="text-xs text-gray-500">
          Objects: 0 &middot; Vertices: 0 &middot; Faces: 0
        </span>
      </footer>
    </div>
  );
}
