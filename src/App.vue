<template>
    <div class="blueprints-app flex h-full w-full flex-col">
        <!-- Command bar -->
        <div class="shrink-0">
            <TopToolbar
                :debug-mode="debugMode"
                :execution-summary="executionSummary"
                :is-executing="isExecuting"
                :show-node-palette="showNodePalette"
                :viewport="viewport"
                @toggle-palette="showNodePalette = !showNodePalette"
                @toggle-debug="debugMode = !debugMode"
                @reset-viewport="resetViewport"
                @run-graph="executeGraph"
                @stop-execution="stopExecution"
                @clear-results="clearExecutionResults"
                @create-test-graph="createTestGraph"
                @open-entry-points="showEntryPointManager = true"
                @add-node-from-dropdown="(nodeId) => addNodeFromDefinition(nodeId, screenToWorldPosition({ x: 200, y: 200 }))"
                @open-project="openProject"
            />
        </div>

        <!-- Main Content: project explorer | canvas | right log | inspector -->
        <div class="flex min-h-0 flex-1 overflow-hidden">
            <!-- Project Explorer (left, resizable) -->
            <div class="shrink-0" :style="{ width: leftWidth + 'px' }">
                <ProjectExplorer :tree="projectTree" @open-project="openProject" @add-node="onOutlineAddNode" />
            </div>
            <div class="bp-resize" @mousedown.prevent="startResize('left', $event)"></div>

            <!-- Canvas Area (no overlapping controls) -->
            <NodeCanvas
                v-if="activeWorkspace"
                :debug-mode="debugMode"
                class="flex-1"
                @context-menu="onContextMenu"
                @drop-node="onDrop"
                @node-context-menu="onNodeContextMenu"
                @deselect="onDeselect"
                @update-outputs="handleUpdateOutputs"
            />
            <div v-else class="node-canvas-surface flex flex-1 items-center justify-center overflow-hidden" style="color: var(--ink-3)">
                <p class="text-lg">No active workspace. Create or open a workspace to start.</p>
            </div>

            <!-- Execution Log Panel (right, non-overlapping) -->
            <ExecutionLog :logs="executionLog" @clear="clearExecutionResults" />

            <!-- Palette drawer (toggled; hidden by default so the inspector is the right panel) -->
            <div v-show="showNodePalette" class="bp-panel right w-86 shrink-0 overflow-y-auto">
                <NodePalette @node-drag-start="onNodeDragStart" @node-select="onNodeSelect" />
            </div>

            <!-- Inspector (the primary right panel, resizable) -->
            <div class="bp-resize" @mousedown.prevent="startResize('right', $event)"></div>
            <div class="bp-panel right shrink-0 overflow-y-auto" :style="{ width: rightWidth + 'px' }">
                <NodeSettings />
            </div>
        </div>

        <!-- Status bar -->
        <footer class="bp-status shrink-0">
            <span class="s"><i class="dot" :class="isExecuting ? 'warn' : 'ok'"></i>{{ isExecuting ? 'Running' : 'Ready' }}</span>
            <span class="s mono">{{ nodes.length }} nodes</span>
            <span v-if="issueCount" class="s" style="color: var(--warn)">⚠ {{ issueCount }} issue{{ issueCount === 1 ? '' : 's' }}</span>
            <span class="right">
                <span class="s mono">{{ activeWorkspace?.name || 'no workspace' }}</span>
                <span class="s mono">{{ Math.round(viewport.zoom * 100) }}%</span>
            </span>
        </footer>

        <!-- Floating Menus/Modals outside canvas -->
        <ContextMenu
            :position="contextMenuPosition?.screen || contextMenuPosition"
            :visible="contextMenuVisible"
            @action="handleContextMenuAction"
            @close="closeContextMenu"
            @node-select="onContextMenuNodeSelect"
        />
        <NodeBrowser :position="nodeBrowserPosition" :visible="nodeBrowserVisible" @close="closeNodeBrowser" @node-select="onNodeBrowserSelect" />
        <NodeContextMenu
            :node="nodeContextMenuNode"
            :position="nodeContextMenuPosition"
            :visible="nodeContextMenuVisible"
            @action="handleNodeContextMenuAction"
            @close="closeNodeContextMenu"
        />
        <EntryPointManager :visible="showEntryPointManager" @close="showEntryPointManager = false" />
    </div>
</template>

<script setup>
    import { computed, defineExpose, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
    import NodePalette from './components/NodePalette.vue';
    import ContextMenu from './components/ContextMenu.vue';
    import NodeBrowser from './components/NodeBrowser.vue';
    import NodeContextMenu from './components/NodeContextMenu.vue';
    import EntryPointManager from './components/EntryPointManager.vue';
    import TopToolbar from './components/layout/TopToolbar.vue';
    import ExecutionLog from './components/canvas/ExecutionLog.vue';
    import NodeCanvas from './components/canvas/NodeCanvas.vue';
    // New panels
    import ProjectExplorer from './components/panels/ProjectExplorer.vue';
    import NodeSettings from './components/NodeSettings.vue';

    import { activeWorkspace, createWorkspace, debugMode, nodes, workspaceState } from './utils/state.js';
    import { addNode, deleteNode } from './utils/nodes-core.js';
    import { addNodeFromDefinition } from './utils/node-creation.js';
    import { getConnections, removeConnection } from './utils/connection-manager.js';
    import { getNextNodeId } from './utils/id-utils.js';
    import { selectedNodeId, selectNode, closeSettings } from './utils/node-selection.js';
    import { attachPendingConnectionToNode, pendingConnectionRequest } from './utils/pending-connection.js';
    import { addActionNode } from './utils/action-node-utils.js';
    import { addSystemNode, updateNodeOutputs } from './utils/system-node-utils.js';
    import { canvasOffset, screenToWorld, viewport, worldToScreen } from './utils/viewport-utils.js';
    import {
        addEntryPoint,
        clearExecutionResults,
        executeFromEntryPoint,
        executeGraph,
        executionLog,
        executionSummary,
        isExecuting,
        removeEntryPoint,
        stopExecution
    } from './utils/graph-executor.js';
    import { pickDirectory, readDirectoryTree } from './utils/file-tree.js';
    import { getWorkspaceIssueCount } from './utils/node-inspector.js';

    const contextMenuVisible = ref(false);
    const contextMenuPosition = ref({ screen: { x: 0, y: 0 }, world: { x: 0, y: 0 } });
    const nodeBrowserVisible = ref(false);
    const nodeBrowserPosition = ref({ x: 0, y: 0 });
    const nodeContextMenuVisible = ref(false);
    const nodeContextMenuNode = ref(null);
    const nodeContextMenuPosition = ref({ x: 0, y: 0 });
    // UI State
    const showNodePalette = ref(false);
    const showEntryPointManager = ref(false);

    // Resizable side panels.
    const leftWidth = ref(224);
    const rightWidth = ref(344);
    function startResize(side, e) {
        e.preventDefault();
        const onMove = (ev) => {
            if (side === 'left') leftWidth.value = Math.min(480, Math.max(160, ev.clientX));
            else rightWidth.value = Math.min(600, Math.max(240, window.innerWidth - ev.clientX));
        };
        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
    }

    // The outline's per-section "+" opens the Add Node picker.
    function onOutlineAddNode() {
        openNodeBrowser({ x: Math.max(40, window.innerWidth / 2 - 160), y: Math.max(60, window.innerHeight / 2 - 200) });
    }

    const projectTree = ref(null);
    // Total validation issues across the graph (status bar).
    const issueCount = computed(() => getWorkspaceIssueCount(nodes.value, { connections: getConnections() }));

    // Convert screen position (editor-local) to world position using canvas offset
    function screenToWorldPosition(screenPos) {
        const clientX = canvasOffset.value.x + screenPos.x;
        const clientY = canvasOffset.value.y + screenPos.y;
        return screenToWorld(clientX, clientY);
    }

    // Reset viewport to default
    function resetViewport() {
        viewport.value.x = 0;
        viewport.value.y = 0;
        viewport.value.zoom = 1.0;
    }

    function closeContextMenu() {
        contextMenuVisible.value = false;
    }

    function openNodeBrowser(position) {
        nodeBrowserPosition.value = position;
        nodeBrowserVisible.value = true;
        closeContextMenu();
    }

    function closeNodeBrowser() {
        nodeBrowserVisible.value = false;
    }

    function onNodeContextMenu(data) {
        nodeContextMenuNode.value = data.node;
        nodeContextMenuPosition.value = data.position; // screen coordinates
        nodeContextMenuVisible.value = true;
        contextMenuVisible.value = false;
        nodeBrowserVisible.value = false;
    }

    function closeNodeContextMenu() {
        nodeContextMenuVisible.value = false;
        nodeContextMenuNode.value = null;
    }

    // Clone a node (fresh id, offset a little so it's visibly distinct) so the
    // user can stamp out copies without re-wiring from the palette. Connections
    // are intentionally not copied — the duplicate starts unconnected.
    function duplicateNode(node) {
        const clone = JSON.parse(JSON.stringify(node));
        clone.id = getNextNodeId(node.nodeDefId || node.type || 'node');
        clone.x = (node.x ?? 0) + 40;
        clone.y = (node.y ?? 0) + 40;
        nodes.value.push(clone);
        selectNode(clone);
    }

    // Remove every connection touching this node (either endpoint).
    function disconnectNode(nodeId) {
        for (const conn of [...getConnections()]) {
            if (conn.from.nodeId === nodeId || conn.to.nodeId === nodeId) {
                removeConnection(conn);
            }
        }
    }

    function handleNodeContextMenuAction(actionData) {
        const { type, node } = actionData;
        switch (type) {
            case 'delete':
                deleteNode(node.id);
                break;
            case 'duplicate':
                duplicateNode(node);
                break;
            case 'copy':
                // TODO: Implement copy to clipboard
                break;
            case 'edit':
                selectNode(node);
                break;
            case 'disconnect':
                disconnectNode(node.id);
                break;
            case 'add-entry-point':
                addEntryPoint(node.id);
                break;
            case 'remove-entry-point':
                removeEntryPoint(node.id);
                break;
            case 'execute-from-here':
                executeFromEntryPoint(node.id).catch(() => {});
                break;
            default:
                break;
        }
    }

    function handleContextMenuAction(actionData) {
        const { type } = actionData;
        const worldPosition = contextMenuPosition.value.world || contextMenuPosition.value;
        // Use the mouse world position directly for node spawn
        const spawnPosition = { x: worldPosition.x, y: worldPosition.y };
        switch (type) {
            case 'addNode': {
                const newNode = addNode(spawnPosition);
                if (pendingConnectionRequest.value) attachPendingConnectionToNode(newNode);
                break;
            }
            case 'addActionNode': {
                const newNode = addActionNode(spawnPosition);
                if (pendingConnectionRequest.value) attachPendingConnectionToNode(newNode);
                break;
            }
            case 'addSystemNode': {
                const newNode = addSystemNode('print', spawnPosition);
                if (pendingConnectionRequest.value) attachPendingConnectionToNode(newNode);
                break;
            }
            case 'showNodeDropdown':
                openNodeBrowser(spawnPosition);
                break;
            default:
                break;
        }
    }

    // Event handlers for node creation
    function onNodeDragStart(_data) {
        // placeholder for palette drag start
    }

    function onNodeSelect(node) {
        const position = screenToWorldPosition({ x: 200, y: 200 });
        const newNode = addNodeFromDefinition(node.id, position);
        if (pendingConnectionRequest.value) attachPendingConnectionToNode(newNode);
    }

    function onNodeBrowserSelect(data) {
        const newNode = addNodeFromDefinition(data.nodeId, data.position);
        if (pendingConnectionRequest.value) attachPendingConnectionToNode(newNode);
    }

    // Create a simple test graph for execution testing
    function createTestGraph() {
        nodes.value = [];
        const startNode = addNodeFromDefinition('on_start', 100, 100);
        const printNode1 = addNodeFromDefinition('print', 350, 100);
        const emitEventNode = addNodeFromDefinition('emit_event', 600, 100);
        const eventListenerNode = addNodeFromDefinition('on_event', 350, 250);
        const printNode2 = addNodeFromDefinition('print', 600, 250);
        if (printNode1.inputs) {
            const valueInput = printNode1.inputs.find((input) => input.name === 'value' || input.name === 'text');
            if (valueInput) valueInput.defaultValue = 'Starting execution...';
        }
        if (emitEventNode.inputs) {
            const eventNameInput = emitEventNode.inputs.find((input) => input.name === 'eventName');
            const dataInput = emitEventNode.inputs.find((input) => input.name === 'data');
            if (eventNameInput) eventNameInput.defaultValue = 'TestEvent';
            if (dataInput) dataInput.defaultValue = { message: 'Hello from event!' };
        }
        if (eventListenerNode.inputs) {
            const eventNameInput = eventListenerNode.inputs.find((input) => input.name === 'eventName');
            if (eventNameInput) eventNameInput.defaultValue = 'TestEvent';
        }
        if (printNode2.inputs) {
            const valueInput = printNode2.inputs.find((input) => input.name === 'value' || input.name === 'text');
            if (valueInput) valueInput.defaultValue = 'Event received!';
        }
        addEntryPoint(startNode.id);
    }

    // Context menu from canvas
    function onContextMenu(event) {
        const target = event.target;
        const nodeElement = target.closest('[data-node-id]');
        if (!nodeElement) {
            event.preventDefault();
            // Use client coordinates directly for fixed-position menus
            const screenPos = { x: event.clientX, y: event.clientY };
            const worldPos = screenToWorld(event.clientX, event.clientY);
            contextMenuPosition.value = { screen: screenPos, world: worldPos };
            contextMenuVisible.value = true;
        }
    }

    // Handle drop from canvas
    function onDrop(event) {
        event.preventDefault();
        try {
            const data = JSON.parse(event.dataTransfer.getData('application/json'));
            if (data.type === 'node-palette-item') {
                const worldPos = screenToWorld(event.clientX, event.clientY);
                const newNode = addNodeFromDefinition(data.nodeDefId, worldPos);
                if (pendingConnectionRequest.value) attachPendingConnectionToNode(newNode);
            }
        } catch (error) {
            console.error('Error handling drop:', error);
        }
    }

    // When a connection drag ends on empty space, pendingConnectionRequest will be set.
    // Open the context menu at that position to let user pick a node to connect.
    watch(pendingConnectionRequest, async (pending) => {
        if (!pending) return;
        const world = pending.position;
        // Use worldToScreen so canvasOffset and viewport are handled
        const screen = worldToScreen(world.x, world.y);
        contextMenuPosition.value = { screen, world };
        await nextTick();
        contextMenuVisible.value = true;
    });

    // New: open project flow (only directory pick + tree load)
    async function openProject() {
        const dir = await pickDirectory();
        if (!dir) return;
        try {
            projectTree.value = await readDirectoryTree(dir);
        } catch (e) {
            console.error('Failed to read directory tree', e);
        }
    }

    // Expose API used by tests
    defineExpose({ selectNode, selectedNodeId });

    // Implement onContextMenuNodeSelect to handle node creation from the context menu, using the correct position and attaching pending connections if present. Also closes the context menu after node creation.
    function onContextMenuNodeSelect({ node, position }) {
        const newNode = addNodeFromDefinition(node.id, screenToWorld(position.x, position.y));
        if (pendingConnectionRequest.value) attachPendingConnectionToNode(newNode);
        closeContextMenu();
    }

    // Keybinding system for node actions
    function handleGlobalKeydown(event) {
        if (!selectedNodeId.value) return;
        // Delete or Backspace: delete selected node
        if (event.key === 'Delete' || event.key === 'Backspace') {
            deleteNode(selectedNodeId.value);
            // Optionally clear selection after delete
            selectedNodeId.value = null;
            event.preventDefault();
        }
        // Add more keybindings here as needed
    }

    onMounted(() => {
        window.addEventListener('keydown', handleGlobalKeydown);
        // Open a default workspace on launch so the user lands on a usable canvas
        // instead of the empty "No active workspace" state.
        if (!activeWorkspace.value && Object.keys(workspaceState.workspaces).length === 0) {
            createWorkspace(Date.now(), { name: 'Workflow 0' });
        }
    });
    onUnmounted(() => {
        window.removeEventListener('keydown', handleGlobalKeydown);
    });

    function onDeselect() {
        closeSettings();
    }

    // Watch for changes in the active workspace
    watch(activeWorkspace, (newWorkspace) => {
        if (newWorkspace) {
            nodes.value = newWorkspace.nodes;
            selectedNodeId.value = newWorkspace.selectedNodeId;
        }
    });

    // Method to handle update-outputs event from SystemNode
    function handleUpdateOutputs(nodeId, newOutputs) {
        updateNodeOutputs(nodeId, newOutputs);
    }
</script>

<style>
    body {
        background: var(--bg);
        color: var(--ink);
        font-family: var(--font-ui);
    }

    .blueprints-app {
        background: var(--bg);
        color: var(--ink);
        font-family: var(--font-ui);
    }

    /* Optional background helpers */
    .bg-checkerboard {
        background-color: #222;
        background-image:
            linear-gradient(45deg, #444 25%, transparent 25%), linear-gradient(-45deg, #444 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #444 75%), linear-gradient(-45deg, transparent 75%, #444 75%);
        background-size: 40px 40px;
        background-position:
            0 0,
            0 20px,
            20px -20px,
            -20px 0px;
    }

    .bg-grid {
        background-color: #444444;
        background-image:
            linear-gradient(0deg, #000 2px, transparent 2px), linear-gradient(90deg, #000 2px, transparent 2px),
            linear-gradient(0deg, #222 1px, transparent 1px), linear-gradient(90deg, #222 1px, transparent 1px);
        background-size:
            80px 80px,
            80px 80px,
            20px 20px,
            20px 20px,
            80px 80px,
            80px 80px;
        background-position:
            0 0,
            0 0,
            0 0,
            0 0;
    }
</style>
