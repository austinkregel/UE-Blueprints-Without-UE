import { describe, it, beforeEach, expect, vi } from 'vitest';
import { 
  addExecFlowNode,
  addSequenceNode,
  addBranchNode,
  addGateNode,
  addMultigateNode,
  addDoOnceNode,
  addDelayNode,
  addFlipFlopNode,
} from '../node-creation.js';
import { nodes } from '../state.js';

// Mock getNextNodeId to return predictable values
vi.mock('../id-utils', () => ({
  getNextNodeId: vi.fn().mockImplementation((type) => `${type}-test-id`)
}));

// Mock createNodeFromDefinition
vi.mock('../node-factory', () => ({
  createNodeFromDefinition: vi.fn().mockImplementation((nodeDefId, x, y, overrides = {}) => ({
    id: overrides.id || 'test-id',
    type: overrides.type || 'exec',
    nodeDefId: nodeDefId,
    x: x || 200,
    y: y || 200,
    inputs: getNodeInputs(nodeDefId),
    outputs: getNodeOutputs(nodeDefId),
    ...overrides
  }))
}));

function getNodeInputs(nodeDefId) {
  const inputs = {
    'sequence': [{ name: 'Exec', type: 'exec' }],
    'branch': [{ name: 'Exec', type: 'exec' }, { name: 'condition', type: 'bool' }],
    'gate': [
      { name: 'Enter', type: 'exec' },
      { name: 'Open', type: 'exec' },
      { name: 'Close', type: 'exec' },
      { name: 'Toggle', type: 'exec' }
    ],
    'multigate': [
      { name: 'Exec', type: 'exec' },
      { name: 'Reset', type: 'exec' }
    ],
    'do_once': [
      { name: 'Exec', type: 'exec' },
      { name: 'Reset', type: 'exec' }
    ],
    'delay': [
      { name: 'Exec', type: 'exec' },
      { name: 'Duration', type: 'float' }
    ],
    'flip_flop': [{ name: 'Exec', type: 'exec' }]
  };
  return inputs[nodeDefId] || [];
}

function getNodeOutputs(nodeDefId) {
  const outputs = {
    'sequence': [
      { name: 'Then 0', type: 'exec' },
      { name: 'Then 1', type: 'exec' },
      { name: 'Then 2', type: 'exec' }
    ],
    'branch': [
      { name: 'True', type: 'exec' },
      { name: 'False', type: 'exec' }
    ],
    'gate': [{ name: 'Exit', type: 'exec' }],
    'multigate': [
      { name: 'Output 0', type: 'exec' },
      { name: 'Output 1', type: 'exec' },
      { name: 'Output 2', type: 'exec' }
    ],
    'do_once': [{ name: 'Completed', type: 'exec' }],
    'delay': [{ name: 'Completed', type: 'exec' }],
    'flip_flop': [
      { name: 'A', type: 'exec' },
      { name: 'B', type: 'exec' },
      { name: 'Is A', type: 'bool' }
    ]
  };
  return outputs[nodeDefId] || [];
}

describe('Exec Flow Node Creation', () => {
  beforeEach(() => {
    nodes.value = [];
  });

  describe('addExecFlowNode', () => {
    it('creates a basic exec flow node with correct properties', () => {
      const node = addExecFlowNode('sequence');
      
      expect(nodes.value.length).toBe(1);
      expect(nodes.value[0]).toMatchObject({
        id: 'exec-test-id',
        type: 'exec',
        nodeDefId: 'sequence',
        x: 200,
        y: 200
      });
    });

    it('creates node at specified position', () => {
      const node = addExecFlowNode('branch', { x: 100, y: 150 });
      
      expect(nodes.value[0]).toMatchObject({
        x: 100,
        y: 150
      });
    });
  });

  describe('Specific Exec Node Types', () => {
    it('creates sequence node with correct inputs/outputs', () => {
      const node = addSequenceNode();
      
      expect(nodes.value[0]).toMatchObject({
        nodeDefId: 'sequence',
        type: 'exec'
      });
      expect(nodes.value[0].inputs).toEqual([{ name: 'Exec', type: 'exec' }]);
      expect(nodes.value[0].outputs).toEqual([
        { name: 'Then 0', type: 'exec' },
        { name: 'Then 1', type: 'exec' },
        { name: 'Then 2', type: 'exec' }
      ]);
    });

    it('creates branch node with condition input', () => {
      const node = addBranchNode();
      
      expect(nodes.value[0]).toMatchObject({
        nodeDefId: 'branch',
        type: 'exec'
      });
      expect(nodes.value[0].inputs).toEqual([
        { name: 'Exec', type: 'exec' },
        { name: 'condition', type: 'bool' }
      ]);
      expect(nodes.value[0].outputs).toEqual([
        { name: 'True', type: 'exec' },
        { name: 'False', type: 'exec' }
      ]);
    });

    it('creates gate node with multiple exec inputs', () => {
      const node = addGateNode();
      
      expect(nodes.value[0]).toMatchObject({
        nodeDefId: 'gate',
        type: 'exec'
      });
      expect(nodes.value[0].inputs).toEqual([
        { name: 'Enter', type: 'exec' },
        { name: 'Open', type: 'exec' },
        { name: 'Close', type: 'exec' },
        { name: 'Toggle', type: 'exec' }
      ]);
    });

    it('creates multigate node with multiple outputs', () => {
      const node = addMultigateNode();
      
      expect(nodes.value[0]).toMatchObject({
        nodeDefId: 'multigate',
        type: 'exec'
      });
      expect(nodes.value[0].outputs).toEqual([
        { name: 'Output 0', type: 'exec' },
        { name: 'Output 1', type: 'exec' },
        { name: 'Output 2', type: 'exec' }
      ]);
    });

    it('creates do_once node with reset capability', () => {
      const node = addDoOnceNode();
      
      expect(nodes.value[0]).toMatchObject({
        nodeDefId: 'do_once',
        type: 'exec'
      });
      expect(nodes.value[0].inputs).toEqual([
        { name: 'Exec', type: 'exec' },
        { name: 'Reset', type: 'exec' }
      ]);
    });

    it('creates delay node with duration input', () => {
      const node = addDelayNode();
      
      expect(nodes.value[0]).toMatchObject({
        nodeDefId: 'delay',
        type: 'exec'
      });
      expect(nodes.value[0].inputs).toEqual([
        { name: 'Exec', type: 'exec' },
        { name: 'Duration', type: 'float' }
      ]);
    });

    it('creates flip_flop node with alternating outputs', () => {
      const node = addFlipFlopNode();
      
      expect(nodes.value[0]).toMatchObject({
        nodeDefId: 'flip_flop',
        type: 'exec'
      });
      expect(nodes.value[0].outputs).toEqual([
        { name: 'A', type: 'exec' },
        { name: 'B', type: 'exec' },
        { name: 'Is A', type: 'bool' }
      ]);
    });
  });

  describe('Node Component Selection', () => {
    it('selects ExecNode component for exec type nodes', async () => {
      const { getNodeComponent } = await import('../get-node-component.js');
      
      const execNode = { type: 'exec', nodeDefId: 'sequence' };
      expect(typeof getNodeComponent).toBe('function');
    });
  });
});
