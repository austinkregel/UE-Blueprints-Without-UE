<template>
    <div class="flex border-r border-zinc-200 bg-white/80 dark:border-zinc-700 dark:bg-zinc-900/80">
        <div class="flex w-48 flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-transparent">
            <div class="flex items-center gap-2 border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
                <span class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">Workflows</span>
                <button
                    class="ml-auto rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-800"
                    @click="addTab"
                >
                    New
                </button>
            </div>
            <div class="flex flex-col overflow-y-auto">
                <div
                    v-for="tab in tabs"
                    :key="tab.id"
                    class="cursor-pointer px-4 py-2"
                    :class="{
                        'bg-emerald-600 text-white': activeTab === tab.id,
                        'bg-zinc-50 text-zinc-700 dark:bg-transparent dark:text-zinc-200': activeTab !== tab.id
                    }"
                    @click="switchTab(tab.id)"
                >
                    {{ tab.name }}
                    <button class="ml-2 text-xs" @click.stop="closeTab(tab.id)">x</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { computed } from 'vue';
    import { createWorkspace, deleteWorkspace, switchWorkspace, workspaceState } from '../../utils/state';

    const tabs = computed(() => {
        return Object.keys(workspaceState.workspaces).map((id) => ({
            id,
            name: workspaceState.workspaces[id].name || `Workflow ${id}`
        }));
    });

    const activeTab = computed(() => workspaceState.activeWorkspaceId);

    function addTab() {
        const newTabId = Date.now();
        createWorkspace(newTabId, {
            name: `Workflow ${tabs.value.length}`
        });
        switchWorkspace(newTabId);
    }

    function switchTab(tabId) {
        switchWorkspace(tabId);
    }

    function closeTab(tabId) {
        deleteWorkspace(tabId);
    }
</script>
