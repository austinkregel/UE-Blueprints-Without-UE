<template>
  <div v-if="visible" class="fixed inset-0 bg-black/40 dark:bg-black/60 flex items-center justify-center z-50">
    <div class="bg-white dark:bg-zinc-800 rounded-lg shadow-xl w-96 max-h-96 flex flex-col border border-zinc-200 dark:border-zinc-700">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-700">
        <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">Entry Points</h3>
        <button @click="$emit('close')" class="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
          ×
        </button>
      </div>
      
      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Current Entry Points -->
        <div class="mb-4">
          <h4 class="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Configured Entry Points</h4>
          <div v-if="entryPoints.length === 0" class="text-zinc-500 text-sm">
            No entry points configured. Select nodes below to add them.
          </div>
          <div v-else class="space-y-2">
            <div 
              v-for="nodeId in entryPoints" 
              :key="nodeId"
              class="flex items-center justify-between bg-zinc-100 dark:bg-zinc-700 p-2 rounded border border-zinc-200 dark:border-zinc-600"
            >
              <div class="flex-1">
                <div class="text-zinc-900 dark:text-white text-sm font-medium">
                  {{ getNodeDisplayName(nodeId) }}
                </div>
                <div class="text-zinc-500 dark:text-zinc-400 text-xs">
                  ID: {{ nodeId }}
                </div>
              </div>
              <div class="flex gap-2">
                <button 
                  @click="executeFromNode(nodeId)"
                  class="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs"
                  :disabled="isExecuting"
                >
                  Run
                </button>
                <button 
                  @click="removeEntryPoint(nodeId)"
                  class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Available Nodes -->
        <div>
          <h4 class="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Available Nodes</h4>
          <div class="space-y-1 max-h-40 overflow-y-auto">
            <div 
              v-for="node in availableNodes" 
              :key="node.id"
              class="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 p-2 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700"
            >
              <div class="flex-1">
                <div class="text-zinc-900 dark:text-white text-sm">
                  {{ node.nodeDefId || node.type || 'Unknown' }}
                </div>
                <div class="text-zinc-500 dark:text-zinc-400 text-xs">
                  ID: {{ node.id }}
                </div>
              </div>
              <button 
                @click="addEntryPoint(node.id)"
                :disabled="isEntryPoint(node.id)"
                class="bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-300 dark:disabled:bg-zinc-600 disabled:cursor-not-allowed text-white px-2 py-1 rounded text-xs"
              >
                {{ isEntryPoint(node.id) ? 'Added' : 'Add' }}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="p-4 border-t border-zinc-200 dark:border-zinc-700 flex gap-2">
        <button
          @click="clearAllEntryPoints"
          class="bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm"
          :disabled="entryPoints.length === 0"
        >
          Clear All
        </button>
        <button 
          @click="runAllEntryPoints"
          class="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm"
          :disabled="entryPoints.length === 0 || isExecuting"
        >
          Run All
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { nodes } from '../utils/state.js';
import { 
  configuredEntryPoints,
  isExecuting,
  addEntryPoint as addEntryPointToConfig,
  removeEntryPoint as removeEntryPointFromConfig,
  clearEntryPoints,
  executeFromEntryPoint,
  executeGraph,
  isEntryPoint as checkIsEntryPoint
} from '../utils/graph-executor.js';

const emit = defineEmits(['close']);

defineProps({
  visible: Boolean
});

// Computed properties
const entryPoints = computed(() => Array.from(configuredEntryPoints.value));

const availableNodes = computed(() => {
  return nodes.value.filter(node => {
    // Show all nodes that can potentially be entry points
    // Function nodes, system nodes, or nodes with exec outputs
    const hasExecOutput = node.outputs?.some(output => output.type === 'exec');
    const isFunction = node.type === 'function';
    const isSystem = node.type === 'system';
    
    return hasExecOutput || isFunction || isSystem;
  });
});

// Helper functions
function getNodeDisplayName(nodeId) {
  const node = nodes.value.find(n => n.id === nodeId);
  if (!node) return 'Unknown Node';
  
  return node.name || node.nodeDefId || node.funcName || node.systemName || node.type || 'Unknown';
}

function addEntryPoint(nodeId) {
  addEntryPointToConfig(nodeId);
}

function removeEntryPoint(nodeId) {
  removeEntryPointFromConfig(nodeId);
}

function isEntryPoint(nodeId) {
  return checkIsEntryPoint(nodeId);
}

function clearAllEntryPoints() {
  clearEntryPoints();
}

async function executeFromNode(nodeId) {
  try {
    await executeFromEntryPoint(nodeId);
  } catch (error) {
    console.error('Failed to execute from entry point:', error);
  }
}

async function runAllEntryPoints() {
  try {
    await executeGraph();
  } catch (error) {
    console.error('Failed to execute graph:', error);
  }
}
</script>
