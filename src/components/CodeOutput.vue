<template>
    <div v-if="visible" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/60" @click.self="$emit('close')">
        <div class="bp-popup flex max-h-[80vh] w-[720px] max-w-[92vw] flex-col">
            <div class="bp-panel-head">
                <span class="bp-sec-label">Compiled · {{ language }}</span>
                <button class="bp-btn ml-auto !h-7 !px-2 text-xs" @click="copy">{{ copied ? 'Copied' : 'Copy' }}</button>
                <button class="bp-btn !h-7 !px-2 text-xs" @click="$emit('close')">Close</button>
            </div>
            <pre class="flex-1 overflow-auto p-3 text-[12px] leading-relaxed" style="font-family: var(--font-mono); color: var(--ink)">{{
                code
            }}</pre>
        </div>
    </div>
</template>

<script setup>
    import { ref } from 'vue';

    const props = defineProps({
        visible: { type: Boolean, default: false },
        code: { type: String, default: '' },
        language: { type: String, default: 'code' }
    });
    defineEmits(['close']);

    const copied = ref(false);
    function copy() {
        try {
            navigator.clipboard?.writeText(props.code);
            copied.value = true;
            setTimeout(() => (copied.value = false), 1500);
        } catch {
            /* clipboard may be unavailable */
        }
    }
</script>
