<template>
  <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <!-- Connection circle with type-based color -->
    <circle
        :fill="connection ? connectionColor : 'transparent'"
        :fill-opacity="connection ? '0.7' : '0'"
        :stroke="connectionColor"
        cx="12"
        cy="12"
        r="8"
        stroke-width="2"
    />
  </svg>
</template>

<script setup>
import {computed, defineProps} from 'vue';
import {getTypeColorHex} from '../../utils/language-definition.js';

const props = defineProps({
  active: {
    type: Boolean,
    default: false
  },
  connection: {
    type: Object,
    default: () => null
  },
  ioType: {
    type: String,
    default: 'mixed'
  }
});

const connection = computed(() => props.connection || null);

const connectionColor = computed(() => {
  // Use the IO type color for unconnected pins
  return getTypeColorHex(props.ioType);
});
</script>

<style scoped>
svg {
  display: block;
  cursor: pointer;
}
</style>
