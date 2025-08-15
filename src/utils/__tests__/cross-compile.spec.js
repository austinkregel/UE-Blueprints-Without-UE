import { describe, it, expect } from 'vitest';
import { generatePython } from '../ast-adapters/python-generator.js';
import { generateElixir } from '../ast-adapters/elixir-generator.js';

const sampleIR = {
  statements: [
    { kind: 'assign', target: { kind: 'ident', name: 'x' }, value: { kind: 'int', value: 1 } },
    { kind: 'assign', target: { kind: 'ident', name: 'y' }, value: { kind: 'binop', op: '+', left: { kind: 'ident', name: 'x' }, right: { kind: 'int', value: 2 } } },
    { kind: 'assign', target: { kind: 'ident', name: 'arr' }, value: { kind: 'array', elements: [ { kind: 'int', value: 1 }, { kind: 'int', value: 2 } ] } },
    { kind: 'assign', target: { kind: 'ident', name: 'm' }, value: { kind: 'map', entries: [ { key: { kind: 'string', value: 'k' }, value: { kind: 'int', value: 3 } } ] } },
    { kind: 'if', cond: { kind: 'binop', op: '>', left: { kind: 'ident', name: 'y' }, right: { kind: 'int', value: 2 } }, then: [ { kind: 'print', value: { kind: 'string', value: 'ok' } } ] },
    { kind: 'for_range', var: 'i', start: { kind: 'int', value: 0 }, end: { kind: 'int', value: 3 }, body: [ { kind: 'print', value: { kind: 'ident', name: 'i' } } ] },
    { kind: 'foreach', var: 'v', iterable: { kind: 'ident', name: 'arr' }, body: [ { kind: 'print', value: { kind: 'ident', name: 'v' } } ] },
    { kind: 'while', cond: { kind: 'binop', op: '<', left: { kind: 'ident', name: 'x' }, right: { kind: 'int', value: 3 } }, body: [ { kind: 'assign', target: { kind: 'ident', name: 'x' }, value: { kind: 'binop', op: '+', left: { kind: 'ident', name: 'x' }, right: { kind: 'int', value: 1 } } } ] },
    { kind: 'function', name: 'f', params: ['a','b'], body: [ { kind: 'return', value: { kind: 'binop', op: '+', left: { kind: 'ident', name: 'a' }, right: { kind: 'ident', name: 'b' } } } ] },
    { kind: 'expr', value: { kind: 'call', callee: 'f', args: [ { kind: 'int', value: 1 }, { kind: 'int', value: 2 } ] } },
  ]
};

describe('Cross-compile IR to Python and Elixir', () => {
  it('generates valid-looking Python code', () => {
    const py = generatePython(sampleIR);
    expect(py).toContain('x = 1');
    expect(py).toContain('y = (x + 2)');
    expect(py).toContain('if (y > 2):');
    expect(py).toContain('for i in range(0, 3):');
  expect(py).toContain('arr = [1, 2]');
  expect(py).toMatch(/for v in arr:/);
  expect(py).toMatch(/while \(x < 3\):/);
  expect(py).toContain('def f(a, b):');
  expect(py).toContain('return (a + b)');
  expect(py).toMatch(/f\(1, 2\)/);
  });

  it('generates valid-looking Elixir code', () => {
    const ex = generateElixir(sampleIR);
    expect(ex).toContain('x = 1');
    expect(ex).toContain('(y > 2)');
    expect(ex).toContain('if (y > 2) do');
    expect(ex).toMatch(/Enum\.each/);
  expect(ex).toContain('arr = [1, 2]');
  expect(ex).toMatch(/Enum\.each\(arr, fn v ->/);
  expect(ex).toContain('def f(a, b) do');
  expect(ex).toContain('(a + b)');
  });
});
