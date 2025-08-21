<template>
  <div
      v-if="visible"
      :style="{ top: position.y + 'px', left: position.x + 'px' }"
      class="context-menu fixed z-50 min-w-48 rounded-lg border border-zinc-200 bg-white shadow-xl dark:border-zinc-600 dark:bg-zinc-800"
      @click.stop
  >
    <div class="py-2">
      <!-- Quick Actions -->
      <div class="px-3 py-1 text-xs font-semibold text-zinc-500 uppercase dark:text-zinc-400">Quick Actions</div>
      <button
          class="flex w-full items-center px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-700"
          @click="handleAction('addNode')"
      >
        <span class="mr-3 h-2 w-2 rounded-full bg-cyan-500"></span>
        Quick Node
      </button>
      <button
          class="flex w-full items-center px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-700"
          @click="handleAction('addActionNode')"
      >
        <span class="mr-3 h-2 w-2 rounded-full bg-yellow-500"></span>
        Action Node
      </button>
      <button
          class="flex w-full items-center px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-700"
          @click="handleAction('addSystemNode')"
      >
        <span class="mr-3 h-2 w-2 rounded-full bg-green-500"></span>
        System Node
      </button>

      <div class="my-2 border-t border-zinc-200 dark:border-zinc-600"></div>

      <!-- Advanced -->
      <div class="px-3 py-1 text-xs font-semibold text-zinc-500 uppercase dark:text-zinc-400">Advanced</div>
      <button
          class="flex w-full items-center px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-white dark:hover:bg-zinc-700"
          @click="handleAction('showNodeDropdown')"
      >
        <span class="mr-3 h-2 w-2 rounded-full bg-blue-500"></span>
        Browse All Nodes...
      </button>
    </div>
  </div>
</template>

<script setup>
import {watch} from 'vue';

const props = defineProps({
  visible: Boolean,
  position: {
    type: Object,
    default: () => ({x: 0, y: 0})
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
watch(
    () => props.visible,
    (newVisible) => {
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
    }
);

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
