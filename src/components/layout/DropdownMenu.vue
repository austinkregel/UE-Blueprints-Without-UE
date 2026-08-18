<template>
    <Menu as="div" class="relative inline-block text-left">
        <MenuButton :class="['cursor-pointer', buttonClass]">
            <span class="flex items-center gap-1">
                {{ label }}
                <svg aria-hidden="true" class="h-3 w-3 opacity-70" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path
                        clip-rule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                        fill-rule="evenodd"
                    />
                </svg>
            </span>
        </MenuButton>
        <MenuItems :class="['bp-dropdown-panel absolute z-50 mt-2 origin-top-left focus:outline-none', widthClass]">
            <div class="py-1">
                <slot />
            </div>
        </MenuItems>
    </Menu>
</template>

<script setup>
    import { defineProps } from 'vue';
    import { Menu, MenuButton, MenuItems } from '@headlessui/vue';

    defineProps({
        label: { type: String, required: true },
        buttonClass: { type: String, default: 'bp-tbtn' },
        widthClass: { type: String, default: 'w-56' }
    });
</script>

<style scoped>
    .bp-dropdown-panel {
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 8px;
        color: var(--ink);
        box-shadow: 0 18px 40px -16px rgba(0, 0, 0, 0.7);
    }

    /* Dark-theme styling for slotted menu items (deep because slot content
       is owned by the parent). Items sit flat and raise on hover/active. */
    .bp-dropdown-panel :deep(button) {
        color: var(--ink-2);
        font-family: var(--font-ui);
    }
    .bp-dropdown-panel :deep(button:hover),
    .bp-dropdown-panel :deep(.bg-zinc-100),
    .bp-dropdown-panel :deep(.dark\:bg-zinc-700) {
        background: var(--raised);
        color: var(--ink);
    }
    .bp-dropdown-panel :deep(button:disabled) {
        color: var(--ink-4);
    }
</style>
