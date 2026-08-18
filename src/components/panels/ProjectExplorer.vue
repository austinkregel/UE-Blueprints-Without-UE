<template>
    <div class="flex">
        <div class="bp-panel left w-48">
            <div class="bp-panel-head">
                <span class="bp-sec-label">Workflows</span>
                <button class="bp-btn primary ml-auto !h-7 !px-2 text-xs" @click="addTab">New</button>
            </div>
            <div class="flex flex-col gap-0.5 overflow-y-auto p-1.5">
                <div
                    v-for="tab in tabs"
                    :key="tab.id"
                    class="bp-row justify-between"
                    :class="{ sel: activeTab === tab.id }"
                    @click="switchTab(tab.id)"
                >
                    <span class="truncate">{{ tab.name }}</span>
                    <button class="ml-2 text-xs text-[var(--ink-3)] hover:text-[var(--ink)]" @click.stop="closeTab(tab.id)">x</button>
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
