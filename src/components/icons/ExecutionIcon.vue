<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <!-- House-shaped pentagon -->
    <path :d="pentagonPoints" :fill="active ? '#fff' : 'none'" :stroke="!active ? 'white' : 'none'" stroke-linejoin="round"
          stroke-width="2"/>
  </svg>
</template>

<script setup>
import {defineProps} from 'vue';

const props = defineProps({
  active: {
    type: Boolean,
    default: false
  }
});

// Pentagon points: shaped like a sideways house
const pentagonPoints = props?.active
    ? 'M6.73516 1L13.6023 7.54883L6.69317 15.1357H1.13555V1H6.73516Z'
    : 'M11.9354 4.5L19.3006 11.5244L11.9139 19.6357H5.63555V4.5H11.9354Z';
</script>

<style scoped>
svg {
  display: block;
  cursor: pointer;
}
</style>
