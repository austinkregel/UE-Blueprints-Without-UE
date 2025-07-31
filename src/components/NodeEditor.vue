<template>
  <div class="relative w-full h-full overflow-hidden bg-zinc-900 text-white font-sans" @mousedown="onEditorMouseDown">
    <div class="absolute top-4 left-4 z-10 flex gap-2">
      <button @click="addNode" class="bg-cyan-700 hover:bg-cyan-800 text-white rounded px-4 py-2 text-base">Add Node</button>
      <button @click="addActionNode" class="bg-yellow-700 hover:bg-yellow-800 text-white rounded px-4 py-2 text-base">Add Action Node</button>
      <button @click="addSystemNode" class="bg-green-700 hover:bg-green-800 text-white rounded px-4 py-2 text-base">Add System Node</button>
    </div>
    <svg class="absolute top-0 left-0 w-full h-full pointer-events-none z-20 connections" width="100%" height="100%" >
      <g v-for="(conn, i) in connections" :key="i">
        <template v-if="getConnectionPoints(conn)">
          <line
            v-if="!isActionFlow(conn)"
            :x1="getConnectionPoints(conn).x1"
            :y1="getConnectionPoints(conn).y1"
            :x2="getConnectionPoints(conn).x2"
            :y2="getConnectionPoints(conn).y2"
            stroke="#0ff" stroke-width="3" />
          <g v-else>
            <line
              :x1="getConnectionPoints(conn).x1"
              :y1="getConnectionPoints(conn).y1"
              :x2="getConnectionPoints(conn).x2"
              :y2="getConnectionPoints(conn).y2"
              stroke="#ff0" stroke-width="5" marker-end="url(#arrow)" />
          </g>
        </template>
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
        @connect="connectNodes"
        @register-io="registerIO"
        @select="selectNode"
        @start-connection-drag="startConnectionDrag"
        @delete-connection="deleteConnection"
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
import { ref } from 'vue';
import NodeSettings from './NodeSettings.vue';
import VariableNode from './VariableNode.vue';
import FunctionNode from './FunctionNode.vue';
import NodeBase from './NodeBase.vue';
import SystemNode from './SystemNode.vue';

const nodes = ref([
  // Example function node
  {
    id: 1,
    type: 'function',
    funcName: 'add',
    hasExec: false,
    x: 100,
    y: 100,
    inputs: [
      { name: 'a', type: 'int' },
      { name: 'b', type: 'int' }
    ],
    outputs: [
      { name: 'result', type: 'int' }
    ]
  },
  // Example variable get node
  {
    id: 2,
    type: 'variable',
    varName: 'counter',
    varType: 'int',
    varAction: 'get',
    x: 350,
    y: 120,
    inputs: [],
    outputs: [
      { name: 'value', type: 'int' }
    ]
  },
  // Example variable set node
  {
    id: 3,
    type: 'variable',
    varName: 'counter',
    varType: 'int',
    varAction: 'set',
    x: 350,
    y: 250,
    inputs: [
      { name: 'value', type: 'int' }
    ],
    outputs: []
  },
  // Example action node (exec)
  {
    id: 4,
    type: 'function',
    funcName: 'print',
    hasExec: true,
    x: 600,
    y: 180,
    inputs: [
      { name: 'Exec', type: 'Exec' },
      { name: 'msg', type: 'string' }
    ],
    outputs: [
      { name: 'Exec', type: 'Exec' }
    ]
  }
]);
let nextId = 5;
const connections = ref([]); // {from: {nodeId, output}, to: {nodeId, input}}
const ioPositions = ref({}); // { [nodeId]: { inputs: {name: {x,y}}, outputs: {name: {x,y}} } }
const selectedNodeId = ref(null);
const draggingConnection = ref(null); // { from: {nodeId, output}, to: {nodeId, input}, type: 'input'|'output', start: {x, y}, mouse: {x, y} }

function addNode() {
  nodes.value.push({
    id: nextId++,
    type: 'function',
    funcName: 'myFunction',
    hasExec: false,
    x: 200,
    y: 200,
    inputs: [],
    outputs: [],
  });
}

function moveNode({ id, x, y }) {
  const node = nodes.value.find(n => n.id === id);
  if (node) {
    node.x = x;
    node.y = y;
  }
}

function connectNodes({ from, to }) {
  // Prevent duplicate connections
  if (connections.value.some(conn =>
    conn.from?.nodeId === from?.nodeId && conn.from?.output === from?.output &&
    conn.to?.nodeId === to?.nodeId && conn.to?.input === to?.input
  )) return;
  // Prevent self-connection
  if (from?.nodeId === to?.nodeId) return;
  // Prevent getter of a variable being used as input for the same variable's setter
  const fromNode = nodes.value.find(n => n.id === from?.nodeId);
  const toNode = nodes.value.find(n => n.id === to?.nodeId);
  if (
    fromNode && toNode &&
    fromNode.type === 'variable' && fromNode.varAction === 'get' &&
    toNode.type === 'variable' && toNode.varAction === 'set' &&
    fromNode.varName === toNode.varName
  ) {
    return;
  }
  // Type compatibility/casting
  const getType = (node, ioName, ioType) => {
    if (!node) return null;
    let arr = ioType === 'input' ? node.inputs : node.outputs;
    let io = arr?.find(x => (x.name || x) === ioName);
    return io?.type || null;
  };
  const fromType = getType(fromNode, from?.output, 'output');
  const toType = getType(toNode, to?.input, 'input');

  console.log({
    fromType,
    toType,
  })
  if (fromType && toType) {
    if (fromType === toType) {
      connections.value.push({ from, to });
      return;
    }
    if (areTypesCompatible(fromType, toType)) {
      // Insert a cast system node between from and to
      const castNodeId = nextId++;
      const castNode = {
        id: castNodeId,
        type: 'system',
        systemName: 'cast',
        systemOp: `Cast ${fromType}→${toType}`,
        x: (fromNode.x + toNode.x) / 2 + 40, // position between nodes
        y: (fromNode.y + toNode.y) / 2 + 40,
        inputs: [{ name: 'in', type: fromType }],
        outputs: [{ name: 'out', type: toType }],
      };
      nodes.value.push(castNode);
      connections.value.push({ from, to: { nodeId: castNodeId, input: 'in' } });
      connections.value.push({ from: { nodeId: castNodeId, output: 'out' }, to });
      return;
    }
    // Not castable: show disabled cursor (handled in UI, see next step)
    return;
  }
  connections.value.push({ from, to });
}

// Type compatibility/casting rules
function areTypesCompatible(fromType, toType) {
  if (fromType === toType) return true;
  // int <-> float
  if ((fromType === 'int' && toType === 'float') || (fromType === 'float' && toType === 'int')) return true;
  // anything to string
  if (toType === 'string') return true;
  // bool <-> int
  if ((fromType === 'bool' && toType === 'int') || (fromType === 'int' && toType === 'bool')) return true;
  // array <-> object (loose)
  if ((fromType === 'array' && toType === 'object') || (fromType === 'object' && toType === 'array')) return true;
  // mixed/void/null are universal
  if ([fromType, toType].includes('mixed') || [fromType, toType].includes('void') || [fromType, toType].includes('null')) return true;
  return false;
}

function onEditorMouseDown(e) {
  // Deselect nodes, cancel drag
  if (draggingConnection.value) draggingConnection.value = null;
}

function startConnectionDrag({ nodeId, ioType, ioName, x, y }) {
  draggingConnection.value = {
    from: ioType === 'output' ? { nodeId, output: ioName } : null,
    to: ioType === 'input' ? { nodeId, input: ioName } : null,
    type: ioType,
    start: { x, y },
    mouse: { x, y },
  };
  window.addEventListener('mousemove', onConnectionDragMove);
  window.addEventListener('mouseup', onConnectionDragEnd);
}

function onConnectionDragMove(e) {
  if (draggingConnection.value) {
    console.log({ x: e.clientX, y: e.clientY });
    draggingConnection.value.mouse = { x: e.clientX, y: e.clientY };
  }
}

function onConnectionDragEnd(e) {
  // We'll handle drop logic in NodeBase later
  draggingConnection.value = null;
  window.removeEventListener('mousemove', onConnectionDragMove);
  window.removeEventListener('mouseup', onConnectionDragEnd);
}

function renderDraggingConnection() {
  if (!draggingConnection.value) return null;
  const { start, mouse } = draggingConnection.value;
  // Bezier curve control points
  const dx = Math.abs(mouse.x - start.x) * 0.5;
  const c1x = start.x + (draggingConnection.value.type === 'output' ? dx : -dx);
  const c2x = mouse.x - (draggingConnection.value.type === 'output' ? dx : -dx);
  return `M${start.x},${start.y} C${c1x},${start.y} ${c2x},${mouse.y} ${mouse.x},${mouse.y}`;
}

function registerIO({ nodeId, type, name, x, y }) {
  if (!ioPositions.value[nodeId]) ioPositions.value[nodeId] = { inputs: {}, outputs: {} };
  ioPositions.value[nodeId][type + 's'][name] = { x, y };
}

function getConnectionPoints(conn) {
  if (!conn.from || !conn.to) return null;
  const from = ioPositions.value[conn.from.nodeId]?.outputs?.[conn.from.output];
  const to = ioPositions.value[conn.to.nodeId]?.inputs?.[conn.to.input];
  if (!from || !to) return null;
  // Offset by IO circle radius (default 8px)
  const r = 8;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
  const offsetX = (dx / len) * r;
  const offsetY = (dy / len) * r;
  return {
    x1: from.x + offsetX,
    y1: from.y + offsetY,
    x2: to.x - offsetX,
    y2: to.y - offsetY
  };
}

function isActionFlow(conn) {
  // If output or input is named 'Exec', treat as action flow
  return (conn.from?.output === 'Exec' || conn.to?.input === 'Exec');
}

function addActionNode() {
  nodes.value.push({
    id: nextId++,
    type: 'function',
    funcName: 'myAction',
    hasExec: true,
    x: 300,
    y: 300,
    inputs: [
      { name: 'Exec', type: 'Exec' }
    ],
    outputs: [
      { name: 'Exec', type: 'Exec' }
    ]
  });
}

function addSystemNode() {
  nodes.value.push({
    id: nextId++,
    type: 'system',
    systemName: 'mySystem',
    x: 500,
    y: 300,
    inputs: [],
    outputs: [],
  });
}

function selectNode({ id }) {
  selectedNodeId.value = id;
}

function closeSettings() {
  selectedNodeId.value = null;
}

function updateNodeIO({ id, inputs, outputs }) {
  const node = nodes.value.find(n => n.id === id);
  if (node) {
    node.inputs = [...inputs];
    node.outputs = [...outputs];
  }
}

function getNodeComponent(node) {
  if (node.type === 'variable') return VariableNode;
  if (node.type === 'function') return FunctionNode;
  if (node.type === 'system') return SystemNode;
  return NodeBase;
}

function deleteConnection({ from, to }) {
  // Remove the connection matching both endpoints
  connections.value = connections.value.filter(conn => {
    return !(
      conn.from?.nodeId === from?.nodeId && conn.from?.output === from?.output &&
      conn.to?.nodeId === to?.nodeId && conn.to?.input === to?.input
    );
  });
}
</script>

<style>
/* Add any global styles here */
</style>
