<template>
  <div class="relative" ref="dropdownRef">
    <button
      @click="toggleDropdown"
      class="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded px-4 py-2 text-base border border-zinc-600"
    >
      <span>{{ title }}</span>
      <svg
        class="w-4 h-4 transition-transform"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
    
    <div
      v-if="isOpen"
      class="absolute top-full left-0 mt-1 w-64 bg-zinc-800 border border-zinc-600 rounded-lg shadow-lg z-50 overflow-hidden"
    >
      <div class="p-2">
        <input
          v-model="searchQuery"
          placeholder="Search nodes..."
          class="w-full bg-zinc-700 text-white border border-zinc-600 rounded px-3 py-1 text-sm"
        />
      </div>
      
      <div class="max-h-80 overflow-y-auto">
        <div v-for="category in filteredCategories" :key="category.key" class="border-b border-zinc-700 last:border-b-0">
          <div
            class="flex items-center justify-between p-2 cursor-pointer hover:bg-zinc-700 text-sm font-medium text-zinc-300"
            @click="toggleCategory(category.key)"
          >
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full" :class="`bg-${category.color}-500`"></div>
              <span>{{ category.name }}</span>
            </div>
            <span class="text-xs text-zinc-500">{{ category.count }}</span>
          </div>
          
          <div v-if="expandedCategories[category.key]" class="bg-zinc-850">
            <div
              v-for="node in category.nodes"
              :key="node.id"
              class="flex items-center justify-between p-2 pl-6 cursor-pointer hover:bg-zinc-700 text-sm"
              @click="$emit('node-select', node)"
            >
              <div>
                <div class="text-white font-medium">{{ node.name }}</div>
                <div class="text-xs text-zinc-400 truncate">{{ node.description }}</div>
              </div>
              <div class="text-xs text-zinc-500">
                {{ node.inputs?.length || 0 }}→{{ node.outputs?.length || 0 }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { getNodePalette } from '../utils/node-factory.js';

const props = defineProps({
  title: { type: String, default: 'Add Node' }
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
      filteredNodes = category.nodes.filter(node =>
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
