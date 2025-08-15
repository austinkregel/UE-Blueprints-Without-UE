import VariableNode from '../components/Nodes/VariableNode.vue';
import FunctionNode from '../components/Nodes/FunctionNode.vue';
import NodeBase from '../components/Nodes/NodeBase.vue';
import SystemNode from '../components/Nodes/SystemNode.vue';
import ExecNode from '../components/Nodes/ExecNode.vue';

export function getNodeComponent(node) {
  if (node.type === 'variable') return VariableNode;
  if (node.type === 'function') return FunctionNode;
  if (node.type === 'system') return SystemNode;
  if (node.type === 'constant') return NodeBase;
  if (node.type === 'exec') return ExecNode;
  const execNodeIds = [
    'sequence', 'branch', 'gate', 'multigate', 'do_once', 'do_n',
    'delay', 'retriggerable_delay', 'flip_flop', 'for_loop', 
    'for_each_loop', 'while_loop'
  ];
  if (node.nodeDefId && execNodeIds.includes(node.nodeDefId)) {
    return ExecNode;
  }
  return NodeBase;
}
