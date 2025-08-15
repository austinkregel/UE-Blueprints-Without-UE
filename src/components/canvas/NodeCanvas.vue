<template>
  <div 
    ref="editorAreaRef"
    class="flex-1 relative"
    :class="{ 'drag-over': isDragOver }"
    @mousedown="onEditorMouseDown"
    @wheel="onWheel"
    @drop="onDrop"
    @dragover.prevent="onDragOver"
    @dragenter.prevent="onDragEnter"
    @dragleave="onDragLeave"
    @contextmenu="onContextMenu"
  >
    <!-- Infinite Canvas Container -->
    <div class="absolute inset-0 overflow-hidden">
      <div class="canvas-content" :style="{ transform: getViewportTransform() }">
        <!-- Connections under nodes -->
        <svg class="absolute pointer-events-none z-0 connections" style="left: -5000px; top: -5000px; width: 10000px; height: 10000px;" viewBox="-5000 -5000 10000 10000" preserveAspectRatio="none">
          <g v-if="debugMode">
            <circle v-for="node in nodes" :key="'center-' + node.id" :cx="node.x" :cy="node.y" r="8" fill="red" pointer-events="none" />
            <text v-for="node in nodes" :key="'center-label-' + node.id" :x="node.x + 12" :y="node.y - 12" font-size="14" fill="red" pointer-events="none">{{`Node ${node.id} (${node.x},${node.y})`}}</text>
            <template v-if="draggingConnection && draggingConnection.dragPos">
              <circle :cx="draggingConnection.dragPos.x" :cy="draggingConnection.dragPos.y" r="7" fill="orange" pointer-events="none" />
              <text :x="draggingConnection.dragPos.x + 12" :y="draggingConnection.dragPos.y - 12" font-size="13" fill="orange" pointer-events="none">{{`Drag (${draggingConnection.dragPos.x},${draggingConnection.dragPos.y})`}}</text>
            </template>
          </g>
          <g v-for="conn in connections" :key="`${conn.from.nodeId}:${conn.from.output}->${conn.to.nodeId}:${conn.to.input}`">
            <path v-if="getConnectionPointsArray(conn)" :d="renderConnectionPath(getConnectionPointsArray(conn))" :stroke="getConnectionColor(conn)" :stroke-width="isActionFlow(conn) ? 5 : 3" fill="none" />
          </g>
          <defs>
            <marker id="arrow" markerWidth="10" markerHeight="10" refX="10" refY="5" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L10,5 L0,10 z" fill="#ff0" />
            </marker>
          </defs>
          <path v-if="renderDraggingConnection()" :d="renderDraggingConnection()" :stroke="draggingConnection.value && isActionFlow(draggingConnection.value) ? '#ff0' : '#0ff'" :stroke-width="draggingConnection.value && isActionFlow(draggingConnection.value) ? 5 : 3" :marker-end="draggingConnection.value && isActionFlow(draggingConnection.value) ? 'url(#arrow)' : null" fill="none" pointer-events="none" />
        </svg>

        <!-- Nodes above connections -->
        <div v-for="node in nodes" :key="node.id" class="relative z-10">
          <component :is="getNodeComponent(node)" :node="node" :connections="connections" @move="moveNode" @connect="addConnection" @register-io="registerIO" @select="selectNode" @start-connection-drag="startConnectionDrag" @delete-connection="removeConnection" @node-context-menu="onNodeContextMenu" />
        </div>
      </div>
    </div>

    <!-- Node Settings Modal removed; settings are shown in the right sidebar panel -->
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
// Removed NodeSettings import
import { isActionFlow, renderDraggingConnection, getConnectionColor } from '../../utils/connection-visuals.js'
import { draggingConnection, nodes } from '../../utils/state.js'
import { selectNode } from '../../utils/node-selection.js'
import { getNodeComponent } from '../../utils/get-node-component.js'
import { startConnectionDrag } from '../../utils/drag-connect.js'
import { moveNode } from '../../utils/nodes-core.js'
import { registerIO, renderConnectionPath, getConnectionPointsArray } from '../../utils/io-utils.js'
import { connections, addConnection, removeConnection } from '../../utils/connection-manager.js'
import { onEditorMouseDown } from '../../utils/editor-utils.js'
import { viewport, getViewportTransform, setZoom, setCanvasOffset } from '../../utils/viewport-utils.js'

const props = defineProps({
  debugMode: { type: Boolean, default: false }
})

const emit = defineEmits(['context-menu', 'drop-node', 'node-context-menu'])

const isDragOver = ref(false)
const editorAreaRef = ref(null)

function updateCanvasOffset() {
  const rect = editorAreaRef.value?.getBoundingClientRect();
  if (rect) setCanvasOffset(rect.left, rect.top);
}

onMounted(() => {
  updateCanvasOffset();
  window.addEventListener('resize', updateCanvasOffset);
  // Observe container size/position changes (e.g., sidebars toggling)
  if (typeof ResizeObserver !== 'undefined' && editorAreaRef.value) {
    const ro = new ResizeObserver(() => updateCanvasOffset());
    ro.observe(editorAreaRef.value);
    // store on instance for cleanup
    editorAreaRef.value.__ro = ro;
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateCanvasOffset);
  const el = editorAreaRef.value;
  if (el && el.__ro) {
    try { el.__ro.disconnect(); } catch {}
    el.__ro = null;
  }
})

function onContextMenu(event) {
  emit('context-menu', event)
}

function onNodeContextMenu(payload) {
  // forward node context menu event to parent
  emit('node-context-menu', payload)
}

function onWheel(event) {
  event.preventDefault();
  const rect = event.currentTarget.getBoundingClientRect();
  const centerX = event.clientX - rect.left;
  const centerY = event.clientY - rect.top;
  const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
  const newZoom = viewport.value.zoom * zoomFactor;
  setZoom(newZoom, centerX, centerY);
}

function onDragEnter(event) {
  event.preventDefault();
  isDragOver.value = true;
}

function onDragOver(event) {
  event.preventDefault();
}

function onDragLeave(event) {
  if (!event.currentTarget.contains(event.relatedTarget)) {
    isDragOver.value = false;
  }
}

function onDrop(event) {
  event.preventDefault();
  isDragOver.value = false;
  emit('drop-node', event)
}
</script>

<style>
.canvas-content {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  transform-origin: 0 0;
}

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

.canvas-content {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}
</style>
