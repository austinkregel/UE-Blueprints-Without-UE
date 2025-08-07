import {
  ioPositions,
  getIOPosition,
  moveNode,
  nodes,
  addNode,
  selectNode,
  closeSettings,
  updateNodeIO, deleteConnection, getNodeComponent, log, selectedNodeId, nextId
} from '../base-node-utils.js';
import { debugMode } from '../base-node-utils.js';
import { describe, it, vi, beforeEach, expect } from 'vitest';
import {connections} from "../connection-manager.js";

describe('getIOPosition', () => {
  beforeEach(() => {
    ioPositions.value = {
      1: {
        inputs: { a: { x: 10, y: 20 }, b: { x: 30, y: 40 } },
        outputs: { result: { x: 50, y: 60 } }
      },
      2: {
        inputs: {},
        outputs: { value: { x: 70, y: 80 } }
      }
    };
  });

  it('returns correct position for valid input', () => {
    expect(getIOPosition(1, 'input', 'a')).toEqual({ x: 10, y: 20 });
    expect(getIOPosition(1, 'input', 'b')).toEqual({ x: 30, y: 40 });
  });

  it('returns correct position for valid output', () => {
    expect(getIOPosition(1, 'output', 'result')).toEqual({ x: 50, y: 60 });
    expect(getIOPosition(2, 'output', 'value')).toEqual({ x: 70, y: 80 });
  });

  it('returns null for invalid nodeId', () => {
    expect(getIOPosition(999, 'input', 'a')).toBeNull();
  });

  it('returns null for invalid ioType', () => {
    expect(getIOPosition(1, 'invalidType', 'a')).toBeNull();
  });

  it('returns null for invalid ioName', () => {
    expect(getIOPosition(1, 'input', 'notExist')).toBeNull();
    expect(getIOPosition(1, 'output', 'notExist')).toBeNull();
  });
});

describe('moveNode', () => {
  beforeEach(() => {
    // Reset nodes to a known state
    nodes.value = [
      { id: 1, x: 10, y: 20 },
      { id: 2, x: 30, y: 40 }
    ];
  });

  it('updates the position of the correct node', () => {
    moveNode({ id: 1, x: 100, y: 200 });
    expect(nodes.value[0].x).toBe(100);
    expect(nodes.value[0].y).toBe(200);
    expect(nodes.value[1].x).toBe(30);
    expect(nodes.value[1].y).toBe(40);
  });

  it('does nothing if node id does not exist', () => {
    moveNode({ id: 999, x: 100, y: 200 });
    expect(nodes.value[0].x).toBe(10);
    expect(nodes.value[0].y).toBe(20);
    expect(nodes.value[1].x).toBe(30);
    expect(nodes.value[1].y).toBe(40);
  });
});

describe('addNode', () => {
  beforeEach(() => {
    nodes.value = [];
    nextId.value = 1;
  });

  it('adds a new function node with default properties', () => {
    addNode();
    expect(nodes.value.length).toBe(1);
    expect(nodes.value[0].type).toBe('function');
    expect(nodes.value[0].funcName).toBe('CustomFunction');
    expect(nodes.value[0].id).toBe(1);
  });

  it('increments nextId for each new node', () => {
    addNode();
    addNode();
    expect(nodes.value[0].id).toBe(1);
    expect(nodes.value[1].id).toBe(2);
  });
});

describe('selectNode and closeSettings', () => {
  it('selects a node by id', () => {
    selectNode({ id: 42 });
    expect(selectedNodeId.value).toBe(42);
  });

  it('closes settings and deselects node', () => {
    selectedNodeId.value = 99;
    closeSettings();
    expect(selectedNodeId.value).toBeNull();
  });
});

describe('updateNodeIO', () => {
  beforeEach(() => {
    nodes.value = [
      { id: 1, inputs: [{ name: 'a' }], outputs: [{ name: 'b' }] }
    ];
  });

  it('updates inputs and outputs for a node', () => {
    updateNodeIO({ id: 1, inputs: [{ name: 'x' }], outputs: [{ name: 'y' }] });
    expect(nodes.value[0].inputs).toEqual([{ name: 'x' }]);
    expect(nodes.value[0].outputs).toEqual([{ name: 'y' }]);
  });

  it('does nothing if node id does not exist', () => {
    updateNodeIO({ id: 999, inputs: [{ name: 'x' }], outputs: [{ name: 'y' }] });
    expect(nodes.value[0].inputs).toEqual([{ name: 'a' }]);
    expect(nodes.value[0].outputs).toEqual([{ name: 'b' }]);
  });
});

describe('deleteConnection', () => {
  beforeEach(() => {
    connections.value = [
      { from: { nodeId: 1, output: 'a' }, to: { nodeId: 2, input: 'b' } },
      { from: { nodeId: 3, output: 'x' }, to: { nodeId: 4, input: 'y' } }
    ];
  });

  it('removes the correct connection', () => {
    deleteConnection({ from: { nodeId: 1, output: 'a' }, to: { nodeId: 2, input: 'b' } });
    expect(connections.value.length).toBe(1);
    expect(connections.value[0].from.nodeId).toBe(3);
  });

  it('does nothing if no matching connection exists', () => {
    deleteConnection({ from: { nodeId: 99, output: 'z' }, to: { nodeId: 88, input: 'w' } });
    expect(connections.value.length).toBe(2);
  });
});

describe('getNodeComponent', () => {
  it('returns correct component for variable node', () => {
    expect(getNodeComponent({ type: 'variable' })).toBeDefined();
  });
  it('returns correct component for function node', () => {
    expect(getNodeComponent({ type: 'function' })).toBeDefined();
  });
  it('returns correct component for system node', () => {
    expect(getNodeComponent({ type: 'system' })).toBeDefined();
  });
  it('returns NodeBase for unknown type', () => {
    expect(getNodeComponent({ type: 'unknown' })).toBeDefined();
  });
});

describe('log', () => {
  it('logs when debugMode is true', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    debugMode.value = true;
    log('test', 123);
    expect(spy).toHaveBeenCalledWith('[DEBUG]', 'test', 123);
    spy.mockRestore();
  });

  it('does not log when debugMode is false', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    debugMode.value = false;
    log('test', 123);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
