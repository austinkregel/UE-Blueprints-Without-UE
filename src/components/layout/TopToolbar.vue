<template>
  <div class="px-4 py-2 flex flex-wrap gap-2 items-center overflow-x-auto">
    <button @click="$emit('toggle-palette')" class="bg-blue-700 hover:bg-blue-800 text-white rounded px-3 py-1.5 text-sm">
      {{ showNodePalette ? 'Hide' : 'Show' }} Palette
    </button>

    <NodeDropdown title="Add Node" @node-select="onNodeSelect" />

    <button @click="$emit('toggle-debug')" class="bg-gray-700 hover:bg-gray-800 text-white rounded px-3 py-1.5 text-sm">
      {{ debugMode ? 'Disable Debug' : 'Enable Debug' }}
    </button>

    <button @click="$emit('reset-viewport')" class="bg-gray-700 hover:bg-gray-800 text-white rounded px-3 py-1.5 text-sm">Reset View</button>

    <button @click="$emit('run-graph')" :disabled="isExecuting" :class="isExecuting ? 'bg-orange-600' : 'bg-green-700 hover:bg-green-800'" class="text-white rounded px-3 py-1.5 text-sm transition-colors disabled:opacity-50">
      {{ isExecuting ? 'Running...' : 'Run Graph' }}
    </button>

    <button v-if="isExecuting" @click="$emit('stop-execution')" class="bg-red-700 hover:bg-red-800 text-white rounded px-3 py-1.5 text-sm">Stop</button>

    <button @click="$emit('clear-results')" class="bg-gray-700 hover:bg-gray-800 text-white rounded px-3 py-1.5 text-sm">Clear Results</button>

    <button @click="$emit('create-test-graph')" class="bg-purple-700 hover:bg-purple-800 text-white rounded px-3 py-1.5 text-sm">Create Test Graph</button>

    <button @click="$emit('open-entry-points')" class="bg-orange-700 hover:bg-orange-800 text-white rounded px-3 py-1.5 text-sm">Entry Points</button>

    <button @click="$emit('open-events')" class="bg-teal-700 hover:bg-teal-800 text-white rounded px-3 py-1.5 text-sm">Events</button>

    <button @click="$emit('open-ast-tools')" class="bg-indigo-700 hover:bg-indigo-800 text-white rounded px-3 py-1.5 text-sm">AST</button>

    <!-- New: Open Project -->
    <button @click="$emit('open-project')" class="bg-emerald-700 hover:bg-emerald-800 text-white rounded px-3 py-1.5 text-sm">Open Project</button>

    <div class="text-xs text-zinc-600 dark:text-zinc-300 ml-auto flex items-center gap-3">
      <span>Right-click + drag to pan | Mouse wheel to zoom</span>
      <span v-if="debugMode">X: {{ Math.round(viewport.x) }}, Y: {{ Math.round(viewport.y) }}, Zoom: {{ viewport.zoom.toFixed(2) }}</span>
      <span v-if="executionSummary?.isComplete || isExecuting" class="text-xs">
        <span class="text-green-600 dark:text-green-400" v-if="executionSummary?.isComplete && executionSummary?.errors === 0">✅ {{ executionSummary.executedNodes }}/{{ executionSummary.totalNodes }}</span>
        <span class="text-yellow-600 dark:text-yellow-400" v-else-if="executionSummary?.isComplete && executionSummary?.errors > 0">⚠️ {{ executionSummary.executedNodes }}/{{ executionSummary.totalNodes }} ({{ executionSummary.errors }} errors)</span>
        <span class="text-blue-600 dark:text-blue-400" v-else-if="isExecuting">🔄 {{ executionSummary?.executedNodes }} done</span>
      </span>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits, defineAsyncComponent } from 'vue';

const props = defineProps({
  showNodePalette: { type: Boolean, default: true },
  debugMode: { type: Boolean, default: false },
  isExecuting: { type: Boolean, default: false },
  viewport: { type: Object, required: true },
  executionSummary: { type: Object, required: true }
});

const emit = defineEmits([
  'toggle-palette',
  'toggle-debug',
  'reset-viewport',
  'run-graph',
  'stop-execution',
  'clear-results',
  'create-test-graph',
  'open-entry-points',
  'open-events',
  'add-node-from-dropdown',
  'open-ast-tools',
  // new
  'open-project'
]);

const NodeDropdown = defineAsyncComponent(() => import('../NodeDropdown.vue'));

function onNodeSelect(node) {
  emit('add-node-from-dropdown', node.id);
}
</script>
