<template>
  <div 
    v-if="visible"
    class="context-menu fixed bg-zinc-800 border border-zinc-600 rounded-lg shadow-xl z-50 min-w-48"
    :style="{ top: position.y + 'px', left: position.x + 'px' }"
    @click.stop
  >
    <div class="py-2">
      <!-- Quick Actions -->
      <div class="px-3 py-1 text-xs font-semibold text-zinc-400 uppercase">Quick Actions</div>
      <button 
        @click="handleAction('addNode')"
        class="w-full text-left px-3 py-2 hover:bg-zinc-700 text-white text-sm flex items-center"
      >
        <span class="w-2 h-2 bg-cyan-500 rounded-full mr-3"></span>
        Quick Node
      </button>
      <button 
        @click="handleAction('addActionNode')"
        class="w-full text-left px-3 py-2 hover:bg-zinc-700 text-white text-sm flex items-center"
      >
        <span class="w-2 h-2 bg-yellow-500 rounded-full mr-3"></span>
        Action Node
      </button>
      <button 
        @click="handleAction('addSystemNode')"
        class="w-full text-left px-3 py-2 hover:bg-zinc-700 text-white text-sm flex items-center"
      >
        <span class="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
        System Node
      </button>
      
      <div class="border-t border-zinc-600 my-2"></div>
      
      <!-- Advanced -->
      <div class="px-3 py-1 text-xs font-semibold text-zinc-400 uppercase">Advanced</div>
      <button 
        @click="handleAction('showNodeDropdown')"
        class="w-full text-left px-3 py-2 hover:bg-zinc-700 text-white text-sm flex items-center"
      >
        <span class="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
        Browse All Nodes...
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  visible: Boolean,
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
});

const emit = defineEmits(['action', 'close']);

function handleAction(actionType) {
  emit('action', {
    type: actionType,
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
