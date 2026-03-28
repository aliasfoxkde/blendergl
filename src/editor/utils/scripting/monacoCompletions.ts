/**
 * Monaco completion provider for the BlenderGL scripting API.
 *
 * Registers a completion item provider that triggers on `.` after `blendergl`
 * and its sub-APIs (scene, ops, data, utils, animation, armature, sculpt, console).
 */

import type * as Monaco from "monaco-editor";

interface CompletionEntry {
  label: string;
  kind: Monaco.languages.CompletionItemKind;
  detail: string;
  insertText: string;
}

// ---- Sub-API completions ----

const SCENE_COMPLETIONS: CompletionEntry[] = [
  { label: "getEntities", kind: 15 /* Method */, detail: "() => ScriptEntity[]", insertText: "getEntities()" },
  { label: "getEntity", kind: 15 /* Method */, detail: "(id: string) => ScriptEntity | null", insertText: "getEntity(${1:id})" },
  { label: "createEntity", kind: 15 /* Method */, detail: "(name: string, geometryType?: string) => ScriptEntity", insertText: "createEntity(${1:name}, ${2:geometryType})" },
  { label: "deleteEntity", kind: 15 /* Method */, detail: "(id: string) => void", insertText: "deleteEntity(${1:id})" },
  { label: "clear", kind: 15 /* Method */, detail: "() => void", insertText: "clear()" },
];

const OPS_COMPLETIONS: CompletionEntry[] = [
  { label: "addPrimitive", kind: 15 /* Method */, detail: "(type: string, options?) => ScriptEntity", insertText: "addPrimitive(${1:type}, ${2:options})" },
  { label: "translate", kind: 15 /* Method */, detail: "(id: string, offset: Vec3) => void", insertText: "translate(${1:id}, ${2:offset})" },
  { label: "setPosition", kind: 15 /* Method */, detail: "(id: string, position: Vec3) => void", insertText: "setPosition(${1:id}, ${2:position})" },
  { label: "rotate", kind: 15 /* Method */, detail: "(id: string, rotation: Vec3) => void", insertText: "rotate(${1:id}, ${2:rotation})" },
  { label: "setRotation", kind: 15 /* Method */, detail: "(id: string, rotation: Vec3) => void", insertText: "setRotation(${1:id}, ${2:rotation})" },
  { label: "scale", kind: 15 /* Method */, detail: "(id: string, scale: Vec3) => void", insertText: "scale(${1:id}, ${2:scale})" },
  { label: "setScale", kind: 15 /* Method */, detail: "(id: string, scale: Vec3) => void", insertText: "setScale(${1:id}, ${2:scale})" },
  { label: "duplicate", kind: 15 /* Method */, detail: "(id: string) => ScriptEntity | null", insertText: "duplicate(${1:id})" },
  { label: "delete", kind: 15 /* Method */, detail: "(id: string) => void", insertText: "delete(${1:id})" },
  { label: "select", kind: 15 /* Method */, detail: "(id: string, addToSelection?: boolean) => void", insertText: "select(${1:id})" },
  { label: "deselectAll", kind: 15 /* Method */, detail: "() => void", insertText: "deselectAll()" },
];

const DATA_COMPLETIONS: CompletionEntry[] = [
  { label: "getMaterial", kind: 15 /* Method */, detail: "(entityId: string) => ScriptMaterial | null", insertText: "getMaterial(${1:entityId})" },
  { label: "setMaterial", kind: 15 /* Method */, detail: "(entityId: string, props: Partial<ScriptMaterial>) => void", insertText: "setMaterial(${1:entityId}, ${2:props})" },
  { label: "getSelection", kind: 15 /* Method */, detail: "() => string[]", insertText: "getSelection()" },
  { label: "getSettings", kind: 15 /* Method */, detail: "() => Record<string, unknown>", insertText: "getSettings()" },
  { label: "setSetting", kind: 15 /* Method */, detail: "(key: string, value: unknown) => void", insertText: "setSetting(${1:key}, ${2:value})" },
];

const UTILS_COMPLETIONS: CompletionEntry[] = [
  { label: "Vec3", kind: 2 /* Function */, detail: "(x, y, z) => Vec3Op", insertText: "Vec3(${1:x}, ${2:y}, ${3:z})" },
  { label: "degToRad", kind: 2 /* Function */, detail: "(deg: number) => number", insertText: "degToRad(${1:degrees})" },
  { label: "radToDeg", kind: 2 /* Function */, detail: "(rad: number) => number", insertText: "radToDeg(${1:radians})" },
  { label: "lerp", kind: 2 /* Function */, detail: "(a: number, b: number, t: number) => number", insertText: "lerp(${1:a}, ${2:b}, ${3:t})" },
  { label: "clamp", kind: 2 /* Function */, detail: "(value: number, min: number, max: number) => number", insertText: "clamp(${1:value}, ${2:min}, ${3:max})" },
  { label: "random", kind: 2 /* Function */, detail: "(min?: number, max?: number) => number", insertText: "random(${1:min}, ${2:max})" },
];

const ANIMATION_COMPLETIONS: CompletionEntry[] = [
  { label: "createClip", kind: 15 /* Method */, detail: "(name: string) => string", insertText: "createClip(${1:name})" },
  { label: "deleteClip", kind: 15 /* Method */, detail: "(clipId: string) => void", insertText: "deleteClip(${1:clipId})" },
  { label: "setActiveClip", kind: 15 /* Method */, detail: "(clipId: string | null) => void", insertText: "setActiveClip(${1:clipId})" },
  { label: "getActiveClipId", kind: 15 /* Method */, detail: "() => string | null", insertText: "getActiveClipId()" },
  { label: "getClipIds", kind: 15 /* Method */, detail: "() => string[]", insertText: "getClipIds()" },
  { label: "addKey", kind: 15 /* Method */, detail: "(clipId, boneId, property, frame, value) => void", insertText: "addKey(${1:clipId}, ${2:boneId}, ${3:property}, ${4:frame}, ${5:value})" },
  { label: "removeKey", kind: 15 /* Method */, detail: "(clipId, trackId, keyIndex) => void", insertText: "removeKey(${1:clipId}, ${2:trackId}, ${3:keyIndex})" },
  { label: "getCurrentFrame", kind: 15 /* Method */, detail: "() => number", insertText: "getCurrentFrame()" },
  { label: "setCurrentFrame", kind: 15 /* Method */, detail: "(frame: number) => void", insertText: "setCurrentFrame(${1:frame})" },
  { label: "play", kind: 15 /* Method */, detail: "() => void", insertText: "play()" },
  { label: "pause", kind: 15 /* Method */, detail: "() => void", insertText: "pause()" },
  { label: "stop", kind: 15 /* Method */, detail: "() => void", insertText: "stop()" },
  { label: "setPlaybackState", kind: 15 /* Method */, detail: '(state: "stopped" | "playing" | "paused") => void', insertText: 'setPlaybackState(${1:state})' },
];

const ARMATURE_COMPLETIONS: CompletionEntry[] = [
  { label: "addArmature", kind: 15 /* Method */, detail: "(entityId: string) => void", insertText: "addArmature(${1:entityId})" },
  { label: "removeArmature", kind: 15 /* Method */, detail: "(entityId: string) => void", insertText: "removeArmature(${1:entityId})" },
  { label: "hasArmature", kind: 15 /* Method */, detail: "(entityId: string) => boolean", insertText: "hasArmature(${1:entityId})" },
  { label: "getBones", kind: 15 /* Method */, detail: "(entityId: string) => ScriptBone[]", insertText: "getBones(${1:entityId})" },
  { label: "addBone", kind: 15 /* Method */, detail: "(entityId, name, parentId, position) => ScriptBone | null", insertText: "addBone(${1:entityId}, ${2:name}, ${3:parentId}, ${4:position})" },
  { label: "removeBone", kind: 15 /* Method */, detail: "(entityId: string, boneId: string) => void", insertText: "removeBone(${1:entityId}, ${2:boneId})" },
  { label: "setBoneTransform", kind: 15 /* Method */, detail: "(boneId: string, position?, rotation?) => void", insertText: "setBoneTransform(${1:boneId}, ${2:position}, ${3:rotation})" },
];

const SCULPT_COMPLETIONS: CompletionEntry[] = [
  { label: "setBrush", kind: 15 /* Method */, detail: "(type: string, radius?: number, strength?: number) => void", insertText: "setBrush(${1:type}, ${2:radius}, ${3:strength})" },
  { label: "getBrush", kind: 15 /* Method */, detail: "() => { type, radius, strength, falloff }", insertText: "getBrush()" },
  { label: "setSymmetry", kind: 15 /* Method */, detail: "(x: boolean, y: boolean, z: boolean) => void", insertText: "setSymmetry(${1:x}, ${2:y}, ${3:z})" },
  { label: "sculptAt", kind: 15 /* Method */, detail: "(x, y, z, brushType?, radius?, strength?) => void", insertText: "sculptAt(${1:x}, ${2:y}, ${3:z})" },
];

const CONSOLE_COMPLETIONS: CompletionEntry[] = [
  { label: "log", kind: 15 /* Method */, detail: "(...args: unknown[]) => void", insertText: "log(${1:...args})" },
  { label: "warn", kind: 15 /* Method */, detail: "(...args: unknown[]) => void", insertText: "warn(${1:...args})" },
  { label: "error", kind: 15 /* Method */, detail: "(...args: unknown[]) => void", insertText: "error(${1:...args})" },
  { label: "clear", kind: 15 /* Method */, detail: "() => void", insertText: "clear()" },
];

// ---- Top-level completions ----

const TOP_LEVEL_COMPLETIONS: CompletionEntry[] = [
  { label: "scene", kind: 6 /* Module */, detail: "Scene access — getEntities, createEntity, deleteEntity", insertText: "scene" },
  { label: "ops", kind: 6 /* Module */, detail: "Operators — addPrimitive, translate, rotate, scale, duplicate", insertText: "ops" },
  { label: "data", kind: 6 /* Module */, detail: "Data access — getMaterial, setMaterial, getSelection, getSettings", insertText: "data" },
  { label: "utils", kind: 6 /* Module */, detail: "Math utilities — Vec3, degToRad, radToDeg, lerp, clamp, random", insertText: "utils" },
  { label: "animation", kind: 6 /* Module */, detail: "Animation — clips, keyframes, playback", insertText: "animation" },
  { label: "armature", kind: 6 /* Module */, detail: "Armature — bones, bone transforms", insertText: "armature" },
  { label: "sculpt", kind: 6 /* Module */, detail: "Sculpting — brushes, symmetry", insertText: "sculpt" },
  { label: "console", kind: 6 /* Module */, detail: "Console — log, warn, error, clear", insertText: "console" },
  { label: "version", kind: 10 /* Property */, detail: "string — API version", insertText: "version" },
];

// ---- Lookup ----

const SUB_API_MAP: Record<string, CompletionEntry[]> = {
  scene: SCENE_COMPLETIONS,
  ops: OPS_COMPLETIONS,
  data: DATA_COMPLETIONS,
  utils: UTILS_COMPLETIONS,
  animation: ANIMATION_COMPLETIONS,
  armature: ARMATURE_COMPLETIONS,
  sculpt: SCULPT_COMPLETIONS,
  console: CONSOLE_COMPLETIONS,
};

/**
 * Register the BlenderGL completion provider with Monaco.
 */
export function registerBlenderGLCompletions(monaco: typeof Monaco): Monaco.IDisposable {
  return monaco.languages.registerCompletionItemProvider("javascript", {
    triggerCharacters: ["."],
    provideCompletionItems(model, position) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: position.column,
      };

      // Top-level: blendergl.
      const textUntilPos = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      // Match "blendergl." at the end
      const topLevelMatch = textUntilPos.match(/blendergl\.([a-zA-Z_]*)$/);
      if (topLevelMatch) {
        const subApi = topLevelMatch[1];
        const completions = SUB_API_MAP[subApi];
        if (completions) {
          return {
            suggestions: completions.map((c) => ({
              label: c.label,
              kind: c.kind,
              detail: c.detail,
              insertText: c.insertText,
              range,
            })),
          };
        }
        return { suggestions: [] };
      }

      // Match just "blendergl" (not followed by .)
      const globalMatch = textUntilPos.match(/blendergl$/);
      if (globalMatch) {
        return {
          suggestions: TOP_LEVEL_COMPLETIONS.map((c) => ({
            label: c.label,
            kind: c.kind,
            detail: c.detail,
            insertText: c.insertText,
            range,
          })),
        };
      }

      return { suggestions: [] };
    },
  });
}
