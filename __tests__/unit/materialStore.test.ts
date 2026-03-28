import { describe, it, expect, beforeEach } from "vitest";
import { useMaterialStore } from "@/editor/stores/materialStore";

describe("Material Store", () => {
  beforeEach(() => {
    // Remove all materials
    const state = useMaterialStore.getState();
    for (const id of Object.keys(state.materials)) {
      useMaterialStore.getState().removeMaterial(id);
    }
  });

  it("starts with empty materials", () => {
    expect(useMaterialStore.getState().materials).toEqual({});
  });

  it("creates a material for an entity", () => {
    useMaterialStore.getState().createMaterial("entity1");
    expect(useMaterialStore.getState().materials["entity1"]).toBeDefined();
  });

  it("does not duplicate material on second create", () => {
    useMaterialStore.getState().createMaterial("entity1");
    useMaterialStore.getState().createMaterial("entity1");
    expect(Object.keys(useMaterialStore.getState().materials)).toHaveLength(1);
  });

  it("has sensible defaults on creation", () => {
    useMaterialStore.getState().createMaterial("e1");
    const mat = useMaterialStore.getState().materials["e1"];

    expect(mat!.albedo).toBe("#888888");
    expect(mat!.metallic).toBe(0.0);
    expect(mat!.roughness).toBe(0.5);
    expect(mat!.emissive).toBe("#000000");
    expect(mat!.emissiveIntensity).toBe(0);
    expect(mat!.opacity).toBe(1.0);
    expect(mat!.alphaMode).toBe("opaque");
  });

  it("updates albedo color (hex string)", () => {
    useMaterialStore.getState().createMaterial("entity1");
    useMaterialStore.getState().updateMaterial("entity1", { albedo: "#ff0000" });

    expect(useMaterialStore.getState().materials["entity1"]!.albedo).toBe("#ff0000");
  });

  it("updates metallic and roughness", () => {
    useMaterialStore.getState().createMaterial("entity1");
    useMaterialStore.getState().updateMaterial("entity1", { metallic: 0.9, roughness: 0.1 });

    const mat = useMaterialStore.getState().materials["entity1"];
    expect(mat!.metallic).toBe(0.9);
    expect(mat!.roughness).toBe(0.1);
  });

  it("updates opacity and alpha mode", () => {
    useMaterialStore.getState().createMaterial("entity1");
    useMaterialStore.getState().updateMaterial("entity1", { opacity: 0.5, alphaMode: "blend" });

    const mat = useMaterialStore.getState().materials["entity1"];
    expect(mat!.opacity).toBe(0.5);
    expect(mat!.alphaMode).toBe("blend");
  });

  it("updates emissive color and intensity", () => {
    useMaterialStore.getState().createMaterial("entity1");
    useMaterialStore.getState().updateMaterial("entity1", {
      emissive: "#00ff00",
      emissiveIntensity: 2.0,
    });

    const mat = useMaterialStore.getState().materials["entity1"];
    expect(mat!.emissive).toBe("#00ff00");
    expect(mat!.emissiveIntensity).toBe(2.0);
  });

  it("removes a material", () => {
    useMaterialStore.getState().createMaterial("entity1");
    useMaterialStore.getState().removeMaterial("entity1");
    expect(useMaterialStore.getState().materials["entity1"]).toBeUndefined();
  });

  it("removing a material clears activeMaterialId if it was active", () => {
    useMaterialStore.getState().createMaterial("entity1");
    useMaterialStore.getState().setActiveMaterial("entity1");
    useMaterialStore.getState().removeMaterial("entity1");

    expect(useMaterialStore.getState().activeMaterialId).toBeNull();
  });

  it("updates PBR clearcoat properties", () => {
    useMaterialStore.getState().createMaterial("entity1");
    useMaterialStore.getState().updateMaterial("entity1", {
      clearcoatEnabled: true,
      clearcoatIntensity: 1.0,
      clearcoatRoughness: 0.2,
    });

    const mat = useMaterialStore.getState().materials["entity1"];
    expect(mat!.clearcoatEnabled).toBe(true);
    expect(mat!.clearcoatIntensity).toBe(1.0);
    expect(mat!.clearcoatRoughness).toBe(0.2);
  });

  it("updates PBR sheen properties", () => {
    useMaterialStore.getState().createMaterial("entity1");
    useMaterialStore.getState().updateMaterial("entity1", {
      sheenEnabled: true,
      sheenIntensity: 0.5,
      sheenColor: "#0000ff",
    });

    const mat = useMaterialStore.getState().materials["entity1"];
    expect(mat!.sheenEnabled).toBe(true);
    expect(mat!.sheenIntensity).toBe(0.5);
    expect(mat!.sheenColor).toBe("#0000ff");
  });

  it("updates subsurface scattering properties", () => {
    useMaterialStore.getState().createMaterial("entity1");
    useMaterialStore.getState().updateMaterial("entity1", {
      sssEnabled: true,
      sssColor: "#ff9966",
      sssRadius: 2.0,
      sssIntensity: 0.8,
    });

    const mat = useMaterialStore.getState().materials["entity1"];
    expect(mat!.sssEnabled).toBe(true);
    expect(mat!.sssColor).toBe("#ff9966");
    expect(mat!.sssRadius).toBe(2.0);
    expect(mat!.sssIntensity).toBe(0.8);
  });

  it("updates anisotropic properties", () => {
    useMaterialStore.getState().createMaterial("entity1");
    useMaterialStore.getState().updateMaterial("entity1", {
      anisotropicEnabled: true,
      anisotropy: 0.8,
      ior: 1.5,
    });

    const mat = useMaterialStore.getState().materials["entity1"];
    expect(mat!.anisotropicEnabled).toBe(true);
    expect(mat!.anisotropy).toBe(0.8);
    expect(mat!.ior).toBe(1.5);
  });

  it("handles multiple entities", () => {
    useMaterialStore.getState().createMaterial("e1");
    useMaterialStore.getState().createMaterial("e2");
    useMaterialStore.getState().createMaterial("e3");
    expect(Object.keys(useMaterialStore.getState().materials)).toHaveLength(3);
  });

  it("setActiveMaterial and getMaterial", () => {
    useMaterialStore.getState().createMaterial("entity1");
    useMaterialStore.getState().setActiveMaterial("entity1");

    expect(useMaterialStore.getState().activeMaterialId).toBe("entity1");
    expect(useMaterialStore.getState().getMaterial("entity1")).toBeDefined();
    expect(useMaterialStore.getState().getMaterial("nonexistent")).toBeUndefined();
  });
});
