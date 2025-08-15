// Language-agnostic intermediate representation (IR) for AST → graph lowering

export function createContext(start = { x: 100, y: 100 }, spacing = { x: 260, y: 140 }) {
  return {
    blocks: [],
    nodes: [],
    edges: [],
  statements: [],
    warnings: [],
    cursor: { x: start.x, y: start.y },
    spacing,
    addNode(node) { this.nodes.push(node); return node; },
    addEdge(from, fromOut, to, toIn) { this.edges.push({ from: { nodeId: from.id, output: fromOut }, to: { nodeId: to.id, input: toIn } }); },
  addStmt(stmt) { this.statements.push(stmt); return stmt; },
    nextPos(col = 0, row = 0) { return { x: this.cursor.x + col * this.spacing.x, y: this.cursor.y + row * this.spacing.y }; },
  };
}

export function createBlock(name = 'block') {
  return { name, first: null, last: null, nodes: [] };
}

export function attachExecChain(ctx, fromNode, toNode, fromOut = 'Exec', toIn = 'Exec') {
  if (!fromNode || !toNode) return;
  ctx.addEdge(fromNode, fromOut, toNode, toIn);
}
