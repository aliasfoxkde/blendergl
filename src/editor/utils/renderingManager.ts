/**
 * Rendering manager — handles SSAO, shadow configuration,
 * environment settings, and studio lighting presets.
 */

import type { Scene } from "@babylonjs/core";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { ShadowGenerator } from "@babylonjs/core/Lights/Shadows/shadowGenerator";
import { CascadedShadowGenerator } from "@babylonjs/core/Lights/Shadows/cascadedShadowGenerator";
import { SSAO2RenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HDRCubeTexture } from "@babylonjs/core/Materials/Textures/hdrCubeTexture";
import type { RenderSettingsData } from "@/editor/stores/renderSettingsStore";
import { sceneRef } from "@/editor/utils/sceneRef";

class RenderingManager {
  private ssaoPipeline: SSAO2RenderingPipeline | null = null;

  init(babylonScene: Scene): void {
    this.setupDefaultShadows(babylonScene);
    this.setupDefaultEnvironment(babylonScene);
  }

  // --- SSAO ---

  enableSSAO(babylonScene: Scene): void {
    if (this.ssaoPipeline) return;

    this.ssaoPipeline = new SSAO2RenderingPipeline(
      "ssao",
      babylonScene,
      { ssaoRatio: 0.5, blurRatio: 0.5 },
    );

    this.ssaoPipeline.totalStrength = 1.0;
    this.ssaoPipeline.maxZ = 100;
    this.ssaoPipeline.minZAspect = 0.2;
    this.ssaoPipeline.radius = 2.0;
    this.ssaoPipeline.base = 0.5;

    babylonScene.postProcessRenderPipelineManager.addPipeline(this.ssaoPipeline);
  }

  disableSSAO(babylonScene: Scene): void {
    if (!this.ssaoPipeline) return;

    babylonScene.postProcessRenderPipelineManager.removePipeline(this.ssaoPipeline.name);
    this.ssaoPipeline.dispose();
    this.ssaoPipeline = null;
  }

  updateSSAO(settings: RenderSettingsData): void {
    const scene = sceneRef.current;
    if (!scene) return;

    if (settings.ssaoEnabled) {
      this.enableSSAO(scene);
      if (this.ssaoPipeline) {
        this.ssaoPipeline.totalStrength = settings.ssaoIntensity;
        this.ssaoPipeline.radius = settings.ssaoRadius;
      }
    } else {
      this.disableSSAO(scene);
    }
  }

  // --- Shadows ---

  private setupDefaultShadows(scene: Scene): void {
    scene.shadowsEnabled = true;
  }

  updateShadows(settings: RenderSettingsData): void {
    const scene = sceneRef.current;
    if (!scene) return;

    scene.shadowsEnabled = settings.shadowsEnabled;

    for (const light of scene.lights) {
      const sg = light.getShadowGenerator();
      if (sg) {
        const shadowGen = sg as ShadowGenerator;
        shadowGen.bias = settings.shadowBias;
        shadowGen.normalBias = settings.shadowNormalBias;
        shadowGen.useBlurExponentialShadowMap = settings.contactShadowsEnabled;
        shadowGen.setDarkness(0.5);
      }
    }
  }

  // --- CSM ---

  updateCSM(settings: RenderSettingsData): void {
    const scene = sceneRef.current;
    if (!scene) return;

    // Find the studio_key directional light and replace its shadow gen with CSM
    for (const light of scene.lights) {
      if (light.name === "studio_key" && light instanceof DirectionalLight) {
        const existingGen = light.getShadowGenerator();
        if (existingGen) {
          existingGen.dispose();
        }

        if (settings.csmEnabled) {
          const csm = new CascadedShadowGenerator(settings.shadowResolution, light);
          csm.useBlurExponentialShadowMap = true;
          csm.blurKernel = 32;
          csm.setDarkness(0.4);
          csm.bias = settings.shadowBias;
          csm.normalBias = settings.shadowNormalBias;
          csm.lambda = settings.csmLambda;
          csm.numCascades = settings.csmCascades;
          csm.autoCalcDepthBounds = settings.csmShadowAutoCalc;
        } else {
          // Re-add standard shadow generator
          const shadowGen = new ShadowGenerator(settings.shadowResolution, light);
          shadowGen.useBlurExponentialShadowMap = settings.contactShadowsEnabled;
          shadowGen.blurKernel = 32;
          shadowGen.setDarkness(0.4);
          shadowGen.bias = settings.shadowBias;
          shadowGen.normalBias = settings.shadowNormalBias;
        }
        break;
      }
    }
  }

  // --- Environment ---

  private setupDefaultEnvironment(scene: Scene): void {
    if (!scene.environmentTexture) {
      scene.clearColor = new Color4(0.05, 0.05, 0.08, 1);
    }
  }

  // --- HDRI ---

  loadHDRIFromFile(file: File): Promise<void> {
    const scene = sceneRef.current;
    if (!scene) return Promise.resolve();

    return new Promise((resolve) => {
      const blobUrl = URL.createObjectURL(file);
      const texture = new HDRCubeTexture(
        blobUrl,
        scene,
        256,
        false,
        true,
        false,
        false,
        () => {
          scene.environmentTexture = texture;
          scene.environmentIntensity = 1.0;
          URL.revokeObjectURL(blobUrl);
          resolve();
        },
        () => {
          URL.revokeObjectURL(blobUrl);
          resolve();
        },
      );
    });
  }

  loadHDRIFromUrl(url: string): void {
    const scene = sceneRef.current;
    if (!scene) return;

    const texture = new HDRCubeTexture(
      url,
      scene,
      256,
      false,
      false,
    );
    scene.environmentTexture = texture;
    scene.environmentIntensity = 1.0;
  }

  clearEnvironment(): void {
    const scene = sceneRef.current;
    if (!scene) return;

    if (scene.environmentTexture) {
      scene.environmentTexture.dispose();
      scene.environmentTexture = null;
    }
    scene.clearColor = new Color4(0.05, 0.05, 0.08, 1);
  }

  updateEnvironment(settings: RenderSettingsData): void {
    const scene = sceneRef.current;
    if (!scene) return;

    if (scene.environmentTexture) {
      scene.environmentIntensity = settings.environmentIntensity;
    }
  }

  // --- Studio Lighting Presets ---

  applyStudioPreset(preset: "neutral" | "three-point" | "dramatic" | "studio"): void {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove existing studio lights
    const toRemove: number[] = [];
    for (let i = 0; i < scene.lights.length; i++) {
      if (scene.lights[i].name.startsWith("studio_")) {
        toRemove.push(i);
      }
    }
    for (let i = toRemove.length - 1; i >= 0; i--) {
      scene.lights[toRemove[i]].dispose();
    }

    switch (preset) {
      case "neutral":
        this.addStudioLight(scene, "studio_key", new Vector3(-1, -2, 1), Color3.White(), 1.0, true);
        this.addStudioLight(scene, "studio_fill", new Vector3(1, -1, 1), Color3.White(), 0.4, false);
        break;
      case "three-point":
        this.addStudioLight(scene, "studio_key", new Vector3(-1, -2, 1), new Color3(1, 0.95, 0.9), 1.2, true);
        this.addStudioLight(scene, "studio_fill", new Vector3(1, -1, 0.5), new Color3(0.8, 0.85, 1), 0.6, false);
        this.addStudioLight(scene, "studio_rim", new Vector3(0, -1, -1), Color3.White(), 0.8, false);
        break;
      case "dramatic":
        this.addStudioLight(scene, "studio_key", new Vector3(-0.5, -3, 0.5), new Color3(1, 0.8, 0.6), 1.5, true);
        this.addStudioLight(scene, "studio_fill", new Vector3(1, -0.5, 1), new Color3(0.4, 0.4, 0.6), 0.3, false);
        this.addStudioLight(scene, "studio_rim", new Vector3(0, -2, -1), new Color3(0.6, 0.7, 1), 1.0, false);
        break;
      case "studio":
        this.addStudioLight(scene, "studio_key", new Vector3(-1, -2, 1), new Color3(1, 0.98, 0.95), 1.0, true);
        this.addStudioLight(scene, "studio_fill", new Vector3(2, -1, 0), new Color3(0.9, 0.92, 1), 0.5, false);
        this.addStudioLight(scene, "studio_rim", new Vector3(0, -1, -2), Color3.White(), 0.7, false);
        this.addStudioLight(scene, "studio_top", new Vector3(0, -3, 0), Color3.White(), 0.3, false);
        break;
    }
  }

  private addStudioLight(
    scene: Scene,
    name: string,
    direction: Vector3,
    color: Color3,
    intensity: number,
    castShadow: boolean,
  ): void {
    const light = new DirectionalLight(name, direction, scene);
    light.diffuse = color;
    light.intensity = intensity;
    light.position = direction.scale(-10);

    if (castShadow) {
      const shadowGen = new ShadowGenerator(1024, light);
      shadowGen.useBlurExponentialShadowMap = true;
      shadowGen.blurKernel = 32;
      shadowGen.setDarkness(0.4);
      shadowGen.bias = 0.00005;
      shadowGen.normalBias = 0.02;
    }
  }

  // --- Shadow Color ---

  setShadowColor(color: string): void {
    const scene = sceneRef.current;
    if (!scene) return;

    const rgb = hexToRgb(color);
    for (const light of scene.lights) {
      const sg = light.getShadowGenerator();
      if (sg) {
        (sg as ShadowGenerator).setDarkness(1 - (rgb.r + rgb.g + rgb.b) / 3);
      }
    }
  }

  dispose(): void {
    const scene = sceneRef.current;
    if (scene && this.ssaoPipeline) {
      scene.postProcessRenderPipelineManager.removePipeline(this.ssaoPipeline.name);
    }
    if (this.ssaoPipeline) {
      this.ssaoPipeline.dispose();
      this.ssaoPipeline = null;
    }
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
export const renderingManager = new RenderingManager();
