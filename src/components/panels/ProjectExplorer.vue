<template>
  <div
      class="w-72 shrink-0 overflow-y-auto border-r border-zinc-200 bg-white/80 dark:border-zinc-700 dark:bg-zinc-900/80">
    <div
        class="flex items-center gap-2 border-b border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-700 dark:bg-transparent">
      <span class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Project</span>
      <button
          class="ml-auto rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800"
          @click="$emit('open-project')"
      >
        Open…
      </button>
    </div>
    <div class="p-2">
      <TreeNode v-if="tree" :depth="0" :node="tree" @open-file="onOpenFile"/>
      <div v-else class="px-2 py-4 text-xs text-zinc-400 dark:text-zinc-500">No project loaded.</div>
    </div>
  </div>
</template>

<script setup>
import {defineEmits, defineProps} from 'vue';
import TreeNode from './TreeNode.vue';

const props = defineProps({
  tree: {type: Object, default: null}
});
const emit = defineEmits(['open-project', 'file-dblclick']);

function onOpenFile(path) {
  emit('file-dblclick', path);
}
</script>
