<template>
    <div v-if="logs.length > 0" class="flex w-80 shrink-0 flex-col border-l border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
        <div class="flex items-center justify-between border-b border-zinc-200 p-4 dark:border-zinc-700">
            <h3 class="text-lg font-semibold text-zinc-900 dark:text-white">Execution Log</h3>
            <button class="text-sm text-zinc-600 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white" @click="$emit('clear')">Clear</button>
        </div>
        <div class="flex-1 space-y-2 overflow-y-auto p-4">
            <div v-for="(log, index) in logs" :key="index" class="rounded bg-zinc-100 p-2 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                {{ log }}
            </div>
        </div>
    </div>
</template>

<script setup>
    import { defineEmits, defineProps } from 'vue';

    defineProps({
        logs: { type: Array, default: () => [] }
    });

    defineEmits(['clear']);
</script>
