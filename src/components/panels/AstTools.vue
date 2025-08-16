<template>
  <div class="w-[28rem] shrink-0 border-l border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-950/80 backdrop-blur flex flex-col">
    <!-- Header -->
    <div class="p-2 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
      <!-- Language selector -->
      <Listbox v-model="language" as="div" class="relative">
        <ListboxButton class="inline-flex items-center gap-2 rounded px-2 py-1 text-sm bg-white dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 shadow-sm ring-1 ring-inset ring-zinc-200 dark:ring-zinc-700/60 hover:bg-zinc-50 dark:hover:bg-zinc-800">
          <span class="size-2 rounded-full" :class="langDotClass(language)"></span>
          <span class="min-w-16 text-left">{{ langLabel(language) }}</span>
          <svg class="size-4 text-zinc-500 dark:text-zinc-400" viewBox="0 0 20 20" fill="currentColor"><path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z"/></svg>
        </ListboxButton>
        <ListboxOptions class="absolute z-10 mt-1 w-40 rounded bg-white dark:bg-zinc-900/95 ring-1 ring-zinc-200 dark:ring-zinc-700/60 shadow-lg focus:outline-none">
          <ListboxOption v-for="opt in languageOptions" :key="opt.id" :value="opt.id" as="template" v-slot="{ active, selected }">
            <li :class="['px-2 py-1.5 text-sm flex items-center gap-2 cursor-default', active ? 'bg-zinc-50 dark:bg-zinc-800/80' : '']">
              <span class="size-2 rounded-full" :class="langDotClass(opt.id)"></span>
              <span class="flex-1" :class="selected ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-200'">{{ opt.label }}</span>
            </li>
          </ListboxOption>
        </ListboxOptions>
      </Listbox>

      <button @click="parse" class="bg-blue-600 hover:bg-blue-500 text-white rounded px-2 py-1 text-sm">Parse</button>
      <button @click="importGraph" :disabled="!canImport" class="rounded px-2 py-1 text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed bg-emerald-600 hover:bg-emerald-500">Import</button>
      <button @click="toPython" :disabled="!canGenerate" class="rounded px-2 py-1 text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed bg-indigo-600 hover:bg-indigo-500">→ Python</button>
      <button @click="toElixir" :disabled="!canGenerate" class="rounded px-2 py-1 text-sm text-white disabled:opacity-40 disabled:cursor-not-allowed bg-fuchsia-600 hover:bg-fuchsia-500">→ Elixir</button>

      <button @click="pickAndScan" :disabled="language !== 'php'" class="ml-auto bg-teal-700 hover:bg-teal-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded px-2 py-1 text-sm">Scan Project…</button>
      <span class="text-xs text-zinc-600 dark:text-zinc-400">{{ summary }}</span>
    </div>

    <TabGroup as="div" class="flex-1 min-h-0 flex flex-col">
      <TabList class="px-2 py-1 border-b border-zinc-200 dark:border-zinc-700 flex items-center gap-2">
        <Tab as="template" v-slot="{ selected }">
          <button :class="['px-2 py-1 rounded text-sm', selected ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60']">Source</button>
        </Tab>
        <Tab as="template" v-slot="{ selected }">
          <button :class="['px-2 py-1 rounded text-sm', selected ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800/60']">Results</button>
        </Tab>
      </TabList>
      <TabPanels class="flex-1 min-h-0">
        <!-- Source panel -->
        <TabPanel class="flex-1 min-h-0">
          <textarea v-model="code" class="w-full h-full bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-2 text-xs font-mono resize-none outline-none" :placeholder="`Paste source (${langLabel(language)})`"></textarea>
        </TabPanel>
        <!-- Results panel -->
        <TabPanel class="flex-1 min-h-0 grid grid-cols-2 gap-px bg-zinc-100 dark:bg-zinc-800/40">
          <div class="p-2 overflow-auto text-xs text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900">
            <div class="font-semibold mb-2">Parsed Output</div>
            <template v-if="language === 'php' && ir">
              <div class="font-semibold mb-1">Live IR</div>
              <pre class="whitespace-pre-wrap">{{ prettyIr }}</pre>
              <div class="mt-2">Nodes: {{ nodes.length }}, Connections: {{ connections.length }}</div>
            </template>
            <template v-else>
              <div class="font-semibold mb-1">Symbols ({{ symbolCount }})</div>
              <ul class="space-y-1">
                <li v-for="(s, i) in symbols" :key="i" class="flex items-center gap-2">
                  <span class="inline-block rounded px-1 py-0.5 text-[10px] uppercase tracking-wide" :class="symbolPillClass(s.kind)">{{ s.kind }}</span>
                  <span class="text-zinc-800 dark:text-zinc-200">{{ s.name }}</span>
                </li>
              </ul>
              <div class="mt-3 font-semibold mb-1">Raw</div>
              <pre class="whitespace-pre-wrap">{{ prettyNorm }}</pre>
            </template>
            <div v-if="warnings.length" class="text-amber-600 dark:text-amber-400 mt-2">Warnings:
              <ul class="list-disc ml-5">
                <li v-for="(w,i) in warnings" :key="i">{{ w }}</li>
              </ul>
            </div>
            <div class="mt-3">
              <div class="font-semibold mb-1">Project Index (PHP)</div>
              <div class="text-zinc-600 dark:text-zinc-400">Root: {{ projectRoot || '—' }}</div>
              <div class="text-zinc-600 dark:text-zinc-400">Classes: {{ stats.classes }}, Interfaces: {{ stats.interfaces }}, Functions: {{ stats.functions }}</div>
              <div v-if="progress.total" class="text-zinc-500 dark:text-zinc-500 mt-1">Scanning: {{ progress.processed }}/{{ progress.total }} {{ progress.filePath ? '(' + progress.filePath + ')' : '' }}</div>
            </div>
          </div>
          <div class="p-2 overflow-auto text-xs text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900">
            <div class="font-semibold mb-2">Generated Code</div>
            <div class="flex items-center gap-2 mb-2">
              <label class="text-zinc-600 dark:text-zinc-400 text-xs">Format:</label>
              <select v-model="outLang" class="bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs px-2 py-1 rounded disabled:opacity-40" :disabled="!canGenerate">
                <option value="python">Python</option>
                <option value="elixir">Elixir</option>
              </select>
            </div>
            <pre class="whitespace-pre-wrap">{{ generated }}</pre>
            <div v-if="!canGenerate" class="mt-2 text-zinc-500">Code generation is currently available for PHP only.</div>
          </div>
        </TabPanel>
      </TabPanels>
    </TabGroup>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { Listbox, ListboxButton, ListboxOptions, ListboxOption, TabGroup, TabList, Tab, TabPanels, TabPanel } from '@headlessui/vue';
import { invoke } from '@tauri-apps/api/core';
import { phpToIr } from '../../utils/ast-adapters/php-adapter.js';
import { lowerIrToGraph } from '../../utils/ast-to-graph.js';
import { generatePython } from '../../utils/ast-adapters/python-generator.js';
import { generateElixir } from '../../utils/ast-adapters/elixir-generator.js';
import { pickAndScanPhpProject, scanPhpProject } from '../../utils/php-project-indexer.js';
import { phpProjectIndex, phpProjectProgress, phpProjectRoot, setPhpProject, setPhpProgress } from '../../utils/php-project-state.js';

const props = defineProps({ visible: { type: Boolean, default: false }, codeText: { type: String, default: '' }, autoParse: { type: Boolean, default: true } });
const emit = defineEmits(['close', 'push-node', 'push-connection', 'import-complete']);

const languages = ref([]); // from backend list_languages: [{ id, exts }]
const colorPalette = ['bg-indigo-400','bg-yellow-400','bg-orange-400','bg-sky-400','bg-emerald-400','bg-pink-400','bg-rose-400'];
const language = ref('');

const languageOptions = computed(() => {
  if (!Array.isArray(languages.value) || languages.value.length === 0) return [];
  return languages.value.map((l, idx) => ({ id: l.id, label: l.id.charAt(0).toUpperCase() + l.id.slice(1), dot: colorPalette[idx % colorPalette.length], exts: l.exts || [] }));
});

const code = ref('<?php\necho "Hello";\n');
const warnings = ref([]);
const nodes = ref([]);
const connections = ref([]);
const ir = ref(null);
const norm = ref(null);
const outLang = ref('python');
const projectRoot = phpProjectRoot;
const progress = phpProjectProgress;

const langLabel = (id) => languageOptions.value.find(o => o.id === id)?.label || id;
const langDotClass = (id) => languageOptions.value.find(o => o.id === id)?.dot || 'bg-zinc-500';

const summary = computed(() => warnings.value.length ? `⚠ ${warnings.value.length} warnings` : 'Ready');
const stats = computed(() => {
  const idx = phpProjectIndex.value || { namespaces: {}, symbols: { classes: {}, interfaces: {}, functions: {} } };
  return {
    classes: Object.keys(idx.symbols?.classes || {}).length,
    interfaces: Object.keys(idx.symbols?.interfaces || {}).length,
    functions: Object.keys(idx.symbols?.functions || {}).length,
  };
});

const canGenerate = computed(() => language.value === 'php' && !!ir.value);
const canImport = computed(() => nodes.value.length > 0 || connections.value.length > 0);

const symbols = computed(() => Array.isArray(norm.value?.symbols) ? norm.value.symbols : []);
const symbolCount = computed(() => symbols.value.length);

const prettyIr = computed(() => ir.value ? JSON.stringify(ir.value.statements ? ir.value : { nodes: ir.value.nodes, edges: ir.value.edges }, null, 2) : '');
const prettyNorm = computed(() => norm.value ? JSON.stringify(norm.value, null, 2) : '');
const generated = computed(() => {
  if (!ir.value) return '';
  if (outLang.value === 'python') return generatePython(ir.value);
  if (outLang.value === 'elixir') return generateElixir(ir.value);
  return '';
});

function symbolPillClass(kind) {
  const base = 'text-[10px] rounded ring-1 ring-inset';
  switch (kind) {
    case 'class': return `${base} bg-blue-500/15 text-blue-300 ring-blue-500/40`;
    case 'interface': return `${base} bg-purple-500/15 text-purple-300 ring-purple-500/40`;
    case 'trait': return `${base} bg-fuchsia-500/15 text-fuchsia-300 ring-fuchsia-500/40`;
    case 'function': return `${base} bg-emerald-500/15 text-emerald-300 ring-emerald-500/40`;
    case 'enum': return `${base} bg-amber-500/15 text-amber-300 ring-amber-500/40`;
    default: return `${base} bg-zinc-700/30 text-zinc-300 ring-zinc-600/50`;
  }
}

async function parse() {
  warnings.value = [];
  nodes.value = [];
  connections.value = [];
  ir.value = null;
  norm.value = null;

  if (language.value === 'php') {
    const result = await phpToIr(code.value);
    ir.value = result;
    const res = lowerIrToGraph(result);
    warnings.value = res.warnings || [];
    nodes.value = res.nodes || [];
    connections.value = res.connections || [];
  } else {
    try {
      const ext = language.value === 'javascript' ? 'js' : (language.value === 'rust' ? 'rs' : 'txt');
      norm.value = await invoke('parse_text', { lang: language.value, text: code.value, pathHint: `input.${ext}` });
    } catch (e) {
      warnings.value.push(`Parse error: ${e?.message || e}`);
    }
  }
}

function importGraph() {
  nodes.value.forEach(n => emit('push-node', n));
  connections.value.forEach(c => emit('push-connection', c));
  emit('import-complete', { nodes: nodes.value.length, connections: connections.value.length });
}

function toPython() { outLang.value = 'python'; }
function toElixir() { outLang.value = 'elixir'; }

async function pickAndScan() {
  try {
    if (typeof window !== 'undefined' && typeof window.__TAURI_INTERNALS__ !== 'undefined') {
      const res = await pickAndScanPhpProject();
      setPhpProject(res.root || projectRoot.value, res.index);
      if (res.warnings?.length) warnings.value.push(...res.warnings);
    } else {
      const path = prompt('Enter project root path to scan (Tauri only recommended):', projectRoot.value || '');
      if (path) {
        setPhpProject(path, phpProjectIndex.value);
        const { index, warnings: w } = await scanPhpProject(path, { onProgress: p => setPhpProgress(p) });
        setPhpProject(path, index);
        if (w?.length) warnings.value.push(...w);
      }
    }
  } catch (e) {
    warnings.value.push(`Scan error: ${e?.message || e}`);
  }
}

// When parent provides code, load it and optionally auto-parse
watch(() => props.codeText, async (txt) => {
  if (typeof txt === 'string' && txt.length) {
    code.value = txt;
    if (props.autoParse) {
      await parse();
    }
  }
});

onMounted(async () => {
  // load available languages from Tauri, fallback to PHP
  try {
    if (typeof window !== 'undefined' && typeof window.__TAURI_INTERNALS__ !== 'undefined') {
      const list = await invoke('list_languages');
      if (Array.isArray(list) && list.length) {
        languages.value = list;
      } else {
        languages.value = [{ id: 'php', exts: ['php'] }];
      }
    } else {
      languages.value = [{ id: 'php', exts: ['php'] }];
    }
  } catch {
    languages.value = [{ id: 'php', exts: ['php'] }];
  }
  if (!language.value || !languageOptions.value.some(o => o.id === language.value)) {
    language.value = languageOptions.value[0]?.id || 'php';
  }

  if (props.codeText) {
    code.value = props.codeText;
    if (props.autoParse) await parse();
  }
});
</script>

<style scoped>
/***** minimal styling helpers for headlessui *****/
</style>
