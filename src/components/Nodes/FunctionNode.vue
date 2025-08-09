<template>
  <NodeBase
    :node="computedNode"
    :connections="connections"
    @move="$emit('move', $event)"
    @select="$emit('select', $event)"
    @register-io="$emit('register-io', $event)"
    @node-context-menu="$emit('node-context-menu', $event)"
    >
    <template #header>
      Function: {{ node.funcName }}
    </template>
  </NodeBase>
</template>

<script setup>
import NodeBase from './NodeBase.vue';
import {computed} from "vue";

const emit = defineEmits([
  'move', 'select', 'register-io', 'node-context-menu'
]);

const props = defineProps({
  node: Object,
  connections: Array,
});

const computedNode = computed(() => {
  const n = { ...props.node };
 
  return n;
});
</script>

<style scoped>
.exec-pin {
  color: #ff0;
  font-weight: bold;
}
</style>
