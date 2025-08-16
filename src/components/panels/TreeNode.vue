<template>
  <div>
    <div v-if="isDir" class="select-none cursor-pointer px-1 py-0.5 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/60 rounded flex items-center" :style="indent" @click="toggle">
      <span class="mr-1 text-xs text-zinc-500 dark:text-zinc-400">{{ collapsed ? '▸' : '▾' }}</span>
      <span class="text-sm mr-1 text-zinc-700 dark:text-zinc-200">{{ node.name || 'dir' }}</span>
      <span v-if="loading" class="text-[10px] text-zinc-400 dark:text-zinc-500">…</span>
    </div>
    <div v-if="isDir && !collapsed" class="ml-0">
      <TreeNode v-for="child in node.children" :key="child.path" :node="child" :depth="(depth||0)+1" @open-file="$emit('open-file', $event)" />
    </div>
    <div v-if="isFile" class="select-none cursor-default px-1 py-0.5 hover:bg-zinc-100/40 dark:hover:bg-zinc-800/40 rounded flex items-center" :style="indent" @dblclick="$emit('open-file', node.path)">
      <span class="text-xs mr-1 text-zinc-500 dark:text-zinc-400">📄</span>
      <span class="text-sm truncate text-zinc-700 dark:text-zinc-200" :title="node.path">{{ node.name }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { listDirectory } from '../../utils/file-tree.js';
const props = defineProps({ node: { type: Object, required: true }, depth: { type: Number, default: 0 } });
const emit = defineEmits(['open-file']);
const collapsed = ref(false);
const loading = ref(false);

async function toggle() {
  collapsed.value = !collapsed.value;
  if (!collapsed.value && isDir.value) {
    if (!Array.isArray(props.node.children) || props.node.children.length === 0) {
      loading.value = true;
      try {
        const children = await listDirectory(props.node.path);
        // Vue reactivity: mutate the object referenced by parent
        props.node.children = children;
      } catch (e) {
        console.error('Failed to list directory', e);
      } finally {
        loading.value = false;
      }
    }
  }
}
const isDir = computed(() => props.node?.kind === 'dir');
const isFile = computed(() => props.node?.kind === 'file');
const indent = computed(() => ({ paddingLeft: `${(props.depth || 0) * 12}px` }));
</script>
