import { describe, it, expect } from "vitest";

// Import the completion data structures indirectly by testing the module exports
// We can't test Monaco registration directly without a Monaco instance,
// but we can verify the module structure and data integrity.

describe("monacoCompletions", () => {
  it("exports registerBlenderGLCompletions function", async () => {
    const mod = await import("@/editor/utils/scripting/monacoCompletions");
    expect(typeof mod.registerBlenderGLCompletions).toBe("function");
  });
});

describe("monacoDiagnostics", () => {
  it("exports validateScript function", async () => {
    const mod = await import("@/editor/utils/scripting/monacoDiagnostics");
    expect(typeof mod.validateScript).toBe("function");
  });

  it("returns empty diagnostics for valid code", async () => {
    const { validateScript } = await import("@/editor/utils/scripting/monacoDiagnostics");
    const diagnostics = validateScript('const x = 1;');
    expect(diagnostics).toHaveLength(0);
  });

  it("returns empty diagnostics for blendergl API usage", async () => {
    const { validateScript } = await import("@/editor/utils/scripting/monacoDiagnostics");
    const diagnostics = validateScript('blendergl.scene.getEntities();');
    expect(diagnostics).toHaveLength(0);
  });

  it("returns diagnostics for syntax errors", async () => {
    const { validateScript } = await import("@/editor/utils/scripting/monacoDiagnostics");
    const diagnostics = validateScript('const x = ;');
    expect(diagnostics.length).toBeGreaterThan(0);
    expect(diagnostics[0].severity).toBe("error");
    expect(diagnostics[0].message).toBeTruthy();
    expect(diagnostics[0].startLineNumber).toBeGreaterThan(0);
  });

  it("returns empty diagnostics for empty code", async () => {
    const { validateScript } = await import("@/editor/utils/scripting/monacoDiagnostics");
    expect(validateScript("")).toHaveLength(0);
    expect(validateScript("   ")).toHaveLength(0);
    expect(validateScript("\n\n")).toHaveLength(0);
  });

  it("returns diagnostics with line/column info for multi-line errors", async () => {
    const { validateScript } = await import("@/editor/utils/scripting/monacoDiagnostics");
    const diagnostics = validateScript('const x = 1;\nconst y =;\nconst z = 2;');
    expect(diagnostics.length).toBeGreaterThan(0);
    const d = diagnostics[0];
    expect(d.startLineNumber).toBeGreaterThanOrEqual(1);
    expect(d.startColumn).toBeGreaterThanOrEqual(1);
    expect(d.endLineNumber).toBeGreaterThanOrEqual(d.startLineNumber);
    expect(d.endColumn).toBeGreaterThanOrEqual(d.startColumn);
  });
});
