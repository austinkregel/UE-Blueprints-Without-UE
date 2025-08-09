<template>
  <span 
    class="inline-flex items-center px-2 py-1 rounded text-xs font-medium pointer-events-none"
    :class="typeClasses"
  >
    {{ name }}: {{ type }}
  </span>
</template>

<script setup>
import { computed } from 'vue';
import { getNodeColor } from '../utils/node-colors.js';

const props = defineProps({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true
  }
});

const typeClasses = computed(() => {
  // Use the centralized type info function
  const color = getNodeColor(props.type);
  
  return [  ];
});
</script>

<style scoped>
/* Additional styling if needed */
</style>