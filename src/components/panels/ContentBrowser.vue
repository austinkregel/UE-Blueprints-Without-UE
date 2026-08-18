<template>
    <div class="bp-tray" :class="{ collapsed }">
        <div class="bp-tray-head">
            <button class="bp-tray-toggle" :title="collapsed ? 'Expand content browser' : 'Collapse content browser'" @click="collapsed = !collapsed">
                <span class="tw" :class="{ 'rotate-90': !collapsed }">▸</span>
                <span class="bp-sec-label">Content</span>
            </button>
            <span class="bp-tray-count">{{ tree.count }}</span>
            <div class="bp-filter bp-tray-filter">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M21 21l-4.3-4.3" stroke-linecap="round" />
                </svg>
                <input v-model="filter" placeholder="Filter…" />
            </div>
        </div>

        <div v-show="!collapsed" class="bp-tray-body">
            <div v-if="tree.count === 0" class="bp-tray-empty">No content source. Install a domain plugin to browse its documents here.</div>
            <div v-else class="bp-tray-rows">
                <div
                    v-for="row in rows"
                    :key="row.key"
                    class="bp-trow"
                    :class="{ folder: row.type === 'folder', file: row.type === 'file', sel: row.type === 'file' && row.entry.id === activeId }"
                    :style="{ paddingLeft: 8 + row.depth * 14 + 'px' }"
                    @click="onRowClick(row)"
                >
                    <template v-if="row.type === 'folder'">
                        <span class="tw flex-none" :class="{ 'rotate-90': expanded.has(row.key) }">▸</span>
                        <svg class="ic flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
                            <path d="M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        </svg>
                        <span class="nm">{{ row.node.name }}</span>
                        <span class="ct">{{ row.node.count }}</span>
                    </template>
                    <template v-else>
                        <NodeGlyph
                            :name="row.entry.icon || 'mission'"
                            class="ic flex-none"
                            :class="`na-${row.entry.color || 'gray'}`"
                            style="color: var(--na)"
                        />
                        <span class="nm">{{ row.entry.name }}</span>
                        <span v-if="filter && row.path" class="pth">{{ row.path }}</span>
                        <span v-if="row.entry.meta && row.entry.meta.kind" class="kd">{{ row.entry.meta.kind }}</span>
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
    import { computed, ref, watch } from 'vue';
    import { buildContentTree, contentRevision, getContentEntries } from '../../utils/content-browser.js';
    import NodeGlyph from '../icons/NodeGlyph.vue';

    defineProps({ activeId: { type: [String, Number], default: null } });
    const emit = defineEmits(['open-entry']);

    const filter = ref('');
    const collapsed = ref(false);
    const expanded = ref(new Set());

    // Re-read the source whenever a plugin (re)registers it — plugins populate the
    // content source asynchronously, after fetching their catalog.
    const entries = computed(() => {
        void contentRevision.value;
        return getContentEntries();
    });
    const tree = computed(() => buildContentTree(entries.value));

    // Auto-expand the top-level folders the first time content shows up, so the
    // boot state reveals the project's shape instead of a wall of collapsed rows.
    watch(
        tree,
        (t) => {
            if (expanded.value.size === 0) {
                const next = new Set();
                for (const f of t.folders) next.add(f.path.join('/'));
                expanded.value = next;
            }
        },
        { immediate: true }
    );

    function toggleFolder(key) {
        const next = new Set(expanded.value);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        expanded.value = next;
    }

    function onRowClick(row) {
        if (row.type === 'folder') toggleFolder(row.key);
        else emit('open-entry', row.entry);
    }

    function walk(folder, depth, acc) {
        for (const f of folder.folders) {
            const key = f.path.join('/');
            acc.push({ type: 'folder', depth, node: f, key });
            if (expanded.value.has(key)) walk(f, depth + 1, acc);
        }
        for (const e of folder.files) {
            acc.push({ type: 'file', depth, entry: e, key: `f:${e.id}` });
        }
    }

    function collectFiles(folder, acc) {
        for (const f of folder.folders) collectFiles(f, acc);
        for (const e of folder.files) acc.push({ entry: e, path: folder.path.join(' / ') });
    }

    // Filtering flattens to matching files (folder collapse ignored); otherwise a
    // depth-first tree honoring the expanded set.
    const rows = computed(() => {
        const q = filter.value.trim().toLowerCase();
        if (q) {
            const files = [];
            collectFiles(tree.value, files);
            return files
                .filter(({ entry }) =>
                    String(entry.name ?? entry.id)
                        .toLowerCase()
                        .includes(q)
                )
                .map(({ entry, path }) => ({ type: 'file', depth: 0, entry, path, key: `f:${entry.id}` }));
        }
        const acc = [];
        walk(tree.value, 0, acc);
        return acc;
    });
</script>
