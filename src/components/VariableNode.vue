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
      Variable: {{ node.varName }} ({{ node.varAction }})
    </template>
  </NodeBase>
</template>

<script setup>
import NodeBase from './NodeBase.vue';
const { node, connections } = defineProps({
  node: Object,
  connections: Array,
});
</script>
