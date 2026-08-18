/**
 * Mercenaries 2 domain plugin.
 *
 * Registers the inspector CODE the palette JSON can't carry — a HUD preview for
 * objective nodes and mission-aware validators. Loaded into the editor via a
 * <script> tag by the generic plugin host, which exposes window.registerBlueprintPlugin.
 * All mercs2-specific presentation (the HUD styles) is injected from here, so none
 * of it leaks into the engine's src/.
 */
(function () {
    if (typeof window === 'undefined' || typeof window.registerBlueprintPlugin !== 'function') return;

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
    }

    function param(node, name) {
        const found = (node.inputs || []).find((i) => i && i.name === name);
        return found ? found.defaultValue : undefined;
    }

    // ---- Lua codegen helpers ----
    function luaLiteral(v) {
        if (v === undefined || v === null || v === '') return 'nil';
        if (typeof v === 'number') return String(v);
        if (typeof v === 'boolean') return v ? 'true' : 'false';
        return `"${String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
    }
    function nsFn(node) {
        const m = /^mercs2\.([^.]+)\.(.+)$/.exec((node && node.nodeDefId) || '');
        return m ? { ns: m[1], fn: m[2] } : null;
    }
    // A node as a Lua value expression (variable read, engine getter, or literal).
    function nodeExpr(node, byId, connections, depth) {
        if (!node || depth > 8) return 'nil';
        if (node.type === 'variable') return `self.${node.varName || 'var'}`;
        const nf = nsFn(node);
        if (nf) return `${nf.ns}.${nf.fn}(${resolveArgs(node, byId, connections, depth + 1)})`;
        return 'nil';
    }
    function resolveArgs(node, byId, connections, depth) {
        return (node.inputs || [])
            .filter((i) => i && i.type !== 'exec')
            .map((i) => {
                const conn = connections.find((c) => c.to && c.to.nodeId === node.id && c.to.input === i.name);
                if (conn) {
                    const src = byId.get(conn.from.nodeId);
                    return src ? nodeExpr(src, byId, connections, depth) : 'nil';
                }
                return luaLiteral(i.defaultValue);
            })
            .join(', ');
    }
    function valueExpr(value, byId, connections) {
        if (!value) return 'nil';
        if (value.kind === 'literal') return luaLiteral(value.value);
        return value.node ? nodeExpr(value.node, byId, connections, 0) : 'nil';
    }
    // Emit one Lua statement for a step node.
    function emitStep(step, byId, connections) {
        const node = step.node;
        if (node.category === 'MERCS2_OBJECTIVE') {
            const type = (node.nodeDefId || '').replace('mercs2.Objective.', '');
            const cfg = step.inputs
                .filter((i) => valueExpr(i.value, byId, connections) !== 'nil')
                .map((i) => `${i.name} = ${valueExpr(i.value, byId, connections)}`)
                .join(', ');
            return `self:CreateChild({ sModuleName = "MrxTaskObjective${type}"${cfg ? ', ' + cfg : ''} })`;
        }
        if (node.category === 'MERCS2_EVENT') {
            const type = (node.nodeDefId || '').replace('mercs2.Event.', '');
            const args = step.inputs.map((i) => valueExpr(i.value, byId, connections)).join(', ');
            return `self:_CreateEvent(Event.${type}, { ${args} }, nil, { self })`;
        }
        const nf = nsFn(node);
        if (nf) {
            const args = step.inputs.map((i) => valueExpr(i.value, byId, connections)).join(', ');
            return `${nf.ns}.${nf.fn}(${args})`;
        }
        if (node.type === 'variable' && node.varAction === 'set') {
            return `self.${node.varName || 'var'} = ${valueExpr(step.inputs[0] && step.inputs[0].value, byId, connections)}`;
        }
        return `-- ${node.name || node.nodeDefId || node.id}`;
    }
    function generateLua(graph, ir) {
        const nodes = graph.nodes || [];
        const connections = graph.connections || [];
        const byId = new Map(nodes.map((n) => [n.id, n]));
        const lines = [];

        const root = nodes.find((n) => n.category === 'MERCS2_MISSION' && /^mercs2\.Root\./.test(n.nodeDefId || ''));
        if (root) {
            const type = (root.nodeDefId || '').replace('mercs2.Root.', '');
            const cls =
                { Contract: 'MrxTaskContract', ContractOutpost: 'MrxTaskContractOutpost', Job: 'MrxTaskJob', Mission: 'MrxTaskMission' }[type] ||
                'MrxTaskContract';
            lines.push(`inherit("${cls}")`, '');
        }

        if (ir.entries.length === 0) {
            lines.push('-- No entry points (lifecycle/event nodes) in this graph.');
        }
        for (const { entry, steps } of ir.entries) {
            const hook = (entry.nodeDefId || '').startsWith('mercs2.Lifecycle.')
                ? entry.nodeDefId.replace('mercs2.Lifecycle.', '')
                : (entry.name || `On${entry.id}`).replace(/\s+/g, '');
            lines.push(`function ${hook}(self)`);
            if (steps.length === 0) lines.push('  -- (empty)');
            for (const step of steps) lines.push('  ' + emitStep(step, byId, connections));
            lines.push('end', '');
        }
        return lines.join('\n').trimEnd() + '\n';
    }

    // ---- Content browser: hydrate a starter graph per corpus document ----
    // The catalog (public/mercs2.content.json) is mined from the real Lua corpus
    // by discovery. Each record opens into a starter graph: the mission root for
    // the class it inherits, plus a node for each lifecycle hook it overrides.
    function rootDefIdFor(className) {
        if (/ContractOutpost/.test(className)) return 'mercs2.Root.ContractOutpost';
        if (/Contract/.test(className)) return 'mercs2.Root.Contract';
        if (/Job/.test(className)) return 'mercs2.Root.Job';
        return 'mercs2.Root.Mission';
    }
    function buildDocumentGraph(api, rec) {
        const nodes = [];
        const root = api.createNode(rootDefIdFor(rec.className || ''), 60, 60);
        if (root) nodes.push(root);
        let y = 260;
        for (const hook of rec.hooks || []) {
            const node = api.createNode('mercs2.Lifecycle.' + hook, 60, y);
            if (node) {
                nodes.push(node);
                y += 150;
            }
        }
        return { name: rec.name, nodes, connections: [] };
    }
    async function loadContent(api) {
        if (typeof fetch === 'undefined') return;
        try {
            const res = await fetch('/mercs2.content.json');
            if (!res.ok) return;
            const cat = await res.json();
            const records = Array.isArray(cat.entries) ? cat.entries : [];
            const entries = records.map((rec) => ({
                id: rec.id,
                name: rec.name,
                path: rec.path,
                icon: rec.icon,
                color: rec.color,
                meta: rec.meta,
                open: () => buildDocumentGraph(api, rec)
            }));
            api.registerContentSource(() => entries);
        } catch (e) {
            console.warn('[mercs2] content catalog load failed', e);
        }
    }

    // Inject the mercs2 HUD styles once (kept out of the engine's theme.css).
    function injectStyles() {
        if (document.getElementById('mercs2-plugin-styles')) return;
        const style = document.createElement('style');
        style.id = 'mercs2-plugin-styles';
        style.textContent = `
      .m2-hud { position: relative; overflow: hidden; border-radius: 10px; padding: 14px 15px;
        background: linear-gradient(180deg, rgba(24,18,8,0.92), rgba(12,10,6,0.96));
        border: 1px solid rgba(240,169,43,0.22); box-shadow: inset 0 0 44px rgba(240,169,43,0.06); }
      .m2-hud::before { content:""; position:absolute; inset:0; pointer-events:none; opacity:.45;
        background: repeating-linear-gradient(0deg, transparent 0 3px, rgba(0,0,0,.14) 3px 4px); }
      .m2-hud-top { display:flex; align-items:center; gap:11px; position:relative; }
      .m2-hud-marker { width:15px; height:15px; transform:rotate(45deg); border:2px solid #f0a92b;
        box-shadow:0 0 10px rgba(240,169,43,.5); flex:none; }
      .m2-hud-title { font-weight:800; letter-spacing:.07em; font-size:13px; color:#f6d98a;
        text-transform:uppercase; text-shadow:0 1px 2px rgba(0,0,0,.6); }
      .m2-hud-prog { margin-top:12px; }
      .m2-hud-prog .lbl { display:flex; justify-content:space-between; font-family:var(--font-mono,monospace);
        font-size:10px; color:#c9a86a; margin-bottom:5px; }
      .m2-hud-prog .bar { height:6px; border-radius:3px; background:rgba(240,169,43,.15); overflow:hidden; }
      .m2-hud-prog .bar i { display:block; height:100%; width:0%; border-radius:3px;
        background:linear-gradient(90deg,#f0a92b,#f6d98a); }
    `;
        document.head.appendChild(style);
    }

    injectStyles();

    window.registerBlueprintPlugin((api) => {
        // HUD preview for objective nodes — what the objective renders in-game.
        api.registerNodePreviewProvider((node) => {
            if (!node || node.category !== 'MERCS2_OBJECTIVE') return null;
            const desc = param(node, 'sDspShortDesc') || node.name || 'Objective';
            const quota = param(node, 'nQuota');
            const title = escapeHtml(String(desc).toUpperCase());
            const prog =
                quota !== undefined && quota !== null && quota !== ''
                    ? `<div class="m2-hud-prog"><div class="lbl"><span>PROGRESS</span><span>0 / ${escapeHtml(quota)}</span></div><div class="bar"><i></i></div></div>`
                    : '';
            return {
                html: `<div class="m2-hud"><div class="m2-hud-top"><div class="m2-hud-marker"></div><div class="m2-hud-title">${title}</div></div>${prog}</div>`
            };
        });

        // Mission-aware validators.
        api.registerNodeValidator((node) => {
            const issues = [];
            if (!node) return issues;
            if (node.category === 'MERCS2_OBJECTIVE') {
                const quota = param(node, 'nQuota');
                if (quota !== undefined && quota !== null && quota !== '' && Number(quota) <= 0) {
                    const nq = (node.inputs || []).find((i) => i && i.name === 'nQuota');
                    issues.push({
                        level: 'error',
                        title: "Quota can't be met",
                        body: `nQuota is ${quota}; this objective can never complete. Set a quota of at least 1.`,
                        field: 'nQuota',
                        fixes: nq
                            ? [
                                  {
                                      label: 'Set quota to 1',
                                      apply: () => {
                                          nq.defaultValue = 1;
                                      }
                                  }
                              ]
                            : []
                    });
                }
            }
            if (node.category === 'MERCS2_EVENT') {
                const hasConfig = (node.inputs || []).some((i) => i && i.type !== 'exec');
                const configured = (node.inputs || []).some(
                    (i) => i && i.type !== 'exec' && i.defaultValue !== undefined && i.defaultValue !== null && i.defaultValue !== ''
                );
                if (hasConfig && !configured) {
                    const firstArg = (node.inputs || []).find((i) => i && i.type !== 'exec');
                    issues.push({
                        level: 'warn',
                        title: 'Event has no configuration',
                        body: 'This event trigger has no argument values set, so it may never fire.',
                        field: firstArg ? firstArg.name : undefined
                    });
                }
            }
            return issues;
        });

        // Mission-shaped outline: group the graph into SCRIPT / EVENTS / OBJECTIVES /
        // VARIABLES so the left panel reads like the mission file (even when empty).
        api.registerOutlineProvider(({ nodes = [], variables = [] }) => {
            const itemsFor = (cats, kindFn) =>
                nodes
                    .filter((n) => cats.includes(n.category))
                    .map((n) => ({
                        id: `n:${n.id}`,
                        label: n.name || n.nodeDefId || `Node ${n.id}`,
                        nodeId: n.id,
                        kind: kindFn ? kindFn(n) : undefined
                    }));

            const sections = [
                {
                    id: 'SCRIPT',
                    title: 'Script',
                    hint: 'the mission file',
                    icon: 'mission',
                    color: 'violet',
                    addable: true,
                    items: itemsFor(['MERCS2_MISSION'], (n) => (String(n.nodeDefId || '').includes('Lifecycle') ? 'lifecycle' : 'root'))
                },
                {
                    id: 'EVENTS',
                    title: 'Events',
                    hint: 'handlers · entry points',
                    icon: 'event',
                    color: 'red',
                    addable: true,
                    items: itemsFor(['MERCS2_EVENT'], () => 'trigger')
                },
                { id: 'OBJECTIVES', title: 'Objectives', icon: 'objective', color: 'amber', addable: true, items: itemsFor(['MERCS2_OBJECTIVE']) },
                {
                    id: 'VARIABLES',
                    title: 'Variables',
                    icon: 'variable',
                    color: 'purple',
                    addable: true,
                    items: variables.map((v) => {
                        const vn = nodes.find((n) => n.type === 'variable' && n.varName === v.name);
                        return { id: `v:${v.name}`, label: v.name, kind: v.type || 'mixed', color: 'purple', nodeId: vn ? vn.id : undefined };
                    })
                }
            ];
            for (const s of sections) for (const it of s.items) if (!it.color) it.color = s.color;

            // Only the mission's foundational primitives live here (like UE's My
            // Blueprint panel). Placed logic/action nodes stay on the canvas.
            return sections;
        });

        // Codegen: lower the graph (via the engine's IR) into mission Lua.
        api.registerCodegenTarget('lua', (graph) => ({
            code: generateLua(graph, api.buildGraphIR(graph)),
            language: 'lua'
        }));

        // Content browser: list the corpus's documents (async — fetch the catalog).
        loadContent(api);
    });
})();
