/**
 * Post-processing pipeline — manages Babylon.js DefaultRenderingPipeline
 * and renders settings integration.
 */

import type { Scene } from "@babylonjs/core";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import type { RenderSettingsData, ToneMappingMode } from "@/editor/stores/renderSettingsStore";

class PostProcessPipeline {
  private pipeline: DefaultRenderingPipeline | null = null;

  init(babylonScene: Scene): void {
    if (this.pipeline) return;

    this.pipeline = new DefaultRenderingPipeline(
      "defaultPipeline",
      true, // hdr
      babylonScene,
      [babylonScene.activeCamera!],
    );

    // Default settings
    this.pipeline.bloomEnabled = true;
    this.pipeline.bloomThreshold = 0.8;
    this.pipeline.bloomWeight = 0.3;
    this.pipeline.bloomKernel = 64;
    this.pipeline.bloomScale = 0.5;

    this.pipeline.fxaaEnabled = true;

    this.pipeline.imageProcessingEnabled = true;
    this.pipeline.imageProcessing.toneMappingEnabled = true;
    this.pipeline.imageProcessing.toneMappingType = 3; // ACES
    this.pipeline.imageProcessing.exposure = 1.0;
    this.pipeline.imageProcessing.contrast = 1.0;

    // Chromatic aberration off by default
    this.pipeline.chromaticAberrationEnabled = false;
    this.pipeline.chromaticAberration.aberrationAmount = 25;

    // Vignette off by default
    this.pipeline.imageProcessing.vignetteEnabled = false;
    this.pipeline.imageProcessing.vignetteWeight = 1.5;
    this.pipeline.imageProcessing.vignetteStretch = 0;
    this.pipeline.imageProcessing.vignetteColor = new Color4(0, 0, 0, 0);

    // Depth of field off by default
    this.pipeline.depthOfFieldEnabled = false;
    this.pipeline.depthOfField.fStop = 1.4;
    this.pipeline.depthOfField.focalLength = 50;
    this.pipeline.depthOfField.focusDistance = 10;
  }

  updateFromSettings(settings: RenderSettingsData): void {
    if (!this.pipeline) return;

    // Tone mapping
    this.pipeline.imageProcessing.toneMappingEnabled = true;
    this.pipeline.imageProcessing.toneMappingType = toneMappingToBabylon(settings.toneMapping);
    this.pipeline.imageProcessing.exposure = settings.exposure;
    this.pipeline.imageProcessing.contrast = settings.contrast;

    // Anti-aliasing
    this.pipeline.fxaaEnabled = settings.antiAliasing === "fxaa";

    // Bloom
    this.pipeline.bloomEnabled = settings.bloomEnabled;
    this.pipeline.bloomThreshold = settings.bloomThreshold;
    this.pipeline.bloomWeight = settings.bloomWeight;
    this.pipeline.bloomKernel = settings.bloomKernel;
    this.pipeline.bloomScale = settings.bloomScale;

    // SSAO
    // Note: DefaultRenderingPipeline doesn't include SSAO directly.
    // SSAO would need a separate SSAORenderingPipeline.
    // For now, we enable it via the pipeline's built-in support if available.

    // Color grading
    this.pipeline.imageProcessingEnabled = settings.colorGradingEnabled || settings.vignetteEnabled;
    if (settings.colorGradingEnabled) {
      this.pipeline.imageProcessing.colorGradingEnabled = true;
      // Color grading temperature/tint/saturation/brightness require
      // a ColorGradingTexture which is not yet implemented.
    } else {
      this.pipeline.imageProcessing.colorGradingEnabled = false;
    }

    // Vignette
    this.pipeline.imageProcessing.vignetteEnabled = settings.vignetteEnabled;
    this.pipeline.imageProcessing.vignetteWeight = settings.vignetteWeight;
    this.pipeline.imageProcessing.vignetteStretch = settings.vignetteStretch;
    const vignetteColor = hexToRgb(settings.vignetteColor);
    this.pipeline.imageProcessing.vignetteColor = new Color4(vignetteColor.r, vignetteColor.g, vignetteColor.b, 0);

    // Depth of field
    this.pipeline.depthOfFieldEnabled = settings.dofEnabled;
    this.pipeline.depthOfField.fStop = settings.dofFStop;
    this.pipeline.depthOfField.focalLength = settings.dofFocalLength;
    this.pipeline.depthOfField.focusDistance = settings.dofFocusDistance;

    // Chromatic aberration
    this.pipeline.chromaticAberrationEnabled = settings.chromaticAberrationEnabled;
    this.pipeline.chromaticAberration.aberrationAmount = settings.chromaticAberrationAmount;
  }

  dispose(): void {
    if (this.pipeline) {
      this.pipeline.dispose();
      this.pipeline = null;
    }
  }
}

function toneMappingToBabylon(mode: ToneMappingMode): number {
  switch (mode) {
    case "linear": return 0;
    case "reinhard": return 1;
    case "filmic": return 2;
    case "aces": return 3;
    default: return 3;
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
}

// Singleton
export const postProcessPipeline = new PostProcessPipeline();
