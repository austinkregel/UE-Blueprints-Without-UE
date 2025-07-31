<template>
  <div class="settings-sidebar">
    <div class="settings-content">
      <h3>Node {{ node.id }} Settings</h3>
      <label>Inputs:</label>
      <ul>
        <li v-for="(input, i) in localInputs.filter(inp => inp.type !== 'Exec')" :key="i">
          <input v-model="localInputs[i].name" placeholder="Input name" />
          <select v-model="localInputs[i].type">
            <option v-for="type in typeOptions.filter(t => t !== 'Exec')" :key="type" :value="type">{{ type }}</option>
            <option :value="localInputs[i].type" v-if="!typeOptions.includes(localInputs[i].type) && localInputs[i].type !== 'Exec'">{{ localInputs[i].type }}</option>
          </select>
          <input v-model="localInputs[i].type" placeholder="Type (e.g. int, string, array)" />
          <button @click="removeInput(i)">Remove</button>
        </li>
      </ul>
      <button @click="addInput">Add Input</button>
      <label>Outputs:</label>
      <ul>
        <li v-for="(output, i) in localOutputs.filter(out => out.type !== 'Exec')" :key="i">
          <input v-model="localOutputs[i].name" placeholder="Output name" />
          <select v-model="localOutputs[i].type">
            <option v-for="type in typeOptions.filter(t => t !== 'Exec')" :key="type" :value="type">{{ type }}</option>
            <option :value="localOutputs[i].type" v-if="!typeOptions.includes(localOutputs[i].type) && localOutputs[i].type !== 'Exec'">{{ localOutputs[i].type }}</option>
          </select>
          <input v-model="localOutputs[i].type" placeholder="Type (e.g. int, string, array)" />
          <button @click="removeOutput(i)">Remove</button>
        </li>
      </ul>
      <button @click="addOutput">Add Output</button>
      <div class="actions">
        <button @click="save">Save</button>
        <button @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
const props = defineProps({ node: Object });
const emit = defineEmits(['close', 'update-io']);

const typeOptions = [
  'int', 'float', 'string', 'bool', 'array', 'object', 'callable', 'mixed', 'void', 'resource', 'null', 'Exec'
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

<style scoped>
.settings-sidebar {
  position: fixed;
  top: 0;
  right: 0;
  height: 100vh;
  width: 340px;
  background: #222;
  color: #fff;
  box-shadow: -2px 0 12px #000a;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  animation: slideIn 0.2s;
}
@keyframes slideIn {
  from { right: -400px; }
  to { right: 0; }
}
.settings-content {
  padding: 24px;
  flex: 1;
  overflow-y: auto;
}
.actions {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}
input, select {
  background: #333;
  color: #fff;
  border: 1px solid #555;
  border-radius: 4px;
  padding: 2px 6px;
  margin-right: 8px;
  margin-bottom: 4px;
}
button {
  background: #444;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 4px 10px;
  cursor: pointer;
}
button:hover {
  background: #666;
}
</style>
