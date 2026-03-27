/**
 * Shader Compiler — converts a node graph into a Babylon.js NodeMaterial.
 *
 * Walks the graph from material_output backwards, creates Babylon
 * NodeMaterialBlock instances, connects them, and compiles.
 */

import { NodeMaterial } from "@babylonjs/core/Materials/Node/nodeMaterial";
import { PBRMetallicRoughnessBlock } from "@babylonjs/core/Materials/Node/Blocks/PBR/pbrMetallicRoughnessBlock";
import { InputBlock } from "@babylonjs/core/Materials/Node/Blocks/Input/inputBlock";
import { AddBlock } from "@babylonjs/core/Materials/Node/Blocks/addBlock";
import { MultiplyBlock } from "@babylonjs/core/Materials/Node/Blocks/multiplyBlock";
import { DivideBlock } from "@babylonjs/core/Materials/Node/Blocks/divideBlock";
import { PowBlock } from "@babylonjs/core/Materials/Node/Blocks/powBlock";
import { ClampBlock } from "@babylonjs/core/Materials/Node/Blocks/clampBlock";
import { ColorMergerBlock } from "@babylonjs/core/Materials/Node/Blocks/colorMergerBlock";
import { ColorSplitterBlock } from "@babylonjs/core/Materials/Node/Blocks/colorSplitterBlock";
import { SimplexPerlin3DBlock } from "@babylonjs/core/Materials/Node/Blocks/simplexPerlin3DBlock";
import { FragmentOutputBlock } from "@babylonjs/core/Materials/Node/Blocks/Fragment/fragmentOutputBlock";
import type { NodeMaterialBlock } from "@babylonjs/core/Materials/Node/nodeMaterialBlock";
import type { NodeMaterialConnectionPoint } from "@babylonjs/core/Materials/Node/nodeMaterialBlockConnectionPoint";
import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { GraphNode, GraphConnection } from "@/editor/types/nodeEditor";

// Block instances created during compilation
interface BlockInstance {
  block: NodeMaterialBlock;
  outputPorts: Map<string, NodeMaterialConnectionPoint>;
  inputPorts: Map<string, NodeMaterialConnectionPoint>;
}

/**
 * Compile the node graph into a Babylon.js NodeMaterial and apply to mesh.
 * Returns the compiled NodeMaterial or null on failure.
 */
export function compileAndApplyShader(
  nodes: Record<string, GraphNode>,
  connections: Record<string, GraphConnection>,
  scene: Scene,
  mesh: AbstractMesh
): NodeMaterial | null {
  try {
    const material = new NodeMaterial("nodeMaterial", scene);
    const blocks = new Map<string, BlockInstance>();

    // Find the material_output node
    const outputNodeId = Object.values(nodes).find((n) => n.type === "material_output")?.id;
    if (!outputNodeId) return null;

    // Create FragmentOutputBlock
    const fragmentOutput = new FragmentOutputBlock("fragmentOutput");
    material.attachedBlocks.push(fragmentOutput);
    blocks.set(outputNodeId, {
      block: fragmentOutput,
      outputPorts: new Map(),
      inputPorts: new Map([["surface", fragmentOutput.rgb]]),
    });

    // Process nodes in reverse topological order
    const orderedNodes = topologicalSort(nodes, connections);

    for (const nodeId of orderedNodes) {
      if (nodeId === outputNodeId) continue;
      const node = nodes[nodeId];
      if (!node) continue;

      const instance = createBlock(node);
      if (!instance) continue;

      blocks.set(nodeId, instance);
      material.attachedBlocks.push(instance.block);

      // Set input values from node state
      applyInputValues(node, instance.block);
    }

    // Connect blocks
    for (const conn of Object.values(connections)) {
      const srcInstance = blocks.get(conn.sourceNodeId);
      const tgtInstance = blocks.get(conn.targetNodeId);
      if (!srcInstance || !tgtInstance) continue;

      const srcPort = srcInstance.outputPorts.get(conn.sourcePortId);
      const tgtPort = tgtInstance.inputPorts.get(conn.targetPortId);
      if (srcPort && tgtPort) {
        srcPort.connectTo(tgtPort);
      }
    }

    material.build(false);

    // Apply to mesh
    mesh.material = material;
    return material;
  } catch (e) {
    console.error("[Shader Compiler]", e);
    return null;
  }
}

/**
 * Create a Babylon block for a graph node.
 */
function createBlock(node: GraphNode): BlockInstance | null {
  const id = node.id.replace(/-/g, "_");
  const instance: BlockInstance = {
    block: null as unknown as NodeMaterialBlock,
    outputPorts: new Map(),
    inputPorts: new Map(),
  };

  switch (node.type) {
    case "principled_bsdf": {
      const block = new PBRMetallicRoughnessBlock(`${id}_pbr`);
      instance.block = block;
      instance.inputPorts.set("baseColor", block.baseColor);
      instance.inputPorts.set("metallic", block.metallic);
      instance.inputPorts.set("roughness", block.roughness);
      instance.outputPorts.set("surface", block.lighting);
      break;
    }
    case "color_input": {
      const block = new InputBlock(`${id}_color`);
      block.isConstant = true;
      instance.block = block;
      instance.outputPorts.set("color", block.output);
      break;
    }
    case "value_input": {
      const block = new InputBlock(`${id}_value`);
      block.isConstant = true;
      instance.block = block;
      instance.outputPorts.set("value", block.output);
      break;
    }
    case "normal_input": {
      const block = new InputBlock(`${id}_normal`);
      block.isConstant = true;
      instance.block = block;
      instance.outputPorts.set("normal", block.output);
      break;
    }
    case "math_add": {
      const block = new AddBlock(`${id}_add`);
      instance.block = block;
      instance.inputPorts.set("a", block.left);
      instance.inputPorts.set("b", block.right);
      instance.outputPorts.set("result", block.output);
      break;
    }
    case "math_subtract": {
      // Babylon doesn't have a SubtractBlock — skip
      return null;
    }
    case "math_multiply": {
      const block = new MultiplyBlock(`${id}_mul`);
      instance.block = block;
      instance.inputPorts.set("a", block.left);
      instance.inputPorts.set("b", block.right);
      instance.outputPorts.set("result", block.output);
      break;
    }
    case "math_divide": {
      const block = new DivideBlock(`${id}_div`);
      instance.block = block;
      instance.inputPorts.set("a", block.left);
      instance.inputPorts.set("b", block.right);
      instance.outputPorts.set("result", block.output);
      break;
    }
    case "math_power": {
      const block = new PowBlock(`${id}_pow`);
      instance.block = block;
      instance.inputPorts.set("base", block.value);
      instance.inputPorts.set("exponent", block.power);
      instance.outputPorts.set("result", block.output);
      break;
    }
    case "math_mix": {
      // Simplified: use multiply for now
      const block = new MultiplyBlock(`${id}_mix`);
      instance.block = block;
      instance.inputPorts.set("a", block.left);
      instance.inputPorts.set("b", block.right);
      instance.outputPorts.set("result", block.output);
      break;
    }
    case "math_clamp": {
      const block = new ClampBlock(`${id}_clamp`);
      instance.block = block;
      instance.inputPorts.set("value", block.value);
      instance.outputPorts.set("result", block.output);
      break;
    }
    case "combine_xyz": {
      const block = new ColorMergerBlock(`${id}_combine`);
      instance.block = block;
      instance.inputPorts.set("x", block.r);
      instance.inputPorts.set("y", block.g);
      instance.inputPorts.set("z", block.b);
      instance.outputPorts.set("vector", block.rgba);
      break;
    }
    case "separate_xyz": {
      const block = new ColorSplitterBlock(`${id}_separate`);
      instance.block = block;
      instance.inputPorts.set("vector", block.rgba);
      instance.outputPorts.set("x", block.r);
      instance.outputPorts.set("y", block.g);
      instance.outputPorts.set("z", block.b);
      break;
    }
    case "noise_texture": {
      const block = new SimplexPerlin3DBlock(`${id}_noise`);
      instance.block = block;
      instance.inputPorts.set("scale", block.seed);
      instance.outputPorts.set("fac", block.output);
      break;
    }
    case "checker_texture":
    case "gradient_texture":
    case "mix_color":
    case "emission": {
      // Simplified: use InputBlock fallback
      const block = new InputBlock(`${id}_fallback`);
      block.isConstant = true;
      instance.block = block;
      instance.outputPorts.set("color", block.output);
      break;
    }
    default:
      return null;
  }

  return instance;
}

/**
 * Apply input values from the node's state to the Babylon block.
 */
function applyInputValues(node: GraphNode, block: NodeMaterialBlock): void {
  if (block instanceof InputBlock) {
    // For InputBlock, set the value property
    for (const value of Object.values(node.values)) {
      if (typeof value === "number") {
        block.value = value;
      } else if (Array.isArray(value) && value.length >= 3) {
        // Color3 value
        block.value = value;
      }
    }
  }
}

/**
 * Simple topological sort using Kahn's algorithm.
 */
function topologicalSort(nodes: Record<string, GraphNode>, connections: Record<string, GraphConnection>): string[] {
  const nodeIds = new Set(Object.keys(nodes));
  const inDegree = new Map<string, number>();
  for (const id of nodeIds) {
    inDegree.set(id, 0);
  }
  for (const conn of Object.values(connections)) {
    if (nodeIds.has(conn.targetNodeId)) {
      inDegree.set(conn.targetNodeId, (inDegree.get(conn.targetNodeId) ?? 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const id of nodeIds) {
    if (inDegree.get(id) === 0) {
      queue.push(id);
    }
  }

  const result: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    result.push(id);
    for (const conn of Object.values(connections)) {
      if (conn.sourceNodeId === id) {
        const newDeg = (inDegree.get(conn.targetNodeId) ?? 1) - 1;
        inDegree.set(conn.targetNodeId, newDeg);
        if (newDeg === 0) {
          queue.push(conn.targetNodeId);
        }
      }
    }
  }

  return result;
}
