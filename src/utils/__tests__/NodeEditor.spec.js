import { beforeEach, describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '../../App.vue';
import { createWorkspace, debugMode, nodes, selectedNodeId, workspaceState } from '../state.js';
import { resetViewport } from '../viewport-utils.js';

// The App only renders the NodeCanvas (and therefore any nodes/overlays) when
// there is an active workspace. These helpers create a fresh workspace holding a
// single node so there is something to select and drag, and reset all shared
// module-level state between tests so runs are independent.
function resetState() {
    // Clear workspaces / active workspace
    for (const key of Object.keys(workspaceState.workspaces)) {
        delete workspaceState.workspaces[key];
    }
    workspaceState.activeWorkspaceId = null;
    selectedNodeId.value = null;
    nodes.value = [];
    // Ensure viewport is identity (zoom 1, no offset) so client coordinates map
    // 1:1 to world coordinates and drag deltas are exact.
    resetViewport();
}

function makeNode(overrides = {}) {
    return {
        id: 'node1',
        type: 'function',
        funcName: 'Node 1',
        x: 100,
        y: 100,
        inputs: [],
        outputs: [],
        ...overrides
    };
}

// Create an active workspace whose nodes array is the same array bound to the
// global `nodes` ref, then mount the App so the canvas renders that node.
async function mountAppWithNode(node) {
    const wsNodes = [node];
    createWorkspace('test-workspace', { nodes: wsNodes });
    nodes.value = wsNodes;
    const wrapper = mount(App);
    await wrapper.vm.$nextTick();
    return wrapper;
}

beforeEach(() => {
    resetState();
});

describe('App click/drag interface', () => {
    it('allows node dragging with debugMode off', async () => {
        debugMode.value = false;
        const node = makeNode();
        const wrapper = await mountAppWithNode(node);

        const initialX = node.x;
        const initialY = node.y;

        const nodeWrapper = wrapper.find(`[data-node-id='${node.id}']`);
        expect(nodeWrapper.exists()).toBe(true);

        await nodeWrapper.trigger('mousedown', { button: 0, clientX: initialX, clientY: initialY });

        const deltaX = 50;
        const deltaY = 50;
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: initialX + deltaX, clientY: initialY + deltaY }));
        window.dispatchEvent(new MouseEvent('mouseup', { clientX: initialX + deltaX, clientY: initialY + deltaY }));
        await wrapper.vm.$nextTick();

        // Node should have moved by exactly the drag delta (world == client at zoom 1).
        expect(nodes.value[0].x).toBe(initialX + deltaX);
        expect(nodes.value[0].y).toBe(initialY + deltaY);
    });

    it('allows node dragging with debugMode on (SVG overlays present)', async () => {
        debugMode.value = true;
        const node = makeNode();
        const wrapper = await mountAppWithNode(node);

        const initialX = node.x;
        const initialY = node.y;

        const nodeWrapper = wrapper.find(`[data-node-id='${node.id}']`);
        expect(nodeWrapper.exists()).toBe(true);

        await nodeWrapper.trigger('mousedown', { button: 0, clientX: initialX, clientY: initialY });

        const deltaX = 50;
        const deltaY = 50;
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: initialX + deltaX, clientY: initialY + deltaY }));
        window.dispatchEvent(new MouseEvent('mouseup', { clientX: initialX + deltaX, clientY: initialY + deltaY }));
        await wrapper.vm.$nextTick();

        // Debug overlay group should be rendered when debugMode is on.
        const svg = wrapper.find('svg.connections');
        expect(svg.exists()).toBe(true);
        expect(svg.findAll('circle[pointer-events="none"]').length).toBeGreaterThan(0);

        // Node should still have moved by exactly the drag delta.
        expect(nodes.value[0].x).toBe(initialX + deltaX);
        expect(nodes.value[0].y).toBe(initialY + deltaY);
    });

    it('SVG debug overlays have pointer-events set to none', async () => {
        debugMode.value = true;
        const node = makeNode();
        const wrapper = await mountAppWithNode(node);

        // The connections SVG itself is non-interactive.
        const svg = wrapper.find('svg.connections');
        expect(svg.exists()).toBe(true);
        expect(svg.attributes('class')).toContain('pointer-events-none');

        // The per-node debug markers (a center circle + a coordinate label) are
        // rendered for each node and explicitly opt out of pointer events.
        const debugCircles = svg.findAll('circle[pointer-events="none"]');
        const debugTexts = svg.findAll('text[pointer-events="none"]');
        expect(debugCircles.length).toBeGreaterThan(0);
        expect(debugTexts.length).toBeGreaterThan(0);
    });

    it('moves node to the drag target position when dragged', async () => {
        debugMode.value = false;
        const node = makeNode();
        const wrapper = await mountAppWithNode(node);

        const nodeWrapper = wrapper.find(`[data-node-id='${node.id}']`);
        expect(nodeWrapper.exists()).toBe(true);

        const targetX = node.x + 30;
        const targetY = node.y + 40;

        await nodeWrapper.trigger('mousedown', { button: 0, clientX: node.x, clientY: node.y });
        window.dispatchEvent(new MouseEvent('mousemove', { clientX: targetX, clientY: targetY }));
        window.dispatchEvent(new MouseEvent('mouseup', { clientX: targetX, clientY: targetY }));
        await wrapper.vm.$nextTick();

        expect(nodes.value[0].x).toBe(targetX);
        expect(nodes.value[0].y).toBe(targetY);
    });

    it('does not move node if mouseup occurs without mousemove', async () => {
        debugMode.value = false;
        const node = makeNode();
        const wrapper = await mountAppWithNode(node);

        const initialX = node.x;
        const initialY = node.y;

        const nodeWrapper = wrapper.find(`[data-node-id='${node.id}']`);
        expect(nodeWrapper.exists()).toBe(true);

        await nodeWrapper.trigger('mousedown', { button: 0, clientX: initialX, clientY: initialY });
        window.dispatchEvent(new MouseEvent('mouseup', { clientX: initialX, clientY: initialY }));
        await wrapper.vm.$nextTick();

        expect(nodes.value[0].x).toBe(initialX);
        expect(nodes.value[0].y).toBe(initialY);
    });

    it('selects node on click', async () => {
        debugMode.value = false;
        const node = makeNode();
        const wrapper = await mountAppWithNode(node);

        // Clicking the node element selects it (NodeBase calls selectNode).
        const nodeWrapper = wrapper.find(`[data-node-id='${node.id}']`);
        expect(nodeWrapper.exists()).toBe(true);

        await nodeWrapper.trigger('click');
        await wrapper.vm.$nextTick();

        const selectedId = wrapper.vm.selectedNodeId?.value ?? wrapper.vm.selectedNodeId;
        expect(selectedId).toBe(node.id);
    });
});
