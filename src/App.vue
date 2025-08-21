<template>
  <div class="flex h-full w-full flex-col bg-white font-sans text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100">
    <!-- Top Toolbar (no overlap) -->
    <div class="shrink-0 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-700 dark:bg-zinc-800/80">
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

    <!-- Main Content: project explorer | canvas | right log | right palette | AST Tools -->
    <div class="flex min-h-0 flex-1 overflow-hidden">
      <!-- Project Explorer (left) -->
      <ProjectExplorer :tree="projectTree" @open-project="openProject"/>

      <!-- Canvas Area (no overlapping controls) -->
      <NodeCanvas
          :debug-mode="debugMode"
          class="flex-1"
          @context-menu="onContextMenu"
          @drop-node="onDrop"
          @node-context-menu="onNodeContextMenu"
      />

      <!-- Execution Log Panel (right, non-overlapping) -->
      <ExecutionLog :logs="executionLog" @clear="clearExecutionResults"/>

      <!-- Right Palette Sidebar -->
      <div
          v-if="showNodePalette"
          class="flex max-h-screen w-86 shrink-0 flex-col overflow-y-auto border-l border-zinc-200 bg-white/80 dark:border-zinc-700 dark:bg-zinc-900/80"
      >
        <NodePalette @node-drag-start="onNodeDragStart" @node-select="onNodeSelect"/>
        <NodeSettings :variables="currentVariables"/>
      </div>

      <!-- AST Tools Sidebar -->
    </div>

    <!-- Floating Menus/Modals outside canvas -->
    <ContextMenu
        :position="contextMenuPosition?.screen || contextMenuPosition"
        :visible="contextMenuVisible"
        @action="handleContextMenuAction"
        @close="closeContextMenu"
    />
    <NodeBrowser :position="nodeBrowserPosition" :visible="nodeBrowserVisible" @close="closeNodeBrowser"
                 @node-select="onNodeBrowserSelect"/>
    <NodeContextMenu
        :node="nodeContextMenuNode"
        :position="nodeContextMenuPosition"
        :visible="nodeContextMenuVisible"
        @action="handleNodeContextMenuAction"
        @close="closeNodeContextMenu"
    />
    <EntryPointManager :visible="showEntryPointManager" @close="showEntryPointManager = false"/>
  </div>
</template>

<script setup>
import {computed, defineExpose, nextTick, ref, watch} from 'vue';
import NodePalette from './components/NodePalette.vue';
import ContextMenu from './components/ContextMenu.vue';
import NodeBrowser from './components/NodeBrowser.vue';
import NodeContextMenu from './components/NodeContextMenu.vue';
import EntryPointManager from './components/EntryPointManager.vue';
import TopToolbar from './components/layout/TopToolbar.vue';
import ExecutionLog from './components/canvas/ExecutionLog.vue';
import NodeCanvas from './components/canvas/NodeCanvas.vue';
// import AstTools from './components/panels/AstTools.vue'
// New panels
import ProjectExplorer from './components/panels/ProjectExplorer.vue';
import NodeSettings from './components/NodeSettings.vue';

import {debugMode, nodes} from './utils/state.js';
import {addNode, deleteNode} from './utils/nodes-core.js';
import {addNodeFromDefinition} from './utils/node-creation.js';
import {selectedNodeId, selectNode} from './utils/node-selection.js';
import {attachPendingConnectionToNode, pendingConnectionRequest} from './utils/pending-connection.js';
import {addActionNode} from './utils/action-node-utils.js';
import {addSystemNode} from './utils/system-node-utils.js';
import {connections} from './utils/connection-manager.js';
import {canvasOffset, screenToWorld, viewport, worldToScreen} from './utils/viewport-utils.js';
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
// New utils for project (drop PHP scanning/indexing and AST/codegen hooks)
import {pickDirectory, readDirectoryTree} from './utils/file-tree.js';
// import { scanPhpProject, startPhpScanStream } from './utils/php-project-indexer.js'
// import { setPhpProject, setPhpProgress, phpProjectIndex } from './utils/php-project-state.js'
// import { importCodeToGraph } from './utils/code-importer.js'
// import { generatePHPCodeFromGraph } from './utils/export-utils.js'

const contextMenuVisible = ref(false);
const contextMenuPosition = ref({screen: {x: 0, y: 0}, world: {x: 0, y: 0}});
const nodeBrowserVisible = ref(false);
const nodeBrowserPosition = ref({x: 0, y: 0});
const nodeContextMenuVisible = ref(false);
const nodeContextMenuNode = ref(null);
const nodeContextMenuPosition = ref({x: 0, y: 0});
// UI State
const showNodePalette = ref(true);
const showEntryPointManager = ref(false);
// const showAstTools = ref(false)
// Provide code to AST tools on demand
// const astCodeText = ref('')
// let astSyncTimer = null

// New project/variables state
const projectTree = ref(null);
const currentVariables = computed(() => {
  const seen = new Set();
  const list = [];
  for (const n of nodes.value) {
    if (n.type === 'variable' && n.varName) {
      const name = n.varName;
      const type = n.varType || 'mixed';
      const key = `${name}|${type}`;
      if (!seen.has(key)) {
        seen.add(key);
        list.push({name, type});
      }
    }
  }
  return list;
});

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

function handleNodeContextMenuAction(actionData) {
  const {type, node} = actionData;
  switch (type) {
    case 'delete':
      deleteNode(node.id);
      break;
    case 'duplicate':
      // Not yet modularized here
      break;
    case 'copy':
      // TODO: Implement copy to clipboard
      break;
    case 'edit':
      selectNode(node);
      break;
    case 'disconnect':
      // TODO: Implement disconnect all connections for this node
      break;
    case 'add-entry-point':
      addEntryPoint(node.id);
      break;
    case 'remove-entry-point':
      removeEntryPoint(node.id);
      break;
    case 'execute-from-here':
      executeFromEntryPoint(node.id).catch(() => {
      });
      break;
    default:
      break;
  }
}

function handleContextMenuAction(actionData) {
  const {type} = actionData;
  const worldPosition = contextMenuPosition.value.world || contextMenuPosition.value;
  switch (type) {
    case 'addNode': {
      const newNode = addNode(worldPosition);
      if (pendingConnectionRequest.value) attachPendingConnectionToNode(newNode);
      break;
    }
    case 'addActionNode': {
      const newNode = addActionNode(worldPosition);
      if (pendingConnectionRequest.value) attachPendingConnectionToNode(newNode);
      break;
    }
    case 'addSystemNode': {
      const newNode = addSystemNode('print', worldPosition);
      if (pendingConnectionRequest.value) attachPendingConnectionToNode(newNode);
      break;
    }
    case 'showNodeDropdown':
      openNodeBrowser(worldPosition);
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
  const position = screenToWorldPosition({x: 200, y: 200});
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
  connections.value = [];
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
    if (dataInput) dataInput.defaultValue = {message: 'Hello from event!'};
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
    const screenPos = {x: event.clientX, y: event.clientY};
    const worldPos = screenToWorld(event.clientX, event.clientY);
    contextMenuPosition.value = {screen: screenPos, world: worldPos};
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
  contextMenuPosition.value = {screen, world};
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

// Removed: onFileDblClick PHP import to graph (AST/codegen UI)
// function onFileDblClick(filePath) { /* removed */ }

// Removed: AST panel sync and watchers
// function syncAstFromGraph() {}
// watch([nodes, connections], () => { /* removed */ }, { deep: true })
// watch(showAstTools, (v) => { if (v) syncAstFromGraph() })

// Expose API used by tests
defineExpose({selectNode, selectedNodeId});
</script>

<style>
/* Optional background helpers */
.bg-checkerboard {
  background-color: #222;
  background-image: linear-gradient(45deg, #444 25%, transparent 25%), linear-gradient(-45deg, #444 25%, transparent 25%),
  linear-gradient(45deg, transparent 75%, #444 75%), linear-gradient(-45deg, transparent 75%, #444 75%);
  background-size: 40px 40px;
  background-position: 0 0,
  0 20px,
  20px -20px,
  -20px 0px;
}

.bg-grid {
  background-color: #444444;
  background-image: linear-gradient(0deg, #000 2px, transparent 2px), linear-gradient(90deg, #000 2px, transparent 2px),
  linear-gradient(0deg, #222 1px, transparent 1px), linear-gradient(90deg, #222 1px, transparent 1px);
  background-size: 80px 80px,
  80px 80px,
  20px 20px,
  20px 20px,
  80px 80px,
  80px 80px;
  background-position: 0 0,
  0 0,
  0 0,
  0 0;
}
</style>
