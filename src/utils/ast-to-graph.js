// Lower language-agnostic IR into editor graph nodes/connections
import { createNodeFromDefinition, createFunctionNode } from './node-factory.js';

export function lowerIrToGraph(ir, { start = { x: 100, y: 100 } } = {}) {
  const nodes = [];
  const connections = [];

  const add = (n) => { nodes.push(n); return n; };
  const connect = (from, out, to, input) => connections.push({ from: { nodeId: from.id, output: out }, to: { nodeId: to.id, input } });

  // For now, assume ir.nodes already contain concrete node shapes.
  // Future: translate abstract ops to language-definition ids here.
  ir.nodes?.forEach(n => nodes.push(n));
  ir.edges?.forEach(e => connections.push(e));

  return { nodes, connections, warnings: ir.warnings || [] };
}
