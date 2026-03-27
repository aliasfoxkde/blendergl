import { useRenderSettingsStore, MATERIAL_PRESETS } from "@/editor/stores/renderSettingsStore";
import { useMaterialStore } from "@/editor/stores/materialStore";
import { useSelectionStore } from "@/editor/stores/selectionStore";
import { captureScreenshot } from "@/editor/utils/screenshot";
import { renderingManager } from "@/editor/utils/renderingManager";

export function RenderSettingsPanel() {
  const panelOpen = useRenderSettingsStore((s) => s.panelOpen);
  const settings = useRenderSettingsStore((s) => s.settings);
  const updateSettings = useRenderSettingsStore((s) => s.updateSettings);
  const togglePanel = useRenderSettingsStore((s) => s.togglePanel);
  const activeEntityId = useSelectionStore((s) => s.activeEntityId);
  const updateMaterial = useMaterialStore((s) => s.updateMaterial);

  if (!panelOpen) return null;

  const presetNames = Object.keys(MATERIAL_PRESETS);

  return (
    <div className="absolute inset-0 z-40 bg-[#1e1e2e] border border-[#333] rounded-lg shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#2a2a3a] border-b border-[#333] shrink-0">
        <span className="text-xs font-semibold text-gray-300">Render Settings</span>
        <button
          className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-white rounded transition"
          onClick={togglePanel}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs">
        {/* Tone Mapping */}
        <Section title="Tone Mapping">
          <SelectRow
            label="Mode"
            value={settings.toneMapping}
            options={["linear", "reinhard", "filmic", "aces"]}
            onChange={(v) => updateSettings({ toneMapping: v as typeof settings.toneMapping })}
          />
          <SliderRow label="Exposure" value={settings.exposure} min={0.1} max={5} step={0.1}
            onChange={(v) => updateSettings({ exposure: v })} />
          <SliderRow label="Contrast" value={settings.contrast} min={0.1} max={3} step={0.1}
            onChange={(v) => updateSettings({ contrast: v })} />
          <SliderRow label="Gamma" value={settings.gamma} min={0.5} max={4} step={0.1}
            onChange={(v) => updateSettings({ gamma: v })} />
        </Section>

        {/* Anti-Aliasing */}
        <Section title="Anti-Aliasing">
          <SelectRow
            label="Method"
            value={settings.antiAliasing}
            options={["fxaa", "msaa4", "msaa8", "none"]}
            onChange={(v) => updateSettings({ antiAliasing: v as typeof settings.antiAliasing })}
          />
        </Section>

        {/* Bloom */}
        <Section title="Bloom">
          <ToggleRow label="Enabled" value={settings.bloomEnabled}
            onChange={(v) => updateSettings({ bloomEnabled: v })} />
          <SliderRow label="Threshold" value={settings.bloomThreshold} min={0} max={2} step={0.05}
            onChange={(v) => updateSettings({ bloomThreshold: v })} />
          <SliderRow label="Weight" value={settings.bloomWeight} min={0} max={2} step={0.05}
            onChange={(v) => updateSettings({ bloomWeight: v })} />
          <SliderRow label="Kernel" value={settings.bloomKernel} min={1} max={128} step={1}
            onChange={(v) => updateSettings({ bloomKernel: v })} />
          <SliderRow label="Scale" value={settings.bloomScale} min={0} max={2} step={0.05}
            onChange={(v) => updateSettings({ bloomScale: v })} />
        </Section>

        {/* Color Grading */}
        <Section title="Color Grading">
          <ToggleRow label="Enabled" value={settings.colorGradingEnabled}
            onChange={(v) => updateSettings({ colorGradingEnabled: v })} />
          <SliderRow label="Temperature" value={settings.colorTemperature} min={1000} max={12000} step={100}
            onChange={(v) => updateSettings({ colorTemperature: v })} />
          <SliderRow label="Saturation" value={settings.colorSaturation} min={0} max={3} step={0.05}
            onChange={(v) => updateSettings({ colorSaturation: v })} />
          <SliderRow label="Brightness" value={settings.colorBrightness} min={-1} max={1} step={0.05}
            onChange={(v) => updateSettings({ colorBrightness: v })} />
        </Section>

        {/* Vignette */}
        <Section title="Vignette">
          <ToggleRow label="Enabled" value={settings.vignetteEnabled}
            onChange={(v) => updateSettings({ vignetteEnabled: v })} />
          <SliderRow label="Weight" value={settings.vignetteWeight} min={0} max={5} step={0.1}
            onChange={(v) => updateSettings({ vignetteWeight: v })} />
          <SliderRow label="Stretch" value={settings.vignetteStretch} min={0} max={1} step={0.05}
            onChange={(v) => updateSettings({ vignetteStretch: v })} />
        </Section>

        {/* Depth of Field */}
        <Section title="Depth of Field">
          <ToggleRow label="Enabled" value={settings.dofEnabled}
            onChange={(v) => updateSettings({ dofEnabled: v })} />
          <SliderRow label="F-Stop" value={settings.dofFStop} min={0.5} max={22} step={0.5}
            onChange={(v) => updateSettings({ dofFStop: v })} />
          <SliderRow label="Focal Length" value={settings.dofFocalLength} min={10} max={200} step={5}
            onChange={(v) => updateSettings({ dofFocalLength: v })} />
          <SliderRow label="Focus Dist" value={settings.dofFocusDistance} min={0.1} max={100} step={0.5}
            onChange={(v) => updateSettings({ dofFocusDistance: v })} />
        </Section>

        {/* Chromatic Aberration */}
        <Section title="Chromatic Aberration">
          <ToggleRow label="Enabled" value={settings.chromaticAberrationEnabled}
            onChange={(v) => updateSettings({ chromaticAberrationEnabled: v })} />
          <SliderRow label="Amount" value={settings.chromaticAberrationAmount} min={0} max={100} step={1}
            onChange={(v) => updateSettings({ chromaticAberrationAmount: v })} />
        </Section>

        {/* SSAO */}
        <Section title="Ambient Occlusion">
          <ToggleRow label="Enabled" value={settings.ssaoEnabled}
            onChange={(v) => updateSettings({ ssaoEnabled: v })} />
          <SliderRow label="Intensity" value={settings.ssaoIntensity} min={0} max={3} step={0.1}
            onChange={(v) => updateSettings({ ssaoIntensity: v })} />
          <SliderRow label="Radius" value={settings.ssaoRadius} min={0.001} max={0.1} step={0.001}
            onChange={(v) => updateSettings({ ssaoRadius: v })} />
          <SliderRow label="Fall Off" value={settings.ssaoFallOff} min={0} max={0.01} step={0.0001}
            onChange={(v) => updateSettings({ ssaoFallOff: v })} />
          <SliderRow label="Area" value={settings.ssaoArea} min={0.001} max={0.5} step={0.005}
            onChange={(v) => updateSettings({ ssaoArea: v })} />
        </Section>

        {/* Environment */}
        <Section title="Environment">
          <div className="flex gap-1">
            <label className="flex-1 px-2 py-1 bg-green-600/30 text-green-200 rounded hover:bg-green-600/50 transition text-[10px] text-center cursor-pointer">
              Load HDRI
              <input
                type="file"
                accept=".hdr,.exr"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) renderingManager.loadHDRIFromFile(file);
                }}
              />
            </label>
            <button
              className="px-2 py-1 bg-red-600/30 text-red-200 rounded hover:bg-red-600/50 transition text-[10px]"
              onClick={() => renderingManager.clearEnvironment()}
            >
              Clear
            </button>
          </div>
          <SliderRow label="Intensity" value={settings.environmentIntensity} min={0} max={3} step={0.1}
            onChange={(v) => updateSettings({ environmentIntensity: v })} />
          <SliderRow label="Rotation" value={settings.environmentRotation} min={0} max={360} step={1}
            onChange={(v) => updateSettings({ environmentRotation: v })} />
          <SliderRow label="Blur" value={settings.environmentBlur} min={0} max={1} step={0.05}
            onChange={(v) => updateSettings({ environmentBlur: v })} />
        </Section>

        {/* Studio Lighting */}
        <Section title="Studio Lighting">
          <div className="grid grid-cols-2 gap-1">
            {(["neutral", "three-point", "dramatic", "studio"] as const).map((preset) => (
              <button
                key={preset}
                className="px-1.5 py-1 bg-[#333] text-gray-300 hover:bg-[#444] hover:text-white rounded transition text-[9px] capitalize"
                onClick={() => renderingManager.applyStudioPreset(preset)}
              >
                {preset.replace("-", " ")}
              </button>
            ))}
          </div>
        </Section>

        {/* Shadows */}
        <Section title="Shadows">
          <ToggleRow label="Enabled" value={settings.shadowsEnabled}
            onChange={(v) => updateSettings({ shadowsEnabled: v })} />
          <SelectRow
            label="Resolution"
            value={String(settings.shadowResolution)}
            options={["512", "1024", "2048", "4096"]}
            onChange={(v) => updateSettings({ shadowResolution: Number(v) })}
          />
          <SliderRow label="Bias" value={settings.shadowBias} min={0} max={0.001} step={0.00001}
            onChange={(v) => updateSettings({ shadowBias: v })} />
          <SliderRow label="Normal Bias" value={settings.shadowNormalBias} min={0} max={0.1} step={0.005}
            onChange={(v) => updateSettings({ shadowNormalBias: v })} />
          <ToggleRow label="Contact Shadows" value={settings.contactShadowsEnabled}
            onChange={(v) => updateSettings({ contactShadowsEnabled: v })} />
          <ToggleRow label="CSM" value={settings.csmEnabled}
            onChange={(v) => updateSettings({ csmEnabled: v })} />
          {settings.csmEnabled && (
            <>
              <SelectRow
                label="Cascades"
                value={String(settings.csmCascades)}
                options={["2", "3", "4"]}
                onChange={(v) => updateSettings({ csmCascades: Number(v) })}
              />
              <SliderRow label="Lambda" value={settings.csmLambda} min={0} max={1} step={0.05}
                onChange={(v) => updateSettings({ csmLambda: v })} />
            </>
          )}
          <label className="flex items-center gap-2 text-gray-400">
            <span className="w-20 shrink-0">Shadow Color</span>
            <input
              type="color"
              value="#000000"
              className="w-6 h-4 bg-transparent border border-[#444] rounded cursor-pointer"
              onChange={(e) => renderingManager.setShadowColor(e.target.value)}
            />
          </label>
        </Section>

        {/* Render Output */}
        <Section title="Render Output">
          <div className="flex gap-1">
            <button
              className="flex-1 px-2 py-1 bg-blue-600/30 text-blue-200 rounded hover:bg-blue-600/50 transition text-[10px]"
              onClick={() => {
                captureScreenshot(settings.screenshotFormat, settings.screenshotQuality);
              }}
            >
              Screenshot ({settings.renderWidth}x{settings.renderHeight})
            </button>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <label className="flex items-center gap-1 text-gray-400">
              Width
              <input
                type="number"
                value={settings.renderWidth}
                min={256}
                max={8192}
                step={64}
                className="w-16 bg-[#333] text-white text-[10px] px-1 py-0.5 rounded border border-[#444]"
                onChange={(e) => updateSettings({ renderWidth: Number(e.target.value) })}
              />
            </label>
            <label className="flex items-center gap-1 text-gray-400">
              Height
              <input
                type="number"
                value={settings.renderHeight}
                min={256}
                max={8192}
                step={64}
                className="w-16 bg-[#333] text-white text-[10px] px-1 py-0.5 rounded border border-[#444]"
                onChange={(e) => updateSettings({ renderHeight: Number(e.target.value) })}
              />
            </label>
          </div>
          <SelectRow
            label="Format"
            value={settings.screenshotFormat}
            options={["png", "jpeg"]}
            onChange={(v) => updateSettings({ screenshotFormat: v as typeof settings.screenshotFormat })}
          />
        </Section>

        {/* Material Presets */}
        <Section title="Material Presets">
          <div className="grid grid-cols-3 gap-1">
            {presetNames.map((name) => (
              <button
                key={name}
                className="px-1.5 py-1 bg-[#333] text-gray-300 hover:bg-[#444] hover:text-white rounded transition text-[9px] capitalize"
                onClick={() => {
                  if (activeEntityId) {
                    const preset = MATERIAL_PRESETS[name];
                    updateMaterial(activeEntityId, preset);
                  }
                }}
              >
                {name.replace("_", " ")}
              </button>
            ))}
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function SliderRow({ label, value, min, max, step, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 w-20 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className="flex-1 h-1 accent-blue-500"
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="text-gray-500 w-12 text-right tabular-nums">{value.toFixed(step < 0.01 ? 5 : step < 0.1 ? 3 : 1)}</span>
    </div>
  );
}

function ToggleRow({ label, value, onChange }: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 flex-1">{label}</span>
      <button
        className={`w-7 h-4 rounded-full transition ${value ? "bg-blue-500" : "bg-[#444]"}`}
        onClick={() => onChange(!value)}
      >
        <div className={`w-3 h-3 bg-white rounded-full shadow transition-transform ${value ? "translate-x-3.5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function SelectRow({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-gray-400 w-20 shrink-0">{label}</span>
      <select
        value={value}
        className="flex-1 bg-[#333] text-white text-[10px] px-1 py-0.5 rounded border border-[#444]"
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
