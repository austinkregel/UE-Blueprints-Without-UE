import { describe, it, beforeEach, expect, vi } from 'vitest';
import * as systemNodeUtils from '../system-node-utils';
import { nodes } from '../base-node-utils';

// Mock getNextNodeId to return predictable values
vi.mock('../id-utils', () => ({
  getNextNodeId: vi.fn(() => 77)
}));

describe('addSystemNode', () => {
  beforeEach(() => {
    nodes.value = [];
  });

  it('adds a system node with correct properties', () => {
    systemNodeUtils.addSystemNode();
    expect(nodes.value.length).toBe(1);
    const node = nodes.value[0];
    expect(node).toMatchObject({
      id: 77,
      type: 'system',
      systemName: 'mySystem',
      x: 500,
      y: 300,
      inputs: [],
      outputs: []
    });
  });
});

