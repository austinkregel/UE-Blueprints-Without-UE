<template>
  <NodeBase
    :node="node"
    :connections="connections"
    @move="$emit('move', $event)"
    @connect="$emit('connect', $event)"
    @select="$emit('select', $event)"
    @register-io="$emit('register-io', $event)"
  >
    <template #header>
      Function: {{ node.funcName }}
    </template>
    <template #inputs>
      <div
        v-if="node.hasExec && !node.inputs.some(i => (i.name || i) === 'Exec')"
        class="io input exec-pin"
        @mousedown.stop.prevent="startExecConnect('input')"
        @contextmenu="onExecContextMenu('input', $event)"
      >
        ● <span class="io-label">Exec</span>
      </div>
    </template>
    <template #outputs>
      <div
        v-if="node.hasExec && !node.outputs.some(i => (i.name || i) === 'Exec')"
        class="io output exec-pin"
        @mousedown.stop.prevent="startExecConnect('output')"
        @contextmenu="onExecContextMenu('output', $event)"
      >
        <span class="io-label">Exec</span> ●
      </div>
    </template>
  </NodeBase>
</template>

<script setup>
import NodeBase from './NodeBase.vue';
const props = defineProps({
  node: Object,
  connections: Array,
});
const emit = defineEmits(['move', 'connect', 'select', 'register-io', 'start-connection-drag', 'delete-connection']);

function startExecConnect(type) {
  // Simulate an IO object for Exec
  emit('start-connection-drag', {
    nodeId: props.node.id,
    ioType: type,
    ioName: 'Exec',
    x: 0, // Will be replaced by NodeBase logic
    y: 0,
    ioTypeForHighlight: 'Exec',
  });
}
function onExecContextMenu(type, event) {
  event.preventDefault();
  emit('delete-connection', { nodeId: props.node.id, ioType: type, ioName: 'Exec' });
}
</script>

<style scoped>
.exec-pin {
  color: #ff0;
  font-weight: bold;
}
</style>
