<template>
    <span class="pointer-events-none inline-flex items-center rounded px-2 py-1 text-xs font-medium">
        {{ name }}
    </span>
</template>

<script setup>
    defineProps({
        name: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true
        }
    });
</script>

<style scoped>
    /* Additional styling if needed */
</style>
