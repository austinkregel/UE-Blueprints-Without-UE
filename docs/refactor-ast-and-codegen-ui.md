# UI Refactor Plan: Remove AST Tools and Codegen UI (Deferred)

Status: Planned (no code changes yet)
Owner: TBD
Target window: TBD

Goal

- Remove AST Tools panel and UI-specific code related to AST parsing/import and PHP code generation.
- Clean up unused UI state, events, and watchers.
- Defer deeper utility deletion until confirmed unused by non-UI code.

Scope

- In-scope: UI components, props/refs, event wiring, watchers, buttons/menus related to AST and code generation.
- Out-of-scope (for first pass): Removing shared utils unless proven unused elsewhere (keep php project indexer/state and exporter for now; assess after UI removal).

Inventory (current references)

- src/App.vue
    - Template:
        - <AstTools ... /> panel node.
        - TopToolbar emits open-ast-tools used to toggle panel.
    - Imports:
        - components/panels/AstTools.vue
        - utils/export-utils.js (generatePHPCodeFromGraph)
        - utils/code-importer.js (importCodeToGraph)
        - utils/php-project-indexer.js (scanPhpProject, startPhpScanStream)
        - utils/file-tree.js (pickDirectory, readDirectoryTree, readText)
        - utils/php-project-state.js (setPhpProject, setPhpProgress, phpProjectIndex)
    - State/refs:
        - showAstTools (ref)
        - astCodeText (ref)
        - astSyncTimer (timer handle)
    - Usage lines (approx from grep; verify when editing):
        - @open-ast-tools="showAstTools = !showAstTools" (TopToolbar binding)
        - <AstTools v-if="showAstTools" :code-text="astCodeText" :auto-parse="true" :lang-id="'php'" />
        - astCodeText.value = generatePHPCodeFromGraph()
        - showAstTools.value = true (when generating)
        - watch(showAstTools, …) to sync astCodeText
        - Code import path uses importCodeToGraph with phpProjectIndex
        - Project scanning startPhpScanStream/scanPhpProject, pickDirectory, readDirectoryTree
- src/components/layout/TopToolbar.vue
    - Emits 'open-ast-tools'
    - Has an AST button that triggers it.
- src/components/panels/AstTools.vue
    - Full panel implementation; imports php-project-indexer/state and performs scanning and AST tasks.
- src/utils/export-utils.js
    - Exports generatePHPCodeFromGraph. Currently referenced by App.vue.
    - Contains an internal call to generatePHPCodeFromGraph() (likely demo/test); reassess when removing UI usage.
- src/utils/code-importer.js
    - Exports importCodeToGraph. Currently referenced by App.vue only (per grep).
- src/utils/php-project-indexer.js
    - scanPhpProject, startPhpScanStream referenced by App.vue and AstTools.vue.
- src/utils/php-project-state.js
    - setPhpProject, setPhpProgress, phpProjectIndex referenced by App.vue and AstTools.vue.

Proposed Removal Plan (phased, safe)
Phase 1 – Hide UI without deleting files (optional quick toggle)

- Comment out the AstTools include in App.vue template and AST button wiring in TopToolbar.vue.
- Leave imports/state in place to avoid breakage; confirm app builds and runs.

Phase 2 – Remove UI wiring cleanly

- In src/App.vue:
    - Remove import of AstTools.
    - Remove showAstTools ref, astCodeText ref, astSyncTimer, and watchers/computed related to AST panel sync.
    - Remove generatePHPCodeFromGraph usage and related code paths that surface AST/Codegen UI.
    - Remove importCodeToGraph usages tied to UI controls; if import is exposed elsewhere via non-UI, leave utils in place.
    - Remove scanning stream UI triggers: pickDirectory/readDirectoryTree/readText + startPhpScanStream/scanPhpProject if only used for AST UI.
    - Remove php-project-state references if strictly UI-related (setPhpProject/setPhpProgress/phpProjectIndex usage in App.vue).
- In src/components/layout/TopToolbar.vue:
    - Remove button that emits 'open-ast-tools'.
    - Remove 'open-ast-tools' from emits.
- In src/components/panels/AstTools.vue:
    - Delete the file after Phase 2 consumers are gone (grep to ensure no imports remain).

Phase 3 – Clean up utilities if truly unused

- Run a workspace grep after Phase 2:
    - importCodeToGraph – if no refs remain, remove from utils/code-importer.js and delete file if it has no other exports used elsewhere.
    - generatePHPCodeFromGraph – if no refs remain, decide whether to keep for non-UI export flows; otherwise remove its export and references in utils/export-utils.js (including any internal demo call).
    - scanPhpProject/startPhpScanStream – if unused, remove or relocate behind a CLI/dev-only harness.
    - php-project-state – if unused, remove.
- Consider leaving indexer/exporter as developer-only tools (e.g., scripts/) with a small CLI wrapper as a follow-up.

Acceptance Checklist

- Build succeeds with no unused imports/vars in touched files.
- UI renders without AST button/panel; no console errors.
- Import/generation triggers removed from App.vue.
- No remaining references to AstTools, open-ast-tools, astCodeText, showAstTools in the codebase.
- No regressions to core canvas/node execution flows.

Commands to assist during removal (manual)

- Find references quickly:
    - ripgrep-like: rg "AstTools|open-ast-tools|generatePHPCodeFromGraph|importCodeToGraph|scanPhpProject|startPhpScanStream|phpProjectIndex|setPhpProject|setPhpProgress"
- After edits, run dev and tests:
    - npm run dev
    - npm test

Tooling follow-up (optional)

- Add ESLint with unused-imports to catch leftovers automatically.
- Consider TS or JSDoc typedefs to tighten API surfaces and spot unused exports earlier.

Risk Notes

- export-utils.js appears to self-call generatePHPCodeFromGraph; removing App.vue usage may leave dead code there—gate it or remove in Phase 3.
- If code import (importCodeToGraph) is used via non-UI flows later, avoid deleting the util; only remove UI hooks for now.

Rollback plan

- Each phase should be a separate commit; revert the last commit if issues arise.

Next Steps

- Approve plan and schedule Phase 1–2 window.
- Assign owner and create branch: chore/remove-ast-codegen-ui.
