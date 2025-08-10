<template>
  <div class="w-full h-full bg-zinc-900 text-white font-sans flex flex-col">
    <!-- Top Toolbar (no overlap) -->
    <div class="shrink-0 border-b border-zinc-700 bg-zinc-800/80 backdrop-blur">
      <TopToolbar
        :show-node-palette="showNodePalette"
        :debug-mode="debugMode"
        :is-executing="isExecuting"
        :viewport="viewport"
        :execution-summary="executionSummary"
        @toggle-palette="showNodePalette = !showNodePalette"
        @toggle-debug="debugMode = !debugMode"
        @reset-viewport="resetViewport"
        @run-graph="executeGraph"
        @stop-execution="stopExecution"
        @clear-results="clearExecutionResults"
        @create-test-graph="createTestGraph"
        @open-entry-points="showEntryPointManager = true"
        @open-events="showEventManager = true"
        @add-node-from-dropdown="(nodeId) => addNodeFromDefinition(nodeId, screenToWorldPosition({ x: 200, y: 200 }))"
      />
    </div>

    <!-- Main Content: canvas | right log | right palette -->
    <div class="flex-1 min-h-0 flex overflow-hidden">
      <!-- Canvas Area (no overlapping controls) -->
      <NodeCanvas
        class="flex-1"
        :debug-mode="debugMode"
        @context-menu="onContextMenu"
        @drop-node="onDrop"
      />

      <!-- Execution Log Panel (right, non-overlapping) -->
      <ExecutionLog :logs="executionLog" @clear="clearExecutionResults" />

      <!-- Right Palette Sidebar -->
      <div v-if="showNodePalette" class="w-64 shrink-0 border-l border-zinc-700 bg-zinc-900/80 overflow-y-auto">
        <NodePalette @node-drag-start="onNodeDragStart" @node-select="onNodeSelect" class="h-full" />
      </div>
    </div>

    <!-- Floating Menus/Modals outside canvas -->
    <ContextMenu :visible="contextMenuVisible" :position="contextMenuPosition?.screen || contextMenuPosition" @action="handleContextMenuAction" @close="closeContextMenu" />
    <NodeBrowser :visible="nodeBrowserVisible" :position="nodeBrowserPosition" @node-select="onNodeBrowserSelect" @close="closeNodeBrowser" />
    <NodeContextMenu :visible="nodeContextMenuVisible" :position="nodeContextMenuPosition" :node="nodeContextMenuNode" @action="handleNodeContextMenuAction" @close="closeNodeContextMenu" />
    <EntryPointManager :visible="showEntryPointManager" @close="showEntryPointManager = false" />
    <EventManager :visible="showEventManager" @close="showEventManager = false" />
  </div>
</template>

<script setup>
import { ref, watch, nextTick, defineExpose } from 'vue'
import NodePalette from './components/NodePalette.vue'
import ContextMenu from './components/ContextMenu.vue'
import NodeBrowser from './components/NodeBrowser.vue'
import NodeContextMenu from './components/NodeContextMenu.vue'
import EntryPointManager from './components/EntryPointManager.vue'
import EventManager from './components/EventManager.vue'
import TopToolbar from './components/layout/TopToolbar.vue'
import ExecutionLog from './components/canvas/ExecutionLog.vue'
import NodeCanvas from './components/canvas/NodeCanvas.vue'
import { nodes, debugMode } from './utils/state.js'
import { addNode, deleteNode } from './utils/nodes-core.js'
import { addNodeFromDefinition } from './utils/node-creation.js'
import { selectNode, selectedNodeId } from './utils/node-selection.js'
import { pendingConnectionRequest, clearPendingConnectionRequest, attachPendingConnectionToNode } from './utils/pending-connection.js'
import { addActionNode } from './utils/action-node-utils.js'
import { addSystemNode } from './utils/system-node-utils.js'
import { connections } from './utils/connection-manager.js'
import { viewport, screenToWorld, canvasOffset } from './utils/viewport-utils.js'
import { executeGraph, stopExecution, clearExecutionResults, isExecuting, executionLog, executionSummary, addEntryPoint, removeEntryPoint, executeFromEntryPoint } from './utils/graph-executor.js'

// UI State
const showNodePalette = ref(true)
const showEntryPointManager = ref(false)
const showEventManager = ref(false)
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const nodeBrowserVisible = ref(false)
const nodeBrowserPosition = ref({ x: 0, y: 0 })
const nodeContextMenuVisible = ref(false)
const nodeContextMenuPosition = ref({ x: 0, y: 0 })
const nodeContextMenuNode = ref(null)

// Convert screen position (editor-local) to world position using canvas offset
function screenToWorldPosition(screenPos) {
  const clientX = canvasOffset.value.x + screenPos.x
  const clientY = canvasOffset.value.y + screenPos.y
  return screenToWorld(clientX, clientY)
}

// Reset viewport to default
function resetViewport() {
  viewport.value.x = 0
  viewport.value.y = 0
  viewport.value.zoom = 1.0
}

function closeContextMenu() {
  contextMenuVisible.value = false
}

function openNodeBrowser(position) {
  nodeBrowserPosition.value = position
  nodeBrowserVisible.value = true
  closeContextMenu()
}

function closeNodeBrowser() {
  nodeBrowserVisible.value = false
}

function onNodeContextMenu(data) {
  nodeContextMenuNode.value = data.node
  nodeContextMenuPosition.value = data.position // screen coordinates
  nodeContextMenuVisible.value = true
  contextMenuVisible.value = false
  nodeBrowserVisible.value = false
}

function closeNodeContextMenu() {
  nodeContextMenuVisible.value = false
  nodeContextMenuNode.value = null
}

function handleNodeContextMenuAction(actionData) {
  const { type, node } = actionData
  switch (type) {
    case 'delete':
      deleteNode(node.id)
      break
    case 'duplicate':
      // Not yet modularized here
      break
    case 'copy':
      // TODO: Implement copy to clipboard
      break
    case 'edit':
      selectNode(node)
      break
    case 'disconnect':
      // TODO: Implement disconnect all connections for this node
      break
    case 'add-entry-point':
      addEntryPoint(node.id)
      break
    case 'remove-entry-point':
      removeEntryPoint(node.id)
      break
    case 'execute-from-here':
      executeFromEntryPoint(node.id).catch(() => {})
      break
    default:
      break
  }
}

function handleContextMenuAction(actionData) {
  const { type } = actionData
  const worldPosition = contextMenuPosition.value.world || contextMenuPosition.value
  switch (type) {
    case 'addNode': {
      const newNode = addNode(worldPosition)
      if (pendingConnectionRequest.value) attachPendingConnectionToNode(newNode)
      break
    }
    case 'addActionNode': {
      const newNode = addActionNode(worldPosition)
      if (pendingConnectionRequest.value) attachPendingConnectionToNode(newNode)
      break
    }
    case 'addSystemNode': {
      const newNode = addSystemNode('print', worldPosition)
      if (pendingConnectionRequest.value) attachPendingConnectionToNode(newNode)
      break
    }
    case 'showNodeDropdown':
      openNodeBrowser(worldPosition)
      break
    default:
      break
  }
}

// Event handlers for node creation
function onNodeDragStart(_data) {
  // placeholder for palette drag start
}

function onNodeSelect(node) {
  const position = screenToWorldPosition({ x: 200, y: 200 })
  const newNode = addNodeFromDefinition(node.id, position)
  if (pendingConnectionRequest.value) attachPendingConnectionToNode(newNode)
}

function onNodeBrowserSelect(data) {
  const newNode = addNodeFromDefinition(data.nodeId, data.position)
  if (pendingConnectionRequest.value) attachPendingConnectionToNode(newNode)
}

// Create a simple test graph for execution testing
function createTestGraph() {
  nodes.value = []
  connections.value = []
  const startNode = addNodeFromDefinition('on_start', 100, 100)
  const printNode1 = addNodeFromDefinition('print', 350, 100)
  const emitEventNode = addNodeFromDefinition('emit_event', 600, 100)
  const eventListenerNode = addNodeFromDefinition('on_event', 350, 250)
  const printNode2 = addNodeFromDefinition('print', 600, 250)
  if (printNode1.inputs) {
    const valueInput = printNode1.inputs.find(input => input.name === 'value' || input.name === 'text')
    if (valueInput) valueInput.defaultValue = 'Starting execution...'
  }
  if (emitEventNode.inputs) {
    const eventNameInput = emitEventNode.inputs.find(input => input.name === 'eventName')
    const dataInput = emitEventNode.inputs.find(input => input.name === 'data')
    if (eventNameInput) eventNameInput.defaultValue = 'TestEvent'
    if (dataInput) dataInput.defaultValue = { message: 'Hello from event!' }
  }
  if (eventListenerNode.inputs) {
    const eventNameInput = eventListenerNode.inputs.find(input => input.name === 'eventName')
    if (eventNameInput) eventNameInput.defaultValue = 'TestEvent'
  }
  if (printNode2.inputs) {
    const valueInput = printNode2.inputs.find(input => input.name === 'value' || input.name === 'text')
    if (valueInput) valueInput.defaultValue = 'Event received!'
  }
  addEntryPoint(startNode.id)
}

// Context menu from canvas
function onContextMenu(event) {
  const target = event.target
  const nodeElement = target.closest('[data-node-id]')
  if (!nodeElement) {
    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const screenPos = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    const worldPos = screenToWorld(event.clientX, event.clientY)
    contextMenuPosition.value = { screen: screenPos, world: worldPos }
    contextMenuVisible.value = true
  }
}

// Handle drop from canvas
function onDrop(event) {
  event.preventDefault()
  try {
    const data = JSON.parse(event.dataTransfer.getData('application/json'))
    if (data.type === 'node-palette-item') {
      const worldPos = screenToWorld(event.clientX, event.clientY)
      const newNode = addNodeFromDefinition(data.nodeDefId, worldPos)
      if (pendingConnectionRequest.value) attachPendingConnectionToNode(newNode)
    }
  } catch (error) {
    console.error('Error handling drop:', error)
  }
}

// When a connection drag ends on empty space, pendingConnectionRequest will be set.
// Open the context menu at that position to let user pick a node to connect.
watch(pendingConnectionRequest, async (pending) => {
  if (!pending) return;
  // Convert world position to screen-local position for the canvas context menu
  const world = pending.position;
  // screenToWorld inverse: x*zoom + viewport.x + canvasOffset.x
  const screen = {
    x: world.x * viewport.value.zoom + viewport.value.x,
    y: world.y * viewport.value.zoom + viewport.value.y,
  };
  contextMenuPosition.value = { screen, world };
  await nextTick();
  contextMenuVisible.value = true;
});

// After any context action or add via browser/drop, attachPendingConnectionToNode handles clearing.

// Expose API used by tests
defineExpose({ selectNode, selectedNodeId })
</script>

<style>
/* Optional background helpers */
.bg-checkerboard {
  background-color: #222;
  background-image: linear-gradient(45deg, #444 25%, transparent 25%),
  linear-gradient(-45deg, #444 25%, transparent 25%),
  linear-gradient(45deg, transparent 75%, #444 75%),
  linear-gradient(-45deg, transparent 75%, #444 75%);
  background-size: 40px 40px;
  background-position: 0 0, 0 20px, 20px -20px, -20px 0px;
}

.bg-grid {
  background-color: #444444;
  background-image:
    linear-gradient(0deg, #000 2px, transparent 2px),
    linear-gradient(90deg, #000 2px, transparent 2px),
    linear-gradient(0deg, #222 1px, transparent 1px),
    linear-gradient(90deg, #222 1px, transparent 1px);
  background-size:
    80px 80px, 80px 80px,
    20px 20px, 20px 20px,
    80px 80px, 80px 80px;
  background-position:
    0 0, 0 0,
    0 0, 0 0,
    0 0, 0 0;
}
</style>
