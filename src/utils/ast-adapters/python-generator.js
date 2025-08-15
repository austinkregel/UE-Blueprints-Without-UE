// IR -> Python code generator
// Supported IR nodes (minimal subset):
// - Program: { statements: IRNode[] }
// - Literals: { kind: 'int'|'float'|'string'|'bool'|'null', value }
// - Ident: { kind: 'ident', name }
// - Assign: { kind: 'assign', target: Ident, value: Expr }
// - Print:  { kind: 'print', value: Expr }
// - BinOp:  { kind: 'binop', op: string, left: Expr, right: Expr }
// - If:     { kind: 'if', cond: Expr, then: IRNode[], else?: IRNode[] }
// - ForRange: { kind: 'for_range', var: string, start: Expr, end: Expr, step?: Expr, body: IRNode[] }

export function generatePython(ir) {
  const lines = [];
  const emit = (s = '') => lines.push(s);

  function expr(e) {
    switch (e?.kind) {
      case 'int': return String(e.value|0);
      case 'float': return String(e.value);
      case 'string': return JSON.stringify(String(e.value));
      case 'bool': return e.value ? 'True' : 'False';
      case 'null': return 'None';
      case 'ident': return e.name;
      case 'array': return `[${(e.elements||[]).map(expr).join(', ')}]`;
      case 'map': {
        const pairs = (e.entries||[]).map(({ key, value }) => `${expr(key)}: ${expr(value)}`);
        return `{${pairs.join(', ')}}`;
      }
      case 'call': {
        const callee = typeof e.callee === 'string' ? e.callee : expr(e.callee);
        return `${callee}(${(e.args||[]).map(expr).join(', ')})`;
      }
      case 'binop': return `(${expr(e.left)} ${e.op} ${expr(e.right)})`;
      default:
        return 'None';
    }
  }

  function stmt(s, indent = '') {
    switch (s.kind) {
      case 'assign':
        emit(`${indent}${s.target.name} = ${expr(s.value)}`);
        break;
      case 'print':
        emit(`${indent}print(${expr(s.value)})`);
        break;
      case 'return':
        emit(`${indent}return${s.value ? ' ' + expr(s.value) : ''}`);
        break;
      case 'expr':
        emit(`${indent}${expr(s.value)}`);
        break;
      case 'function': {
        const params = (s.params||[]).join(', ');
        emit(`${indent}def ${s.name}(${params}):`);
        if (s.body?.length) s.body.forEach(n => stmt(n, indent + '    ')); else emit(indent + '    pass');
        break;
      }
      case 'if':
        emit(`${indent}if ${expr(s.cond)}:`);
        if (s.then?.length) s.then.forEach(n => stmt(n, indent + '    ')); else emit(indent + '    pass');
        if (s.else?.length) {
          emit(`${indent}else:`);
          s.else.forEach(n => stmt(n, indent + '    '));
        }
        break;
      case 'while':
        emit(`${indent}while ${expr(s.cond)}:`);
        if (s.body?.length) s.body.forEach(n => stmt(n, indent + '    ')); else emit(indent + '    pass');
        break;
      case 'foreach': {
        const v = s.var || 'item';
        emit(`${indent}for ${v} in ${expr(s.iterable)}:`);
        if (s.body?.length) s.body.forEach(n => stmt(n, indent + '    ')); else emit(indent + '    pass');
        break;
      }
      case 'for_range': {
        const start = expr(s.start);
        const end = expr(s.end);
        const step = s.step ? `, ${expr(s.step)}` : '';
        emit(`${indent}for ${s.var} in range(${start}, ${end}${step}):`);
        if (s.body?.length) s.body.forEach(n => stmt(n, indent + '    ')); else emit(indent + '    pass');
        break;
      }
      default:
        // unknown -> pass
        emit(indent + '# unsupported stmt');
    }
  }

  ir?.statements?.forEach(s => stmt(s));
  if (lines.length === 0) emit('pass');
  return lines.join('\n');
}
