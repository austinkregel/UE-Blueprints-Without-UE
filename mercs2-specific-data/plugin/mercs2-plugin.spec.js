import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { installPluginGlobal } from '../../src/utils/plugin-host.js';
import { getCodegenTargets, runCodegen } from '../../src/utils/codegen.js';
import { getOutlineSections } from '../../src/utils/outline.js';
import { getNodeIssues, getNodePreview } from '../../src/utils/node-inspector.js';

// Load the real plugin bundle (IIFE) into the jsdom global, after exposing the
// registration global — exactly how the engine loads it via <script>.
beforeAll(() => {
    installPluginGlobal();
    const src = readFileSync('mercs2-specific-data/plugin/mercs2-plugin.js', 'utf8');
    new Function(src)();
});

describe('mercs2 plugin', () => {
    describe('codegen (lua target)', () => {
        it('registers a lua target', () => {
            expect(getCodegenTargets()).toContain('lua');
        });

        it('lowers a mission graph to structured Lua', () => {
            const nodes = [
                { id: 1, category: 'MERCS2_MISSION', nodeDefId: 'mercs2.Root.Contract', name: 'Contract', inputs: [], outputs: [] },
                {
                    id: 2,
                    category: 'MERCS2_MISSION',
                    nodeDefId: 'mercs2.Lifecycle.Activated',
                    inputs: [{ name: 'self', type: 'object' }],
                    outputs: [{ name: 'Body', type: 'exec' }]
                },
                {
                    id: 3,
                    category: 'MERCS2_OBJECTIVE',
                    nodeDefId: 'mercs2.Objective.Destroy',
                    inputs: [
                        { name: 'Exec', type: 'exec' },
                        { name: 'sName', type: 'string', defaultValue: 'DestroyConvoy' },
                        { name: 'nQuota', type: 'int', defaultValue: 5 }
                    ],
                    outputs: [{ name: 'OnComplete', type: 'exec' }]
                },
                {
                    id: 4,
                    category: 'MERCS2_OBJECT',
                    nodeDefId: 'mercs2.Object.Remove',
                    inputs: [
                        { name: 'Exec', type: 'exec' },
                        { name: 'guid', type: 'object' }
                    ],
                    outputs: [{ name: 'Exec', type: 'exec' }]
                },
                {
                    id: 5,
                    category: 'MERCS2_PG',
                    nodeDefId: 'mercs2.Pg.GetGuidByName',
                    inputs: [{ name: 'name', type: 'string', defaultValue: 'convoy.01' }],
                    outputs: [{ name: 'value', type: 'object' }]
                }
            ];
            const connections = [
                { from: { nodeId: 2, output: 'Body' }, to: { nodeId: 3, input: 'Exec' } },
                { from: { nodeId: 3, output: 'OnComplete' }, to: { nodeId: 4, input: 'Exec' } },
                { from: { nodeId: 5, output: 'value' }, to: { nodeId: 4, input: 'guid' } }
            ];
            const { code, language } = runCodegen('lua', { nodes, connections });
            expect(language).toBe('lua');
            expect(code).toContain('inherit("MrxTaskContract")');
            expect(code).toContain('function Activated(self)');
            expect(code).toContain('self:CreateChild({ sModuleName = "MrxTaskObjectiveDestroy", sName = "DestroyConvoy", nQuota = 5 })');
            // pure getter inlined as a nested expression
            expect(code).toContain('Object.Remove(Pg.GetGuidByName("convoy.01"))');
        });

        it('emits _CreateEvent for event nodes and a lifecycle function for the entry', () => {
            const nodes = [
                {
                    id: 1,
                    category: 'MERCS2_MISSION',
                    nodeDefId: 'mercs2.Lifecycle.Activated',
                    inputs: [],
                    outputs: [{ name: 'Body', type: 'exec' }]
                },
                {
                    id: 2,
                    category: 'MERCS2_EVENT',
                    nodeDefId: 'mercs2.Event.ObjectDeath',
                    inputs: [
                        { name: 'Exec', type: 'exec' },
                        { name: 'uGuid', type: 'object', defaultValue: 'garage' }
                    ],
                    outputs: [{ name: 'On Fire', type: 'exec' }]
                }
            ];
            const connections = [{ from: { nodeId: 1, output: 'Body' }, to: { nodeId: 2, input: 'Exec' } }];
            const { code } = runCodegen('lua', { nodes, connections });
            expect(code).toContain('function Activated(self)');
            expect(code).toContain('self:_CreateEvent(Event.ObjectDeath, { "garage" }, nil, { self })');
        });
    });

    describe('outline provider', () => {
        it('produces Script / Events / Objectives / Variables from the graph', () => {
            const nodes = [
                { id: 1, category: 'MERCS2_MISSION', nodeDefId: 'mercs2.Root.Contract', name: 'Contract' },
                { id: 2, category: 'MERCS2_EVENT', nodeDefId: 'mercs2.Event.ObjectDeath', name: 'On Object Death' },
                { id: 3, category: 'MERCS2_OBJECTIVE', nodeDefId: 'mercs2.Objective.Destroy', name: 'Destroy' },
                { id: 4, type: 'variable', varName: 'quota' },
                // a placed logic node must NOT appear in the outline
                { id: 5, category: 'CONTROL', nodeDefId: 'if', name: 'If Statement' }
            ];
            const sections = getOutlineSections({ nodes, variables: [{ name: 'quota', type: 'int' }] });
            const titles = sections.map((s) => s.title);
            expect(titles).toEqual(['Script', 'Events', 'Objectives', 'Variables']);
            expect(sections.find((s) => s.title === 'Objectives').items).toHaveLength(1);
            // variable item carries a nodeId so it selects on click
            expect(sections.find((s) => s.title === 'Variables').items[0].nodeId).toBe(4);
            // the placed CONTROL node is not present anywhere
            expect(sections.some((s) => s.items.some((i) => i.nodeId === 5))).toBe(false);
        });
    });

    describe('validators', () => {
        it('flags an objective with a non-positive quota and offers a fix that clears it', () => {
            const node = { id: 1, category: 'MERCS2_OBJECTIVE', inputs: [{ name: 'nQuota', type: 'int', defaultValue: 0 }] };
            const issues = getNodeIssues(node, { connections: [] });
            const quota = issues.find((i) => i.field === 'nQuota' && i.level === 'error');
            expect(quota).toBeTruthy();
            expect(quota.fixes[0].label).toBe('Set quota to 1');
            quota.fixes[0].apply();
            expect(node.inputs[0].defaultValue).toBe(1);
            expect(getNodeIssues(node, { connections: [] }).some((i) => i.field === 'nQuota' && i.level === 'error')).toBe(false);
        });
    });

    describe('preview', () => {
        it('renders a HUD preview for objective nodes only', () => {
            const obj = {
                id: 1,
                category: 'MERCS2_OBJECTIVE',
                name: 'Destroy',
                inputs: [{ name: 'sDspShortDesc', type: 'string', defaultValue: 'Destroy the convoy' }]
            };
            const prev = getNodePreview(obj);
            expect(prev).toBeTruthy();
            expect(prev.html).toContain('m2-hud-title');
            expect(prev.html).toContain('DESTROY THE CONVOY');
            // not an objective → no preview
            expect(getNodePreview({ id: 2, category: 'MERCS2_OBJECT', inputs: [] })).toBeNull();
        });
    });
});
