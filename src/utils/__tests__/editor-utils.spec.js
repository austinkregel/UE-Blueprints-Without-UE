import { describe, it, beforeEach, expect, vi } from 'vitest';
import * as editorUtils from '../editor-utils.js';
import { nodes, draggingConnection, ioPositions } from '../base-node-utils.js';
import { connectNodes } from '../connection-utils.js';

vi.mock('../connection-utils', () => ({
  connectNodes: vi.fn()
}));
vi.mock('../base-node-utils');

describe('onEditorMouseDown', () => {
  let getBoundingClientRectMock;
  beforeEach(() => {
    nodes.value = [
      { id: 1, inputs: [{ name: 'a' }], outputs: [{ name: 'out' }], x: 10, y: 10 },
      { id: 2, inputs: [{ name: 'b' }], outputs: [{ name: 'out2' }], x: 100, y: 100 }
    ];
    connectNodes.mockClear();
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
      ioType: 'output',
      nodeId: 1,
      ioName: 'out',
      from: { nodeId: 1, output: 'out' }
    };
    const event = { clientX: 95, clientY: 95 };
    editorUtils.onEditorMouseDown(event);
    expect(connectNodes).toHaveBeenCalledWith({
      from: { nodeId: 1, output: 'out' },
      to: { nodeId: '2', input: 'b' }
    });
  });

  it('connects input to output when mouse is over a node', () => {
    draggingConnection.value = {
      ioType: 'input',
      nodeId: 2,
      ioName: 'b',
      from: { nodeId: 2, input: 'b' }
    };
    const event = { clientX: 20, clientY: 20 };
    editorUtils.onEditorMouseDown(event);
    expect(connectNodes).toHaveBeenCalledWith({
      from: { nodeId: '1', output: 'out' },
      to: { nodeId: 2, input: 'b' }
    });
  });

  it('does nothing if not over a node', () => {
    draggingConnection.value = {
      ioType: 'output',
      nodeId: 1,
      ioName: 'out',
      from: { nodeId: 1, output: 'out' }
    };
    const event = { clientX: 200, clientY: 200 };
    editorUtils.onEditorMouseDown(event);
    expect(connectNodes).not.toHaveBeenCalled();
  });
});
