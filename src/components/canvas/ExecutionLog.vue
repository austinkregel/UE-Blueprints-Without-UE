<template>
  <div v-if="logs.length > 0" class="w-80 shrink-0 bg-zinc-900 border-l border-zinc-700 flex flex-col">
    <div class="p-4 border-b border-zinc-700 flex items-center justify-between">
      <h3 class="text-lg font-semibold text-white">Execution Log</h3>
      <button @click="$emit('clear')" class="text-zinc-400 hover:text-white text-sm">Clear</button>
    </div>
    <div class="flex-1 overflow-y-auto p-4 space-y-2">
      <div v-for="(log, index) in logs" :key="index" class="text-sm text-zinc-300 bg-zinc-800 p-2 rounded">{{ log }}</div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'

defineProps({
  logs: { type: Array, default: () => [] }
})

defineEmits(['clear'])
</script>
