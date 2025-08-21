<template>
  <div v-if="visible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
       @click="handleOverlayClick">
    <div
        class="flex max-h-[80vh] w-96 flex-col rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-600 dark:bg-zinc-800"
        @click.stop
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-600">
        <h3 class="font-semibold text-zinc-900 dark:text-white">Browse All Nodes</h3>
        <button class="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white"
                @click="$emit('close')">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
          </svg>
        </button>
      </div>

      <!-- Search -->
      <div class="border-b border-zinc-200 p-4 dark:border-zinc-600">
        <input
            ref="searchInput"
            v-model="searchQuery"
            class="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 dark:border-zinc-600 dark:bg-zinc-700 dark:text-white"
            placeholder="Search nodes..."
        />
      </div>

      <!-- Node List -->
      <div class="flex-1 overflow-y-auto">
        <div v-for="category in filteredCategories" :key="category.key"
             class="border-b border-zinc-200 last:border-b-0 dark:border-zinc-700">
          <div
              class="flex cursor-pointer items-center justify-between p-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
              @click="toggleCategory(category.key)"
          >
            <div class="flex items-center gap-2">
              <div :class="`bg-${category.color}-500`" class="h-2 w-2 rounded-full"></div>
              <span>{{ category.name }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-zinc-500">{{ category.count }}</span>
              <svg
                  :class="{ 'rotate-180': expandedCategories[category.key] }"
                  class="h-4 w-4 transition-transform"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
              >
                <path d="M19 9l-7 7-7-7" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/>
              </svg>
            </div>
          </div>

          <div v-if="expandedCategories[category.key]" class="bg-zinc-50 dark:bg-zinc-900/40">
            <div
                v-for="node in category.nodes"
                :key="node.id"
                class="flex cursor-pointer flex-col gap-1 border-l-2 border-transparent p-3 pl-6 hover:border-blue-500 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                @click="handleNodeSelect(node)"
            >
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-zinc-900 dark:text-white">{{ node.name }}</span>
                <div :class="`bg-${category.color}-400`" class="h-2 w-2 rounded-full"></div>
              </div>
              <p class="text-xs text-zinc-600 dark:text-zinc-400">{{ node.description }}</p>
              <div class="flex justify-between text-xs text-zinc-500">
                <span>{{ node.inputs?.length || 0 }} inputs</span>
                <span>{{ node.outputs?.length || 0 }} outputs</span>
              </div>
            </div>
          </div>
        </div>

        <!-- No results -->
        <div v-if="filteredCategories.length === 0" class="p-4 text-center text-zinc-500 dark:text-zinc-400">
          No nodes found matching "{{ searchQuery }}"
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-zinc-200 p-4 text-xs text-zinc-500 dark:border-zinc-600 dark:text-zinc-400">
        Click on a node to add it at the right-click position
      </div>
    </div>
  </div>
</template>

<script setup>
// Safety net: ensure listener is removed on unmount
import {computed, nextTick, onUnmounted, ref, watch} from 'vue';
import {getAllNodeDefinitions, NODE_CATEGORIES} from '../utils/language-definition.js';

const props = defineProps({
  visible: Boolean,
  position: {
    type: Object,
    default: () => ({x: 0, y: 0})
  }
});

const emit = defineEmits(['close', 'node-select']);

const searchQuery = ref('');
const expandedCategories = ref({});
const searchInput = ref(null);

// Focus search input when modal opens
watch(
    () => props.visible,
    (newVisible) => {
      if (newVisible) {
        nextTick(() => {
          if (searchInput.value) {
            searchInput.value.focus();
          }
        });
      }
    }
);

// Get all available nodes organized by category
const allNodes = computed(() => {
  const nodes = getAllNodeDefinitions();
  const categorized = {};

  for (const [nodeId, nodeDef] of Object.entries(nodes)) {
    const categoryKey = nodeDef.categoryKey || 'OTHER';
    if (!categorized[categoryKey]) {
      categorized[categoryKey] = [];
    }
    categorized[categoryKey].push({
      id: nodeId,
      ...nodeDef
    });
  }

  return categorized;
});

// Filter and organize categories for display
const filteredCategories = computed(() => {
  const query = searchQuery.value.toLowerCase();
  const categories = [];

  for (const [categoryKey, nodes] of Object.entries(allNodes.value)) {
    const categoryInfo = NODE_CATEGORIES[categoryKey.toUpperCase()] || {
      name: categoryKey,
      color: 'gray'
    };

    const filteredNodes = nodes.filter(
        (node) =>
            node.name.toLowerCase().includes(query) ||
            node.description?.toLowerCase().includes(query) ||
            node.id.toLowerCase().includes(query)
    );

    if (filteredNodes.length > 0) {
      categories.push({
        key: categoryKey,
        name: categoryInfo.name,
        color: categoryInfo.color,
        count: filteredNodes.length,
        nodes: filteredNodes.sort((a, b) => a.name.localeCompare(b.name))
      });
    }
  }

  return categories.sort((a, b) => a.name.localeCompare(b.name));
});

function toggleCategory(categoryKey) {
  expandedCategories.value[categoryKey] = !expandedCategories.value[categoryKey];
}

function handleNodeSelect(node) {
  emit('node-select', {
    nodeId: node.id,
    position: props.position
  });
  emit('close');
}

function handleOverlayClick() {
  emit('close');
}

// Handle escape key
watch(
    () => props.visible,
    (newVisible) => {
      if (typeof window !== 'undefined' && window.document) {
        if (newVisible) {
          window.document.addEventListener('keydown', handleKeyDown);
        } else {
          window.document.removeEventListener('keydown', handleKeyDown);
        }
      }
    }
);

onUnmounted(() => {
  if (typeof window !== 'undefined' && window.document) {
    window.document.removeEventListener('keydown', handleKeyDown);
  }
});

function handleKeyDown(event) {
  if (event.key === 'Escape') {
    emit('close');
  }
}
</script>

<style scoped>
/* Custom scrollbar for the node list */
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: #4a5568 #2d3748;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: #2d3748;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #4a5568;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: #718096;
}

/* Smooth entrance animation */
.fixed {
  animation: modalFadeIn 0.2s ease-out;
}

/* Keep slide-in on dark container; light background still looks fine */
.bg-zinc-800 {
  animation: modalSlideIn 0.2s ease-out;
}

@keyframes modalFadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
