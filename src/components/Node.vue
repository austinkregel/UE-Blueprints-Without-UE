<template>
  <div
    class="node"
    :data-node-id="node.id"
    :style="{ left: node.x + 'px', top: node.y + 'px' }"
    @mousedown.stop="startDrag"
    @click.stop="selectNode"
  >
    <div class="node-header">Node {{ node.id }}</div>
    <div class="io-list">
      <div class="inputs">
        <div
          v-for="input in node.inputs"
          :key="input"
          class="io input"
          @mousedown.stop.prevent="startConnect('input', input)"
        >
          ● {{ input }}
        </div>
      </div>
      <div class="outputs">
        <div
          v-for="output in node.outputs"
          :key="output"
          class="io output"
          @mousedown.stop.prevent="startConnect('output', output)"
        >
          {{ output }} ●
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import {construction} from "./base-node-utils.js";
const props = defineProps({
  node: Object,
  connections: Array,
});
const emit = defineEmits(['move', 'connect', 'select']);
const {
  startDrag,
  onDrag,
  stopDrag,
  startConnect,
  connecting,
} = construction(emit, props);

function finishConnect(e) {
  if (connecting.value) {
    // For demo: just emit a connect event with dummy data
    emit('connect', {
      from: connecting.value.type === 'output' ? { nodeId: props.node.id, output: connecting.value.name } : null,
      to: connecting.value.type === 'input' ? { nodeId: props.node.id, input: connecting.value.name } : null,
    });
  }
  connecting.value = null;
  window.removeEventListener('mouseup', finishConnect);
}

function selectNode() {
  emit('select', { id: props.node.id });
}
onBeforeUnmount(() => {
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
  window.removeEventListener('mouseup', finishConnect);
});
</script>

<style scoped>
.node {
  position: absolute;
  min-width: 120px;
  background: #333;
  color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px #0008;
  user-select: none;
  cursor: grab;
}
.node-header {
  background: #444;
  padding: 6px 12px;
  border-radius: 8px 8px 0 0;
  font-weight: bold;
}
.io-list {
  display: flex;
  justify-content: space-between;
  padding: 8px;
}
.inputs, .outputs {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.io {
  background: #555;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  cursor: pointer;
}
.input {
  align-items: flex-start;
}
.output {
  align-items: flex-end;
}
</style>
