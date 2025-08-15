// PHP Project Indexer for Tauri environment
// Scans a project directory, parses PHP files, and builds a symbol index
// Guarded to work only when Tauri APIs are available.
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import parserModule from 'php-parser';

function getPhpParser() {
  try {
    if (parserModule && typeof parserModule.Engine === 'function') return new parserModule.Engine({ parser: { extractDoc: true }, ast: { withPositions: true }, lexer: { all_tokens: true } });
    if (parserModule?.default && typeof parserModule.default.Engine === 'function') return new parserModule.default.Engine({ parser: { extractDoc: true }, ast: { withPositions: true }, lexer: { all_tokens: true } });
    if (typeof parserModule === 'function') return new parserModule({ parser: { extractDoc: true }, ast: { withPositions: true }, lexer: { all_tokens: true } });
    return null;
  } catch (e) {
    return null;
  }
}

function isTauriAvailable() {
  return typeof window !== 'undefined' && typeof window.__TAURI_INTERNALS__ !== 'undefined';
}

function normalizeNs(nsNode) {
  if (!nsNode) return '';
  if (typeof nsNode === 'string') return nsNode;
  if (typeof nsNode?.name === 'string') return nsNode.name;
  if (Array.isArray(nsNode)) return nsNode.map(p => p.name).join('\\');
  return String(nsNode?.name || '')
}

function nameToString(nameNode) {
  if (!nameNode) return '';
  if (typeof nameNode === 'string') return nameNode;
  if (nameNode.kind === 'name' || nameNode.kind === 'identifier') {
    if (Array.isArray(nameNode.name)) return nameNode.name.map(n => n.name).join('\\');
    return nameNode.name || '';
  }
  if (nameNode.kind === 'classreference' && nameNode.name) return nameNode.name;
  return String(nameNode.name || '');
}

function makeFqn(ns, name) {
  const n = String(name || '').replace(/^\\+/, '');
  if (!ns) return `\\${n}`;
  return `\\${ns}\\${n}`;
}

function resolveName(rawName, usesMap, currentNs) {
  const name = typeof rawName === 'string' ? rawName : nameToString(rawName);
  if (!name) return '';
  // Already FQN
  if (name.startsWith('\\')) return name;
  const first = name.split('\\')[0];
  if (usesMap && usesMap[first]) {
    const rest = name.slice(first.length);
    return `${usesMap[first]}${rest ? rest : ''}`;
  }
  return makeFqn(currentNs, name);
}
function collectUses(children) {
  const uses = {};
  for (const c of children) {
    if (c.kind === 'usegroup') {
      const ns = nameToString(c.name) || '';
      for (const it of c.items || []) {
        const alias = it.alias ? it.alias.name : nameToString(it.name).split('\\').pop();
        const full = `\\${ns}\\${nameToString(it.name)}`.replace(/\\{2,}/g, '\\');
        uses[alias] = full;
      }
    } else if (c.kind === 'useitem' || c.kind === 'use') {
      const items = c.items || [c];
      for (const it of items) {
        const n = nameToString(it.name || it);
        if (!n) continue;
        const alias = it.alias ? it.alias.name : n.split('\\').pop();
        const full = n.startsWith('\\') ? n : `\\${n}`;
        uses[alias] = full;
      }
    }
  }
  return uses;
}

function initIndex() {
  return {
    files: {},
    symbols: {
      classes: {},
      interfaces: {},
      traits: {},
      functions: {}
    },
    namespaces: {}
  };
}

function indexFileAst(filePath, ast) {
  const fileInfo = { filePath, namespace: '', uses: {}, classes: [], interfaces: [], traits: [], functions: [] };

  const visitChildren = (children, nsOverride = null) => {
    if (!Array.isArray(children)) return;
    // Collect uses at this level
    const localUses = collectUses(children);
    Object.assign(fileInfo.uses, localUses);

    for (const node of children) {
      if (!node || typeof node !== 'object') continue;
      switch (node.kind) {
        case 'namespace': {
          const ns = normalizeNs(node.name);
          fileInfo.namespace = ns || fileInfo.namespace;
          visitChildren(node.children || [], ns || fileInfo.namespace);
          break;
        }
        case 'class': {
          const name = node.name?.name || '';
          const ns = nsOverride ?? fileInfo.namespace;
          const fqn = makeFqn(ns, name);
          const ext = node.extends ? resolveName(node.extends, fileInfo.uses, ns) : null;
          const impl = (node.implements || []).map(i => resolveName(i, fileInfo.uses, ns));
          fileInfo.classes.push({ name, fqn, namespace: ns, extends: ext, implements: impl, flags: node.isAbstract ? 'abstract' : (node.isFinal ? 'final' : '') });
          break;
        }
        case 'interface': {
          const name = node.name?.name || '';
          const ns = nsOverride ?? fileInfo.namespace;
          const fqn = makeFqn(ns, name);
          const ext = (node.extends || []).map(i => resolveName(i, fileInfo.uses, ns));
          fileInfo.interfaces.push({ name, fqn, namespace: ns, extends: ext });
          break;
        }
        case 'trait': {
          const name = node.name?.name || '';
          const ns = nsOverride ?? fileInfo.namespace;
          const fqn = makeFqn(ns, name);
          fileInfo.traits.push({ name, fqn, namespace: ns });
          break;
        }
        case 'function': {
          const name = node.name?.name || '';
          const ns = nsOverride ?? fileInfo.namespace;
          const fqn = makeFqn(ns, name);
          fileInfo.functions.push({ name, fqn, namespace: ns });
          break;
        }
        default:
          // ignore other nodes for now
          break;
      }
    }
  };

  visitChildren(ast.children || []);
  return fileInfo;
}

function mergeIntoIndex(index, fileInfo) {
  index.files[fileInfo.filePath] = fileInfo;
  const nsKey = fileInfo.namespace || '\\';
  if (!index.namespaces[nsKey]) index.namespaces[nsKey] = { classes: [], interfaces: [], traits: [], functions: [] };
  for (const c of fileInfo.classes || []) {
    index.namespaces[nsKey].classes.push(c);
    index.symbols.classes[c.fqn] = { filePath: fileInfo.filePath, name: c.name };
  }
  for (const i of fileInfo.interfaces || []) {
    index.namespaces[nsKey].interfaces.push(i);
    index.symbols.interfaces[i.fqn] = { filePath: fileInfo.filePath, name: i.name };
  }
  for (const t of fileInfo.traits || []) {
    index.namespaces[nsKey].traits.push(t);
    index.symbols.traits[t.fqn] = { filePath: fileInfo.filePath, name: t.name };
  }
  for (const f of fileInfo.functions || []) {
    index.namespaces[nsKey].functions.push(f);
    index.symbols.functions[f.fqn] = { filePath: fileInfo.filePath, name: f.name };
  }
}

export async function scanPhpProject(rootPath, { onProgress } = {}) {
  const warnings = [];
  if (!isTauriAvailable()) {
    warnings.push('Tauri API not available. Project scanning is only supported in the desktop app.');
    return { index: initIndex(), warnings };
  }

  const parser = getPhpParser();

  let phpFiles = [];
  try {
    phpFiles = await invoke('enumerate_php_files', { rootPath });
  } catch (e) {
    warnings.push(`enumerate_php_files failed: ${e?.message || e}`);
    return { index: initIndex(), warnings };
  }

  const index = initIndex();
  try {
    let processed = 0;
    for (const filePath of phpFiles) {
      try {
        // Prefer Rust backend (tree-sitter) for cross-language scalability
        let fileInfo = await invoke('parse_php_file_to_symbols', { path: filePath });
        if (!fileInfo || !fileInfo.filePath) {
          throw new Error('Empty parse result');
        }
        mergeIntoIndex(index, fileInfo);
      } catch (e1) {
        // Fallback to JS php-parser if available
        try {
          if (!parser) throw new Error('php-parser not available');
          const content = await invoke('read_text_file', { path: filePath });
          const ast = parser.parseCode(content);
          const fileInfo = indexFileAst(filePath, ast);
          mergeIntoIndex(index, fileInfo);
        } catch (e2) {
          warnings.push(`Failed to parse ${filePath}: ${e1?.message || e1} ${e2 ? ' | fallback: ' + (e2?.message || e2) : ''}`);
        }
      } finally {
        processed += 1;
        if (typeof onProgress === 'function') onProgress({ processed, total: phpFiles.length, filePath });
      }
    }
  } catch (e) {
    warnings.push(`Scan failed: ${e?.message || e}`);
  }

  return { index, warnings };
}

export async function pickAndScanPhpProject() {
  if (!isTauriAvailable()) return { index: initIndex(), warnings: ['Tauri API not available in this environment'] };
  const dir = await open({ directory: true, multiple: false });
  if (!dir) return { index: initIndex(), warnings: ['No directory selected'] };
  const { index, warnings } = await scanPhpProject(dir, { onProgress: () => {} });
  return { index, warnings, root: dir };
}

export function resolvePhpName(rawName, fileInfo) {
  return resolveName(rawName, fileInfo?.uses || {}, fileInfo?.namespace || '');
}

export async function startPhpScanStream(rootPath, onEvent) {
  if (!isTauriAvailable()) return () => {};
  const unlisten = await listen('php_scan', (e) => {
    try { onEvent && onEvent(e?.payload || {}); } catch {}
  });
  await invoke('start_php_scan', { rootPath });
  return () => { try { unlisten(); } catch {} };
}
