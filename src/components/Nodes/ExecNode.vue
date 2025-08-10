<template>
  <NodeBase
    :node="node"
    :connections="connections"
    @move="$emit('move', $event)"
    @connect="$emit('connect', $event)"
    @select="$emit('select', $event)"
    @register-io="$emit('register-io', $event)"
    @node-context-menu="$emit('node-context-menu', $event)"
  >
    <template #header>
      {{ getNodeDisplayName() }}
    </template>
    
    <!-- Special content for specific exec nodes -->
    <div v-if="needsSpecialContent" class="p-2 text-xs text-gray-400">
      <div v-if="node.nodeDefId === 'sequence'">
        Executes outputs in order
      </div>
      <div v-else-if="node.nodeDefId === 'gate'">
        State: {{ gateState }}
      </div>
      <div v-else-if="node.nodeDefId === 'multigate'">
        Next: {{ nextOutput }}
      </div>
      <div v-else-if="node.nodeDefId === 'do_once'">
        {{ hasExecuted ? 'Completed' : 'Ready' }}
      </div>
      <div v-else-if="node.nodeDefId === 'do_n'">
        Count: {{ executionCount }}/{{ node.inputs?.find(i => i.name === 'N')?.defaultValue || 'N' }}
      </div>
      <div v-else-if="node.nodeDefId === 'delay'">
        Duration: {{ node.inputs?.find(i => i.name === 'Duration')?.defaultValue || 1.0 }}s
      </div>
      <div v-else-if="node.nodeDefId === 'flip_flop'">
        Next: {{ isFlipState ? 'A' : 'B' }}
      </div>
    </div>
  </NodeBase>
</template>

<script setup>
import { computed, ref } from 'vue';
import NodeBase from './NodeBase.vue';

const emit = defineEmits([
  'move', 'connect', 'select', 'register-io', 'node-context-menu'
]);

const { node, connections } = defineProps({
  node: Object,
  connections: Array,
});

// State management for different exec node types
const gateState = ref('closed');
const nextOutput = ref(0);
const hasExecuted = ref(false);
const executionCount = ref(0);
const isFlipState = ref(true);

const getNodeDisplayName = () => {
  if (node.nodeDefId) {
    // Use the definition name
    const definitions = {
      'sequence': 'Sequence',
      'branch': 'Branch',
      'gate': 'Gate',
      'multigate': 'MultiGate',
      'do_once': 'Do Once',
      'do_n': 'Do N',
      'delay': 'Delay',
      'retriggerable_delay': 'Retriggerable Delay',
      'flip_flop': 'Flip Flop',
      'for_loop': 'For Loop',
      'for_each_loop': 'For Each Loop',
      'while_loop': 'While Loop'
    };
    return definitions[node.nodeDefId] || node.nodeDefId;
  }
  
  if (node.execType) {
    return node.execType;
  }
  
  return 'Exec Node';
};

const needsSpecialContent = computed(() => {
  const specialNodes = [
    'sequence', 'gate', 'multigate', 'do_once', 'do_n', 
    'delay', 'retriggerable_delay', 'flip_flop'
  ];
  return specialNodes.includes(node.nodeDefId);
});
</script>

<style scoped>
/* Exec nodes can have distinct styling */
.exec-node {
  border-left: 4px solid #fbbf24; /* amber-400 for exec flow */
}
</style>
