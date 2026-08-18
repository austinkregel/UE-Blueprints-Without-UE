<template>
    <div v-if="logs.length > 0" class="bp-panel right w-80 shrink-0">
        <div class="bp-panel-head justify-between">
            <h3 class="bp-sec-label">Execution Log</h3>
            <button class="bp-btn !h-7 !px-2 text-xs" @click="$emit('clear')">Clear</button>
        </div>
        <div class="flex-1 space-y-2 overflow-y-auto p-3">
            <div
                v-for="(log, index) in logs"
                :key="index"
                class="mono rounded-md border border-[var(--line-soft)] bg-[var(--panel-2)] p-2 text-xs text-[var(--ink-2)]"
            >
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
