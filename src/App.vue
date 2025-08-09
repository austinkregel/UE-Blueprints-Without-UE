<template>
  <div class="relative bg-grid w-full h-full overflow-hidden bg-zinc-900 text-white font-sans flex" @mousedown="onEditorMouseDown" @wheel="onWheel">
    <!-- Main Editor Area -->
    <div 
      class="flex-1 relative"
      :class="{ 'drag-over': isDragOver }"
      @drop="onDrop"
      @dragover.prevent="onDragOver"
      @dragenter.prevent="onDragEnter"
      @dragleave="onDragLeave"
      @contextmenu="onContextMenu"
    >
      <!-- Fixed UI Controls -->
      <div class="absolute top-4 left-4 z-10 flex gap-3 flex-wrap items-center">
        <button @click="showNodePalette = !showNodePalette" class="bg-blue-700 hover:bg-blue-800 text-white rounded px-4 py-2 text-base">
          {{ showNodePalette ? 'Hide' : 'Show' }} Palette
        </button>
        
        <!-- Node Creation Dropdown -->
        <NodeDropdown 
          title="Add Node" 
          @node-select="(node) => addNodeFromDefinition(node.id, screenToWorldPosition({ x: 200, y: 200 }))" 
        />
        
        <button @click="debugMode = !debugMode" class="bg-gray-700 hover:bg-gray-800 text-white rounded px-4 py-2 text-base">
          {{ debugMode ? 'Disable Debug' : 'Enable Debug' }}
        </button>
        
        <button @click="resetViewport" class="bg-gray-700 hover:bg-gray-800 text-white rounded px-4 py-2 text-base">
          Reset View
        </button>
        
        <div class="text-sm text-zinc-400 bg-zinc-800 px-3 py-2 rounded">
          Right-click + drag to pan | Mouse wheel to zoom
        </div>
        
        <!-- Viewport info for debugging -->
        <div v-if="debugMode" class="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
          X: {{ Math.round(viewport.x) }}, Y: {{ Math.round(viewport.y) }}, Zoom: {{ viewport.zoom.toFixed(2) }}
        </div>
      </div>
      
      <!-- Infinite Canvas Container -->
      <div class="absolute inset-0 overflow-hidden">
        <!-- Transformed Canvas Content -->
        <div class="canvas-content" :style="{ transform: getViewportTransform() }">
          <svg class="absolute top-0 left-0 w-full h-full pointer-events-none z-20 connections" width="100%" height="100%" >
            <!-- Debug Markers -->
            <g v-if="debugMode">
              <!-- Node Centers -->
              <circle v-for="node in nodes" :key="'center-' + node.id" :cx="node.x" :cy="node.y" r="8" fill="red" pointer-events="none" />
              <text v-for="node in nodes" :key="'center-label-' + node.id" :x="node.x + 12" :y="node.y - 12" font-size="14" fill="red" pointer-events="none">
                {{`Node ${node.id} (${node.x},${node.y})`}}
              </text>
              <!-- Drag Point -->
              <template v-if="draggingConnection && draggingConnection.dragPos">
                <circle :cx="draggingConnection.dragPos.x" :cy="draggingConnection.dragPos.y" r="7" fill="orange" pointer-events="none" />
                <text :x="draggingConnection.dragPos.x + 12" :y="draggingConnection.dragPos.y - 12" font-size="13" fill="orange" pointer-events="none">
                  {{`Drag (${draggingConnection.dragPos.x},${draggingConnection.dragPos.y})`}}
                </text>
              </template>
            </g>
            <g v-for="conn in connections" :key="`${conn.from.nodeId}:${conn.from.output}->${conn.to.nodeId}:${conn.to.input}`">
              <path
                  v-if="getConnectionPointsArray(conn)"
                  :d="renderConnectionPath(getConnectionPointsArray(conn))"
                  :stroke="getConnectionColor(conn)"
                  :stroke-width="isActionFlow(conn) ? 5 : 3"
                  :marker-end="isActionFlow(conn) ? 'url(#arrow)' : null"
                  fill="none"
              />
            </g>
            <defs>
              <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L10,5 L0,10 z" fill="#ff0" />
              </marker>
            </defs>
            <path
                v-if="renderDraggingConnection()"
                :d="renderDraggingConnection()"
                :stroke="draggingConnection.value && isActionFlow(draggingConnection.value) ? '#ff0' : '#0ff'"
                :stroke-width="draggingConnection.value && isActionFlow(draggingConnection.value) ? 5 : 3"
                :marker-end="draggingConnection.value && isActionFlow(draggingConnection.value) ? 'url(#arrow)' : null"
                fill="none"
                pointer-events="none"
            />
          </svg>
          <div v-for="node in nodes" :key="node.id">
            <component
                :is="getNodeComponent(node)"
                :node="node"
                :connections="connections"
                @move="moveNode"
                @connect="addConnection"
                @register-io="registerIO"
                @select="selectNode"
                @start-connection-drag="startConnectionDrag"
                @delete-connection="removeConnection"
                @node-context-menu="onNodeContextMenu"
            />
          </div>
        </div>
      </div>
      
      <NodeSettings
          v-if="selectedNodeId !== null"
          :node="nodes.find(n => n.id === selectedNodeId)"
          @close="closeSettings"
          @update-io="updateNodeIO"
      />
    </div>
    
    <!-- Context Menu -->
    <ContextMenu
      :visible="contextMenuVisible"
      :position="contextMenuPosition?.screen || contextMenuPosition"
      @action="handleContextMenuAction"
      @close="closeContextMenu"
    />
    
    <!-- Node Browser Modal -->
    <NodeBrowser
      :visible="nodeBrowserVisible"
      :position="nodeBrowserPosition"
      @node-select="onNodeBrowserSelect"
      @close="closeNodeBrowser"
    />
    
    <!-- Node Context Menu -->
    <NodeContextMenu
      :visible="nodeContextMenuVisible"
      :position="nodeContextMenuPosition"
      :node="nodeContextMenuNode"
      @action="handleNodeContextMenuAction"
      @close="closeNodeContextMenu"
    />
    
    <!-- Node Palette Sidebar -->
    <NodePalette 
      v-if="showNodePalette"
      @node-drag-start="onNodeDragStart"
      @node-select="onNodeSelect"
      class="h-full"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import NodeSettings from './components/NodeSettings.vue';
import NodePalette from './components/NodePalette.vue';
import NodeDropdown from './components/NodeDropdown.vue';
import ContextMenu from './components/ContextMenu.vue';
import NodeBrowser from './components/NodeBrowser.vue';
import NodeContextMenu from './components/NodeContextMenu.vue';
import {
  isActionFlow,
  renderDraggingConnection,
  draggingConnection,
  selectedNodeId,
  nodes,
  closeSettings,
  updateNodeIO,
  selectNode,
  getNodeComponent,
  startConnectionDrag,
  moveNode,
  addNode,
  debugMode, 
  getConnectionColor,
  // New universal programming functions
  addNodeFromDefinition,
  deleteNode,
  duplicateNode
} from "./utils/base-node-utils.js";
import { addActionNode } from './utils/action-node-utils.js';
import { addSystemNode } from './utils/system-node-utils.js';
import { registerIO, renderConnectionPath, getConnectionPointsArray } from './utils/io-utils.js';
import { connections, addConnection, removeConnection } from './utils/connection-manager.js';
import { onEditorMouseDown } from './utils/editor-utils.js';
import { viewport, getViewportTransform, setZoom, screenToWorld } from './utils/viewport-utils.js';

// UI State
const showNodePalette = ref(true);
const isDragOver = ref(false);
const contextMenuVisible = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });
const nodeBrowserVisible = ref(false);
const nodeBrowserPosition = ref({ x: 0, y: 0 });
const nodeContextMenuVisible = ref(false);
const nodeContextMenuPosition = ref({ x: 0, y: 0 });
const nodeContextMenuNode = ref(null);

// Context menu functionality
function onContextMenu(event) {
  // Only show context menu if not clicking on a node
  const target = event.target;
  const nodeElement = target.closest('[data-node-id]');
  
  if (!nodeElement) {
    event.preventDefault();
    
    // Store both screen and world positions
    const rect = event.currentTarget.getBoundingClientRect();
    const screenPos = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    const worldPos = screenToWorld(screenPos.x, screenPos.y);
    
    // Use screen coordinates for menu positioning (so it appears in viewport)
    // But store world coordinates for actions
    contextMenuPosition.value = {
      screen: screenPos,
      world: worldPos
    };
    contextMenuVisible.value = true;
  }
}

// Wheel zoom functionality
function onWheel(event) {
  event.preventDefault();
  
  const rect = event.currentTarget.getBoundingClientRect();
  const centerX = event.clientX - rect.left;
  const centerY = event.clientY - rect.top;
  
  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = viewport.value.zoom * zoomFactor;
  
  setZoom(newZoom, centerX, centerY);
}

// Convert screen position to world position
function screenToWorldPosition(screenPos) {
  return screenToWorld(screenPos.x, screenPos.y);
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
  console.log('Node context menu requested:', data);
  nodeContextMenuNode.value = data.node;
  // Keep screen coordinates for menu positioning so it appears in viewport
  nodeContextMenuPosition.value = data.position; // This should already be screen coordinates
  nodeContextMenuVisible.value = true;
  // Close other menus
  contextMenuVisible.value = false;
  nodeBrowserVisible.value = false;
}

function closeNodeContextMenu() {
  nodeContextMenuVisible.value = false;
  nodeContextMenuNode.value = null;
}

function handleNodeContextMenuAction(actionData) {
  const { type, node } = actionData;
  
  console.log('Node context menu action:', type, 'for node:', node);
  
  switch (type) {
    case 'delete':
      deleteNode(node.id);
      break;
    case 'duplicate':
      duplicateNode(node);
      break;
    case 'copy':
      // TODO: Implement copy to clipboard
      console.log('Copy functionality not yet implemented');
      break;
    case 'edit':
      // Open the node settings
      selectNode(node);
      break;
    case 'disconnect':
      // TODO: Implement disconnect all connections for this node
      console.log('Disconnect functionality not yet implemented');
      break;
    default:
      console.log('Unknown node context menu action:', type);
  }
}

function handleContextMenuAction(actionData) {
  const { type } = actionData;
  // Handle both old format (direct position) and new format (screen/world)
  const worldPosition = contextMenuPosition.value.world || contextMenuPosition.value;
  
  switch (type) {
    case 'addNode':
      addNode(worldPosition);
      break;
    case 'addActionNode':
      addActionNode(worldPosition);
      break;
    case 'addSystemNode':
      addSystemNode('print', worldPosition);
      break;
    case 'showNodeDropdown':
      // Open the node browser modal at the world position
      openNodeBrowser(worldPosition);
      break;
    default:
      console.log('Unknown context menu action:', type);
  }
}

// Event handlers for node creation
function onNodeDragStart(data) {
  console.log('Node drag started:', data);
}

function onNodeSelect(node) {
  console.log('Node selected from palette:', node);
  // Create the node when selected from palette at a default world position
  const position = screenToWorldPosition({ x: 200, y: 200 });
  addNodeFromDefinition(node.id, position);
}

function onNodeBrowserSelect(data) {
  console.log('Node selected from browser:', data);
  // Create the node at the specified world position
  addNodeFromDefinition(data.nodeId, data.position);
}

// Drag and drop functionality
function onDragEnter(event) {
  event.preventDefault();
  isDragOver.value = true;
}

function onDragOver(event) {
  event.preventDefault();
  // Optional: Add visual feedback here
}

function onDragLeave(event) {
  // Only set to false if we're leaving the main drop zone
  if (!event.currentTarget.contains(event.relatedTarget)) {
    isDragOver.value = false;
  }
}

function onDrop(event) {
  event.preventDefault();
  isDragOver.value = false;
  
  try {
    const data = JSON.parse(event.dataTransfer.getData('application/json'));
    
    if (data.type === 'node-palette-item') {
      // Get the drop position relative to the editor area and convert to world coordinates
      const rect = event.currentTarget.getBoundingClientRect();
      const screenPos = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      };
      const worldPos = screenToWorld(screenPos.x, screenPos.y);
      
      console.log('Dropping node:', data.nodeDefId, 'at world position:', worldPos);
      
      // Create the node at the drop position in world coordinates
      addNodeFromDefinition(data.nodeDefId, worldPos);
    }
  } catch (error) {
    console.error('Error handling drop:', error);
  }
}

</script>

<style>
/* Canvas content styling */
.canvas-content {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-origin: 0 0;
}

/* Add your styles here */
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
    /* Large black grid lines */
      linear-gradient(0deg, #000 2px, transparent 2px),
      linear-gradient(90deg, #000 2px, transparent 2px),
        /* Small light gray grid lines */
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

/* Drag and drop styling */
.drag-over {
  background-color: rgba(59, 130, 246, 0.1) !important;
  border: 2px dashed rgba(59, 130, 246, 0.5);
  transition: all 0.2s ease-in-out;
}

.drag-over::before {
  content: "Drop node here";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: rgba(59, 130, 246, 0.8);
  font-size: 1.5rem;
  font-weight: bold;
  pointer-events: none;
  z-index: 1000;
}

/* Prevent text selection during panning */
.canvas-content {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
</style>
