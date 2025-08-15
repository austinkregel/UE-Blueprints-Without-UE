// PHP adapter: AST → IR
// Uses php-parser dynamically if installed; produces a simple IR compatible with ast-to-graph

import { createContext } from '../ast-ir.js';
import { createNodeFromDefinition, createFunctionNode, createVariableNode, createLiteralNode } from '../node-factory.js';
import { getNodeDefinition } from '../language-definition.js';

async function getPhpParser() {
  try {
    const mod = await import('php-parser');
    // Support various export shapes from php-parser
    if (mod && typeof mod.Engine === 'function') {
      return new mod.Engine({ parser: { extractDoc: true }, ast: { withPositions: true }, lexer: { all_tokens: true } });
    }
    if (mod?.default && typeof mod.default.Engine === 'function') {
      return new mod.default.Engine({ parser: { extractDoc: true }, ast: { withPositions: true }, lexer: { all_tokens: true } });
    }
    if (typeof mod === 'function') {
      // very old shape
      return new mod({ parser: { extractDoc: true }, ast: { withPositions: true }, lexer: { all_tokens: true } });
    }
    return null;
  } catch (e) {
    // Re-throw a tagged error so caller can surface a helpful warning
    const err = new Error(`Failed to load php-parser: ${e?.message || e}`);
    err.__phpParserLoadError = true;
    throw err;
  }
}

export async function phpToIr(phpCode, opts = {}) {
  let parser = null;
  const ctx = createContext(opts.start, opts.spacing);
  try {
    parser = await getPhpParser();
  } catch (e) {
    if (e?.__phpParserLoadError) {
      ctx.warnings.push(`${e.message}. If you just installed, restart dev server so Vite picks it up.`);
    } else {
      ctx.warnings.push('php-parser load error. Ensure it is installed and compatible.');
    }
    return ctx;
  }
  if (!parser) { ctx.warnings.push('php-parser not found at runtime. Ensure dependency is installed and bundled.'); return ctx; }
  let ast;
  try { ast = parser.parseCode(phpCode); } catch (e) { ctx.warnings.push(`PHP parse error: ${e.message}`); return ctx; }

  // Simple pass: turn echo into print node, literals into literal nodes, etc.
  for (const stmt of (ast.children || [])) {
    if (stmt.kind === 'echo') {
      const pos = ctx.nextPos(0, ctx.nodes.length);
      const printNode = createNodeFromDefinition('print', pos.x, pos.y) || createFunctionNode('print', [{ name: 'value', type: 'string' }], [], pos.x, pos.y);
      ctx.addNode(printNode);
      // Connect echo arguments to print input as literals when possible
      const args = stmt.arguments || stmt.expressions || [];
      for (const arg of args) {
        const aPos = ctx.nextPos(1, ctx.nodes.length);
        let kind = 'string';
        let val = '';
        if (arg.kind === 'string') { kind = 'string'; val = arg.value; }
        else if (arg.kind === 'number') { kind = (String(arg.value).includes('.') ? 'float' : 'int'); val = Number(arg.value); }
        else if (arg.kind === 'boolean') { kind = 'bool'; val = !!arg.value; }
  const lit = createLiteralNode(kind, val, aPos.x, aPos.y);
  ctx.addNode(lit);
  const outName = lit.outputs?.[0]?.name || 'value';
  ctx.addEdge(lit, outName, printNode, 'value');
  // Populate IR statements for code generators
  const valueExpr = kind === 'string'
    ? { kind: 'string', value: val }
    : kind === 'int'
      ? { kind: 'int', value: val }
      : kind === 'float'
        ? { kind: 'float', value: val }
        : kind === 'bool'
          ? { kind: 'bool', value: val }
          : { kind: 'string', value: String(val) };
  ctx.addStmt({ kind: 'print', value: valueExpr });
      }
    }
  }
  return ctx;
}
