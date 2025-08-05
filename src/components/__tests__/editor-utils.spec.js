import { describe, it, beforeEach, expect, vi } from 'vitest';
import * as editorUtils from '../editor-utils';
import { nodes, draggingConnection } from '../base-node-utils';
import { connectNodes } from '../connection-utils';
import { log } from '../base-node-utils';

vi.mock('../connection-utils', () => ({
  connectNodes: vi.fn()
}));
vi.mock('../base-node-utils', async () => {
  const actual = await vi.importActual('../base-node-utils');
  return {
    ...actual,
    log: vi.fn()
  };
});

describe('onEditorMouseDown', () => {
  let getBoundingClientRectMock;
  beforeEach(() => {
    nodes.value = [
      { id: 1, inputs: [{ name: 'a' }], outputs: [{ name: 'out' }], x: 10, y: 10 },
      { id: 2, inputs: [{ name: 'b' }], outputs: [{ name: 'out2' }], x: 100, y: 100 }
    ];
    draggingConnection.value = {
      type: 'output',
      from: { nodeId: 1, output: 'out' },
      to: { nodeId: 2, input: 'b' }
    };
    connectNodes.mockClear();
    log.mockClear();
    // Mock DOM
    getBoundingClientRectMock = vi.fn()
      .mockReturnValueOnce({ left: 0, right: 50, top: 0, bottom: 50 })
      .mockReturnValueOnce({ left: 90, right: 150, top: 90, bottom: 150 });
    global.document.querySelector = vi.fn(() => ({ getBoundingClientRect: getBoundingClientRectMock }));
  });

  it('connects output to input when mouse is over a node', () => {
    const event = { clientX: 95, clientY: 95 };
    editorUtils.onEditorMouseDown(event);
    expect(connectNodes).toHaveBeenCalledWith({
      from: { nodeId: 1, output: 'out' },
      to: { nodeId: 2, input: 'b' }
    });
  });

  it('does nothing if not over a node', () => {
    const event = { clientX: 200, clientY: 200 };
    editorUtils.onEditorMouseDown(event);
    expect(connectNodes).not.toHaveBeenCalled();
  });

  it('logs connection attempts', () => {
    const event = { clientX: 95, clientY: 95 };
    editorUtils.onEditorMouseDown(event);
    expect(log).toHaveBeenCalled();
  });
});
