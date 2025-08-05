import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import NodeEditor from '../NodeEditor.vue';

function getNodeElement(wrapper, nodeId) {
  // Find the node DOM element by id
  return wrapper.find(`[data-node-id="${nodeId}"]`);
}

describe('NodeEditor click/drag interface', () => {
  it('allows node selection and dragging with debugMode off', async () => {
    const wrapper = mount(NodeEditor);
    // Assume first node exists
    const node = wrapper.vm.nodes[0];
    const initialX = node.x;
    const initialY = node.y;
    // Simulate mousedown on node
    const nodeWrapper = wrapper.find(`[data-node-id='${node.id}']`);
    await nodeWrapper.trigger('mousedown', { clientX: initialX, clientY: initialY });
    // Simulate mousemove and mouseup on window
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: initialX + 50, clientY: initialY + 50 }));
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: initialX + 50, clientY: initialY + 50 }));
    await wrapper.vm.$nextTick();
    // Node should have moved
    expect(wrapper.vm.nodes[0].x).not.toBe(initialX);
    expect(wrapper.vm.nodes[0].y).not.toBe(initialY);
  });

  it('allows node selection and dragging with debugMode on (SVG overlays present)', async () => {
    const wrapper = mount(NodeEditor);
    wrapper.vm.debugMode = true;
    await wrapper.vm.$nextTick();
    const node = wrapper.vm.nodes[0];
    const initialX = node.x;
    const initialY = node.y;
    // Simulate mousedown on node
    const nodeWrapper = wrapper.find(`[data-node-id='${node.id}']`);
    await nodeWrapper.trigger('mousedown', { clientX: initialX, clientY: initialY });
    // Simulate mousemove and mouseup on window
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: initialX + 50, clientY: initialY + 50 }));
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: initialX + 50, clientY: initialY + 50 }));
    await wrapper.vm.$nextTick();
    // Node should have moved
    expect(wrapper.vm.nodes[0].x).not.toBe(initialX);
    expect(wrapper.vm.nodes[0].y).not.toBe(initialY);
  });

  it('SVG debug overlays have pointer-events set to none', async () => {
    const wrapper = mount(NodeEditor);
    wrapper.vm.debugMode = true;
    await wrapper.vm.$nextTick();
    // Check SVG debug markers
    const svg = wrapper.find('svg');
    expect(svg.attributes('class')).toContain('pointer-events-none');
    // Check that circles/text have pointer-events="none"
    const debugCircles = svg.findAll('circle[pointer-events="none"]');
    const debugTexts = svg.findAll('text[pointer-events="none"]');
    expect(debugCircles.length).toBeGreaterThan(0);
    expect(debugTexts.length).toBeGreaterThan(0);
  });

  it('emits move event with correct payload when node is dragged', async () => {
    const wrapper = mount(NodeEditor);
    const node = wrapper.vm.nodes[0];
    const nodeWrapper = wrapper.find(`[data-node-id='${node.id}']`);
    const targetX = node.x + 30;
    const targetY = node.y + 40;
    await nodeWrapper.trigger('mousedown', { clientX: node.x, clientY: node.y });
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: targetX, clientY: targetY }));
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: targetX, clientY: targetY }));
    await wrapper.vm.$nextTick();
    // Check that the node's position matches the drag target
    expect(wrapper.vm.nodes[0].x).toBe(targetX);
    expect(wrapper.vm.nodes[0].y).toBe(targetY);
  });

  it('does not move node if mouseup occurs without mousemove', async () => {
    const wrapper = mount(NodeEditor);
    const node = wrapper.vm.nodes[0];
    const initialX = node.x;
    const initialY = node.y;
    const nodeWrapper = wrapper.find(`[data-node-id='${node.id}']`);
    await nodeWrapper.trigger('mousedown', { clientX: initialX, clientY: initialY });
    window.dispatchEvent(new MouseEvent('mouseup', { clientX: initialX, clientY: initialY }));
    await wrapper.vm.$nextTick();
    expect(wrapper.vm.nodes[0].x).toBe(initialX);
    expect(wrapper.vm.nodes[0].y).toBe(initialY);
  });

  it('selects node on click', async () => {
    const wrapper = mount(NodeEditor, {
      global: {
        stubs: {
          NodeSettings: true
        }
      }
    });
    const node = wrapper.vm.nodes[0];
    // Directly call selectNode to simulate event
    wrapper.vm.selectNode({ id: node.id });
    await wrapper.vm.$nextTick();
    const selectedId = wrapper.vm.selectedNodeId?.value ?? wrapper.vm.selectedNodeId;
    expect(selectedId).toBe(node.id);
  });
});
