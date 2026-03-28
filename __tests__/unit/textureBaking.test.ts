import { describe, it, expect } from "vitest";
import {
  createDefaultBakingSettings,
  aoToRGBA,
  displacementToRGBA,
  curvatureToRGBA,
  thicknessToRGBA,
  applyBakeMargin,
} from "@/editor/utils/textureBaking";

describe("textureBaking", () => {
  describe("createDefaultBakingSettings", () => {
    it("returns sensible defaults", () => {
      const settings = createDefaultBakingSettings();
      expect(settings.resolution).toBe(1024);
      expect(settings.samples).toBe(256);
      expect(settings.bakeNormal).toBe(true);
      expect(settings.bakeDisplacement).toBe(false);
      expect(settings.bakeAO).toBe(false);
      expect(settings.bakeCurvature).toBe(false);
      expect(settings.bakeThickness).toBe(false);
      expect(settings.aoDistance).toBe(0.5);
      expect(settings.aoContrast).toBe(1.0);
      expect(settings.bakeMargin).toBe(2);
    });
  });

  describe("aoToRGBA", () => {
    it("converts AO float map to RGBA", () => {
      const res = 4;
      const ao = new Float32Array(res * res);
      ao[0] = 1.0;  // fully lit
      ao[1] = 0.0;  // fully occluded
      ao[2] = 0.5;  // half
      const rgba = aoToRGBA(ao, res);

      // RGBA = 4 channels
      expect(rgba.length).toBe(res * res * 4);
      // Pixel 0: AO=1.0 -> RGB=255, A=255
      expect(rgba[0]).toBe(255);
      expect(rgba[1]).toBe(255);
      expect(rgba[2]).toBe(255);
      expect(rgba[3]).toBe(255);
      // Pixel 1: AO=0.0 -> RGB=0, A=255
      expect(rgba[4]).toBe(0);
      expect(rgba[5]).toBe(0);
      expect(rgba[6]).toBe(0);
      expect(rgba[7]).toBe(255);
      // Pixel 2: AO=0.5 -> RGB=127, A=255
      expect(rgba[8]).toBe(127);
      expect(rgba[9]).toBe(127);
      expect(rgba[10]).toBe(127);
      expect(rgba[11]).toBe(255);
    });
  });

  describe("displacementToRGBA", () => {
    it("normalizes displacement to 0-255 range", () => {
      const res = 4;
      const disp = new Float32Array(res * res);
      disp[0] = -1.0;
      disp[1] = 1.0;
      disp[2] = 0.0;
      const rgba = displacementToRGBA(disp, res);

      expect(rgba.length).toBe(res * res * 4);
      // min = -1, max = 1, range = 2
      // -1 -> 0, 0 -> 127, 1 -> 255
      expect(rgba[0]).toBe(0);       // -1.0 normalized to 0
      expect(rgba[4]).toBe(255);     // 1.0 normalized to 255
      expect(rgba[8]).toBe(127);     // 0.0 normalized to 127
      expect(rgba[3]).toBe(255);     // alpha always 255
    });

    it("handles uniform displacement (range=0 fallback to 1)", () => {
      const res = 2;
      const disp = new Float32Array(res * res).fill(0.5);
      const rgba = displacementToRGBA(disp, res);
      // All values same -> min=max -> range=1 (fallback)
      // (0.5 - 0.5) / 1 * 255 = 0
      for (let i = 0; i < res * res; i++) {
        expect(rgba[i * 4]).toBe(0);
      }
    });
  });

  describe("curvatureToRGBA", () => {
    it("flat surface is blue (R=0,G=0,B=255)", () => {
      const res = 2;
      const curvature = new Float32Array(res * res).fill(0);
      const rgba = curvatureToRGBA(curvature, res);

      // val=0: R=0, G=0, B=255
      expect(rgba[0]).toBe(0);
      expect(rgba[1]).toBe(0);
      expect(rgba[2]).toBe(255);
      expect(rgba[3]).toBe(255);
    });

    it("high curvature is yellow-ish (R=255,G=200,B=0)", () => {
      const res = 2;
      const curvature = new Float32Array(res * res).fill(1.0);
      const rgba = curvatureToRGBA(curvature, res);

      expect(rgba[0]).toBe(255);   // R = val*255 = 255
      expect(rgba[1]).toBe(200);   // G = val*200 = 200
      expect(rgba[2]).toBe(0);     // B = (1-val)*255 = 0
      expect(rgba[3]).toBe(255);
    });
  });

  describe("thicknessToRGBA", () => {
    it("thick (safe) is green", () => {
      const res = 2;
      const thickness = new Float32Array(res * res).fill(1.0);
      const rgba = thicknessToRGBA(thickness, res);

      expect(rgba[0]).toBe(0);     // R = (1-1)*255 = 0
      expect(rgba[1]).toBe(255);   // G = 1*255 = 255
      expect(rgba[2]).toBe(0);
      expect(rgba[3]).toBe(255);
    });

    it("thin (danger) is red", () => {
      const res = 2;
      const thickness = new Float32Array(res * res).fill(0.0);
      const rgba = thicknessToRGBA(thickness, res);

      expect(rgba[0]).toBe(255);   // R = (1-0)*255 = 255
      expect(rgba[1]).toBe(0);     // G = 0*255 = 0
      expect(rgba[2]).toBe(0);
      expect(rgba[3]).toBe(255);
    });
  });

  describe("applyBakeMargin", () => {
    it("returns original when margin is 0", () => {
      const data = new Uint8Array([100, 200, 50, 255]);
      const result = applyBakeMargin(data, 2, 0, 4);
      expect(result).toEqual(data);
    });

    it("returns original when margin is negative", () => {
      const data = new Uint8Array([100, 200, 50, 255]);
      const result = applyBakeMargin(data, 2, -1, 4);
      expect(result).toEqual(data);
    });

    it("preserves data type (Uint8Array)", () => {
      const data = new Uint8Array(16);
      const result = applyBakeMargin(data, 2, 1, 4);
      expect(result).toBeInstanceOf(Uint8Array);
    });

    it("preserves data type (Float32Array)", () => {
      const res = 4;
      const data = new Float32Array(res * res); // 1 channel, 4x4 = 16 pixels
      const result = applyBakeMargin(data, res, 1, 1);
      expect(result).toBeInstanceOf(Float32Array);
      expect(result.length).toBe(res * res);
    });

    it("does not crash on small resolution", () => {
      const data = new Uint8Array(4); // 1x1 image, 4 channels
      const result = applyBakeMargin(data, 1, 1, 4);
      expect(result.length).toBe(4);
    });
  });
});
