<template>
    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path :d="pentagonPath" :fill="active ? '#ffffff' : 'none'" :stroke="active ? 'none' : '#ffffff'" stroke-width="2" stroke-linejoin="round" />
    </svg>
</template>

<script setup>
    import { computed, defineProps } from 'vue';

    const { active } = defineProps({
        active: {
            type: Boolean,
            default: false
        }
    });

    const pentagonPath = computed(() => {
        // Active (filled) version - slightly smaller
        if (active) {
            return 'M5.13555 4H12.1355L20 11.5L12.1355 20.1355H5.13555L5.13555 4Z';
        }
        // Inactive (outline) version - slightly larger
        return 'M11.7352 5L18.6023 11.5488L11.6932 19.1357H6.13555V5H11.7352Z';
    });
</script>

<style scoped>
    svg {
        @apply block cursor-pointer;
    }
</style>
