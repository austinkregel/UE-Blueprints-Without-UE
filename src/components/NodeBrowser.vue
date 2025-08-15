<template>
  <div 
    v-if="visible"
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    @click="handleOverlayClick"
  >
    <div 
      class="bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl w-96 max-h-[80vh] flex flex-col"
      @click.stop
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-zinc-600">
        <h3 class="text-white font-semibold">Browse All Nodes</h3>
        <button 
          @click="$emit('close')"
          class="text-zinc-400 hover:text-white"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <!-- Search -->
      <div class="p-4 border-b border-zinc-600">
        <input
          v-model="searchQuery"
          placeholder="Search nodes..."
          class="w-full bg-zinc-700 text-white border border-zinc-600 rounded px-3 py-2 text-sm"
          ref="searchInput"
        />
      </div>
      
      <!-- Node List -->
      <div class="flex-1 overflow-y-auto">
        <div v-for="category in filteredCategories" :key="category.key" class="border-b border-zinc-700 last:border-b-0">
          <div
            class="flex items-center justify-between p-3 cursor-pointer hover:bg-zinc-700 text-sm font-medium text-zinc-300"
            @click="toggleCategory(category.key)"
          >
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full" :class="`bg-${category.color}-500`"></div>
              <span>{{ category.name }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-zinc-500">{{ category.count }}</span>
              <svg
                class="w-4 h-4 transition-transform"
                :class="{ 'rotate-180': expandedCategories[category.key] }"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          <div v-if="expandedCategories[category.key]" class="bg-zinc-850">
            <div
              v-for="node in category.nodes"
              :key="node.id"
              class="flex flex-col gap-1 p-3 pl-6 cursor-pointer hover:bg-zinc-700 border-l-2 border-transparent hover:border-blue-500"
              @click="handleNodeSelect(node)"
            >
              <div class="flex items-center justify-between">
                <span class="text-white text-sm font-medium">{{ node.name }}</span>
                <div class="w-2 h-2 rounded-full" :class="`bg-${category.color}-400`"></div>
              </div>
              <p class="text-zinc-400 text-xs">{{ node.description }}</p>
              <div class="flex justify-between text-xs text-zinc-500">
                <span>{{ node.inputs?.length || 0 }} inputs</span>
                <span>{{ node.outputs?.length || 0 }} outputs</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- No results -->
        <div v-if="filteredCategories.length === 0" class="p-4 text-center text-zinc-400">
          No nodes found matching "{{ searchQuery }}"
        </div>
      </div>
      
      <!-- Footer -->
      <div class="p-4 border-t border-zinc-600 text-xs text-zinc-400">
        Click on a node to add it at the right-click position
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { getAllNodeDefinitions, NODE_CATEGORIES } from '../utils/language-definition.js';

const props = defineProps({
  visible: Boolean,
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
});

const emit = defineEmits(['close', 'node-select']);

const searchQuery = ref('');
const expandedCategories = ref({});
const searchInput = ref(null);

// Focus search input when modal opens
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    nextTick(() => {
      if (searchInput.value) {
        searchInput.value.focus();
      }
    });
  }
});

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
    
    const filteredNodes = nodes.filter(node => 
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
watch(() => props.visible, (newVisible) => {
  if (typeof window !== 'undefined' && window.document) {
    if (newVisible) {
      window.document.addEventListener('keydown', handleKeyDown);
    } else {
      window.document.removeEventListener('keydown', handleKeyDown);
    }
  }
});

// Safety net: ensure listener is removed on unmount
import { onUnmounted } from 'vue';
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
