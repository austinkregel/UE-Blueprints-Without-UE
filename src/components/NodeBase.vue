<template>
  <div
    class="node-glass absolute inline-block min-w-[120px] max-w-[420px]  text-white font-sans text-sm select-none cursor-grab"
    :style="{ left: node.x + 'px', top: node.y + 'px' }"
    :data-node-id="node.id"
    ref="nodeRef"
    @mousedown.stop="startDrag"
    @click.stop="() => selectNode(node)"
  >
    <svg class="absolute top-0 left-0 w-full h-full pointer-events-none z-10" width="100%" height="100%">
      <g v-for="conn in nodeConnections" :key="connKey(conn)">
        <line
          v-if="getConnectionPoints(conn)"
          :x1="getConnectionPoints(conn).x1"
          :y1="getConnectionPoints(conn).y1"
          :x2="getConnectionPoints(conn).x2"
          :y2="getConnectionPoints(conn).y2"
          stroke="#0ff" stroke-width="3" />
      </g>
    </svg>
    <div class="bg-linear-to-r from-blue-500 to-gray-800 px-3 py-1.5 rounded-t-lg font-bold">
      <slot name="header">Node {{ node.id }}</slot>
    </div>
    <slot></slot>
    <div class="flex justify-between p-2 flex-wrap">
      <div class="flex justify-between w-full">
        <SidewaysHouseIcon class="w-6 h-6 text-gray-500" />
        <SidewaysHouseIcon class="w-6 h-6 text-gray-500" />

      </div>
      <div class="flex flex-col gap-1 inputs">
        <div
          v-for="input in node.inputs"
          :key="input.name || input"
          class="io input  px-1.5 py-0.5 rounded text-xs flex items-center cursor-pointer"
          @mousedown.stop.prevent="handleIOStart('input', input, $event)"
          @contextmenu="onIOContextMenu('input', input, $event)"
        >
          <div v-if="input.type !== 'Exec'" class="flex items-center">
            ● <span class="mx-0.5 io-label">{{ input.name || input }}</span>
            <span v-if="input.type" class="io-type text-cyan-300 text-[0.85em] ml-0.5">: {{ input.type }}</span>
          </div>
        </div>
        <slot name="inputs"></slot>
      </div>
      <div class="flex flex-col gap-1 outputs">
        <div
          v-for="output in node.outputs"
          :key="output.name || output"
          class="io output  px-1.5 py-0.5 rounded text-xs flex items-center cursor-pointer justify-end"
          @mousedown.stop.prevent="handleIOStart('output', output, $event)"
          @contextmenu="onIOContextMenu('output', output, $event)"
        >
          <span class="io-label mx-0.5">{{ output.name || output }}</span>
          <span v-if="output.type" class="io-type text-cyan-300 border rounded text-[0.85em] mx-0.5">: {{ output.type }}</span> ●
        </div>
        <slot name="outputs"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
import {onMounted, nextTick, computed, watch, ref} from 'vue';
import {construction, log, selectNode, startConnectionDrag} from "./base-node-utils.js";
import SidewaysHouseIcon from "./SidewaysHouseIcon.vue";
const emit = defineEmits([
  'move', 'connect', 'register-io', 'select', 'start-connection-drag', 'delete-connection'
]);
const props = defineProps({ node: Object, connections: Array });

const nodeRef = ref();
const {
  registerAllIO,
  startDrag,
  onIOContextMenu,
  connKey,
  getConnectionPoints
} = construction(emit, props, nodeRef);

onMounted(() => {
  nextTick(registerAllIO);
});

watch(
  () => [props.node.inputs, props.node.outputs],
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

function handleIOStart(type, io, event) {
  // Get the IO element's position for accurate drag start
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = rect.left + rect.width / 2 + window.scrollX;
  const y = rect.top + rect.height / 2 + window.scrollY;

  log('Starting connection drag:', {
    type,
    ioName: io.name || io,
    x, y
  });
  startConnectionDrag({
    nodeId: props.node.id,
    ioType: type,
    ioName: io.name || io,
    x,
    y
  });
}
</script>

<style scoped>
.node-glass {
  background: linear-gradient(135deg, rgba(40,40,50,0.85) 60%, rgba(80,80,120,0.7) 100%);
  border-radius: 18px;
  box-shadow: 0 4px 24px 0 rgba(0,0,0,0.25), 0 1.5px 6px 0 rgba(0,255,255,0.08);
  border: 1.5px solid rgba(180,180,220,0.18);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: box-shadow 0.2s;
}
.node-glass:active {
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.35), 0 1.5px 6px 0 rgba(0,255,255,0.18);
}
.valid-target {
  border: 2px dashed #0ff !important;
  opacity: 1 !important;
}
</style>
