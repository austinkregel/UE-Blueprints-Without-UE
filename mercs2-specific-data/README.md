# mercs2-specific-data

This directory is the **Mercenaries 2 domain layer** for the blueprint engine. All mercs2-specific
knowledge lives here. `src/` and `src-tauri/` stay generic — they must never learn the word
"mercs2." The engine only ever consumes a **generated data file** through its existing extension
seam.

## How it layers onto the generic engine

```
src/ + src-tauri/                 generic blueprint engine (domain-agnostic)
        ▲ loads as data
        │  public/language-extras.json   ← generic seam the engine already reads on startup
        │  (NodePalette.vue → loadLanguageDefinitionsFromUrl → registerExtraNodeDefinitions)
        │
mercs2-specific-data/
  ├─ discovery/discover.mjs        the hard-coded discovery tool (reads the mercs2 assets)
  └─ spec/mercs2.nodes.json        the generated node palette (committed, canonical artifact)
```

The engine's `NodePalette` already calls `loadLanguageDefinitionsFromUrl('/language-extras.json')`
on mount. Discovery writes the generated palette to both `spec/mercs2.nodes.json` (canonical,
committed) and `public/language-extras.json` (the served copy the running editor loads). **No `src/`
change is required to see the mercs2 palette** — this is the whole point of the layering.

## Sources the discovery tool mines

The engine was re-implemented in Rust; the authored game logic is decompiled Lua. Discovery reads
**both**, from an external checkout (`mercs2-wad-simulator`) whose path is hard-coded at the top of
`discover.mjs` (initial hard-coded discovery — to be made configurable later):

| Source | What we take from it |
|---|---|
| `crates/mercs2_script/binding_coverage.json` | The authoritative catalog: 37 engine namespaces / ~1092 C-function bindings, names + real/stub status. |
| `crates/mercs2_script/src/bindings/*.rs` | Typed argument pins — parsed from each `b.real("Fn", …create_function(move \|_, (a,b): (T1,T2)\|` closure, anchored by each file's `pub const GLOBAL`. |
| `docs/scripts_graph_spec.md` (fact-checked) | The Blueprint-shaped authoring layer above the raw bindings: event-trigger nodes (§3c, typed arg tuples), objective nodes (§3b), and mission root/lifecycle nodes (§3a). These are hand-encoded in `discover.mjs` from that spec. |

Node roles follow the spec's Blueprint mapping: `Event.<Type>` → red event nodes (exec-out);
`Get*/Is*/Has*` → pure data nodes (no exec); everything else → impure action nodes (exec-in/out).

## Regenerating

```bash
npm run mercs2:discover
```

Reads the mercs2 assets and rewrites `spec/mercs2.nodes.json` + `public/language-extras.json`.
The tool is a no-op with a clear message if the mercs2 checkout isn't present (e.g. in CI), so it
never breaks a build on a machine without the game assets.
