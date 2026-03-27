import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

export function LandingPage() {
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    const onAvailable = () => setCanInstall(true);
    window.addEventListener("pwa-install-available", onAvailable);
    return () => window.removeEventListener("pwa-install-available", onAvailable);
  }, []);

  const handleInstall = async () => {
    const prompt = (window as unknown as Record<string, unknown>).__pwaInstallPrompt as
      | { prompt: () => Promise<void> }
      | undefined;
    if (!prompt) return;
    await prompt.prompt();
    setCanInstall(false);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-blue-500 flex items-center justify-center text-sm font-bold">
            GL
          </div>
          <span className="text-lg font-semibold">BlenderGL</span>
        </div>
        <div className="flex items-center gap-4">
          {canInstall && (
            <button
              onClick={handleInstall}
              className="px-4 py-2 border border-orange-500/50 rounded-lg text-sm font-medium hover:bg-orange-500/10 transition"
            >
              Install App
            </button>
          )}
          <a
            href="https://github.com/aliasfoxkde/blendergl"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-white transition"
          >
            GitHub
          </a>
          <Link
            to="/editor"
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-blue-500 rounded-lg text-sm font-medium hover:opacity-90 transition"
          >
            Launch Editor
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="max-w-3xl">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-r from-orange-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
            3D for the Web
          </h1>
          <p className="text-lg md:text-xl text-gray-400 mb-8 leading-relaxed">
            An AI-native 3D creation system that runs entirely in your browser.
            Create, edit, and export 3D scenes with the power of WebGL — no
            downloads, no installs, no limits.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/editor"
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-blue-500 rounded-xl text-lg font-semibold hover:opacity-90 transition shadow-lg shadow-orange-500/20"
            >
              Start Creating
            </Link>
            <a
              href="https://github.com/aliasfoxkde/blendergl"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 border border-white/20 rounded-xl text-lg font-medium hover:bg-white/5 transition"
            >
              View Source
            </a>
          </div>
        </div>
      </main>

      {/* Features */}
      <section className="px-6 py-16 border-t border-white/5">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          <FeatureCard
            title="Browser Native"
            description="Runs entirely client-side with WebGL. No server, no installs. Works on desktop, tablet, and mobile."
          />
          <FeatureCard
            title="Full 3D Editor"
            description="Scene graph, transform tools, mesh editing, materials, and file I/O. Everything you need to create 3D content."
          />
          <FeatureCard
            title="AI-Powered"
            description="AI-assisted object generation, mesh optimization, and scene analysis. The future of 3D creation."
          />
        </div>
      </section>

      {/* Demo / Screenshots Section */}
      <section className="px-6 py-16 border-t border-white/5">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">What You Can Build</h2>
        <p className="text-gray-400 text-center mb-12 max-w-2xl mx-auto">
          From primitives to complex scenes — BlenderGL gives you professional-grade 3D tools right in the browser.
        </p>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <DemoCard
            title="Scene Hierarchy"
            description="Full scene graph with drag-and-drop reparenting, visibility toggling, and entity management."
            gradient="from-blue-500/20 to-cyan-500/20"
            icon={
              <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="8" y="4" width="32" height="8" rx="2" />
                <rect x="12" y="16" width="24" height="6" rx="2" />
                <rect x="16" y="26" width="16" height="6" rx="2" />
                <rect x="20" y="36" width="8" height="6" rx="2" />
              </svg>
            }
          />
          <DemoCard
            title="Materials & PBR"
            description="Physically-based rendering with metalness, roughness, emissive, and procedural textures."
            gradient="from-orange-500/20 to-red-500/20"
            icon={
              <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="24" cy="24" r="16" />
                <path d="M24 8a16 16 0 0 1 0 32" fill="currentColor" opacity="0.3" />
                <circle cx="18" cy="18" r="3" fill="currentColor" />
              </svg>
            }
          />
          <DemoCard
            title="UV & Texture Paint"
            description="Unwrap UVs with smart projections and paint directly on mesh surfaces with layered brushes."
            gradient="from-purple-500/20 to-pink-500/20"
            icon={
              <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="4" width="40" height="40" rx="4" />
                <path d="M4 24h40M24 4v40M4 14h40M4 34h40M14 4v40M34 4v40" opacity="0.3" />
                <path d="M8 8l12 8-8 12-4-4z" fill="currentColor" opacity="0.4" />
              </svg>
            }
          />
          <DemoCard
            title="Animation & Rigging"
            description="Keyframe animation with timeline editor, armature system with bone weights, and playback controls."
            gradient="from-green-500/20 to-emerald-500/20"
            icon={
              <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="24" y1="8" x2="24" y2="20" />
                <line x1="24" y1="20" x2="14" y2="32" />
                <line x1="24" y1="20" x2="34" y2="32" />
                <line x1="14" y1="32" x2="10" y2="42" />
                <line x1="14" y1="32" x2="18" y2="42" />
                <line x1="34" y1="32" x2="30" y2="42" />
                <line x1="34" y1="32" x2="38" y2="42" />
                <circle cx="24" cy="6" r="3" fill="currentColor" />
              </svg>
            }
          />
          <DemoCard
            title="Node Editor"
            description="Visual scripting with a node graph editor for creating materials, shaders, and logic."
            gradient="from-yellow-500/20 to-orange-500/20"
            icon={
              <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="12" width="14" height="10" rx="2" />
                <rect x="32" y="12" width="14" height="10" rx="2" />
                <rect x="16" y="30" width="16" height="10" rx="2" />
                <path d="M16 17h16" />
                <path d="M24 22v8" />
              </svg>
            }
          />
          <DemoCard
            title="File I/O"
            description="Import OBJ, GLTF, STL, FBX files. Export to GLTF, OBJ, STL, and 3D print-ready formats."
            gradient="from-cyan-500/20 to-blue-500/20"
            icon={
              <svg viewBox="0 0 48 48" className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 28v10a2 2 0 0 0 2 2h32a2 2 0 0 0 2-2V28" />
                <path d="M24 8v24" />
                <path d="M16 16l8-8 8 8" />
              </svg>
            }
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-4 border-t border-white/10 text-center text-sm text-gray-500">
        <p>
          MIT License &middot; Built with Babylon.js + React + TypeScript &middot;
          Deployed on Cloudflare Pages
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-xl border border-white/10 bg-white/5">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function DemoCard({
  title,
  description,
  gradient,
  icon,
}: {
  title: string;
  description: string;
  gradient: string;
  icon: React.ReactNode;
}) {
  return (
    <div className={`p-6 rounded-xl border border-white/10 bg-gradient-to-br ${gradient}`}>
      <div className="text-gray-300 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
