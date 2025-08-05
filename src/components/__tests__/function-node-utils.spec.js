import { describe, it, beforeEach, expect, vi } from 'vitest';
import * as functionNodeUtils from '../function-node-utils';
import { nodes, nextId } from '../base-node-utils';
import { log } from '../base-node-utils';

vi.mock('../base-node-utils', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    log: vi.fn(),
    getNextNodeId: vi.fn(() => 'function-100'), // Provide a mock implementation
  };
});

describe('addFunctionNode', () => {
  beforeEach(() => {
    nodes.value = [];
    log.mockClear();
  });

  it('adds a function node with correct properties', () => {
    functionNodeUtils.addFunctionNode();
    expect(nodes.value.length).toBe(1);
    const node = nodes.value[0];
    expect(node).toMatchObject({
      id: 'function-100', // Updated to match the string ID format
      type: 'function',
      funcName: 'myAction',
      hasExec: true,
      x: 300,
      y: 300,
      inputs: [ { name: 'Exec', type: 'Exec' } ],
      outputs: [ { name: 'Exec', type: 'Exec' } ]
    });
  });

  it('calls log with correct arguments', () => {
    functionNodeUtils.addFunctionNode();
    expect(log).toHaveBeenCalledWith(
      'Function node added',
      expect.objectContaining({
        funcName: 'myAction',
        type: 'function',
        hasExec: true,
        x: 300,
        y: 300,
        inputs: [ { name: 'Exec', type: 'Exec' } ],
        outputs: [ { name: 'Exec', type: 'Exec' } ]
      })
    );
  });
});
