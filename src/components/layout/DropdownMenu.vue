<template>
    <Menu as="div" class="relative inline-block text-left">
        <MenuButton :class="['cursor-pointer rounded px-3 py-1.5 text-sm text-white', buttonClass]">
            <span class="flex items-center gap-1">
                {{ label }}
                <svg aria-hidden="true" class="h-3 w-3 opacity-80" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                    <path
                        clip-rule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                        fill-rule="evenodd"
                    />
                </svg>
            </span>
        </MenuButton>
        <MenuItems
            :class="[
                'absolute z-50 mt-2 origin-top-left rounded-md bg-white shadow-lg ring-1 ring-black/5 focus:outline-none dark:bg-zinc-800',
                widthClass
            ]"
        >
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
        buttonClass: { type: String, default: 'bg-gray-700 hover:bg-gray-800' },
        widthClass: { type: String, default: 'w-56' }
    });
</script>
