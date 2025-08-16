<template>
  <div class="w-full h-full bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 font-sans flex flex-col">
    <!-- Top Toolbar (no overlap) -->
    <div class="shrink-0 border-b border-zinc-200 bg-white/80 dark:border-zinc-700 dark:bg-zinc-800/80 backdrop-blur">
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
        @add-node-from-dropdown="(nodeId) => addNodeFromDefinition(nodeId, screenToWorldPosition({ x: 200, y: 200 }))"
        @open-ast-tools="showAstTools = !showAstTools"
        @open-project="openProject"
      />
    </div>

    <!-- Main Content: project explorer | canvas | right log | right palette | AST Tools -->
    <div class="flex-1 min-h-0 flex overflow-hidden">
      <!-- Project Explorer (left) -->
      <ProjectExplorer :tree="projectTree" @open-project="openProject" @file-dblclick="onFileDblClick" />

      <!-- Canvas Area (no overlapping controls) -->
      <NodeCanvas
        class="flex-1"
        :debug-mode="debugMode"
        @context-menu="onContextMenu"
        @drop-node="onDrop"
        @node-context-menu="onNodeContextMenu"
      />

      <!-- Execution Log Panel (right, non-overlapping) -->
      <ExecutionLog :logs="executionLog" @clear="clearExecutionResults" />

      <!-- Right Palette Sidebar -->
      <div v-if="showNodePalette" class="w-86 shrink-0 border-l border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 overflow-y-auto max-h-screen flex flex-col">
        <NodePalette @node-drag-start="onNodeDragStart" @node-select="onNodeSelect" />
        <VariablesPanel :variables="currentVariables" />
      </div>

      <!-- AST Tools Sidebar -->
      <AstTools v-if="showAstTools" :code-text="astCodeText" :auto-parse="true" @push-node="pushNodeFromAst" @push-connection="pushConnectionFromAst" @import-complete="onAstImportComplete" />
    </div>

    <!-- Floating Menus/Modals outside canvas -->
    <ContextMenu :visible="contextMenuVisible" :position="contextMenuPosition?.screen || contextMenuPosition" @action="handleContextMenuAction" @close="closeContextMenu" />
    <NodeBrowser :visible="nodeBrowserVisible" :position="nodeBrowserPosition" @node-select="onNodeBrowserSelect" @close="closeNodeBrowser" />
    <NodeContextMenu :visible="nodeContextMenuVisible" :position="nodeContextMenuPosition" :node="nodeContextMenuNode" @action="handleNodeContextMenuAction" @close="closeNodeContextMenu" />
    <EntryPointManager :visible="showEntryPointManager" @close="showEntryPointManager = false" />
  </div>
</template>

<script setup>
import { ref, watch, nextTick, defineExpose, computed } from 'vue'
import NodePalette from './components/NodePalette.vue'
import ContextMenu from './components/ContextMenu.vue'
import NodeBrowser from './components/NodeBrowser.vue'
import NodeContextMenu from './components/NodeContextMenu.vue'
import EntryPointManager from './components/EntryPointManager.vue'
import TopToolbar from './components/layout/TopToolbar.vue'
import ExecutionLog from './components/canvas/ExecutionLog.vue'
import NodeCanvas from './components/canvas/NodeCanvas.vue'
import AstTools from './components/panels/AstTools.vue'
// New panels
import ProjectExplorer from './components/panels/ProjectExplorer.vue'
import VariablesPanel from './components/panels/VariablesPanel.vue'

import { nodes, debugMode } from './utils/state.js'
import { addNode, deleteNode } from './utils/nodes-core.js'
import { addNodeFromDefinition } from './utils/node-creation.js'
import { selectNode, selectedNodeId } from './utils/node-selection.js'
import { pendingConnectionRequest, attachPendingConnectionToNode } from './utils/pending-connection.js'
import { addActionNode } from './utils/action-node-utils.js'
import { addSystemNode } from './utils/system-node-utils.js'
import { connections, pruneDanglingConnections } from './utils/connection-manager.js'
import { viewport, screenToWorld, canvasOffset, worldToScreen } from './utils/viewport-utils.js'
import { executeGraph, stopExecution, clearExecutionResults, isExecuting, executionLog, executionSummary, addEntryPoint, removeEntryPoint, executeFromEntryPoint } from './utils/graph-executor.js'
// New utils for project + php import
import { pickDirectory, readDirectoryTree, readText } from './utils/file-tree.js'
import { scanPhpProject, startPhpScanStream } from './utils/php-project-indexer.js'
import { setPhpProject, setPhpProgress, phpProjectIndex } from './utils/php-project-state.js'
import { importPhpIntoEditor } from './utils/php-to-nodes.js'

// UI State
const showNodePalette = ref(true)
const showEntryPointManager = ref(false)
const showAstTools = ref(false)
// Provide code to AST tools on demand
const astCodeText = ref('')
const contextMenuVisible = ref(false)
const contextMenuPosition = ref({ x: 0, y: 0 })
const nodeBrowserVisible = ref(false)
const nodeBrowserPosition = ref({ x: 0, y: 0 })
const nodeContextMenuVisible = ref(false)
const nodeContextMenuPosition = ref({ x: 0, y: 0 })
const nodeContextMenuNode = ref(null)

// New project/variables state
const projectTree = ref(null)
const currentVariables = computed(() => {
  const seen = new Set()
  const list = []
  for (const n of nodes.value) {
    if (n.type === 'variable' && n.varName) {
      const name = n.varName
      const type = n.varType || 'mixed'
      const key = `${name}|${type}`
      if (!seen.has(key)) {
        seen.add(key)
        list.push({ name, type })
      }
    }
  }
  return list
})

// Helpers for AST tools import
function pushNodeFromAst(node) {
  nodes.value.push(node)
}
function pushConnectionFromAst(conn) {
  connections.value.push(conn)
}
function onAstImportComplete({ nodes: n, connections: c }) {
  console.log(`[AST Import] Added ${n} nodes and ${c} connections`)
  // Try to center the viewport around the last imported node if available
  const last = nodes.value[nodes.value.length - 1]
  if (last) {
    viewport.value.x = -last.x + 300
    viewport.value.y = -last.y + 200
  }
  // Clean up any orphan connections created by import or previous edits
  pruneDanglingConnections()
}

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
    // Use client coordinates directly for fixed-position menus
    const screenPos = { x: event.clientX, y: event.clientY }
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
  const world = pending.position;
  // Use worldToScreen so canvasOffset and viewport are handled
  const screen = worldToScreen(world.x, world.y);
  contextMenuPosition.value = { screen, world };
  await nextTick();
  contextMenuVisible.value = true;
});

// New: open project flow
async function openProject() {
  const dir = await pickDirectory()
  if (!dir) return
  try {
    projectTree.value = await readDirectoryTree(dir)
  } catch (e) {
    console.error('Failed to read directory tree', e)
  }
  // Begin streaming scan progress from Rust
  let stopStream = null
  try {
    stopStream = await startPhpScanStream(dir, (ev) => {
      if (!ev || !ev.phase) return
      if (ev.phase === 'start') {
        setPhpProgress({ processed: 0, total: ev.total || 0, filePath: '' })
      } else if (ev.phase === 'file') {
        setPhpProgress({ processed: ev.processed || 0, total: ev.total || 0, filePath: ev.path || '' })
      } else if (ev.phase === 'error') {
        console.warn('[PHP Scan error]', ev.message)
      } else if (ev.phase === 'done') {
        setPhpProgress({ processed: ev.processed || 0, total: ev.total || 0, filePath: '' })
        if (typeof stopStream === 'function') try { stopStream() } catch {}
      }
    })
  } catch (e) {
    console.warn('Failed to start streaming scan', e)
  }
  // Run full scan to build index in background
  scanPhpProject(dir, { onProgress: (p) => setPhpProgress(p) })
    .then(({ index, warnings }) => {
      if (warnings?.length) console.warn('[PHP Scan warnings]', warnings)
      setPhpProject(dir, index)
      // ensure we stop stream if still active
      if (typeof stopStream === 'function') try { stopStream() } catch {}
    })
    .catch(err => console.error('PHP scan failed', err))
}

// New: handle file double-click -> import PHP into graph and collect variables
async function onFileDblClick(filePath) {
  try {
    const src = await readText(filePath)
    if (typeof src !== 'string') return
    // Clear current graph
    nodes.value = []
    connections.value = []
    const fileInfo = phpProjectIndex.value?.files?.[filePath] || null
    const { warnings, error } = await importPhpIntoEditor(src, {
      start: { x: 100, y: 100 },
      spacing: { x: 260, y: 140 },
      projectIndex: phpProjectIndex.value || null,
      filePath,
      fileInfo,
      pushNode: (n) => nodes.value.push(n),
      pushConnection: (c) => connections.value.push(c)
    })
    if (error) console.warn('[PHP Import error]', error)
    if (warnings?.length) console.warn('[PHP Import warnings]', warnings)
    // Also load AST for this file
    astCodeText.value = src
    showAstTools.value = true
  } catch (e) {
    console.error('Failed to open file', e)
  }
}

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
    0 0, 0 0;
}
</style>
