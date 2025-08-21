<template>
  <div ref="dropdownRef" class="relative">
    <button
        class="flex items-center gap-2 rounded border border-zinc-300 bg-white px-4 py-2 text-base text-zinc-900 hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
        @click="toggleDropdown"
    >
      <span>{{ title }}</span>
      <svg :class="{ 'rotate-180': isOpen }" class="h-4 w-4 transition-transform" fill="none" stroke="currentColor"
           viewBox="0 0 24 24">
        <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
      </svg>
    </button>

    <div
        v-if="isOpen"
        class="absolute top-full left-0 z-50 mt-1 w-64 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-600 dark:bg-zinc-800"
    >
      <div class="p-2">
        <input
            v-model="searchQuery"
            class="w-full rounded border border-zinc-300 bg-white px-3 py-1 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
            placeholder="Search nodes..."
        />
      </div>

      <div class="max-h-80 overflow-y-auto">
        <div v-for="category in filteredCategories" :key="category.key"
             class="border-b border-zinc-200 last:border-b-0 dark:border-zinc-700">
          <div
              class="flex cursor-pointer items-center justify-between p-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
              @click="toggleCategory(category.key)"
          >
            <div class="flex items-center gap-2">
              <div :class="`bg-${category.color}-500`" class="h-2 w-2 rounded-full"></div>
              <span>{{ category.name }}</span>
            </div>
            <span class="text-xs text-zinc-500">{{ category.count }}</span>
          </div>

          <div v-if="expandedCategories[category.key]" class="dark:bg-zinc-850 bg-zinc-50">
            <div
                v-for="node in category.nodes"
                :key="node.id"
                class="flex cursor-pointer items-center justify-between p-2 pl-6 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-700"
                @click="$emit('node-select', node)"
            >
              <div>
                <div class="font-medium text-zinc-900 dark:text-white">{{ node.name }}</div>
                <div class="truncate text-xs text-zinc-500 dark:text-zinc-400">{{ node.description }}</div>
              </div>
              <div class="text-xs text-zinc-500">{{ node.inputs?.length || 0 }}→{{ node.outputs?.length || 0 }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {computed, onMounted, onUnmounted, ref} from 'vue';
import {getNodePalette} from '../utils/node-factory.js';

const props = defineProps({
  title: {type: String, default: 'Add Node'}
});

const emit = defineEmits(['node-select']);

const isOpen = ref(false);
const searchQuery = ref('');
const expandedCategories = ref({});
const dropdownRef = ref(null);
const nodePalette = ref({});

onMounted(() => {
  nodePalette.value = getNodePalette();
  // In tests/SSR, document may not exist or may be torn down; guard usage
  if (typeof window !== 'undefined' && window.document) {
    window.document.addEventListener('click', handleClickOutside);
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined' && window.document) {
    window.document.removeEventListener('click', handleClickOutside);
  }
});

const filteredCategories = computed(() => {
  const query = searchQuery.value.toLowerCase();
  const categories = [];

  for (const [categoryKey, category] of Object.entries(nodePalette.value)) {
    let filteredNodes = category.nodes;

    if (query) {
      filteredNodes = category.nodes.filter(
          (node) =>
              node.name.toLowerCase().includes(query) ||
              node.description.toLowerCase().includes(query) ||
              node.id.toLowerCase().includes(query)
      );
    }

    if (filteredNodes.length > 0) {
      categories.push({
        key: categoryKey,
        name: category.name || categoryKey,
        color: category.color || 'gray',
        count: filteredNodes.length,
        nodes: filteredNodes
      });
    }
  }

  return categories;
});

function toggleDropdown() {
  isOpen.value = !isOpen.value;
}

function toggleCategory(categoryKey) {
  expandedCategories.value[categoryKey] = !expandedCategories.value[categoryKey];
}

function handleClickOutside(event) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    isOpen.value = false;
  }
}
</script>

<style scoped>
.rotate-180 {
  transform: rotate(180deg);
}
</style>
