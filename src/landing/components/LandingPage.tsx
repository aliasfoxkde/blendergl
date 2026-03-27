import { Link } from "react-router-dom";

export function LandingPage() {
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
