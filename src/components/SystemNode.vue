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
      System: {{ node.systemOp || 'Operation' }}
    </template>
  </NodeBase>
</template>

<script setup>
import NodeBase from './NodeBase.vue';
const props = defineProps({
  node: Object,
  connections: Array,
});
</script>

<style scoped>
/* You can add custom styles for system nodes here */
</style>

