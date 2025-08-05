<template>
  <NodeBase
    :node="computedNode"
    :connections="connections"
    @move="$emit('move', $event)"
    @select="$emit('select', $event)"
    @register-io="$emit('register-io', $event)"
    >
    <template #header>
      Function: {{ node.funcName }}
    </template>
  </NodeBase>
</template>

<script setup>
import NodeBase from './NodeBase.vue';
import {computed} from "vue";
import ExecutionIcon from "../icons/ExecutionIcon.vue";
const props = defineProps({
  node: Object,
  connections: Array,
});

const execInput = { name: 'Exec', type: 'Exec' };
const execOutput = { name: 'Exec', type: 'Exec' };

const computedNode = computed(() => {
  const n = { ...props.node };
  if (n.hasExec) {
    if (!n.inputs.some(i => (i.name || i) === 'Exec')) {
      n.inputs = [execInput, ...n.inputs];
    }
    if (!n.outputs.some(i => (i.name || i) === 'Exec')) {
      n.outputs = [execOutput, ...n.outputs];
    }
  }
  return n;
});
</script>

<style scoped>
.exec-pin {
  color: #ff0;
  font-weight: bold;
}
</style>
