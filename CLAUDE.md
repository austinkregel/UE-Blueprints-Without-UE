# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A Tauri desktop app that provides an **Unreal Engine Blueprints–style visual editor for real code**. Source files are parsed into an AST, lowered into a node graph, edited visually, and (eventually) regenerated back into source. This is a code editor — not a game/3D tool. Primary target language is PHP (Laravel), but the design is language-agnostic via pluggable adapters.

Two halves talk over Tauri IPC:

- **Frontend (Vue 3 / `src/`)** — the node canvas, the node-graph model, and an in-JS graph _executor_ for testing graphs.
- **Rust backend (`src-tauri/`)** — filesystem access and tree-sitter parsing/lowering of source into normalized ASTs and graph nodes.

## Commands

```bash
npm run dev            # Vite dev server only (browser, no Rust) — port 1420, strictPort
npm run tauri dev      # Full desktop app (Vue + Rust backend). Use this to exercise Tauri commands.
npm run build          # vite build
npm test               # vitest (watch mode)
npx vitest run                                   # run all tests once
npx vitest run src/utils/__tests__/foo.spec.js   # run a single test file
npx vitest run -t "substring of test name"        # run tests matching a name
npm run php:scan       # run the standalone Rust php_scan bin (src-tauri/src/bin/php_scan.rs)
cargo test --manifest-path src-tauri/Cargo.toml   # Rust unit tests
npx prettier --write . # format (no ESLint configured; prettier is the only formatter)
```

Toolchain versions are pinned in `.tool-versions` (node 25.9, rust 1.94, elixir 1.18, erlang 28). Elixir/Erlang are only needed for the `Makefile` library-analyzer targets, not the app itself.

## Architecture

### Frontend state & data flow (`src/utils/`)

Global reactive state lives in module-level `ref`s, not a store library:

- **`state.js`** — the single source of truth: `nodes` (ref array), `selectedNodeId`, plus a `workspaceState` reactive holding multiple named workspaces (each with its own nodes/connections/ioPositions). `App.vue` watches `activeWorkspace` and rebinds `nodes.value` to the active workspace's array. When adding graph features, respect this workspace indirection.
- **`language-definition.js`** — the heart of the system. Defines the `TYPES` system (with compatibility/auto-cast rules and per-type colors) and every node definition (inputs, outputs, exec pins, category). **Node behavior is data-driven from here**: exec pins, I/O, and colors are derived from definitions, not hand-authored per node. `registerExtraNodeDefinitions()` allows runtime extension (see `language-spec-loader.js`, which can load extras from a URL or a Tauri file path).
- **`node-factory.js` → `node-creation.js`** — factory builds a node object from a definition; creation pushes it onto `nodes.value`. `addNodeFromDefinition(nodeDefId, position)` is the main entry.
- **`connection-manager.js` / `connection-utils.js`** — connection storage, validation, type-checking, auto-casting.
- **`graph-executor.js`** — walks the graph from entry points following **exec pins** and evaluates it _in JavaScript_ (for in-app testing/preview). Entry points are user-configured or auto-detected (`on_start`, exec-output-without-exec-input nodes, etc.). This is separate from real code generation.
- **`ast-adapters/`** (`python-generator.js`, `elixir-generator.js`) — take a minimal JS **IR** and emit source strings. This is the codegen side, distinct from the executor.

### Rust backend (`src-tauri/src/`)

- **`lib.rs`** — registers all `#[tauri::command]`s and a `REGISTRY` of language adapters (PHP, JavaScript, Rust). Key commands: `list_dir`, `read_text_file`, `enumerate_language_files`, `parse_file`/`parse_text` (→ `NormalizedFile`), `start_php_scan` (streams `php_scan` events per file), `parse_code_to_graph` (tree-sitter → graph `nodes` + `connections`), `list_languages`.
- **`parser/`** — `mod.rs` defines the `LanguageAdapter` trait, `Registry`, and the `NormalizedFile`/`SymbolItem`/`ReferenceItem` shapes serialized to the frontend. One module per language: `php.rs`, `javascript.rs`, `rust_lang.rs`, plus `generic.rs`. Add a language by implementing an adapter and registering it in `lib.rs`'s `REGISTRY`.
- `parse_code_to_graph` currently only implements PHP lowering (literals, variables, calls, binary ops, echo/return/assignment). Other languages return an error.

### Vue components (`src/components/`)

`App.vue` is the composition root wiring toolbar, canvas, panels, and floating menus. Notable subdirs: `Nodes/` (NodeBase + per-type node components), `NodeParts/` (I/O pins), `canvas/` (NodeCanvas, ExecutionLog), `panels/` (ProjectExplorer, VariablesPanel), `layout/` (TopToolbar).

## Conventions & gotchas

- **Vue 3 `<script setup>` + Composition API** throughout. Tailwind 4 (via `@tailwindcss/vite`), dark mode supported.
- **No dynamic `import()`** in app code — the copilot instructions forbid it (bundling/Tauri reasons). `language-spec-loader.js` uses `await import('@tauri-apps/plugin-fs')` as a deliberate Tauri-only exception; prefer static imports elsewhere.
- **Detect Tauri via `window.__TAURI_INTERNALS__`**, not the old `window.__TAURI__` (removed). Tauri v2 plugin names: `@tauri-apps/plugin-fs`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-opener`.
- Keep files under ~500 lines; the guidance is to split large modules rather than let them grow (many `*-node-utils.js` files exist for this reason).
- Tests are vitest + `@vue/test-utils` under `src/**/__tests__/`, jsdom environment. There are 28 util test suites — run the relevant one after touching a util.
- **Stale docs warning:** `docs/refactor-ast-and-codegen-ui.md` predates recent refactors and references files that no longer exist (e.g. `AstTools.vue`, `php-project-indexer.js`). Trust the actual tree over it; use it only for intent/rationale.
