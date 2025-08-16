<template>
  <div class="node-palette bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-700 w-80 h-full overflow-y-auto">
    <div class="p-4 border-b border-zinc-200 dark:border-zinc-700">
      <h2 class="text-zinc-900 dark:text-white font-bold text-lg">Node Palette</h2>
      <input
        v-model="searchQuery"
        placeholder="Search nodes..."
        class="mt-2 w-full bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white placeholder-zinc-400 border border-zinc-300 dark:border-zinc-600 rounded px-3 py-1 text-sm"
      />
      <div class="mt-2 flex gap-2">
        <button @click="scanProjectClick" class="text-xs bg-blue-600 hover:bg-blue-700 text-white rounded px-2 py-1">Scan Project</button>
        <span v-if="scanStatus" class="text-xs text-zinc-500">{{ scanStatus }}</span>
      </div>
    </div>
    
    <div class="p-2">
      <div v-for="(category, categoryKey) in filteredPalette" :key="categoryKey" class="mb-4">
        <div 
          class="flex items-center justify-between p-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded"
          @click="toggleCategory(categoryKey)"
        >
          <div class="flex items-center">
            <div 
              class="w-3 h-3 rounded-full mr-2"
              :class="`bg-${category.color}-500`"
            ></div>
            <span class="text-zinc-900 dark:text-white font-medium">{{ category.name }}</span>
          </div>
          <span class="text-zinc-500 dark:text-zinc-400 text-sm">
            {{ category.nodes.length }} nodes
          </span>
        </div>
        
        <div v-if="expandedCategories[categoryKey]" class="ml-4 mt-2">
          <div 
            v-for="node in category.nodes" 
            :key="node.id"
            class="p-2 mb-2 bg-white dark:bg-zinc-800 rounded cursor-grab hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-600 transition-all duration-200 hover:border-zinc-300 dark:hover:border-zinc-500"
            :draggable="true"
            @dragstart="onDragStart($event, node)"
            @click="onNodeSelect(node)"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="text-zinc-900 dark:text-white text-sm font-medium">{{ node.name }}</span>
              <div
                class="w-2 h-2 rounded-full"
                :class="`bg-${category.color}-400`"
              ></div>
            </div>
            
            <p class="text-zinc-600 dark:text-zinc-400 text-xs mb-2">{{ node.description }}</p>

            <div class="flex justify-between text-xs">
              <div>
                <span class="text-zinc-600 dark:text-zinc-500">In:</span>
                <span class="text-cyan-600 dark:text-cyan-400 ml-1">{{ node.inputs?.length || 0 }}</span>
              </div>
              <div>
                <span class="text-zinc-600 dark:text-zinc-500">Out:</span>
                <span class="text-pink-600 dark:text-pink-400 ml-1">{{ node.outputs?.length || 0 }}</span>
              </div>
            </div>
            
            <!-- Input/Output preview -->
            <div v-if="showIOPreview" class="mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700">
              <div v-if="node.inputs?.length" class="mb-1">
                <div class="text-zinc-600 dark:text-zinc-500 text-xs mb-1">Inputs:</div>
                <div class="flex flex-wrap gap-1">
                  <Type 
                    v-for="input in node.inputs" 
                    :key="input.name"
                    :name="input.name"
                    :type="input.type"
                  />
                </div>
              </div>
              
              <div v-if="node.outputs?.length">
                <div class="text-zinc-600 dark:text-zinc-500 text-xs mb-1">Outputs:</div>
                <div class="flex flex-wrap gap-1">
                  <Type 
                    v-for="output in node.outputs" 
                    :key="output.name"
                    :name="output.name"
                    :type="output.type"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Toggle for IO preview -->
    <div class="p-4 border-t border-zinc-200 dark:border-zinc-700">
      <label class="flex items-center text-zinc-900 dark:text-white text-sm">
        <input
          type="checkbox" 
          v-model="showIOPreview"
          class="mr-2"
        />
        Show I/O Details
      </label>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { getNodePalette } from '../utils/node-factory.js';
import { loadLanguageDefinitionsFromUrl } from '../utils/language-spec-loader.js';
import { pickDirectory } from '../utils/file-tree.js';
import { scanProject } from '../utils/project-indexer.js';
import Type from './Type.vue';

const emit = defineEmits(['node-drag-start', 'node-select']);

const searchQuery = ref('');
const showIOPreview = ref(false);
const expandedCategories = ref({});
const nodePalette = ref({});
const scanStatus = ref('');

function refreshPalette() {
  nodePalette.value = getNodePalette();
  for (const categoryKey of Object.keys(nodePalette.value)) {
    if (expandedCategories.value[categoryKey] === undefined) expandedCategories.value[categoryKey] = true;
  }
}

let defsListener = null;

onMounted(async () => {
  try { await loadLanguageDefinitionsFromUrl('/language-extras.json'); } catch {}
  refreshPalette();
  defsListener = () => refreshPalette();
  try { window.addEventListener('language-definitions-updated', defsListener); } catch {}
});

onBeforeUnmount(() => {
  try { if (defsListener) window.removeEventListener('language-definitions-updated', defsListener); } catch {}
});

const filteredPalette = computed(() => {
  if (!searchQuery.value) {
    return nodePalette.value;
  }
  
  const query = searchQuery.value.toLowerCase();
  const filtered = {};
  
  for (const [categoryKey, category] of Object.entries(nodePalette.value)) {
    const filteredNodes = category.nodes.filter(node => 
      node.name.toLowerCase().includes(query) ||
      node.description.toLowerCase().includes(query) ||
      node.id.toLowerCase().includes(query)
    );
    
    if (filteredNodes.length > 0) {
      filtered[categoryKey] = {
        ...category,
        nodes: filteredNodes
      };
    }
  }
  
  return filtered;
});

function toggleCategory(categoryKey) {
  expandedCategories.value[categoryKey] = !expandedCategories.value[categoryKey];
}

function onDragStart(event, node) {
  event.dataTransfer.setData('application/json', JSON.stringify({
    type: 'node-palette-item',
    nodeDefId: node.id,
    nodeName: node.name
  }));
  
  emit('node-drag-start', { node, event });
}

function onNodeSelect(node) {
  emit('node-select', node);
}

async function scanProjectClick() {
  try {
    scanStatus.value = 'Picking…';
    const dir = await pickDirectory();
    if (!dir) { scanStatus.value = 'Canceled'; return; }
    scanStatus.value = 'Scanning…';
    await scanProject(dir, { onProgress: (p) => { scanStatus.value = `Scanning ${p.processed}/${p.total || '?'}…`; } });
    // The indexer registers nodes and emits update event; refresh locally just in case
    refreshPalette();
    scanStatus.value = 'Done';
    setTimeout(() => { scanStatus.value = ''; }, 1500);
  } catch (e) {
    scanStatus.value = 'Failed';
    setTimeout(() => { scanStatus.value = ''; }, 2000);
  }
}
</script>

<style scoped>
.node-palette {
  scrollbar-width: thin;
  scrollbar-color: #4a5568 #2d3748;
}

.node-palette::-webkit-scrollbar {
  width: 8px;
}

.node-palette::-webkit-scrollbar-track {
  background: #2d3748;
}

.node-palette::-webkit-scrollbar-thumb {
  background: #4a5568;
  border-radius: 4px;
}

.node-palette::-webkit-scrollbar-thumb:hover {
  background: #718096;
}

/* Drag styling */
[draggable="true"]:active {
  cursor: grabbing !important;
  transform: scale(0.95);
  opacity: 0.8;
}

[draggable="true"]:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
</style>
