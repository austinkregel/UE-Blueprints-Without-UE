<template>
  <div class="fixed top-0 right-0 h-screen w-[540px] bg-zinc-900 text-white shadow-2xl z-[1000] flex flex-col items-stretch animate-slideIn">
    <div class="p-6 flex-1 flex flex-col overflow-y-auto">
      <h3 class="text-lg font-bold mb-4">Node {{ node.id }} Settings</h3>
      <label class="block font-semibold mb-1">Inputs:</label>
      <ul class="flex flex-col">
        <li v-for="input in filteredInputs" :key="input.name + '-' + input.type" class="mb-2 flex items-center gap-2">
          <input v-model="input.name" placeholder="Input name" class="bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1 mr-2 mb-0.5 w-28" />
          <select v-model="input.type" class="bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1 mr-2 mb-0.5 w-28">
            <option v-for="type in typeOptions" :key="type" :value="type">{{ type }}</option>
            <option :value="input.type" v-if="!typeOptions.includes(input.type)">{{ input.type }}</option>
          </select>
          <input v-model="input.type" placeholder="Type (e.g. int, string, array)" class="bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1 mr-2 mb-0.5 w-32" />
          <button @click="removeInput(localInputs.indexOf(input))" class="bg-zinc-700 hover:bg-zinc-600 text-white rounded px-2 py-1">Remove</button>
        </li>
      </ul>
      <button @click="addInput" class="bg-zinc-700 hover:bg-zinc-600 text-white rounded px-3 py-1 mb-4">Add Input</button>
      <label class="block font-semibold mb-1">Outputs:</label>
      <ul class="flex flex-col">
        <li v-for="output in filteredOutputs" :key="output.name + '-' + output.type" class="mb-2 flex items-center gap-2">
          <input v-model="output.name" placeholder="Output name" class="bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1 mr-2 mb-0.5 w-28" />
          <select v-model="output.type" class="bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1 mr-2 mb-0.5 w-28">
            <option v-for="type in typeOptions" :key="type" :value="type">{{ type }}</option>
            <option :value="output.type" v-if="!typeOptions.includes(output.type)">{{ output.type }}</option>
          </select>
          <input v-model="output.type" placeholder="Type (e.g. int, string, array)" class="bg-zinc-800 text-white border border-zinc-700 rounded px-2 py-1 mr-2 mb-0.5 w-32" />
          <button @click="removeOutput(localOutputs.indexOf(output))" class="bg-zinc-700 hover:bg-zinc-600 text-white rounded px-2 py-1">Remove</button>
        </li>
      </ul>
      <button @click="addOutput" class="bg-zinc-700 hover:bg-zinc-600 text-white rounded px-3 py-1 mb-4">Add Output</button>
      <div class="mt-4 flex gap-2">
        <button @click="save" class="bg-cyan-600 hover:bg-cyan-700 text-white rounded px-4 py-2">Save</button>
        <button @click="$emit('close')" class="bg-zinc-700 hover:bg-zinc-600 text-white rounded px-4 py-2">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue';
const props = defineProps({ node: Object });
const emit = defineEmits(['close', 'update-io']);

const typeOptions = [
  'int', 'float', 'string', 'bool', 'array', 'object', 'callable', 'mixed', 'void', 'resource', 'null'
];

function normalizeIO(ioArr) {
  return ioArr.map(io => typeof io === 'object' ? io : { name: io, type: '' });
}

const localInputs = ref(normalizeIO(props.node.inputs));
const localOutputs = ref(normalizeIO(props.node.outputs));

watch(() => props.node, (newNode) => {
  localInputs.value = normalizeIO(newNode.inputs);
  localOutputs.value = normalizeIO(newNode.outputs);
});

const filteredInputs = computed(() => localInputs.value.filter(inp => inp.type !== 'Exec'));
const filteredOutputs = computed(() => localOutputs.value.filter(out => out.type !== 'Exec'));

function addInput() {
  localInputs.value.push({ name: 'Input', type: '' });
}
function removeInput(i) {
  localInputs.value.splice(i, 1);
}
function addOutput() {
  localOutputs.value.push({ name: 'Output', type: '' });
}
function removeOutput(i) {
  localOutputs.value.splice(i, 1);
}
function save() {
  emit('update-io', {
    id: props.node.id,
    inputs: localInputs.value.map(io => ({ ...io })),
    outputs: localOutputs.value.map(io => ({ ...io })),
  });
  emit('close');
}
</script>
