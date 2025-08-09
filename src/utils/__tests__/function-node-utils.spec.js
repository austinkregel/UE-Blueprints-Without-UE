import { describe, it, beforeEach, expect, vi } from 'vitest';
import * as functionNodeUtils from '../function-node-utils.js';
import { nodes, nextId } from '../base-node-utils.js';
import { log } from '../base-node-utils.js';

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
    nextId.value = 1;
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
      x: 300,
      y: 300,
      inputs: [],
      outputs: []
    });
  });

  it('calls log with correct arguments', () => {
    functionNodeUtils.addFunctionNode();
    expect(log).toHaveBeenCalledWith(
      'Function node added',
      expect.objectContaining({
        funcName: 'myAction',
        type: 'function',
        x: 300,
        y: 300,
        inputs: [],
        outputs: []
      })
    );
  });
});
