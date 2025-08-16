<template>
  <div class="border-t border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-900/80 text-[11px] leading-tight">
    <!-- Node Settings Section (shown when a node is selected) -->
    <div v-if="selectedNode" class="px-2 pt-1">
      <div class="flex items-center gap-1 mb-1">
        <span class="font-semibold text-zinc-700 dark:text-zinc-200">Node {{ selectedNode.id }}</span>
        <button class="ml-auto text-[10px] px-1.5 py-0.5 rounded-sm bg-cyan-600 hover:bg-cyan-700 text-white dark:bg-cyan-700 dark:hover:bg-cyan-800" @click="save" title="Save changes">Save</button>
        <button class="text-[10px] px-1.5 py-0.5 rounded-sm bg-zinc-200 hover:bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-white" @click="close" title="Close settings">Close</button>
      </div>
      <!-- General -->
      <div class="grid grid-cols-2 gap-1.5 mb-2">
        <div>
          <label class="block text-[10px] text-zinc-500 dark:text-zinc-400" title="Type">Type</label>
          <input :value="selectedNode.type" disabled class="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px]" />
        </div>
        <div>
          <label class="block text-[10px] text-zinc-500 dark:text-zinc-400" title="Category">Cat</label>
          <input :value="selectedNode.category || ''" disabled class="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px]" />
        </div>
        <div>
          <label class="block text-[10px] text-zinc-500 dark:text-zinc-400" title="Definition">Def</label>
          <input :value="selectedNode.nodeDefId || ''" disabled class="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px]" />
        </div>
        <div>
          <label class="block text-[10px] text-zinc-500 dark:text-zinc-400" title="Display Name">Name</label>
          <input v-model="localName" placeholder="(optional)" class="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px]" />
        </div>
        <div>
          <label class="block text-[10px] text-zinc-500 dark:text-zinc-400">X</label>
          <input type="number" v-model.number="localX" class="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px]" />
        </div>
        <div>
          <label class="block text-[10px] text-zinc-500 dark:text-zinc-400">Y</label>
          <input type="number" v-model.number="localY" class="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px]" />
        </div>
      </div>

      <!-- Variable specific -->
      <div v-if="selectedNode.type === 'variable'" class="mb-2">
        <h4 class="font-semibold mb-1 text-[11px] text-zinc-700 dark:text-zinc-200">Variable</h4>
        <div class="grid grid-cols-2 gap-1.5 mb-1.5">
          <div>
            <label class="block text-[10px] text-zinc-500 dark:text-zinc-400">Action</label>
            <select v-model="localVarAction" class="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px]">
              <option value="get">get</option>
              <option value="set">set</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] text-zinc-500 dark:text-zinc-400">Type</label>
            <select v-model="localVarType" class="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px]">
              <option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</option>
            </select>
          </div>
          <div class="col-span-2">
            <label class="block text-[10px] text-zinc-500 dark:text-zinc-400">Name</label>
            <input v-model="localVarName" class="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px]" />
          </div>
        </div>
        <div v-if="selectedNode.isLiteral" class="grid grid-cols-2 gap-1.5 items-center">
          <div class="col-span-2">
            <label class="block text-[10px] text-zinc-500 dark:text-zinc-400">Literal</label>
            <input v-if="localVarType === 'string'" v-model="localLiteralValueString" class="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px]" />
            <input v-else-if="localVarType === 'int' || localVarType === 'float'" type="number" v-model.number="localLiteralValueNumber" class="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px]" />
            <label v-else-if="localVarType === 'bool'" class="inline-flex items-center gap-1 text-[11px] text-zinc-700 dark:text-zinc-200">
              <input type="checkbox" v-model="localLiteralValueBool" /> Boolean
            </label>
            <div v-else class="text-[10px] text-zinc-500 dark:text-zinc-400">Unsupported literal type</div>
          </div>
        </div>
      </div>

      <!-- IO Editors -->
      <label class="block font-semibold mb-0.5 text-zinc-700 dark:text-zinc-200">In:</label>
      <ul class="flex flex-col">
        <li v-for="input in filteredInputs" :key="input.name + '-' + input.type" class="mb-1 flex items-center gap-1 whitespace-nowrap">
          <input v-model="input.name" placeholder="name" class="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px] w-20" />
          <select v-model="input.type" class="appearance-none bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px] w-20">
            <option v-for="type in typeOptions" :key="type" :value="type">{{ type }}</option>
            <option :value="input.type" v-if="!typeOptions.includes(input.type)">{{ input.type }}</option>
          </select>
          <input v-model="input.type" placeholder="type" class="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px] w-24" />
          <button @click="removeInput(localInputs.indexOf(input))" class="bg-zinc-200 hover:bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-white rounded-sm px-1.5 py-0.5 text-[10px]" title="Remove">✕</button>
        </li>
      </ul>
      <button @click="addInput" class="bg-zinc-200 hover:bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-white rounded-sm px-2 py-0.5 mb-2 text-[11px]" title="Add Input">+ In</button>
      <label class="block font-semibold mb-0.5 text-zinc-700 dark:text-zinc-200">Out:</label>
      <ul class="flex flex-col">
        <li v-for="output in filteredOutputs" :key="output.name + '-' + output.type" class="mb-1 flex items-center gap-1 whitespace-nowrap">
          <input v-model="output.name" placeholder="name" class="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px] w-20" />
          <select v-model="output.type" class="appearance-none bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px] w-20">
            <option v-for="type in typeOptions" :key="type" :value="type">{{ type }}</option>
            <option :value="output.type" v-if="!typeOptions.includes(output.type)">{{ output.type }}</option>
          </select>
          <input v-model="output.type" placeholder="type" class="bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px] w-24" />
          <button @click="removeOutput(localOutputs.indexOf(output))" class="bg-zinc-200 hover:bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-white rounded-sm px-1.5 py-0.5 text-[10px]" title="Remove">✕</button>
        </li>
      </ul>
      <button @click="addOutput" class="bg-zinc-200 hover:bg-zinc-300 text-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600 dark:text-white rounded-sm px-2 py-0.5 mb-3 text-[11px]" title="Add Output">+ Out</button>
    </div>

    <!-- Variables List Section -->
    <div class="px-2 py-1 flex items-center gap-1 border-t border-zinc-200 dark:border-zinc-700" :class="{ 'mt-2': !!selectedNode }">
      <span class="font-semibold text-zinc-700 dark:text-zinc-200">Variables</span>
      <span class="ml-auto text-[10px] text-zinc-500 dark:text-zinc-400" v-if="variables?.length" :title="variables.length + ' variables'">{{ variables.length }}</span>
    </div>
    <div class="max-h-56 overflow-y-auto p-1.5">
      <div v-if="!variables || variables.length === 0" class="text-[10px] text-zinc-500 dark:text-zinc-400 px-2 py-3">No variables detected.</div>
      <ul v-else class="space-y-1">
        <li v-for="v in variables" :key="v.name" class="text-[10px] px-1.5 py-0.5 rounded-sm bg-zinc-100/60 dark:bg-zinc-800/60 flex items-center gap-1 min-w-0">
          <span class="text-amber-500 dark:text-amber-300">$</span>
          <span class="flex-1 truncate text-zinc-700 dark:text-zinc-200" :title="v.name">{{ v.name }}</span>
          <span class="ml-auto text-zinc-500 dark:text-zinc-400" :title="v.type || 'mixed'">{{ v.type || 'mixed' }}</span>
        </li>
      </ul>
      <!-- Add Variable Form -->
      <div class="mt-2 grid grid-cols-5 gap-1 items-end">
        <div class="col-span-2">
          <label class="block text-[10px] text-zinc-500 dark:text-zinc-400">Name</label>
          <input v-model="newVarName" placeholder="myVar" class="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px]" />
        </div>
        <div>
          <label class="block text-[10px] text-zinc-500 dark:text-zinc-400">Type</label>
          <select v-model="newVarType" class="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px]">
            <option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</option>
          </select>
        </div>
        <div>
          <label class="block text-[10px] text-zinc-500 dark:text-zinc-400">Action</label>
          <select v-model="newVarAction" class="w-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-white border border-zinc-200 dark:border-zinc-700 rounded-sm px-1.5 py-0.5 text-[11px]">
            <option value="get">get</option>
            <option value="set">set</option>
          </select>
        </div>
        <div>
          <button @click="createVariable" class="w-full bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-700 dark:hover:bg-emerald-800 rounded-sm px-2 py-1 text-[11px]">Add</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
import { selectedNodeId } from '../../utils/state.js';
import { nodes } from '../../utils/state.js';
import { updateNodeIO, updateNode } from '../../utils/nodes-core.js';
import { closeSettings, selectNode } from '../../utils/node-selection.js';
import { addVariableNode } from '../../utils/node-creation.js';
const props = defineProps({ variables: { type: Array, default: () => [] } });

// Selected node reactive reference
const selectedNode = computed(() => nodes.value.find(n => n.id === selectedNodeId.value) || null);

// Local editable copies
const typeOptions = [ 'int', 'float', 'string', 'bool', 'array', 'object', 'callable', 'mixed', 'void', 'resource', 'null' ];
const localInputs = ref([]);
const localOutputs = ref([]);
const localName = ref('');
const localX = ref(0);
const localY = ref(0);
const localVarName = ref('');
const localVarType = ref('mixed');
const localVarAction = ref('get');
const localLiteralValueString = ref('');
const localLiteralValueNumber = ref(0);
const localLiteralValueBool = ref(false);

// Add Variable form state
const newVarName = ref('');
const newVarType = ref('mixed');
const newVarAction = ref('get');

function normalizeIO(ioArr) {
  return (ioArr || []).map(io => typeof io === 'object' ? { ...io } : { name: io, type: '' });
}

watch(selectedNode, (n) => {
  if (n) {
    localInputs.value = normalizeIO(n.inputs);
    localOutputs.value = normalizeIO(n.outputs);
    localName.value = n.name || '';
    localX.value = n.x || 0;
    localY.value = n.y || 0;
    localVarName.value = n.varName || '';
    localVarType.value = n.varType || 'mixed';
    localVarAction.value = n.varAction || 'get';
    localLiteralValueString.value = typeof n.value === 'string' ? n.value : '';
    localLiteralValueNumber.value = typeof n.value === 'number' ? n.value : 0;
    localLiteralValueBool.value = typeof n.value === 'boolean' ? n.value : false;
  } else {
    localInputs.value = [];
    localOutputs.value = [];
    localName.value = '';
    localX.value = 0;
    localY.value = 0;
    localVarName.value = '';
    localVarType.value = 'mixed';
    localVarAction.value = 'get';
    localLiteralValueString.value = '';
    localLiteralValueNumber.value = 0;
    localLiteralValueBool.value = false;
  }
}, { immediate: true });

const filteredInputs = computed(() => localInputs.value.filter(inp => String(inp.type).toLowerCase() !== 'exec'));
const filteredOutputs = computed(() => localOutputs.value.filter(out => String(out.type).toLowerCase() !== 'exec'));

function addInput() { localInputs.value.push({ name: 'Input', type: '' }); }
function removeInput(i) { localInputs.value.splice(i, 1); }
function addOutput() { localOutputs.value.push({ name: 'Output', type: '' }); }
function removeOutput(i) { localOutputs.value.splice(i, 1); }

function save() {
  const n = selectedNode.value;
  if (!n) return;
  updateNodeIO({ id: n.id, inputs: localInputs.value.map(io => ({ ...io })), outputs: localOutputs.value.map(io => ({ ...io })) });
  const updates = { id: n.id, name: localName.value, x: localX.value, y: localY.value };
  if (n.type === 'variable') {
    updates.varName = localVarName.value;
    updates.varType = localVarType.value;
    updates.varAction = localVarAction.value;
    if (n.isLiteral) {
      updates.value = localVarType.value === 'string' ? localLiteralValueString.value
        : (localVarType.value === 'bool' ? localLiteralValueBool.value : Number(localLiteralValueNumber.value));
    }
  }
  if (n.type === 'function') {
    updates.funcName = localName.value || n.funcName;
  }
  updateNode(updates);
}

function close() { closeSettings(); }

function createVariable() {
  const name = (newVarName.value || '').trim();
  if (!name) return;
  const node = addVariableNode(name, newVarType.value || 'mixed', newVarAction.value || 'get');
  if (node) {
    selectNode({ id: node.id });
    newVarName.value = '';
    newVarType.value = 'mixed';
    newVarAction.value = 'get';
  }
}
</script>
