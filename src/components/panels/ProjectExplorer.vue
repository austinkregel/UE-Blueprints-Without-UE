<template>
  <div class="w-72 shrink-0 border-r border-zinc-700 bg-zinc-900/80 overflow-y-auto">
    <div class="px-3 py-2 border-b border-zinc-700 flex items-center gap-2">
      <span class="text-sm font-semibold">Project</span>
      <button class="ml-auto text-xs px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-800" @click="$emit('open-project')">Open…</button>
    </div>
    <div class="p-2">
      <TreeNode v-if="tree" :node="tree" :depth="0" @open-file="onOpenFile" />
      <div v-else class="text-xs text-zinc-400 px-2 py-4">No project loaded.</div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue';
import TreeNode from './TreeNode.vue';

const props = defineProps({
  tree: { type: Object, default: null }
});
const emit = defineEmits(['open-project', 'file-dblclick']);

function onOpenFile(path) {
  emit('file-dblclick', path);
}
</script>
