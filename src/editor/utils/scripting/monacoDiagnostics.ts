/**
 * Script validation for Monaco editor diagnostics.
 *
 * Validates script syntax by attempting to parse (not execute) the code.
 * Returns Monaco marker data for error squiggles.
 */

export interface ScriptDiagnostic {
  startLineNumber: number;
  startColumn: number;
  endLineNumber: number;
  endColumn: number;
  message: string;
  severity: "error" | "warning" | "info";
}

/**
 * Validate a script and return diagnostics.
 *
 * Uses `new Function()` to check for syntax errors without executing.
 * Extracts line/column from the error stack trace.
 */
export function validateScript(code: string): ScriptDiagnostic[] {
  const diagnostics: ScriptDiagnostic[] = [];

  // Skip empty/whitespace-only scripts
  if (!code.trim()) {
    return diagnostics;
  }

  try {
    // Wrap in a function to catch syntax errors without executing
    // eslint-disable-next-line no-new-func
    new Function("blendergl", "console", `"use strict";\n${code}`);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));

    // Extract line/column from stack trace
    const lineCol = extractLineColumn(error);
    if (lineCol) {
      diagnostics.push({
        startLineNumber: lineCol.line,
        startColumn: lineCol.column,
        endLineNumber: lineCol.line,
        endColumn: lineCol.column + 1,
        message: error.message,
        severity: "error",
      });
    } else {
      // Fallback: report at line 1
      diagnostics.push({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: 1,
        endColumn: 2,
        message: error.message,
        severity: "error",
      });
    }
  }

  return diagnostics;
}

/**
 * Extract line and column numbers from a Function constructor error stack.
 *
 * Stack format: "Function anonymous(...) new Function(...) ..."
 * The actual script error line appears as "<anonymous>:LINE:COLUMN"
 */
function extractLineColumn(error: Error): { line: number; column: number } | null {
  const stack = error.stack ?? "";
  // Match <anonymous>:LINE:COLUMN pattern
  const match = stack.match(/<anonymous>:(\d+):(\d+)/);
  if (match) {
    return { line: parseInt(match[1], 10), column: parseInt(match[2], 10) };
  }
  return null;
}
