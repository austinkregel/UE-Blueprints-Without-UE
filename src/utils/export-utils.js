import { nodes } from './state.js';
import { connections } from './connection-manager.js';

function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function serializeGraph() {
  return {
    nodes: nodes.value.map(n => ({
      id: n.id,
      type: n.type,
      nodeDefId: n.nodeDefId,
      funcName: n.funcName,
      varName: n.varName,
      varType: n.varType,
      varAction: n.varAction,
      x: n.x,
      y: n.y,
      inputs: (n.inputs || []).map(i => (typeof i === 'string' ? { name: i } : i)),
      outputs: (n.outputs || []).map(o => (typeof o === 'string' ? { name: o } : o)),
    })),
    connections: connections.value.map(c => ({ from: c.from, to: c.to }))
  };
}

export function exportGraphAsJSON(filename = 'graph.json') {
  const json = JSON.stringify(serializeGraph(), null, 2);
  downloadText(filename, json);
}

function sanitizeName(name) {
  return String(name || '').replace(/[^A-Za-z0-9_]/g, '_') || 'unnamed';
}

export function generatePHPCodeFromGraph() {
  const g = serializeGraph();
  const lines = [];
  lines.push('<?php');
  lines.push('// Auto-generated from node graph');
  lines.push('');

  // Emit variable placeholders
  for (const n of g.nodes) {
    if (n.type === 'variable') {
      const vName = sanitizeName(n.varName || `var_${n.id}`);
      lines.push(`$${vName} = null; // type: ${n.varType || 'mixed'}`);
    }
  }
  if (g.nodes.some(n => n.type === 'variable')) lines.push('');

  // Emit function stubs for function/system nodes
  for (const n of g.nodes) {
    if (n.type === 'function' || n.type === 'system' || n.type === 'exec') {
      const fname = sanitizeName(n.funcName || n.nodeDefId || `node_${n.id}`);
      const params = (n.inputs || [])
        .filter(i => (i.type || '').toLowerCase() !== 'exec')
        .map((i, idx) => `$${sanitizeName(i.name) || 'p' + idx}`)
        .join(', ');
      lines.push(`function ${fname}(${params}) {`);
      lines.push('    // TODO: implement');
      // Return something if outputs exist
      const dataOutputs = (n.outputs || []).filter(o => (o.type || '').toLowerCase() !== 'exec');
      if (dataOutputs.length > 0) {
        const ret = dataOutputs.map((o, idx) => `$${sanitizeName(o.name) || 'out' + idx}`).join(', ');
        if (dataOutputs.length === 1) {
          lines.push(`    return ${ret};`);
        } else {
          lines.push(`    return [${ret}];`);
        }
      }
      lines.push('}');
      lines.push('');
    }
  }

  // Emit a simple flow description as comments
  lines.push('// Flow connections');
  for (const c of g.connections) {
    lines.push(`// ${c.from.nodeId}:${c.from.output} -> ${c.to.nodeId}:${c.to.input}`);
  }

  lines.push('');
  lines.push('// Entry point suggestion');
  const start = g.nodes.find(n => n.nodeDefId === 'on_start' || n.funcName === 'Start' || n.type === 'exec');
  if (start) {
    const sname = sanitizeName(start.funcName || start.nodeDefId || `node_${start.id}`);
    lines.push(`// ${sname}();`);
  }

  return lines.join('\n');
}

export function exportGraphAsPHP(filename = 'graph.php') {
  const php = generatePHPCodeFromGraph();
  downloadText(filename, php);
}

export function generateJSModuleFromGraph() {
  const g = serializeGraph();
  const lines = [];
  lines.push('// Auto-generated from node graph');
  lines.push('export const graph = ' + JSON.stringify(g, null, 2) + ';');
  return lines.join('\n');
}

export function exportGraphAsJS(filename = 'graph.js') {
  const js = generateJSModuleFromGraph();
  downloadText(filename, js);
}
