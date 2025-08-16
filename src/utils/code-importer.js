// Language-agnostic code importer: map parsed symbols to graph nodes
import { createFunctionNode } from './node-factory.js';

function normalizeType(t) {
  if (!t || typeof t !== 'string') return 'mixed';
  const tt = t.trim();
  if (!tt) return 'mixed';
  // Lightweight normalization across languages
  const lc = tt.toLowerCase();
  if (/(^|[^a-z])(i8|i16|i32|i64|isize|usize|u8|u16|u32|u64)([^a-z]|$)/.test(lc) || /\bint(eger)?\b/.test(lc) || /\bnumber\b/.test(lc)) return 'int';
  if (/(^|[^a-z])(f32|f64)([^a-z]|$)/.test(lc) || /\b(float|double)\b/.test(lc)) return 'float';
  if (/(str|string|char)/.test(lc)) return 'string';
  if (/(bool|boolean)/.test(lc)) return 'bool';
  if (/(void|unit|nil|none|null|undefined)/.test(lc)) return 'void';
  if (/\barray\b|\[\]/.test(lc)) return 'array';
  return tt; // preserve otherwise
}

function sanitizeParamName(name, i) {
  const base = (name || '').trim() || `arg${i+1}`;
  return base.replace(/[^A-Za-z0-9_:$<>\[\]\-]/g, '_');
}

export function mapParsedToGraph(nf, { start = { x: 100, y: 100 }, yStep = 100 } = {}) {
  const nodes = [];
  const connections = [];
  let y = start.y;

  for (const s of nf.symbols || []) {
    if (s.kind !== 'function') continue; // focus on function-like for now
    const inputs = [];
    const params = Array.isArray(s.params) ? s.params : [];
    params.forEach((p, i) => {
      const name = sanitizeParamName(p?.name, i);
      const type = normalizeType(p?.ty || 'any');
      inputs.push({ name, type });
    });

    const outputs = [];
    if (s.return_type && normalizeType(s.return_type) !== 'void') {
      outputs.push({ name: 'result', type: normalizeType(s.return_type) });
    }

    const node = createFunctionNode(s.name || 'fn', inputs, outputs, start.x, y, {
      funcName: s.name || 'fn',
      // carry some metadata for UI/hover
      refs: { filePath: nf.filePath, language: nf.language, range: s.range || null, visibility: s.visibility || null, isMethod: !!s.is_method }
    });

    nodes.push(node);
    y += yStep;
  }

  return { nodes, connections, warnings: nf.warnings || [] };
}

// Optional: runtime import functions (Tauri)
export async function importFileToGraph(langId, filePath, invoke) {
  if (typeof invoke !== 'function') throw new Error('invoke function required');
  const nf = await invoke('parse_file', { lang: langId, path: filePath });
  return mapParsedToGraph(nf);
}

export async function importTextToGraph(langId, text, invoke, pathHint = '<memory>') {
  if (typeof invoke !== 'function') throw new Error('invoke function required');
  const nf = await invoke('parse_text', { lang: langId, text, pathHint });
  return mapParsedToGraph(nf);
}

// Import a class's methods as vertical nodes spaced out; include usage metadata if provided
export function importClassMethodsToGraph(projectIndex, classKeyOrName, { start = { x: 100, y: 100 }, yStep = 110 } = {}) {
  const nodes = [];
  const connections = [];
  const warnings = [];
  if (!projectIndex || !projectIndex.classes) return { nodes, connections, warnings: ['No project index provided'] };
  let clsEntry = projectIndex.classes[classKeyOrName];
  if (!clsEntry) {
    // try to find by simple name match
    const key = Object.keys(projectIndex.classes).find(k => k.endsWith(`::${classKeyOrName}`) || projectIndex.classes[k].name === classKeyOrName);
    if (key) clsEntry = projectIndex.classes[key];
  }
  if (!clsEntry) return { nodes, connections, warnings: [`Class not found: ${classKeyOrName}`] };

  let y = start.y;
  const methods = (clsEntry.methods || []).filter(m => {
    const vis = (m.visibility || '').toLowerCase();
    return !vis || vis === 'public' || vis === 'export';
  });
  methods.forEach(m => {
    const inputs = (m.params || []).map((p, i) => ({ name: (p?.name || `arg${i+1}`).replace(/[^A-Za-z0-9_:$<>\[\]\-]/g, '_'), type: (p?.ty || 'any') }));
    const outputs = m.return_type ? [{ name: 'result', type: m.return_type }] : [];
    const node = createFunctionNode(`${clsEntry.name}.${m.name}`, inputs, outputs, start.x, y, {
      funcName: `${clsEntry.name}.${m.name}`,
      refs: { filePath: m.filePath || clsEntry.filePath, range: m.range || null, class: clsEntry.name, method: m.name, fqn: m.fqn || null, usage: (clsEntry.usage && clsEntry.usage[m.name]) || [] }
    });
    nodes.push(node);
    y += yStep;
  });

  return { nodes, connections, warnings };
}
