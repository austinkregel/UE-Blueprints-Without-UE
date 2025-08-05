<template>
  <div class="relative bg-grid w-full h-full overflow-hidden bg-zinc-900 text-white font-sans" @mousedown="onEditorMouseDown">
    <div class="absolute top-4 left-4 z-10 flex gap-2">
      <button @click="addNode" class="bg-cyan-700 hover:bg-cyan-800 text-white rounded px-4 py-2 text-base">Add Node</button>
      <button @click="addActionNode" class="bg-yellow-700 hover:bg-yellow-800 text-white rounded px-4 py-2 text-base">Add Action Node</button>
      <button @click="addSystemNode" class="bg-green-700 hover:bg-green-800 text-white rounded px-4 py-2 text-base">Add System Node</button>
      <button @click="debugMode = !debugMode" class="bg-gray-700 hover:bg-gray-800 text-white rounded px-4 py-2 text-base">
        {{ debugMode ? 'Disable Debug' : 'Enable Debug' }}
      </button>
    </div>
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
          :stroke="isActionFlow(conn) ? '#ff0' : '#0ff'"
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
      />
    </div>
    <NodeSettings
      v-if="selectedNodeId !== null"
      :node="nodes.find(n => n.id === selectedNodeId)"
      @close="closeSettings"
      @update-io="updateNodeIO"
    />
  </div>
</template>

<script setup>
import NodeSettings from './NodeSettings.vue';
import {
  isActionFlow,
  renderDraggingConnection,
  draggingConnection,
  selectedNodeId,
  nodes,
  closeSettings,
  updateNodeIO,
  selectNode,
  deleteConnection,
  getNodeComponent,
  startConnectionDrag,
  moveNode,
  addNode,
  debugMode, ioPositions
} from "./base-node-utils.js";
import { addActionNode } from './action-node-utils.js';
import { addSystemNode } from './system-node-utils.js';
import { registerIO, renderConnectionPath, getConnectionPointsArray } from './io-utils.js';
import { connections, addConnection, removeConnection } from './connection-manager.js';
import { onEditorMouseDown } from './editor-utils.js';

</script>

<style>
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
</style>
