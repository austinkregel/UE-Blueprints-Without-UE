#!/usr/bin/env node
/**
 * Mercenaries 2 domain discovery.
 *
 * Reads the mercs2 assets (the Rust re-implementation + the fact-checked visual-scripting spec)
 * and emits a node palette in the generic engine's `registerExtraNodeDefinitions` format:
 *
 *   { CATEGORY_KEY: { nodeId: { name, category, inputs[], outputs[], description } } }
 *
 * Output goes to:
 *   - mercs2-specific-data/spec/mercs2.nodes.json   (canonical, committed)
 *   - public/language-extras.json                    (served copy the editor loads on startup)
 *
 * This is the "initial hard-coded discovery": the mercs2 checkout path is a constant below, and the
 * mission/event authoring layer is hand-encoded from docs/scripts_graph_spec.md. Nothing here leaks
 * into src/ or src-tauri/ — the engine only consumes the generated JSON.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');

// --- hard-coded mercs2 asset location (make configurable in a later phase) ---
const MERCS2_ROOT = '/Users/austinkregel/src/mercs2-wad-simulator';
const BINDING_COVERAGE = join(MERCS2_ROOT, 'crates/mercs2_script/binding_coverage.json');
const BINDINGS_DIR = join(MERCS2_ROOT, 'crates/mercs2_script/src/bindings');

const OUT_CANONICAL = join(REPO_ROOT, 'mercs2-specific-data/spec/mercs2.nodes.json');
const OUT_SERVED = join(REPO_ROOT, 'public/language-extras.json');

// Domain plugin (inspector code) — copied to public/ and listed in the plugin manifest.
const PLUGIN_SRC = join(__dirname, '..', 'plugin', 'mercs2-plugin.js');
const OUT_PLUGIN = join(REPO_ROOT, 'public/plugins/mercs2.js');
const OUT_MANIFEST = join(REPO_ROOT, 'public/plugins.json');

// Real Lua corpus — the actual mission/contract scripts. The content browser
// lists these as openable documents; the plugin hydrates a starter graph per entry.
const CORPUS_DIR = join(MERCS2_ROOT, 'crates/mercs2_script/corpus/mercs2-luacd/src');
const OUT_CONTENT = join(REPO_ROOT, 'public/mercs2.content.json');

// ---------------------------------------------------------------------------
// Type mapping: mercs2/Rust argument types -> generic engine pin types.
// The engine's type system: int, float, string, bool, object, array, mixed, exec.
// ---------------------------------------------------------------------------
function rustTypeToPin(rustType) {
    const t = rustType.trim().replace(/^&/, '').replace(/^mut /, '');
    if (/^Guid$/.test(t)) return 'object';
    if (/^(String|str)$/.test(t)) return 'string';
    if (/^f(32|64)$/.test(t)) return 'float';
    if (/^(i|u)(8|16|32|64|size)$/.test(t)) return 'int';
    if (/^bool$/.test(t)) return 'bool';
    if (/^(Table|Value|Variadic|Function|MultiValue)/.test(t)) return 'mixed';
    return 'mixed';
}

const isPureName = (fn) => /^(Get|Is|Has|Can|Find|Query|Lookup)/.test(fn);

// ---------------------------------------------------------------------------
// 1. Parse the Rust binding files: GLOBAL const + per-function typed args.
//    Anchored on `pub const GLOBAL: &str = "X";` and `b.real("Fn", … create_function(move |ctx, ARGS| …`.
// ---------------------------------------------------------------------------
function parseRustBindings() {
    const byGlobal = {}; // global -> { fnName -> [{name, type}] }
    if (!existsSync(BINDINGS_DIR)) return byGlobal;

    for (const file of readdirSync(BINDINGS_DIR)) {
        if (!file.endsWith('.rs') || file === 'mod.rs') continue;
        const src = readFileSync(join(BINDINGS_DIR, file), 'utf8');
        const globalMatch = /pub const GLOBAL:\s*&str\s*=\s*"([^"]+)"/.exec(src);
        if (!globalMatch) continue;
        const global = globalMatch[1];
        // null-prototype so binding names like "constructor"/"valueOf" can't collide with
        // Object.prototype members.
        byGlobal[global] ||= Object.create(null);

        // Each binding: b.real("Fn", ... create_function(move |ctx, <ARGS>| ...
        // ARGS is one of: nothing, `name: Type`, or `(a, b): (T1, T2)`.
        const re = /b\.(?:real|stub)\(\s*"([A-Za-z0-9_]+)"[\s\S]{0,120}?create_function\(move \|(?:_|lua|ctx)\s*(?:,\s*([^|]*?))?\|/g;
        let m;
        while ((m = re.exec(src)) !== null) {
            const fn = m[1];
            const argSpec = (m[2] || '').trim();
            byGlobal[global][fn] = parseArgSpec(argSpec);
        }
    }
    return byGlobal;
}

function parseArgSpec(spec) {
    if (!spec) return [];
    // Tuple form: (a, b, c): (T1, T2, T3)
    const tuple = /^\(([^)]*)\)\s*:\s*\(([^)]*)\)$/.exec(spec);
    if (tuple) {
        const names = tuple[1]
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        const types = tuple[2].split(',').map((s) => s.trim());
        return names.map((name, i) => ({ name, type: rustTypeToPin(types[i] || 'mixed') }));
    }
    // Single form: name: Type
    const single = /^([A-Za-z0-9_]+)\s*:\s*(.+)$/.exec(spec);
    if (single) return [{ name: single[1], type: rustTypeToPin(single[2]) }];
    return [];
}

// ---------------------------------------------------------------------------
// 2. Build the engine-binding palette from binding_coverage.json, enriched
//    with typed pins from the Rust parse.
// ---------------------------------------------------------------------------
function buildBindingNodes(rustByGlobal) {
    const cov = JSON.parse(readFileSync(BINDING_COVERAGE, 'utf8'));
    const spec = {};
    const globalByCat = {}; // categoryKey -> original global name (for category metadata)

    for (const ns of cov.namespaces) {
        const global = ns.global;
        const categoryKey = `MERCS2_${global.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
        globalByCat[categoryKey] = global;
        spec[categoryKey] ||= {};
        const fns = [...(ns.real_fns || []), ...(ns.stub_fns || [])];

        for (const fn of fns) {
            const rawArgs = rustByGlobal[global]?.[fn];
            const args = Array.isArray(rawArgs) ? rawArgs : [];
            const nodeId = `mercs2.${global}.${fn}`;
            const stub = (ns.stub_fns || []).includes(fn);
            const pure = isPureName(fn);

            const argPins = args.map((a) => ({ name: a.name, type: a.type }));
            let inputs;
            let outputs;
            if (pure) {
                // Pure data node: no exec pins, typed args in, one value out.
                inputs = argPins;
                outputs = [{ name: 'value', type: 'mixed' }];
            } else {
                // Impure action node: exec-in + typed args, exec-out.
                inputs = [{ name: 'Exec', type: 'exec' }, ...argPins];
                outputs = [{ name: 'Exec', type: 'exec' }];
            }

            spec[categoryKey][nodeId] = {
                name: `${global}.${fn}`,
                category: categoryKey,
                inputs,
                outputs,
                description: `${global}.${fn} — mercs2 engine binding${stub ? ' (stub)' : ''}${pure ? ' · pure' : ''}`
            };
        }
    }
    return { spec, globalByCat };
}

// ---------------------------------------------------------------------------
// Category metadata (display name + color), from the safe color set the engine
// already ships (only these Tailwind colors are guaranteed generated).
// ---------------------------------------------------------------------------
const NS_COLORS = {
    Object: 'violet',
    ObjectState: 'violet',
    ObjectFilter: 'violet',
    Pg: 'blue',
    Player: 'green',
    Ai: 'orange',
    Vehicle: 'cyan',
    Sound: 'pink',
    VO: 'pink',
    Gui: 'indigo',
    Hud: 'indigo',
    Net: 'emerald',
    Math: 'green',
    String: 'pink',
    Weapon: 'red',
    Airstrike: 'red',
    Human: 'orange',
    Camera: 'cyan',
    Graphics: 'cyan',
    Timer: 'amber',
    Debug: 'gray',
    Sys: 'slate'
};

function buildBindingCategories(globalByCat) {
    const cats = {};
    for (const [categoryKey, global] of Object.entries(globalByCat)) {
        cats[categoryKey] = {
            name: `Mercs2 · ${global}`,
            color: NS_COLORS[global] || 'slate',
            icon: 'function',
            description: `Mercenaries 2 ${global} engine bindings`
        };
    }
    return cats;
}

const AUTHORING_CATEGORIES = {
    MERCS2_MISSION: { name: 'Mercs2 · Mission', color: 'violet', icon: 'mission', description: 'Mission roots and lifecycle hooks' },
    MERCS2_EVENT: { name: 'Mercs2 · Events', color: 'red', icon: 'event', description: 'Event.<Type> trigger nodes (red event nodes)' },
    MERCS2_OBJECTIVE: { name: 'Mercs2 · Objectives', color: 'amber', icon: 'objective', description: 'Objective task nodes with outcome exec pins' }
};

// ---------------------------------------------------------------------------
// 3. Hand-encoded Blueprint authoring layer, from docs/scripts_graph_spec.md.
//    These sit ABOVE the raw engine bindings and are the red/exec-shaped nodes.
// ---------------------------------------------------------------------------

// §3c event-trigger catalog — each an exec-OUT ("On Fire") red node whose config
// arg tuple becomes typed input pins. Excludes the payload-field non-triggers
// called out in gotcha §6.2 (ButtonPress/PosX/PrimaryClipSize/…).
const EVENT_TRIGGERS = [
    [
        'TimerRelative',
        'time',
        [
            ['nSeconds', 'float'],
            ['bRepeat', 'bool', true]
        ]
    ],
    [
        'ObjectProximity',
        'spatial',
        [
            ['uChar', 'object'],
            ['uTarget', 'object'],
            ['sCompare', 'string'],
            ['nDist', 'float']
        ]
    ],
    [
        'Boundary',
        'spatial',
        [
            ['uChar', 'object'],
            ['uRegion', 'object'],
            ['sDir', 'string'],
            ['bPersist', 'bool', true]
        ]
    ],
    [
        'ObjectHibernation',
        'lifecycle',
        [
            ['uGuid', 'object'],
            ['sState', 'string']
        ]
    ],
    ['ObjectDeath', 'lifecycle', [['uGuid', 'object']]],
    [
        'ObjectInSeat',
        'lifecycle',
        [
            ['uChar', 'object'],
            ['uVehicle', 'object'],
            ['sSeat', 'string'],
            ['sAction', 'string']
        ]
    ],
    ['ObjectIsReady', 'lifecycle', [['uGuid', 'object']]],
    ['ObjectDelete', 'lifecycle', [['uGuid', 'object']]],
    ['ObjectIsVisible', 'lifecycle', [['uGuid', 'object']]],
    [
        'ObjectWinched',
        'lifecycle',
        [
            ['uObj', 'object'],
            ['nIdx', 'mixed'],
            ['sMode', 'string']
        ]
    ],
    [
        'ObjectHealth',
        'combat',
        [
            ['uGuid', 'object'],
            ['sCompare', 'string'],
            ['nHealth', 'float']
        ]
    ],
    [
        'ObjectHealthLessThan',
        'combat',
        [
            ['uGuid', 'object'],
            ['nHealth', 'float']
        ]
    ],
    [
        'WeaponEvent',
        'combat',
        [
            ['sClass', 'string'],
            ['sAction', 'string'],
            ['uGuid', 'object']
        ]
    ],
    [
        'HumanStateTransition',
        'state',
        [
            ['uChar', 'object'],
            ['sFrom', 'string'],
            ['sTo', 'string'],
            ['sQualifier', 'string', true]
        ]
    ],
    ['HumanActionComplete', 'state', [['uChar', 'object']]],
    [
        'ObjectPhysicsEvent',
        'state',
        [
            ['uGuid', 'object'],
            ['sPhysTag', 'string']
        ]
    ],
    [
        'AnimationEvent',
        'state',
        [
            ['uGuid', 'object'],
            ['sAnimTag', 'string']
        ]
    ],
    [
        'ContextAction',
        'input',
        [
            ['uChar', 'object'],
            ['uGuid', 'object']
        ]
    ],
    [
        'Button',
        'input',
        [
            ['uPlayerChar', 'object'],
            ['sButton', 'string'],
            ['sPhase', 'string'],
            ['bConsume', 'bool']
        ]
    ],
    [
        'Minigame',
        'input',
        [
            ['uPlayerChar', 'object'],
            ['nTimeOut', 'float'],
            ['sMode', 'string'],
            ['uButton', 'object']
        ]
    ],
    [
        'ScriptEvent',
        'scripting',
        [
            ['sChannel', 'string'],
            ['fFilter', 'mixed', true]
        ]
    ],
    [
        'GameStateChange',
        'scripting',
        [
            ['sState', 'string'],
            ['sEdge', 'string']
        ]
    ]
];

function buildEventNodes() {
    const cat = {};
    for (const [type, group, args] of EVENT_TRIGGERS) {
        const nodeId = `mercs2.Event.${type}`;
        const inputs = args.map(([name, type, optional]) => {
            const pin = { name, type };
            if (optional) pin.optional = true;
            return pin;
        });
        cat[nodeId] = {
            name: `On ${type}`,
            category: 'MERCS2_EVENT',
            inputs,
            outputs: [
                { name: 'On Fire', type: 'exec' },
                { name: 'context', type: 'mixed' }
            ],
            description: `Event.${type} trigger (${group}) — binds via Event.Create/_CreateEvent; the callback is the exec-out.`
        };
    }
    return { MERCS2_EVENT: cat };
}

// §3b objective nodes — exec-in, common + type-specific config pins, one exec-out per outcome.
const OBJECTIVE_COMMON = [
    ['sName', 'string'],
    ['sDspShortDesc', 'string'],
    ['vTgtInclude', 'mixed'],
    ['sTgtLabelFilter', 'string'],
    ['nQuota', 'int']
];
const OBJECTIVE_OUTCOMES = [
    ['OnComplete', 'exec'],
    ['OnCancel', 'exec'],
    ['OnActivate', 'exec']
];
const OBJECTIVES = [
    [
        'Deliver',
        [
            ['vDestRegion', 'mixed'],
            ['fDist', 'float'],
            ['bStop', 'bool']
        ]
    ],
    ['Destroy', [['bHeroOnly', 'bool']]],
    ['Protect', [['bHeroOnly', 'bool']]],
    ['Extract', [['fDist', 'float']]],
    [
        'EnterVehicle',
        [
            ['uPlayer', 'object'],
            ['bUseAnySeat', 'bool']
        ]
    ],
    ['Verify', [['sFactionId', 'string']]],
    ['Action', [['sActionLabel', 'string']]],
    ['Release', [['sActionLabel', 'string']]],
    ['Accept', [['sDialogText', 'string']]],
    ['CaptureOutpost', [['uOutpostBldg', 'object']]],
    [
        'Race',
        [
            ['tCourseLocs', 'mixed'],
            ['fWidth', 'float'],
            ['sGateType', 'string']
        ]
    ]
];

function buildObjectiveNodes() {
    const cat = {};
    for (const [type, specific] of OBJECTIVES) {
        const nodeId = `mercs2.Objective.${type}`;
        const configPins = [...OBJECTIVE_COMMON, ...specific].map(([name, type]) => ({ name, type }));
        cat[nodeId] = {
            name: `${type} Objective`,
            category: 'MERCS2_OBJECTIVE',
            inputs: [{ name: 'Exec', type: 'exec' }, ...configPins],
            outputs: OBJECTIVE_OUTCOMES.map(([name, type]) => ({ name, type })),
            description: `MrxTaskObjective${type} — created via self:CreateChild; outcome wires are the t/fOn* callbacks.`
        };
    }
    return { MERCS2_OBJECTIVE: cat };
}

// §3a mission root / lifecycle nodes.
const ROOTS = [
    [
        'Contract',
        'MrxTaskContract',
        [
            ['sFactionId', 'string'],
            ['sStarter', 'string']
        ]
    ],
    ['ContractOutpost', 'MrxTaskContractOutpost', [['sFactionId', 'string']]],
    ['Job', 'MrxTaskJob', [['sFactionId', 'string']]],
    [
        'Mission',
        'MrxTaskMission',
        [
            ['sFactionId', 'string'],
            ['oStarter', 'object']
        ]
    ]
];
const LIFECYCLE = ['PreLoadAssets', 'LoadAssets', 'Activated', 'Complete', 'Cancel', 'Cleanup'];

function buildMissionNodes() {
    const cat = {};
    for (const [type, cls, config] of ROOTS) {
        cat[`mercs2.Root.${type}`] = {
            name: `${type} (root)`,
            category: 'MERCS2_MISSION',
            inputs: config.map(([name, type]) => ({ name, type })),
            outputs: [{ name: 'Activated', type: 'exec' }],
            description: `Mission root — inherit("${cls}"). The mission .lua is this node.`
        };
    }
    for (const hook of LIFECYCLE) {
        cat[`mercs2.Lifecycle.${hook}`] = {
            name: `${hook} (lifecycle)`,
            category: 'MERCS2_MISSION',
            inputs: [{ name: 'self', type: 'object' }],
            outputs: [{ name: 'Body', type: 'exec' }],
            description: `Lifecycle hook ${hook}(self) — called by the base task class in fixed order.`
        };
    }
    return { MERCS2_MISSION: cat };
}

// ---------------------------------------------------------------------------
// §4 content catalog — mine the real Lua corpus into openable documents.
//   Folders come from the corpus layout: the top dir is the "residency" band
//   (resident / vz / shell), the second level groups by faction+type. Files are
//   the contract/job/mission scripts. Each entry carries the class it inherits
//   and the lifecycle hooks it overrides, so the plugin can build a starter graph.
// ---------------------------------------------------------------------------
const RESIDENCY_LABELS = { resident: 'Resident', vz: 'Venezuela', shell: 'Shell' };
const FACTION_LABELS = {
    pmc: 'PMC',
    oil: 'Oil',
    chi: 'Chinese',
    gur: 'Guerrillas',
    all: 'Allies',
    pir: 'Pirates',
    mec: 'Mercs',
    jet: 'Jets',
    vza: 'Venezuela'
};
const LIFECYCLE_HOOKS = ['PreLoadAssets', 'LoadAssets', 'Activated', 'Complete', 'Cancel', 'Cleanup'];

function kindFromClass(cls) {
    return cls.replace(/^MrxTask/, '').replace(/^Mrx/, '') || 'Script';
}
function styleForKind(kind) {
    if (/Contract/.test(kind)) return { icon: 'mission', color: 'violet' };
    if (/Job/.test(kind) || /Objective/.test(kind)) return { icon: 'objective', color: 'amber' };
    if (/Tutorial/.test(kind)) return { icon: 'flow', color: 'blue' };
    if (/Support/.test(kind)) return { icon: 'object', color: 'slate' };
    return { icon: 'mission', color: 'violet' };
}
function groupFor(base, kind) {
    const m = /^([a-z]+?)(con|job)\d/.exec(base);
    if (m && FACTION_LABELS[m[1]]) return `${FACTION_LABELS[m[1]]} ${m[2] === 'job' ? 'Jobs' : 'Contracts'}`;
    if (/Tutorial/.test(kind)) return 'Tutorials';
    if (/Support/.test(kind)) return 'Support';
    if (/Objective/.test(kind)) return 'Objectives';
    return 'Other';
}
function niceName(base, kind) {
    const m = /^([a-z]+?)(con|job)(\d+)$/.exec(base);
    if (m && FACTION_LABELS[m[1]]) return `${FACTION_LABELS[m[1]]} ${m[2] === 'job' ? 'Job' : 'Contract'} ${m[3]}`;
    return `${base} (${kind})`;
}

function buildContentCatalog() {
    if (!existsSync(CORPUS_DIR)) {
        console.warn(`[mercs2:discover] corpus not found at ${CORPUS_DIR} — content catalog will be empty.`);
        return { entries: [] };
    }
    const entries = [];
    for (const dir of readdirSync(CORPUS_DIR)) {
        const abs = join(CORPUS_DIR, dir);
        let files;
        try {
            files = readdirSync(abs);
        } catch {
            continue; // not a directory
        }
        const residency = RESIDENCY_LABELS[dir] || dir.charAt(0).toUpperCase() + dir.slice(1);
        for (const file of files) {
            if (!file.endsWith('.lua')) continue;
            let src;
            try {
                src = readFileSync(join(abs, file), 'utf8');
            } catch {
                continue;
            }
            const inh = /inherit\("([^"]+)"\)/.exec(src);
            if (!inh || !/^Mrx/.test(inh[1])) continue; // only task/mission scripts are openable graphs
            const className = inh[1];
            const base = file.replace(/\.lua$/, '');
            const kind = kindFromClass(className);
            const hooks = LIFECYCLE_HOOKS.filter((h) => new RegExp(`function\\s+${h}\\s*\\(`).test(src));
            const style = styleForKind(kind);
            entries.push({
                id: `${dir}/${base}`,
                name: niceName(base, kind),
                path: [residency, groupFor(base, kind)],
                className,
                hooks,
                icon: style.icon,
                color: style.color,
                meta: { kind }
            });
        }
    }
    entries.sort((a, b) => a.id.localeCompare(b.id));
    return { entries };
}

// ---------------------------------------------------------------------------
// Assemble + write
// ---------------------------------------------------------------------------
function mergeSpecs(...specs) {
    const out = {};
    for (const spec of specs) {
        for (const [cat, nodes] of Object.entries(spec)) {
            out[cat] = { ...(out[cat] || {}), ...nodes };
        }
    }
    return out;
}

function countNodes(spec) {
    return Object.values(spec).reduce((n, cat) => n + Object.keys(cat).length, 0);
}

function main() {
    if (!existsSync(BINDING_COVERAGE)) {
        console.warn(`[mercs2:discover] mercs2 assets not found at ${MERCS2_ROOT} — skipping (no-op).`);
        console.warn('[mercs2:discover] This is expected on machines without the game checkout (e.g. CI).');
        return;
    }

    const rustByGlobal = parseRustBindings();
    const { spec: bindingNodes, globalByCat } = buildBindingNodes(rustByGlobal);
    const eventNodes = buildEventNodes();
    const objectiveNodes = buildObjectiveNodes();
    const missionNodes = buildMissionNodes();

    const nodes = mergeSpecs(missionNodes, eventNodes, objectiveNodes, bindingNodes);
    // Authoring categories win on key collisions (e.g. MERCS2_EVENT: the Event
    // namespace bindings share the category with the red event-trigger nodes).
    const categories = { ...buildBindingCategories(globalByCat), ...AUTHORING_CATEGORIES };

    const spec = { categories, nodes };
    const json = JSON.stringify(spec, null, 2) + '\n';
    mkdirSync(dirname(OUT_CANONICAL), { recursive: true });
    mkdirSync(dirname(OUT_SERVED), { recursive: true });
    writeFileSync(OUT_CANONICAL, json);
    writeFileSync(OUT_SERVED, json);

    // Install the domain plugin (inspector providers) into public/ + manifest.
    mkdirSync(dirname(OUT_PLUGIN), { recursive: true });
    writeFileSync(OUT_PLUGIN, readFileSync(PLUGIN_SRC, 'utf8'));
    writeFileSync(OUT_MANIFEST, JSON.stringify(['/plugins/mercs2.js'], null, 2) + '\n');

    // Content catalog — the openable documents the content browser lists.
    const content = buildContentCatalog();
    writeFileSync(OUT_CONTENT, JSON.stringify(content, null, 2) + '\n');

    const typedBindingPins = Object.values(bindingNodes).reduce(
        (n, cat) => n + Object.values(cat).filter((d) => d.inputs.some((p) => p.type !== 'exec')).length,
        0
    );
    console.log(`[mercs2:discover] categories: ${Object.keys(categories).length}`);
    console.log(
        `[mercs2:discover] nodes: ${countNodes(nodes)} (bindings ${countNodes(bindingNodes)}, events ${countNodes(eventNodes)}, objectives ${countNodes(objectiveNodes)}, mission ${countNodes(missionNodes)})`
    );
    console.log(`[mercs2:discover] binding nodes with typed arg pins (from Rust): ${typedBindingPins}`);
    console.log(`[mercs2:discover] wrote ${OUT_CANONICAL}`);
    console.log(`[mercs2:discover] wrote ${OUT_SERVED}`);
    console.log(`[mercs2:discover] content entries: ${content.entries.length} -> ${OUT_CONTENT}`);
}

main();
