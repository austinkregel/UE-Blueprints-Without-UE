// Convert project index (classes/methods/functions) into palette node definitions
import { registerExtraNodeDefinitions } from './language-definition.js';

function normalizeType(t) {
    if (!t || typeof t !== 'string') return 'mixed';
    const tt = t.trim();
    const lc = tt.toLowerCase();
    if (/(^|[^a-z])(i8|i16|i32|i64|isize|usize|u8|u16|u32|u64)([^a-z]|$)/.test(lc) || /\bint(eger)?\b/.test(lc) || /\bnumber\b/.test(lc))
        return 'int';
    if (/(^|[^a-z])(f32|f64)([^a-z]|$)/.test(lc) || /\b(float|double)\b/.test(lc)) return 'float';
    if (/(str|string|char)/.test(lc)) return 'string';
    if (/(bool|boolean)/.test(lc)) return 'bool';
    if (/(void|unit|nil|none|null|undefined)/.test(lc)) return 'void';
    if (/\barray\b|\[\]/.test(lc)) return 'array';
    return tt;
}

function sanitizeName(name) {
    return String(name || '').replace(/[^A-Za-z0-9_:$<>\[\]\-\.]/g, '_');
}

function paramsToInputs(params = []) {
    return params.map((p, i) => ({
        name: sanitizeName(p?.name || `arg${i + 1}`),
        type: normalizeType(p?.ty || 'mixed')
    }));
}

function returnToOutputs(ret) {
    const t = normalizeType(ret);
    if (!t || t === 'void') return [];
    return [{ name: 'result', type: t }];
}

export function registerProjectSymbolsAsNodes(index) {
    const extra = { PROJECT: {} };
    // Top-level functions
    for (const fn of Object.values(index?.functions || {})) {
        const nodeId = `fn:${sanitizeName(fn.name)}`;
        extra.PROJECT[nodeId] = {
            name: fn.name,
            category: 'PROJECT',
            description: `${fn.filePath || ''}`,
            inputs: paramsToInputs(fn.params),
            outputs: returnToOutputs(fn.return_type)
        };
    }
    // Class methods
    for (const cls of Object.values(index?.classes || {})) {
        for (const m of cls.methods || []) {
            const vis = (m.visibility || '').toLowerCase();
            const isPublic = !vis || vis === 'public' || vis === 'export';
            const nodeId = `method:${sanitizeName(cls.name)}.${sanitizeName(m.name)}`;
            extra.PROJECT[nodeId] = {
                name: `${cls.name}.${m.name}`,
                category: 'PROJECT',
                description: `${m.filePath || ''}${isPublic ? '' : ` (${vis})`}`.trim(),
                inputs: paramsToInputs(m.params),
                outputs: returnToOutputs(m.return_type)
            };
        }
    }
    registerExtraNodeDefinitions(extra);
}
