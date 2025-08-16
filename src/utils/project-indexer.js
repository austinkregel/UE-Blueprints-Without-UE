// Cross-language Project Indexer using Tauri backend generic parser
// Safely no-op outside Tauri so tests/web preview won’t break.
import { registerProjectSymbolsAsNodes } from './code-symbols-to-nodes.js';

function isTauri() {
  return typeof window !== 'undefined' && typeof window.__TAURI_INTERNALS__ !== 'undefined';
}

async function getInvoke() {
  try {
    const mod = await import('@tauri-apps/api/core');
    return mod.invoke;
  } catch {
    return null;
  }
}

/**
 * Scan a project directory for supported languages, parse files, build a cross-language index,
 * and register nodes into the NodePalette under PROJECT category.
 *
 * Contract:
 *  - input: rootPath (string), { onProgress?: (p:{processed,total,filePath,lang}) => void }
 *  - output: { index, warnings }
 */
export async function scanProject(rootPath, { onProgress } = {}) {
  const warnings = [];
  const index = { files: {}, classes: {}, functions: {}, references: [] };
  if (!isTauri()) {
    warnings.push('Tauri API not available. Project scanning is only supported in the desktop app.');
    return { index, warnings };
  }
  const invoke = await getInvoke();
  if (!invoke) {
    warnings.push('invoke not available');
    return { index, warnings };
  }

  try {
    const langs = await invoke('list_languages');
    let processed = 0;
    let total = 0;
    const langFiles = {};
    for (const l of langs || []) {
      try {
        const files = await invoke('enumerate_language_files', { lang: l.id, rootPath });
        langFiles[l.id] = files || [];
        total += (files || []).length;
      } catch (e) {
        warnings.push(`enumerate_language_files failed for ${l.id}: ${e?.message || e}`);
      }
    }

    for (const [langId, files] of Object.entries(langFiles)) {
      for (const path of files) {
        try {
          const nf = await invoke('parse_file', { lang: langId, path });
          index.files[path] = nf;
          // collect classes and methods
          for (const s of nf.symbols || []) {
            if (s.kind === 'class' || s.kind === 'interface' || s.kind === 'trait' || s.kind === 'enum') {
              const key = s.fqn || `${path}::${s.name}`;
              if (!index.classes[key]) index.classes[key] = { name: s.name, kind: s.kind, filePath: path, methods: [], lang: nf.language };
            } else if (s.kind === 'function') {
              const isMethod = !!s.is_method;
              if (isMethod && s.owner_type) {
                // find class(es) with matching simple name
                const targets = Object.entries(index.classes).filter(([ck, cls]) => cls.name === s.owner_type);
                for (const [ck] of targets) {
                  const m = { name: s.name, fqn: s.fqn || `${ck}::${s.name}`, visibility: s.visibility || null, params: s.params || [], return_type: s.return_type || null, range: s.range || null, filePath: path };
                  index.classes[ck].methods.push(m);
                }
              } else {
                const key = s.fqn || `${path}::${s.name}`;
                index.functions[key] = { name: s.name, fqn: key, filePath: path, params: s.params || [], return_type: s.return_type || null, range: s.range || null, lang: nf.language };
              }
            }
          }
          // references
          (nf.references || []).forEach(r => index.references.push({ ...r, filePath: path, lang: nf.language }));
        } catch (e) {
          warnings.push(`parse_file failed for ${path}: ${e?.message || e}`);
        } finally {
          processed += 1;
          try { onProgress && onProgress({ processed, total, filePath: path, lang: langId }); } catch {}
        }
      }
    }

    // derive usage per method (best-effort)
    for (const [classKey, cls] of Object.entries(index.classes)) {
      cls.usage = {};
      for (const m of cls.methods) {
        const u = [];
        for (const r of index.references) {
          const nameMatch = r.name && String(r.name).includes(m.name);
          const qualMatch = r.qualifier ? String(r.qualifier).includes(cls.name) : false;
          if (nameMatch && (qualMatch || r.kind === 'call')) {
            u.push({ filePath: r.filePath, range: r.range, kind: r.kind, qualifier: r.qualifier || null });
          }
        }
        cls.usage[m.name] = u;
      }
    }

    // Register into NodePalette as PROJECT nodes
    registerProjectSymbolsAsNodes(index);
  } catch (e) {
    warnings.push(`scan failed: ${e?.message || e}`);
  }
  return { index, warnings };
}

