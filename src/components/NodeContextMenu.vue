<template>
  <div 
    v-if="visible"
    class="context-menu fixed bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50 min-w-48"
    :style="{ top: position.y + 'px', left: position.x + 'px' }"
    @click.stop
  >
    <div class="py-2">
      <!-- Node Info Header -->
      <div class="px-3 py-2 border-b border-zinc-600">
        <div class="text-white text-sm font-semibold">{{ node?.name || `Node ${node?.id}` }}</div>
        <div class="text-zinc-400 text-xs">{{ node?.nodeDefId || node?.type }}</div>
      </div>
      
      <!-- Node Actions -->
      <div class="px-3 py-1 text-xs font-semibold text-zinc-400 uppercase">Actions</div>
      
      <button 
        @click="handleAction('duplicate')"
        class="w-full text-left px-3 py-2 hover:bg-zinc-700 text-white text-sm flex items-center"
      >
        <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Duplicate
      </button>
      
      <button 
        @click="handleAction('copy')"
        class="w-full text-left px-3 py-2 hover:bg-zinc-700 text-white text-sm flex items-center"
      >
        <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Copy
      </button>
      
      <button 
        @click="handleAction('edit')"
        class="w-full text-left px-3 py-2 hover:bg-zinc-700 text-white text-sm flex items-center"
      >
        <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        Edit Properties
      </button>
      
      <div class="border-t border-zinc-600 my-2"></div>
      
      <!-- Dangerous Actions -->
      <div class="px-3 py-1 text-xs font-semibold text-red-400 uppercase">Danger Zone</div>
      
      <button 
        @click="handleAction('disconnect')"
        class="w-full text-left px-3 py-2 hover:bg-zinc-700 text-orange-300 text-sm flex items-center"
      >
        <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
        Disconnect All
      </button>
      
      <button 
        @click="handleAction('delete')"
        class="w-full text-left px-3 py-2 hover:bg-red-700 text-red-300 text-sm flex items-center"
      >
        <svg class="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete Node
      </button>
    </div>
  </div>
</template>

<script setup>
import { watch } from 'vue';

const props = defineProps({
  visible: Boolean,
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  node: {
    type: Object,
    default: null
  }
});

const emit = defineEmits(['action', 'close']);

function handleAction(actionType) {
  emit('action', {
    type: actionType,
    node: props.node,
    position: props.position
  });
  emit('close');
}

// Close when clicking outside or pressing escape
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    // Add click listener to close menu when clicking outside
    setTimeout(() => {
      document.addEventListener('click', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }, 0);
  } else {
    document.removeEventListener('click', handleOutsideClick);
    document.removeEventListener('keydown', handleKeyDown);
  }
});

function handleOutsideClick() {
  emit('close');
}

function handleKeyDown(event) {
  if (event.key === 'Escape') {
    emit('close');
  }
}
</script>

<style scoped>
.context-menu {
  /* Ensure the menu doesn't go off-screen */
  max-height: 80vh;
  overflow-y: auto;
}

/* Smooth entrance animation */
.context-menu {
  animation: contextMenuSlide 0.15s ease-out;
}

@keyframes contextMenuSlide {
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
