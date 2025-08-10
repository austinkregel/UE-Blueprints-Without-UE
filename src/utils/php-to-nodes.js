/**
 * PHP → Nodes importer (scaffold)
 *
 * Parses PHP code into a node graph compatible with this editor.
 * Uses `php-parser` if available. Falls back with a helpful error if not installed.
 *
 * npm install php-parser --save
 */

import { createNodeFromDefinition, createFunctionNode, createVariableNode } from './node-factory.js';
import { getNodeDefinition } from './language-definition.js';
import { getNextNodeId } from './id-utils.js';

// Map PHP binary operators to node definition IDs
const BIN_OP_MAP = {
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  '/': 'divide',
  '%': 'mod',
  '==': 'equals',
  '===': 'equals',
  '!=': 'not_equals',
  '!==': 'not_equals',
  '>': 'greater_than',
  '<': 'less_than',
  '>=': 'greater_or_equal',
  '<=': 'less_or_equal',
  '&&': 'and',
  '||': 'or'
};

// Attempt to load php-parser dynamically (works in ESM builds)
async function getPhpParser() {
  try {
    const mod = await import('php-parser');
    // Support multiple export shapes
    if (mod.Engine) return new mod.Engine({
      parser: { extractDoc: true },
      ast: { withPositions: true },
      lexer: { all_tokens: true }
    });
    if (mod.default?.Engine) return new mod.default.Engine({
      parser: { extractDoc: true },
      ast: { withPositions: true },
      lexer: { all_tokens: true }
    });
    // Older default export
    if (typeof mod === 'function') return new mod({
      parser: { extractDoc: true },
      ast: { withPositions: true },
      lexer: { all_tokens: true }
    });
  } catch (e) {
    return null;
  }
  return null;
}

/**
 * Public API: parse PHP into a nodes + connections graph
 */
export async function parsePhpToGraph(phpCode, { start = { x: 100, y: 100 }, spacing = { x: 260, y: 140 } } = {}) {
  const parser = await getPhpParser();
  if (!parser) {
    return {
      nodes: [],
      connections: [],
      warnings: [
        'php-parser not installed. Run: npm i php-parser',
      ],
      error: 'Missing php-parser dependency'
    };
  }

  let ast;
  try {
    ast = parser.parseCode(phpCode);
  } catch (e) {
    return { nodes: [], connections: [], warnings: [], error: `PHP parse error: ${e.message}` };
  }

  const ctx = createContext(start, spacing);
  visitProgram(ast, ctx);
  layoutNodes(ctx);
  return { nodes: ctx.nodes, connections: ctx.connections, warnings: ctx.warnings };
}

function createContext(start, spacing) {
  return {
    nodes: [],
    connections: [],
    warnings: [],
    cursor: { x: start.x, y: start.y },
    row: 0,
    col: 0,
    spacing,
    // helpers
    add(node) { this.nodes.push(node); return node; },
    connect(from, fromOut, to, toIn) {
      this.connections.push({ from: { nodeId: from.id, output: fromOut }, to: { nodeId: to.id, input: toIn } });
    },
    nextPos() {
      const pos = { x: this.cursor.x + this.col * this.spacing.x, y: this.cursor.y + this.row * this.spacing.y };
      this.col += 1;
      return pos;
    },
    newline() { this.row += 1; this.col = 0; }
  };
}

function layoutNodes(ctx) {
  // No-op for now, positions assigned during creation via nextPos()
}

function visitProgram(ast, ctx) {
  if (!ast || !ast.children) return;
  for (const node of ast.children) {
    visitNode(node, ctx);
    ctx.newline();
  }
}

function visitNode(node, ctx) {
  if (!node) return null;
  switch (node.kind) {
    case 'expressionstatement':
      return visitNode(node.expression, ctx);
    case 'assign':
      return handleAssign(node, ctx);
    case 'call':
      return handleCall(node, ctx);
    case 'bin':
      return handleBinary(node, ctx);
    case 'if':
      return handleIf(node, ctx);
    case 'return':
      return handleReturn(node, ctx);
    case 'echo':
      return handleEcho(node, ctx);
    case 'number':
    case 'string':
      return createLiteral(node, ctx);
    case 'variable':
      return handleVariableRead(node, ctx);
    default:
      ctx.warnings.push(`Unsupported PHP node kind: ${node.kind}`);
      return null;
  }
}

function createLiteral(node, ctx) {
  const type = node.kind === 'number' ? 'int' : 'string';
  const pos = ctx.nextPos();
  // Create a simple function node as a literal provider
  const lit = createFunctionNode('literal', [], [{ name: 'value', type }], pos.x, pos.y);
  // Attach value metadata (editor can render inline value later)
  lit.meta = { literal: node.value, type };
  return ctx.add(lit);
}

function handleVariableRead(node, ctx) {
  const name = node.name; // without $ symbol
  const pos = ctx.nextPos();
  const v = createVariableNode(name, 'mixed', 'get', pos.x, pos.y);
  return ctx.add(v);
}

function handleAssign(node, ctx) {
  const left = node.left; // variable
  const right = node.right; // expression
  const rightNode = visitNode(right, ctx);
  const pos = ctx.nextPos();
  const name = left?.name ?? `var_${getNextNodeId('tmp')}`;
  const setVar = createVariableNode(name, inferTypeFromAst(right) ?? 'mixed', 'set', pos.x, pos.y);
  ctx.add(setVar);
  if (rightNode) {
    // Connect expression value -> set variable input
    const fromOut = guessPrimaryOutput(rightNode) ?? 'value';
    ctx.connect(rightNode, fromOut, setVar, 'value');
  }
  return setVar;
}

function handleBinary(node, ctx) {
  const leftNode = visitNode(node.left, ctx);
  const rightNode = visitNode(node.right, ctx);
  const op = node.type; // operator string like '+', '=='
  const defId = BIN_OP_MAP[op] || null;
  const pos = ctx.nextPos();
  let binNode;
  if (defId && getNodeDefinition(defId)) {
    binNode = createNodeFromDefinition(defId, pos.x, pos.y);
  } else {
    // Fallback custom function node
    binNode = createFunctionNode(`binary_${op}`, [{ name: 'a', type: 'mixed' }, { name: 'b', type: 'mixed' }], [{ name: 'result', type: 'mixed' }], pos.x, pos.y);
  }
  ctx.add(binNode);
  if (leftNode) ctx.connect(leftNode, guessPrimaryOutput(leftNode) ?? 'value', binNode, firstInputName(binNode) ?? 'a');
  if (rightNode) ctx.connect(rightNode, guessPrimaryOutput(rightNode) ?? 'value', binNode, secondInputName(binNode) ?? 'b');
  return binNode;
}

function handleCall(node, ctx) {
  // Function name can be identifier or variable
  const fname = getName(node.what);
  const pos = ctx.nextPos();
  let callNode;
  // Try to map well-known functions
  const mapped = mapFunctionNameToNodeDef(fname);
  if (mapped) {
    callNode = createNodeFromDefinition(mapped, pos.x, pos.y);
  } else {
    callNode = createFunctionNode(fname || 'call', (node.arguments || []).map((_, i) => ({ name: `arg${i+1}`, type: 'mixed' })), [{ name: 'result', type: 'mixed' }], pos.x, pos.y);
  }
  ctx.add(callNode);

  // Connect arguments
  (node.arguments || []).forEach((arg, i) => {
    const argNode = visitNode(arg, ctx);
    if (!argNode) return;
    const toIn = inputNameAt(callNode, i) ?? `arg${i+1}`;
    ctx.connect(argNode, guessPrimaryOutput(argNode) ?? 'value', callNode, toIn);
  });
  return callNode;
}

function handleEcho(node, ctx) {
  // echo is like print
  const pos = ctx.nextPos();
  const printNode = createNodeFromDefinition('print', pos.x, pos.y) || createFunctionNode('print', [{ name: 'msg', type: 'string' }], [], pos.x, pos.y);
  ctx.add(printNode);
  (node.arguments || node.expressions || []).forEach((arg, i) => {
    const argNode = visitNode(arg, ctx);
    if (!argNode) return;
    ctx.connect(argNode, guessPrimaryOutput(argNode) ?? 'value', printNode, firstInputName(printNode) ?? 'msg');
  });
  return printNode;
}

function handleIf(node, ctx) {
  // Prefer exec 'branch' if available
  const pos = ctx.nextPos();
  const branchNode = createNodeFromDefinition('branch', pos.x, pos.y) || createFunctionNode('if', [{ name: 'Condition', type: 'bool' }], [{ name: 'True' }, { name: 'False' }], pos.x, pos.y);
  ctx.add(branchNode);

  // Condition
  const condNode = visitNode(node.test, ctx);
  if (condNode) {
    ctx.connect(condNode, guessPrimaryOutput(condNode) ?? 'value', branchNode, firstInputName(branchNode) ?? 'Condition');
  }
  // Then block and else block handling would require exec graph sequencing.
  // For now we just place them sequentially after and let the user wire exec outputs.
  (node.body?.children || []).forEach(stmt => visitNode(stmt, ctx));
  (node.alternate?.children || []).forEach(stmt => visitNode(stmt, ctx));
  return branchNode;
}

function handleReturn(node, ctx) {
  const exprNode = node.expr ? visitNode(node.expr, ctx) : null;
  const pos = ctx.nextPos();
  const ret = createFunctionNode('return', [{ name: 'value', type: 'mixed' }], [], pos.x, pos.y);
  ctx.add(ret);
  if (exprNode) ctx.connect(exprNode, guessPrimaryOutput(exprNode) ?? 'value', ret, 'value');
  return ret;
}

// Utilities
function getName(what) {
  if (!what) return null;
  if (what.kind === 'identifier') return what.name;
  if (what.kind === 'name') return what.name;
  if (what.kind === 'variable') return what.name;
  return null;
}

function inferTypeFromAst(node) {
  if (!node) return 'mixed';
  switch (node.kind) {
    case 'number': return 'int';
    case 'string': return 'string';
    case 'boolean': return 'bool';
    default: return 'mixed';
  }
}

function firstInputName(node) {
  return node.inputs?.[0]?.name || node.inputs?.[0] || null;
}
function secondInputName(node) {
  return node.inputs?.[1]?.name || node.inputs?.[1] || null;
}
function inputNameAt(node, i) {
  return node.inputs?.[i]?.name || node.inputs?.[i] || null;
}
function guessPrimaryOutput(node) {
  // Try a few common names
  const outs = node.outputs || [];
  if (outs.length === 0) return null;
  const names = outs.map(o => (o.name || o)).map(n => n?.toLowerCase?.() || n);
  const idx = names.findIndex(n => ['result', 'out', 'value'].includes(n));
  return idx >= 0 ? (node.outputs[idx].name || node.outputs[idx]) : (node.outputs[0].name || node.outputs[0]);
}

/**
 * Convenience: import into the editor state
 * You can call this from a UI action and push nodes/connections into store
 */
export async function importPhpIntoEditor(phpCode, { start, spacing, pushNode, pushConnection } = {}) {
  const { nodes, connections, warnings, error } = await parsePhpToGraph(phpCode, { start, spacing });
  if (error) return { warnings, error };
  if (typeof pushNode === 'function') nodes.forEach(pushNode);
  if (typeof pushConnection === 'function') connections.forEach(pushConnection);
  return { count: { nodes: nodes.length, connections: connections.length }, warnings };
}
