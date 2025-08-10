<template>
  <div v-if="visible" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-zinc-800 rounded-lg shadow-xl w-96 max-h-96 flex flex-col">
      <!-- Header -->
      <div class="flex items-center justify-between p-4 border-b border-zinc-700">
        <h3 class="text-lg font-semibold text-white">Event System</h3>
        <button @click="$emit('close')" class="text-zinc-400 hover:text-white">
          ×
        </button>
      </div>
      
      <!-- Content -->
      <div class="flex-1 overflow-y-auto p-4">
        <!-- Emit Event Section -->
        <div class="mb-4">
          <h4 class="text-sm font-medium text-zinc-300 mb-2">Emit Event</h4>
          <div class="space-y-2">
            <input 
              v-model="eventName"
              placeholder="Event name"
              class="w-full bg-zinc-700 text-white p-2 rounded text-sm"
            />
            <textarea 
              v-model="eventData"
              placeholder="Event data (JSON)"
              class="w-full bg-zinc-700 text-white p-2 rounded text-sm resize-none"
              rows="3"
            ></textarea>
            <button 
              @click="emitCustomEvent"
              class="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm w-full"
              :disabled="!eventName.trim()"
            >
              Emit Event
            </button>
          </div>
        </div>
        
        <!-- Active Events -->
        <div class="mb-4">
          <h4 class="text-sm font-medium text-zinc-300 mb-2">Recent Events</h4>
          <div v-if="recentEvents.length === 0" class="text-zinc-500 text-sm">
            No events emitted yet
          </div>
          <div v-else class="space-y-2 max-h-32 overflow-y-auto">
            <div 
              v-for="event in recentEvents" 
              :key="event.name + event.timestamp"
              class="bg-zinc-700 p-2 rounded"
            >
              <div class="text-white text-sm font-medium">{{ event.name }}</div>
              <div class="text-zinc-400 text-xs">
                {{ new Date(event.timestamp).toLocaleTimeString() }}
              </div>
              <div v-if="Object.keys(event.data).length > 0" class="text-zinc-300 text-xs mt-1">
                Data: {{ JSON.stringify(event.data) }}
              </div>
            </div>
          </div>
        </div>
        
        <!-- Event Listeners -->
        <div>
          <h4 class="text-sm font-medium text-zinc-300 mb-2">Event Listeners</h4>
          <div v-if="eventTypes.length === 0" class="text-zinc-500 text-sm">
            No event listeners configured
          </div>
          <div v-else class="space-y-2">
            <div 
              v-for="eventType in eventTypes" 
              :key="eventType"
              class="bg-zinc-700 p-2 rounded"
            >
              <div class="text-white text-sm font-medium">{{ eventType }}</div>
              <div class="text-zinc-400 text-xs">
                {{ getEventListeners(eventType).length }} listener(s)
              </div>
              <div class="mt-1 space-y-1">
                <div 
                  v-for="nodeId in getEventListeners(eventType)" 
                  :key="nodeId"
                  class="text-zinc-300 text-xs"
                >
                  → {{ getNodeDisplayName(nodeId) }} ({{ nodeId }})
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="p-4 border-t border-zinc-700">
        <div class="text-xs text-zinc-400">
          Use "On Event" nodes to listen for events. Use "Emit Event" nodes to trigger events from the graph.
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { nodes } from '../utils/state.js';
import { 
  emitEvent,
  getAllEvents,
  getEventListeners as getListeners,
  activeEvents
} from '../utils/graph-executor.js';

const emit = defineEmits(['close']);

defineProps({
  visible: Boolean
});

// Local state
const eventName = ref('');
const eventData = ref('{}');

// Computed properties
const eventTypes = computed(() => getAllEvents());

const recentEvents = computed(() => {
  return Array.from(activeEvents.value.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10); // Show last 10 events
});

// Helper functions
function getNodeDisplayName(nodeId) {
  const node = nodes.value.find(n => n.id === nodeId);
  if (!node) return 'Unknown Node';
  
  return node.name || node.nodeDefId || node.funcName || node.systemName || node.type || 'Unknown';
}

function getEventListeners(eventType) {
  return getListeners(eventType);
}

function emitCustomEvent() {
  if (!eventName.value.trim()) return;
  
  let data = {};
  try {
    data = JSON.parse(eventData.value || '{}');
  } catch (error) {
    console.warn('Invalid JSON data, using empty object:', error);
    data = {};
  }
  
  emitEvent(eventName.value.trim(), data);
  
  // Clear form
  eventName.value = '';
  eventData.value = '{}';
}
</script>
