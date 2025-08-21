<template>
  <div
      ref="nodeRef"
      :class="[colorClasses.border, colorClasses.shadow, executionStatusClass]"
      :data-node-id="node.id"
      :style="{ left: node.x + 'px', top: node.y + 'px' }"
      class="node-glass absolute inline-block max-w-[420px] min-w-[220px] cursor-grab border-2 font-sans text-sm text-white select-none"
      @mousedown.stop="handleMouseDown"
      @click.stop="handleClick"
      @contextmenu.stop.prevent="handleNodeContextMenu"
  >
    <div
        v-if="shouldShowHeader"
        :class="colorClasses.header"
        class="relative z-10 flex items-center justify-between rounded-t-lg bg-gradient-to-r px-3 py-1.5 font-bold"
    >
      <slot name="header">{{ getDefaultHeaderText() }}</slot>
      <div v-if="executionStatus.executed" class="ml-2 text-xs">
        <span v-if="executionStatus.success === false" class="text-red-300">❌</span>
        <span v-else class="text-green-300">✅</span>
      </div>
    </div>
    <slot></slot>
    <div class="relative z-10 flex flex-wrap justify-between p-2">
      <!-- Variable nodes: Special compact layout -->
      <div v-if="props.node.type === 'variable'" class="flex w-full items-end justify-end">
        <div
            :data-io-name="props.node.outputs?.[0]?.name || props.node.varName"
            class="io output flex cursor-pointer items-center bg-zinc-700/50 text-sm hover:bg-zinc-600/50"
            @contextmenu="
                        onIOContextMenu(
                            'output',
                            { name: props.node.outputs?.[0]?.name || props.node.varName, type: props.node.varType || 'mixed' },
                            $event
                        )
                    "
            @mousedown.stop.prevent="
                        handleIOStart(
                            'output',
                            { name: props.node.outputs?.[0]?.name || props.node.varName, type: props.node.varType || 'mixed' },
                            $event
                        )
                    "
        >
          <Type
              :name="props.node.outputs?.[0]?.name || props.node.varName"
              :type="props.node.varType || 'mixed'"
              class="io-label font-medium"
          />
          <ExecutionIcon v-if="props.node.varType === 'exec'" :active="!!getOutputConnection(props.node.varName)"
                         class="ml-2 h-4 w-4"/>
          <ConnectionIcon
              v-else
              :connection="getOutputConnection(props.node.varName)"
              :io-type="props.node.varType || 'mixed'"
              class="ml-2 h-4 w-4"
          />
        </div>
      </div>

      <!-- Regular nodes: Standard input/output layout -->
      <template v-else>
        <div class="inputs flex flex-col gap-1">
          <div
              v-for="input in node.inputs"
              :key="input.name || input"
              :data-io-name="input.name || input"
              class="io input flex cursor-pointer items-center px-1.5 py-0.5 text-xs"
              @contextmenu="onIOContextMenu('input', input, $event)"
              @mousedown.stop.prevent="handleIOStart('input', input, $event)"
          >
            <ExecutionIcon v-if="input.type === 'exec'" :active="!!getInputConnection(input)" class="mr-1 h-4 w-4"/>
            <ConnectionIcon v-else :connection="getInputConnection(input)" :io-type="input.type || 'mixed'"
                            class="mr-1 h-4 w-4"/>
            <Type :name="input.name" :type="input.type" class="io-label"/>
          </div>
          <slot name="inputs"></slot>
        </div>

        <div class="outputs flex flex-col gap-1">
          <div
              v-for="output in node.outputs"
              :key="output.name || output"
              :data-io-name="output.name || output"
              class="io output flex cursor-pointer items-center justify-end px-1.5 py-0.5 text-xs"
              @contextmenu="onIOContextMenu('output', output, $event)"
              @mousedown.stop.prevent="handleIOStart('output', output, $event)"
          >
            <Type :name="output.name" :type="output.type" class="io-label"/>
            <ExecutionIcon v-if="output.type === 'exec'" :active="!!getOutputConnection(output)" class="ml-1 h-4 w-4"/>
            <ConnectionIcon v-else :connection="getOutputConnection(output)" :io-type="output.type || 'mixed'"
                            class="ml-1 h-4 w-4"/>
          </div>
          <slot name="outputs"></slot>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import {computed, nextTick, onMounted, ref, watch} from 'vue';
import {construction} from '../../utils/node-interaction.js';
import {startConnectionDrag} from '../../utils/drag-connect.js';
import ExecutionIcon from '../icons/ExecutionIcon.vue';
import {getRectXBasedOnType, getRectYBasedOnType} from '../../utils/io-utils.js';
import {screenToWorld, viewport} from '../../utils/viewport-utils.js';
import ConnectionIcon from '../icons/ConnectionIcon.vue';
import {getNodeColor} from '../../utils/node-colors.js';
import Type from '../Type.vue';
import {getNodeExecutionStatus} from '../../utils/graph-executor.js';

const emit = defineEmits(['move', 'connect', 'register-io', 'select', 'start-connection-drag', 'delete-connection', 'node-context-menu']);
const props = defineProps({
  node: Object,
  connections: Array
});

const nodeRef = ref();
const {registerAllIO, startDrag, onIOContextMenu} = construction(emit, props, nodeRef);

onMounted(() => {
  nextTick(() => {
    registerAllIO();
  });
});

watch(
    () => [props.node],
    () => {
      nextTick(registerAllIO);
    },
    {deep: true}
);

// Get connection for a specific input
const getInputConnection = (inputName) => {
  if (!props.connections) return null;
  return (
      props.connections.find(
          (conn) =>
              conn.to && conn.to.nodeId === props.node.id && (conn.to.input === inputName || conn.to.input === (inputName.name || inputName))
      ) || null
  );
};

// Get connection for a specific output
const getOutputConnection = (outputName) => {
  if (!props.connections) return null;
  return (
      props.connections.find(
          (conn) =>
              conn.from &&
              conn.from.nodeId === props.node.id &&
              (conn.from.output === outputName || conn.from.output === (outputName.name || outputName))
      ) || null
  );
};

// Get execution status for visual indicators
const executionStatus = computed(() => getNodeExecutionStatus(props.node.id));

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

// Execution status styling
const executionStatusClass = computed(() => {
  if (!executionStatus.value.executed) return '';

  if (executionStatus.value.success === false) {
    return 'border-red-500 shadow-red-500/30';
  } else if (executionStatus.value.executed) {
    return 'border-green-500 shadow-green-500/30';
  }

  return '';
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

function handleMouseUp() {
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('mouseup', handleMouseUp);
  if (!isDragging.value) {
    emit('select', props.node);
  }
  isDragging.value = false;
  dragStarted = false;
}

function handleClick() {
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
  background: linear-gradient(135deg, rgba(40, 40, 50, 0.5) 60%, rgba(80, 80, 120, 0.3) 100%);
  border-radius: 18px;
  box-shadow: 0 4px 24px 0 rgba(0, 0, 0, 0.25),
  0 1.5px 6px 0 rgba(0, 255, 255, 0.08);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  transition: box-shadow 0.2s,
  border-color 0.2s;
}

.node-glass:active {
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.35),
  0 1.5px 6px 0 rgba(0, 255, 255, 0.18);
}

.valid-target {
  border: 2px dashed #0ff !important;
  opacity: 1 !important;
}
</style>
