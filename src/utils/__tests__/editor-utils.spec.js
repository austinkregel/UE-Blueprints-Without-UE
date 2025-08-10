import { describe, it, beforeEach, expect, vi } from 'vitest';
import { nodes, draggingConnection, ioPositions } from '../state.js';
import { connectNodes } from '../connection-utils.js';
import { onEditorMouseDown } from '../editor-utils.js';

vi.mock('../connection-utils', () => ({
  connectNodes: vi.fn()
}));

describe('onEditorMouseDown', () => {
  let getBoundingClientRectMock;
  beforeEach(() => {
    nodes.value = [
      { id: 1, inputs: [{ name: 'a' }], outputs: [{ name: 'out' }], x: 10, y: 10 },
      { id: 2, inputs: [{ name: 'b' }], outputs: [{ name: 'out2' }], x: 100, y: 100 }
    ];
    connectNodes.mockClear();
    
    // Mock DOM methods that are called in editor-utils
    global.document = {
      querySelector: vi.fn(),
      querySelectorAll: vi.fn(() => []),
      elementFromPoint: vi.fn()
    };
    
    // Mock target with closest method
    const mockTarget = {
      closest: vi.fn()
    };
    
    global.mockTarget = mockTarget;
    
    // Mock ioPositions for both nodes
    ioPositions.value = {
      1: {
        inputs: { a: { x: 10, y: 10 } },
        outputs: { out: { x: 20, y: 20 } }
      },
      2: {
        inputs: { b: { x: 100, y: 100 } },
        outputs: { out2: { x: 100, y: 100 } }
      }
    };
    getBoundingClientRectMock = vi.fn()
      .mockReturnValueOnce({ left: 0, right: 50, top: 0, bottom: 50 })
      .mockReturnValueOnce({ left: 90, right: 150, top: 90, bottom: 150 });
    global.document.querySelector = vi.fn(() => ({ getBoundingClientRect: getBoundingClientRectMock }));
  });

  it('connects output to input when mouse is over a node', () => {
    draggingConnection.value = {
      type: 'output', // ensure editor-utils sees correct type
      ioType: 'output',
      nodeId: 1,
      ioName: 'out',
      from: { nodeId: 1, output: 'out' }
    };
    
    // Mock the event with target that has closest method
    const mockNodeElement = { getAttribute: vi.fn(() => '2') };
    global.mockTarget.closest.mockReturnValue(mockNodeElement);
    
    const event = { 
      clientX: 95, 
      clientY: 95,
      target: global.mockTarget
    };
    
    onEditorMouseDown(event);
    expect(connectNodes).toHaveBeenCalledWith({
      from: { nodeId: 1, output: 'out' },
      to: { nodeId: 2, input: 'b' }
    });
  });

  it('connects input to output when mouse is over a node', () => {
    draggingConnection.value = {
      type: 'input',
      ioType: 'input',
      nodeId: 2,
      ioName: 'b',
      to: { nodeId: 2, input: 'b' }
    };
    
    // Mock the event with target that has closest method
    const mockNodeElement = { getAttribute: vi.fn(() => '1') };
    global.mockTarget.closest.mockReturnValue(mockNodeElement);
    
    const event = { 
      clientX: 20, 
      clientY: 20,
      target: global.mockTarget
    };
    
    onEditorMouseDown(event);
    expect(connectNodes).toHaveBeenCalledWith({
      from: { nodeId: 1, output: 'out' },
      to: { nodeId: 2, input: 'b' }
    });
  });

  it('does nothing if not over a node', () => {
    draggingConnection.value = {
      type: 'output',
      ioType: 'output',
      nodeId: 1,
      ioName: 'out',
      from: { nodeId: 1, output: 'out' }
    };
    
    // Mock the event with target that returns null for closest (not over a node)
    global.mockTarget.closest.mockReturnValue(null);
    
    const event = { 
      clientX: 200, 
      clientY: 200,
      target: global.mockTarget
    };
    
    onEditorMouseDown(event);
    expect(connectNodes).not.toHaveBeenCalled();
  });
});

describe('editor utils', () => {
  it('dummy', () => {
    expect(true).toBe(true);
  });
});
