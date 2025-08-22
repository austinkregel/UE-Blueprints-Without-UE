// Language-agnostic code importer: map parsed symbols to graph nodes
import { createFunctionNode } from './node-factory.js';

function normalizeType(t) {
    if (!t || typeof t !== 'string') return 'mixed';
    const tt = t.trim();
    if (!tt) return 'mixed';
    // Lightweight normalization across languages
    const lc = tt.toLowerCase();
    if (/(^|[^a-z])(i8|i16|i32|i64|isize|usize|u8|u16|u32|u64)([^a-z]|$)/.test(lc) || /\bint(eger)?\b/.test(lc) || /\bnumber\b/.test(lc))
        return 'int';
    if (/(^|[^a-z])(f32|f64)([^a-z]|$)/.test(lc) || /\b(float|double)\b/.test(lc)) return 'float';
    if (/(str|string|char)/.test(lc)) return 'string';
    if (/(bool|boolean)/.test(lc)) return 'bool';
    if (/(void|unit|nil|none|null|undefined)/.test(lc)) return 'void';
    if (/\barray\b|\[\]/.test(lc)) return 'array';
    return tt; // preserve otherwise
}

function sanitizeParamName(name, i) {
    const base = (name || '').trim() || `arg${i + 1}`;
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
            refs: {
                filePath: nf.filePath,
                language: nf.language,
                range: s.range || null,
                visibility: s.visibility || null,
                isMethod: !!s.is_method
            }
        });

        nodes.push(node);
        y += yStep;
    }

    return { nodes, connections, warnings: nf.warnings || [] };
}
