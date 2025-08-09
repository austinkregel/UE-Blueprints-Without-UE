<template>
  <div
    class="node-glass absolute inline-block min-w-[220px] max-w-[420px] text-white font-sans text-sm select-none cursor-grab border-2"
    :class="[colorClasses.border, colorClasses.shadow]"
    :style="{ left: node.x + 'px', top: node.y + 'px' }"
    :data-node-id="node.id"
    ref="nodeRef"
    @mousedown.stop="handleMouseDown"
    @click.stop="handleClick"
    @contextmenu.stop.prevent="handleNodeContextMenu"
  >
    <svg class="absolute top-0 left-0 w-full h-full pointer-events-none" width="100%" height="100%" style="z-index: -1;">
      <g v-for="conn in nodeConnections" :key="connKey(conn)">
        <line
          v-if="getConnectionPoints(conn)"
          :x1="getConnectionPoints(conn).x1"
          :y1="getConnectionPoints(conn).y1"
          :x2="getConnectionPoints(conn).x2"
          :y2="getConnectionPoints(conn).y2"
          :stroke="getConnectionColor(conn)" stroke-width="3" />
      </g>
    </svg>
    <div 
      v-if="shouldShowHeader"
      class="px-3 py-1.5 rounded-t-lg font-bold bg-gradient-to-r relative z-10"
      :class="colorClasses.header"
    >
      <slot name="header">{{ getDefaultHeaderText() }}</slot>
    </div>
    <slot></slot>
    <div class="flex justify-between p-2 flex-wrap relative z-10">
      <div class="flex justify-between w-full io" v-if="hasExecutionPins">
        <ExecutionIcon
          class="w-6 h-6 text-gray-500 io-type"
          :data-io-name="'Exec'"
          @mousedown.stop.prevent="handleIOStart('exec', { name: 'Exec', type: 'Exec', icon: true }, $event)"
        />
        <ExecutionIcon
          class="w-6 h-6 text-gray-500 io-type"
          :data-io-name="'Exec'"
          @mousedown.stop.prevent="handleIOStart('exec', { name: 'Exec', type: 'Exec', icon: true }, $event)"
        />

      </div>
      
      <!-- Variable nodes: Special compact layout -->
      <div v-if="props.node.type === 'variable'" class="flex items-end justify-end w-full">
        <div
          class="io output text-sm flex items-center cursor-pointer bg-zinc-700/50 hover:bg-zinc-600/50"
          :data-io-name="props.node.varName"
          @mousedown.stop.prevent="handleIOStart('output', { name: props.node.varName, type: props.node.varType || 'mixed' }, $event)"
          @contextmenu="onIOContextMenu('output', { name: props.node.varName, type: props.node.varType || 'mixed' }, $event)"
        >
          <Type 
            :name="props.node.varName" 
            :type="props.node.varType || 'mixed'" 
            class="io-label font-medium"
          />
          <ConnectionIcon class="w-4 h-4 ml-2" :connection="getOutputConnection(props.node.varName)" :io-type="props.node.varType || 'mixed'" />
        </div>
      </div>
      
      <!-- Regular nodes: Standard input/output layout -->
      <template v-else>
        <div class="flex flex-col gap-1 inputs">
          <div
            v-for="input in node.inputs"
            :key="input.name || input"
            class="io input px-1.5 py-0.5 text-xs flex items-center cursor-pointer"
            :data-io-name="input.name || input"
            @mousedown.stop.prevent="handleIOStart('input', input, $event)"
            @contextmenu="onIOContextMenu('input', input, $event)"
          >
            <ConnectionIcon class="w-4 h-4 mr-1" :connection="getInputConnection(input)" :io-type="input.type || 'mixed'" />
            <Type 
              :name="input.name" 
              :type="input.type" 
              class="io-label"
            />
          </div>
          <slot name="inputs"></slot>
        </div>
        
        <div class="flex flex-col gap-1 outputs">
          <div
            v-for="output in node.outputs"
            :key="output.name || output"
            class="io output px-1.5 py-0.5 text-xs flex items-center cursor-pointer justify-end"
            :data-io-name="output.name || output"
            @mousedown.stop.prevent="handleIOStart('output', output, $event)"
            @contextmenu="onIOContextMenu('output', output, $event)"
          >
            <Type 
              :name="output.name" 
              :type="output.type" 
              class="io-label"
            />
            <ConnectionIcon class="w-4 h-4 ml-1" :connection="getOutputConnection(output)" :io-type="output.type || 'mixed'" />
          </div>
          <slot name="outputs"></slot>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import {onMounted, nextTick, computed, watch, ref} from 'vue';
import {construction, getConnectionColor, log, selectNode, startConnectionDrag} from "../../utils/base-node-utils.js";
import ExecutionIcon from "../icons/ExecutionIcon.vue";
import {getRectXBasedOnType, getRectYBasedOnType, registerIO} from "../../utils/io-utils.js";
import { screenToWorld, viewport } from "../../utils/viewport-utils.js";
import ConnectionIcon from "../icons/ConnectionIcon.vue";
import { getNodeColor } from "../../utils/node-colors.js";
import Type from "../Type.vue";
const emit = defineEmits([
  'move', 'connect', 'register-io', 'select', 'start-connection-drag', 'delete-connection', 'node-context-menu'
]);
const props = defineProps({ 
  node: Object, 
  connections: Array
});

const nodeRef = ref();
const {
  registerAllIO,
  startDrag,
  onIOContextMenu,
  connKey,
  getConnectionPoints
} = construction(emit, props, nodeRef);

onMounted(() => {
  nextTick(() => {
    registerAllIO();
    // Register exec IO points for SidewaysHouseIcon
    const iconEls = nodeRef.value?.querySelectorAll('.io-type');
    const type = 'output';
    if (iconEls) {
      iconEls.forEach((el, idx) => {
        const rect = el.getBoundingClientRect();
        registerIO({
          nodeId: props.node.id,
          type, // or 'input' if you want to support both
          name: `ExecIcon${idx}`,
          x: getRectXBasedOnType(type, rect),
          y: getRectYBasedOnType(type, rect),
        });
      });
    }
  });
});

watch(
  () => [props.node],
  () => {
    nextTick(registerAllIO);
  },
  { deep: true }
);

const nodeConnections = computed(() => {
  // Only show connections where this node is the source or target
  if (!props.connections) return [];
  return props.connections.filter(conn =>
    (conn.from && conn.from.nodeId === props.node.id) ||
    (conn.to && conn.to.nodeId === props.node.id)
  );
});

// Get connection for a specific input
const getInputConnection = (inputName) => {
  if (!props.connections) return null;
  return props.connections.find(conn => 
    conn.to && 
    conn.to.nodeId === props.node.id && 
    (conn.to.input === inputName || conn.to.input === (inputName.name || inputName))
  ) || null;
};

// Get connection for a specific output
const getOutputConnection = (outputName) => {
  if (!props.connections) return null;
  return props.connections.find(conn => 
    conn.from && 
    conn.from.nodeId === props.node.id && 
    (conn.from.output === outputName || conn.from.output === (outputName.name || outputName))
  ) || null;
};

// Color mappings for different node types
const colorClasses = computed(() => {
  // Get the color for this specific node using our coloring system
  const nodeColor = getNodeColor(props.node.type, props.node.nodeDefId);
  
  const colorMap = {
    blue: {
      header: 'from-blue-500 to-blue-700',
      border: 'border-blue-400/30',
      shadow: 'shadow-blue-500/20'
    },
    green: {
      header: 'from-green-500 to-green-700',
      border: 'border-green-400/30',
      shadow: 'shadow-green-500/20'
    },
    yellow: {
      header: 'from-yellow-500 to-yellow-700',
      border: 'border-yellow-400/30',
      shadow: 'shadow-yellow-500/20'
    },
    purple: {
      header: 'from-purple-500 to-purple-700',
      border: 'border-purple-400/30',
      shadow: 'shadow-purple-500/20'
    },
    red: {
      header: 'from-red-500 to-red-700',
      border: 'border-red-400/30',
      shadow: 'shadow-red-500/20'
    },
    cyan: {
      header: 'from-cyan-500 to-cyan-700',
      border: 'border-cyan-400/30',
      shadow: 'shadow-cyan-500/20'
    },
    pink: {
      header: 'from-pink-500 to-pink-700',
      border: 'border-pink-400/30',
      shadow: 'shadow-pink-500/20'
    },
    orange: {
      header: 'from-orange-500 to-orange-700',
      border: 'border-orange-400/30',
      shadow: 'shadow-orange-500/20'
    },
    gray: {
      header: 'from-gray-500 to-gray-700',
      border: 'border-gray-400/30',
      shadow: 'shadow-gray-500/20'
    }
  };
  
  return colorMap[nodeColor] || colorMap.blue;
});

// Determine if this node type should have execution pins
const hasExecutionPins = computed(() => {
  // Variable nodes never have execution pins
  if (props.node.type === 'variable') {
    return false;
  }
  
  // Check if the node definition explicitly includes exec pins
  if (props.node.nodeDefId) {
    const hasExecInput = props.node.inputs?.some(input => input.type === 'exec');
    const hasExecOutput = props.node.outputs?.some(output => output.type === 'exec');
    return hasExecInput || hasExecOutput;
  }
  
  // For legacy nodes without nodeDefId, use type-based logic
  if (props.node.type === 'function') {
    // Functions typically need exec pins
    return true;
  }
  
  if (props.node.type === 'system') {
    // System operations typically need exec pins
    return true;
  }
  
  // For other types, check if they have any exec inputs/outputs defined
  const hasExecInput = props.node.inputs?.some(input => input.type === 'exec');
  const hasExecOutput = props.node.outputs?.some(output => output.type === 'exec');
  return hasExecInput || hasExecOutput;
});

// Determine if this node should show a header
const shouldShowHeader = computed(() => {
  // Variable nodes don't show headers
  if (props.node.type === 'variable') {
    return false;
  }
  
  // All other node types show headers
  return true;
});

// Get default header text for nodes
const getDefaultHeaderText = () => {
  if (props.node.name) {
    return props.node.name;
  }
  
  if (props.node.nodeDefId) {
    return props.node.nodeDefId;
  }
  
  if (props.node.type === 'function') {
    return props.node.funcName || 'Function';
  }
  
  if (props.node.type === 'system') {
    return props.node.systemName || 'System';
  }
  
  return `Node ${props.node.id}`;
};

function handleIOStart(type, io, event) {
  // Get the IO element's position for accurate drag start
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  const screenX = getRectXBasedOnType(type, rect);
  const screenY = getRectYBasedOnType(type, rect);
  
  // Convert to world coordinates
  const worldPos = screenToWorld(screenX, screenY);

  startConnectionDrag({
    nodeId: props.node.id,
    ioType: type,
    ioName: io.name || io,
    x: worldPos.x,
    y: worldPos.y,
    icon: !!io.icon
  });
}

const isDragging = ref(false);
let dragStartX = 0;
let dragStartY = 0;
let dragStarted = false;
let nodeStartX = 0;
let nodeStartY = 0;

function handleMouseDown(event) {
  event.preventDefault();
  dragStartX = event.clientX;
  dragStartY = event.clientY;
  nodeStartX = props.node.x;
  nodeStartY = props.node.y;
  isDragging.value = false;
  dragStarted = false;
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);
}

function handleMouseMove(event) {
  if (!isDragging.value) {
    const dx = event.clientX - dragStartX;
    const dy = event.clientY - dragStartY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      isDragging.value = true;
      if (!dragStarted) {
        dragStarted = true;
      }
    }
  }
  if (isDragging.value) {
    // Calculate mouse movement in screen space, then convert to world space
    const screenDeltaX = event.clientX - dragStartX;
    const screenDeltaY = event.clientY - dragStartY;
    
    // Convert screen delta to world delta by dividing by zoom
    const worldDeltaX = screenDeltaX / viewport.value.zoom;
    const worldDeltaY = screenDeltaY / viewport.value.zoom;
    
    emit('move', { 
      id: props.node.id, 
      x: nodeStartX + worldDeltaX, 
      y: nodeStartY + worldDeltaY 
    });
  }
}

function handleMouseUp(event) {
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
  if (!isDragging.value) {
    selectNode(props.node);
  }
  isDragging.value = false;
  dragStarted = false;
}

function handleClick(event) {
  // No-op: selection is handled in mouseup
}

function handleNodeContextMenu(event) {
  // Emit the context menu event with the mouse position and node data
  emit('node-context-menu', {
    node: props.node,
    position: {
      x: event.clientX,
      y: event.clientY
    }
  });
}
</script>

<style scoped>
.node-glass {
  background: linear-gradient(135deg, rgba(40,40,50,0.5) 60%, rgba(80,80,120,0.3) 100%);
  border-radius: 18px;
  box-shadow: 0 4px 24px 0 rgba(0,0,0,0.25), 0 1.5px 6px 0 rgba(0,255,255,0.08);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  transition: box-shadow 0.2s, border-color 0.2s;
}

.node-glass:active {
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.35), 0 1.5px 6px 0 rgba(0,255,255,0.18);
}

.valid-target {
  border: 2px dashed #0ff !important;
  opacity: 1 !important;
}
</style>
