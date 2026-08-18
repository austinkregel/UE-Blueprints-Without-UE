# Mercenaries 2 Lua Scripting, Viewed as a Visual-Code (Blueprint-style) System — Handoff Briefing

> **Purpose of this file.** It is a *self-contained* briefing. The receiving agent has **no access**
> to the Mercenaries 2 codebase, the reverse-engineering corpus, the decompiled Lua, or the Rust
> reimplementation. Everything needed to reason about the engine's scripting model as a node-based
> visual-code target (like Unreal Engine Blueprints) is embedded below, including real code excerpts
> and the binding palette. Where a claim is proven-from-shipped-bytes vs inferred, it is marked.
>
> **Audience task.** The reader is building (or advising on) a **visual-code editor** — a node-graph
> authoring tool in the spirit of UE Blueprints. Mercenaries 2's Lua interface is being used as a
> real-world domain / testing ground for that editor. This document gives the mental model, the
> concrete API surface, the runtime options, and a validation strategy.

---

## 0. TL;DR

- Mercenaries 2 (2008 open-world action game) drives its gameplay logic in an **embedded Lua VM**
  (Lua **5.1.2**, "float" build in the shipped game). The Lua ↔ engine boundary is a fixed,
  enumerable C-function API: **~53 namespaces / ~1216 functions**. That API surface is your **node
  palette**.
- The game's script layer is **already Blueprint-shaped**: prototype-chain classes (`inherit(...)`)
  with **lifecycle hooks** (`LoadAssets`/`Activated`/`Complete`/`Cancel`/`Cleanup`) plus an
  **event-bind model** (`Event.Create` / `self:_CreateEvent(EventType, args, callback, cbArgs)`).
  Events with callbacks are exactly UE's red "Event" nodes; the getters are blue "pure/data" nodes.
- Crucially, **scripts never run on the per-frame hot path.** The engine ticks natively; script only
  participates by **registering an event and receiving a callback.** That event-driven model — not a
  per-frame "tick" node — is the correct execution spine for a game visual-scripting editor.
- Two runtime "surfaces" are available to test a generated graph against:
  1. **`mercs2_script`** — a faithful, headless **Rust reimplementation** of the engine's Lua host
     (Lua 5.4 + a 5.1 compatibility layer, the real module system, and an `EngineHost` trait seam).
     Deterministic, fast, instant reset. **The recommended dev/iteration loop.**
  2. **The original shipped game** — authentic behavior, live Lua injection, but slow, stateful, and
     with no visual feedback into the running game. **The final acceptance gate.**
- The project already ships a **trace oracle**: a hook that records the *ordered stream of
  `(binding, args)` calls* the real game emits. This yields the single strongest correctness test for
  a codegen tool: **"does my generated graph emit the same ordered binding-call sequence as the
  reference script?"** — far more robust than diffing generated source text.

---

## 1. What Mercenaries 2 is, and where scripting sits

Mercenaries 2: World in Flames is an open-world third-person shooter. The engine is Pandemic's
in-house "Pangea"-lineage engine (hence the `Pg*` naming throughout). Its architecture is an
**ECS-style world** (entities + components) simulated natively in C++, with an **embedded Lua VM**
layered on top for **game logic**: missions/contracts, the player economy (cash/fuel), HUD/PDA,
AI orders, audio cues, support-item drops, world-state overlays, and the world-load handshake.

Two hard boundaries matter, and the project names them explicitly:

- **Surface A** = the *asset → parsed-struct* boundary (how WAD-packed binary assets deserialize).
  Not relevant to a scripting/visual-code editor. Mentioned only so the term isn't confusing.
- **Surface B** = the *script → engine* boundary: the ordered stream of C-function binding calls Lua
  makes into the engine. **This is the surface that matters for you.** It is the node palette *and*
  the correctness oracle.

The guiding philosophy of the whole reimplementation effort is worth stealing directly:

> **"Implementation is free; behavior is gated by provable equivalence."**
> A reimplemented engine — even one running a *newer* Lua VM — is correct **iff**, for the same
> scenario, its scripts emit the **same ordered sequence of `(binding, args)`** calls. Nobody cares
> *how* the new VM computes; only that it calls the engine the same way.

For a visual-code editor that compiles a graph down to a target language, this is the ideal test
contract: correctness = same observable side-effect stream, not same source text.

---

## 2. The scripting model, mapped onto Blueprints

The engine draws the same line UE draws between **native C++ (the runtime)** and **Blueprints (the
authored graph)** — it just expresses the authored side as **Lua** rather than a visual tree.

| UE Blueprint concept | Mercenaries 2 equivalent | Notes |
|---|---|---|
| Blueprint Class deriving from a native Actor/Object class | A mission/contract script doing `inherit("MrxTaskContract")` (prototype-chain OO) | Class-based; the base classes live in the engine's Lua runtime. |
| Class lifecycle events (BeginPlay / EndPlay) | `LoadAssets` → `Activated` → (`Complete` \| `Cancel`) → `Cleanup` | Fixed hook names the base class calls. |
| Red **Event** node with an exec-out pin + input pins | `self:_CreateEvent(EventType, {args}, callback, {cbArgs})`, or free-standing `Event.Create(...)` / `Event.CreatePersistent(...)` | `callback` = the exec pin; `cbArgs` = input pins; `args` configure *which* event. |
| The catalog of event *types* (OnHit, OnOverlap, OnTimer…) | `Event.ObjectDeath`, `Event.Boundary` (region enter/exit), `Event.ObjectProximity`, `Event.TimerRelative`, `Event.ObjectHealth`, `Event.ObjectIsVisible`, `Event.ObjectInSeat`, `Event.ObjectHibernation`, `Event.GameStateChange`, `Event.ScriptEvent` (~18 types total) | See §4 for the catalog. |
| Sequence / state-machine / exec-flow wiring | Objective chaining: `self:CreateChild({ sModuleName="MrxTaskObjective…", … })`, where each objective's `tOnComplete`/`fOnComplete` spawns the next objective | This is the closest thing to visible exec-flow between "nodes." |
| Blue **pure/data** nodes (getters) | `Pg.GetGuidByName(name)`, `Object.GetLocalizedName(guid)`, `Player.GetPrimaryCharacter()`, `String.GetHash(s)`, `Object.GetHealth(guid)` | Side-effect-free reads. |
| Impure action nodes (with exec pins) | `Object.Kill`, `Object.ApplyImpulse`, `Pg.Spawn`, `Sound.CueSound`, `Ai.Goal`, `MrxLayerManager.Add` | Do things; have ordering significance. |
| Native C++ node implementations | ~53 engine namespaces / ~1216 C-functions registered as `luaL_Reg` tables | The palette; see §3. |
| Custom event dispatch / message passing | `Event.ScriptEvent` + `Event.Post(...)` (fire a named script event; other bound handlers receive it) | Decoupled pub/sub between scripts. |
| Data assets / config | Mission metadata tables (`tMissionData`, `WifMissionFlow`), world-state **layers** | Data-driven; not hard-coded in the per-mission scripts. |

### 2.1 The single most important design lesson

**Scripts are never on the per-frame hot path.** The engine's frame loop is a native 5-layer master
update; the gameplay/ECS systems (camera, animation, vehicle, AI, population, …) are ticked in a
fixed native order. Lua does **not** get a per-frame "tick" callback in the normal case. Instead, a
script:

1. In `Activated`, **binds events** (`_CreateEvent`) and **spawns/configures** world state.
2. Goes dormant. The engine runs.
3. When a bound condition fires (an object dies, the player crosses a boundary, a timer elapses), the
   engine **calls the script's callback.**

For a visual-code editor targeting games, replicate this: the default authored unit is
**event → (condition/data) → action**, not a polled per-frame graph. Keep generated logic
event-driven so it stays off the simulation hot path. (If you *do* need periodic work, the idiom is a
self-rescheduling `Event.TimerRelative` callback — see the example in §5 — which is the graph
equivalent of a "SetTimerByEvent" loop, not a Tick node.)

---

## 3. The node palette: the Lua → engine binding surface

This is the enumerable API your editor would expose as nodes. It is **~53 namespaces / ~1216
functions**, recovered three independent ways (static decompilation of the shipped exe: 58 tables /
1285 named fns; a live runtime hook: 60 tables / 1357 raw entries, 53 game tables / ~1216 hooked; and
the Xbox devkit symbol strings). The table below is the **high-value subset** — the namespaces the
real game Lua actually leans on, with representative functions.

The `Reimpl` column reflects how much of each namespace the headless `mercs2_script` host currently
*obeys* (as opposed to *accepts-and-traces*). Legend: **✅** real behavior · **🟡** partial · **⭕**
no-op stub installed (call succeeds, does nothing) · **❌** nothing yet (an auto-stub layer logs the
call and continues). **Every namespace is at minimum callable** — nothing crashes on an unknown call.

| Namespace | Representative functions | Role | Reimpl |
|---|---|---|---|
| `Debug` | `Printf`, `Print` | logging | ✅ |
| `Sys` | **`RequestGameState`** (drives world-load: `"WaitForStreaming"`/`"WaitForTether"`), `RequestAutosave`, `GetLevelName`, `StartWithResources`, `GuidToString`, `SetAssetRequestMax` | engine/session handshake | 🟡 |
| `Pg` | `GetGuidByName`, **`Spawn`**, `FastCollect*`, `Load/UnloadAsset`, `SaveGame`/`LoadGame`, `Contract*`, `AddContextAction` | world/object core | 🟡 |
| `Object` | `GetHealth`, `IsAlive`, `Get/SetPosition`, `Get/SetYaw`, `HasLabel`, `Kill`, `Remove`, `FadeOut`, `ApplyImpulse`, `SetInfiniteAmmo`, `SetHibernationDistance`, `OpenGate`, `GetLocalizedName` | per-entity ops | 🟡 |
| `Event` | `Create`, `CreatePersistent`, `Delete`, `Post` + ~18 event *types* | **the event/graph spine** | ⭕ (constants + handle counter; **no event loop yet**) |
| `Ai` | `Goal`, `Role`, `Deploy`, `Set/GetRelation`, `SetPriorityTarget`, `LivingWorld` | AI orders | ⭕ |
| `Vehicle` | `GetDriver`, `GetRiders`, `Enter`, `Exit`, `SetParts`, `OpenDoor`, `GetSeatParams` | vehicles | ⭕ |
| `ObjectState` | `GetLinkGuid`, `SetState`, `SendDamage`, `StartEmitter`/`StopEmitter` | stateful object FX/logic | ❌ |
| `Player` | `Get/SetCash`, `Get/Set/AddFuel`, `FuelCapacity`, `GetPrimaryCharacter`, `GetSecondaryCharacter`, `VehicleDisguise` | player economy/identity | ❌ |
| `Hud` / `Pda` / `Gui` / `Marker` | HUD/PDA widgets, `Hud.Fanfare:Create/Commence`, per-player `Gui*Update` events | UI | ❌ |
| `Sound` / `VO` | `CueSound`, soundbanks with callbacks, category fades, `AddMusicState`/`TransitionMusic`/`BindMusicCue`, VO priorities | audio | ❌ |
| `Airstrike` / `Munitions` | `Flyby`, `SpawnOrdnance`, designators | support strikes | ❌ |
| `Net` | `IsServer`, `IsClient`, `SendCustomEvent`, `SendEvent_*` (support/revive/PDA/fanfare), `SetLoadingScreen` | co-op networking | ❌ |
| `Human.Inventory`, `Weapon`, `Camera`, `String`, `Graphics`, `DangerousBuilding` | `SetAllWeapons`, `SetReserveAmmo`, `GetYaw`, `String.GetHash`, `Graphics.InitTinyGeometry`, `SetRarity` | misc gameplay | ❌ |

> **Reading the Reimpl column for editor purposes:** the *call surface* is fully authorable across all
> namespaces even where behavior is ❌ — the host installs an **auto-stub `_G` metatable** so an
> unimplemented binding **logs-and-continues instead of crashing**. This is exactly what an
> incremental visual editor wants from its runtime: you can build and run a half-wired graph, and
> nodes whose backing isn't implemented yet no-op with a trace instead of aborting the run.

There are also pure-Lua **framework modules** (prefix `Mrx*`) that sit *above* the engine C-tables and
are themselves part of the authoring vocabulary — e.g. `MrxLayerManager.Add/Remove/MarkForRemoval`
(stream world content in/out), `MrxUtil.SpawnObject`/`MrxUtil.SpawnActor`, `MrxSupportData.AddFreebie`,
`MrxAchievements.NetGrantAchievement`, `MrxSoundCategories.Fade`, `MrxMusic.PlayFanfare`. These are
Lua-implemented conveniences over the C-tables; a visual editor could expose them as higher-level
"macro" nodes.

---

## 4. The event catalog (the red-node types)

Events are bound with `self:_CreateEvent(EventType, {args}, callback, {cbArgs})` (auto-cleaned when the
owning task tears down) or the free-standing `Event.Create(...)` / `Event.CreatePersistent(...)`
(you manage lifetime yourself; `CreatePersistent` survives across the owner). The event types seen in
the shipped game:

| Event type | Fires when | Typical `args` |
|---|---|---|
| `Event.TimerRelative` | N seconds after the bind | `{seconds}` — default fire-and-forget tutorials use `{10}` |
| `Event.ObjectDeath` | a tracked object is destroyed | `{guid}` |
| `Event.ObjectHealth` | a tracked object's health crosses a threshold | `{guid, threshold, ...}` |
| `Event.ObjectProximity` | two objects come within range | `{guidA, guidB, distance}` |
| `Event.Boundary` | an object enters/exits a named region | `{region, "enter"/"exit"}` |
| `Event.ObjectInSeat` | a character enters/leaves a vehicle seat | `{vehicle/seat, ...}` |
| `Event.ObjectHibernation` | an object streams awake / hibernates | `{guid, "awake"/"hibernated"}` |
| `Event.ObjectIsVisible` | an object becomes visible to the player | `{guid, ...}` |
| `Event.GameStateChange` | the engine's session/load state changes | used with `Sys.RequestGameState` |
| `Event.ScriptEvent` | a named custom event is `Event.Post`-ed | `{eventName}` — decoupled pub/sub |

`callback` is a Lua function (the exec target). `cbArgs` is a table forwarded to it — usually
`{self}` so the handler has its owning object.

---

## 5. A real, complete example (embedded — this is authentic shipped logic)

This is a full mission-job script from the shipped game (`mecjob.lua`, the "mechanic job"). It is a
compact but *representative* slice of the whole vocabulary: `inherit` (class), `import` (dependencies),
`LoadAssets` → `AssetsLoaded` → `Activated` lifecycle, a self-scheduling `TimerRelative`, an
`ObjectDeath` bind, data getters (`Pg.GetGuidByName`, `Object.GetLocalizedName`), a spawn, and a
`Complete`/`Cancel` with a UI fanfare. Annotate this in your head as a node graph.

```lua
inherit("MrxTaskJob")            -- class: derive from the Job base task
import("MrxGuiHudMessage")       -- dependency nodes / imported modules
import("MrxSoundCategories")
import("MrxMusic")
import("MrxVoSequence")

-- Lifecycle event 1: preload world content (streamed "layers"), then callback AssetsLoaded
function LoadAssets(self, tSaveData)
  local tLayersToAdd = {
    "vz_state_gua_upperclass_pristine",
    "Vz_State_MecJob"
  }
  MrxLayerManager.Add(tLayersToAdd, self.AssetsLoaded, {self})   -- async load → callback
end

function AssetsLoaded(self)
  self:_IssueAssetsLoadedCallbacks()
  -- self-scheduling timer: "2s from now, run Activated" — the graph idiom for a delayed exec pin
  self:_CreateEvent(Event.TimerRelative, {2}, self.Activated, {self})
end

-- Lifecycle event 2: wire up the mission
function Activated(self)
  self.tMsgWrongVeh  = { "Eva-In-Mission-Contract-Mech01-09", "Eva-In-Mission-Contract-Mech01-10",
                         "Eva-In-Mission-Contract-Mech01-11" }
  self.tMsgLowHealth = { "Eva-In-Mission-Contract-Mech01-01", "Eva-In-Mission-Contract-Mech01-02",
                         "Eva-In-Mission-Contract-Mech01-03", "Eva-In-Mission-Contract-Mech01-04" }
  self.sMsgGarageDestroyed = "Fiona-In-Mission-Contract-Mech01-62"
  self.sMsgExitGarage      = "Eva-In-Mission-Contract-Mech01-61"

  -- DATA/getter nodes: resolve named world entities to runtime GUIDs
  self.inRegion  = Pg.GetGuidByName("mechanicHQ.rgn.inside")
  self.outRegion = Pg.GetGuidByName("mechanicHQ.rgn.outside")
  self.garage    = Pg.GetGuidByName("mechanicHQ")

  MrxTaskJob.Activated(self)                    -- call the base-class lifecycle (super)

  -- ACTION nodes: remove a placeholder object, spawn the objective vehicle
  local kPropVehName = "mc001.propVehicle"
  local o = Pg.GetGuidByName(kPropVehName)
  if o then Object.Remove(o) end
  if self.sPropVehTemplate then
    o = MrxUtil.SpawnObject(self.sPropVehTemplate, "meccon.loc.inprogress", kPropVehName)
  end

  -- EVENT node: when the garage is destroyed, run _GarageDestroyed(self)  → fail condition
  self:_CreateEvent(Event.ObjectDeath, { self.garage }, _GarageDestroyed, {self})

  self:_PlayerOutside()
  self:_SetupJob()
end

-- Lifecycle: success path (UI fanfare, then base-class Complete)
function Complete(self)
  Sound.TransitionMusic("mission_success", true)
  local sPlayer1Name = Object.GetLocalizedName(Player.GetPrimaryCharacter())
  local uPlayer2Guid = Player.GetSecondaryCharacter()
  local sPlayer2Name = uPlayer2Guid and Object.GetLocalizedName(uPlayer2Guid) or nil
  Hud.Fanfare:Create({
    sType = "mission", sProfileName1 = sPlayer1Name, sProfileName2 = sPlayer2Name,
    fCallback = function(bRepeat)
      MrxSoundCategories.Fade("fanfare", false)
      MrxTaskMission.Complete(self)             -- chain to base-class completion
    end
  })
  MrxSoundCategories.Fade("fanfare", true)
  Hud.Fanfare:Commence({})
end

-- Lifecycle: fail/cancel path
function Cancel(self)
  MrxMusic.PlayFanfare(false)
  Hud.Fanfare:Create({
    sType = "mission", sProfileName1 = "unused",
    sCancelMsg = self._sCancelMsg or "[Fanfare.Cancel.Msg]",
    fCallback = function(bRetry)
      MrxSoundCategories.Fade("fanfare", false)
      MrxTaskMission.Cancel(self)
      self:GetParent():Cancel()
    end
  })
  MrxSoundCategories.Fade("fanfare", true)
  Hud.Fanfare:Commence({})
end
```

### 5.1 The contract/objective structure (the "sequence" layer)

Above the single-script level, a mission is a **tree of tasks**. A contract creates **objective
children**, and each objective's completion callback creates the next — this is the game's version of
exec-flow / a state machine:

```lua
-- inside Activated, after wiring events:
self:CreateChild({
  sModuleName   = "MrxTaskObjectiveDestroy",   -- objective behavior class
  sDspShortDesc = "[Con.Mech01.Obj1]",         -- localized objective text token
  vTgtInclude   = { ... },                     -- target set
  nQuota        = 3,                            -- destroy 3 tagged objects
  bDspBlp       = true,                         -- show radar blip
  tOnComplete   = { self.CreateSecondObjective, {self} },  -- → spawns the next objective
  fOnComplete   = nil,
})
```

Objective behavior classes seen in the game: `MrxTaskObjectiveDeliver` (move a target to a
location/region), `MrxTaskObjectiveDestroy` (kill N tagged objects; `nQuota`/`sTgtLabelFilter`),
`MrxTaskObjectiveEnterVehicle`, and others. Common keys: `sDspShortDesc`, `vTgtInclude`,
`vDestLoc`/`vDestRegion`, `nQuota`, `bDspBlp`, `vVoSeqOnAdd`, `tOnComplete`/`fOnComplete`,
`tOnCancel`/`fOnCancel`.

**Modeling takeaway:** there are two graph granularities here — the *intra-script* event graph
(events → callbacks) and the *inter-objective* sequence (a task tree wired by completion callbacks).
A visual editor could surface both: a per-behavior EventGraph and a mission-level flow/sequence graph.

---

## 6. The module system (how scripts compose — the "class hierarchy")

The host provides three composition primitives. These are proven from the shipped VM's string data
and reproduced in the reimplementation:

- **`import("ModuleName")`** — load and evaluate a module once; cache it in `_MODULES`. Gives access
  to its exported functions/tables. (Dependency edge.)
- **`inherit("BaseClass")`** — set up a prototype chain so the current script's environment falls
  through to `BaseClass` (`__index → base`). This is single-inheritance class derivation. The
  lifecycle hooks (`Activated` etc.) are found via this chain; a script calls `Base.Activated(self)`
  to invoke the super implementation. (Class edge.)
- **`dynamic_import("modulename")`** — asynchronous/deferred load, used to pull in a script from *any*
  currently-loaded content archive at runtime (e.g. how DLC contracts get registered without a static
  reference). Executes the module in the caller's environment.

Per-module environments use `__index → _G`, so a module sees globals but its own definitions are
scoped. The loader is **cyclic-safe** (register-before-execute).

For an editor: `import` = a dependency you add to a graph; `inherit` = the parent class you pick when
creating a new graph asset; lifecycle hook names come from the chosen parent.

---

## 7. The two runtime surfaces you can target

### 7.1 `mercs2_script` — the faithful headless host (RECOMMENDED dev loop)

A Rust crate that re-implements the engine's Lua host authentically:

- **Lua 5.4** (via the `mlua` crate, vendored) plus a **measured 5.1 → 5.4 compatibility prelude**
  (`setfenv`/`getfenv`/`module`/`loadstring` aliases, `unpack`/`table.getn`/`math.mod`/`string.gfind`,
  etc.). The shipped game is 5.1.2; 5.4 differences only matter where scripts rely on 5.1 float
  truncation semantics — a bounded, audited set.
- The **real module system** (`import`/`inherit`/`dynamic_import` with the exact env/prototype
  semantics above). It runs *actual decompiled game modules*, not stand-ins.
- An **`EngineHost` trait seam** — an inversion of control that mirrors the original design. In the
  shipped game, the `Sys.*`/`Pg.*`/etc. C-tables call *down* into native engine code. Here, the Lua
  bindings call *into* a Rust trait (`EngineHost`) that the engine implements. **Dependency points
  engine → script host, never the reverse.**

Why this is the right iteration target for a visual-code editor:

1. **Single observation choke-point.** Every node "firing" is a call through the `EngineHost` trait.
   That is the natural place to record the `(binding, args)` trace, drive coverage, or mock behavior.
2. **Complete call surface, graceful degradation.** All ~53 namespaces are authorable; unimplemented
   ones auto-stub-and-log rather than crash (§3). You can run partial graphs.
3. **Deterministic + instant reset.** Headless, no world to boot, no non-determinism to fight.
4. **It IS the authentic host**, not an approximation of one — same module system, same binding
   names/shapes.

Caveat to communicate honestly: only a minority of bindings have **real behavioral bodies** today
(strong in `Debug`/`Sys`/`Pg`/`Object`; `Event` has constants + a handle counter but **no event
loop** yet; most gameplay namespaces are ⭕/❌). So this host is excellent for validating that a graph
**emits the right calls in the right order**, and for executing/authoring, but it will not yet fully
*simulate* mission outcomes. For behavior on the subset that matters, use the live game.

### 7.2 The original shipped game — authentic behavior (final acceptance gate)

The real game can execute Lua injected at runtime (there is an existing framework + workflow for
sending Lua into the live process and reading results back, driving the game with a virtual
controller, and confirming a script loaded). Properties:

- **Authentic**: real ECS world, real AI, real audio, real mission outcomes.
- **Slow + stateful**: you must boot the game and reach a world state; resetting is expensive.
- **No visual feedback channel**: there is no screenshot/inspection *into* the running 3D game from
  tooling — the live-Lua round-trip *is* the feedback loop. Plan tests as assertions, not eyeballing.
- Best used as the **acceptance gate** for the node subset whose runtime behavior you care about, and
  as the **source of the ground-truth trace** (see §8).

### 7.3 Recommendation

**Iterate against `mercs2_script`; gate final behavior against the live game.** This mirrors the
project's own Surface-B methodology, so you ride infrastructure that already exists rather than
inventing a parallel one:

- Editor dev loop: generate Lua from a graph → run in `mercs2_script` → assert the emitted
  `(binding, args)` trace matches expectation → measure binding coverage.
- Acceptance: for the handful of graphs whose *outcomes* matter, run the generated Lua in the live
  game and assert observable results.

---

## 8. The validation strategy (why this is a great testbed)

Three assets exist that most "let's prototype a visual scripting tool" efforts must build from
scratch. Lean on all three.

1. **A typed node palette, as data.** A machine-readable binding map (`binding_map.json` in the
   project: dumped tables/entries; ~53 game tables / ~1216 functions). Your editor should **generate
   its node catalog from this manifest**, not hand-author nodes. This is itself a valuable thing to
   prove out: a visual editor whose palette is *driven by a signature manifest* stays in sync with the
   target API for free.

2. **A ground-truth equivalence oracle.** A runtime hook records the **ordered stream of
   `(binding, args)`** the real game emits for a given scenario. This gives the strongest possible
   correctness test for a graph→code compiler:

   > A generated graph is correct **iff** it emits the **same ordered binding-call sequence** as the
   > reference script for the same inputs.

   This is dramatically more robust than diffing generated source: it is invariant to formatting,
   variable naming, and even VM version. Build your editor's test harness around **trace equivalence**.

3. **A faithful headless runtime + coverage.** `mercs2_script` executes generated Lua and can report
   which bindings were called vs. which are still missing (a `binding_coverage.json`-style report). No
   game boot needed for the inner loop.

Plus a **corpus of ~370 decompiled real scripts** (missions, jobs, tutorials, flow) exists as a
reference set of "what real graphs look like" — invaluable for designing node ergonomics, defaults,
and for round-trip tests (decompile a real script → model it as a graph → regenerate → assert trace
equivalence against the original).

---

## 9. Suggested first milestones for the editor

1. **Ingest the palette.** Parse the binding manifest (~53 namespaces / ~1216 fns) into node
   definitions. Categorize each node as *event* (red/exec), *pure getter* (blue/data), or *impure
   action* (white/exec) — a first cut can be heuristic on name (`Get*`/`Is*`/`Has*` → pure).
2. **Model one real script as a graph.** Use `mecjob.lua` (§5) — it exercises class inheritance,
   imported dependencies, the `LoadAssets→AssetsLoaded→Activated` lifecycle, a self-scheduling
   `TimerRelative`, an `ObjectDeath` bind, data getters, a spawn, and `Complete`/`Cancel`. One script,
   representative coverage.
3. **Emit Lua from the graph.** Codegen targeting the same module system (`inherit`/`import`,
   lifecycle hooks, `_CreateEvent`).
4. **Close the loop with trace equivalence.** Run both the original and the generated Lua through
   `mercs2_script`; diff the ordered `(binding, args)` streams. Green = the graph is behaviorally
   equivalent at the engine boundary.
5. **Add the mission-flow (sequence) layer.** Model `CreateChild` objective chaining as a
   flow/sequence graph distinct from the per-script event graph (§5.1).

---

## 10. Glossary (so this file stands alone)

- **Pangea / `Pg*`** — the engine lineage; the `Pg` Lua namespace is the world/object core API.
- **WAD** — the game's packed content archive format (assets + compiled Lua bytecode live here).
- **ECS** — entity-component-system; the engine simulates the world this way natively in C++.
- **GUID** — a runtime handle to a world object; you resolve a *name* to a GUID with
  `Pg.GetGuidByName`.
- **Layer / world-state overlay** — a named bundle of world content streamed in/out (e.g.
  `Vz_State_MecJob`), managed via `MrxLayerManager`. Missions add/remove layers to change the world.
- **Contract / Job / Objective** — the mission taxonomy. A contract is a task that creates objective
  children; objectives chain via completion callbacks. Base classes: `MrxTaskContract`, `MrxTaskJob`,
  `MrxTaskMission`, `MrxTaskObjective*`.
- **`Mrx*` modules** — pure-Lua framework layer above the engine C-tables (helpers for layers, spawns,
  VO, sound categories, achievements, support items).
- **Surface A / Surface B** — the two RE boundaries. A = asset→struct (not relevant here). B =
  script→engine binding calls (the palette + the correctness oracle).
- **`mercs2_script`** — the Rust reimplementation of the Lua host (Lua 5.4 + 5.1 compat + module
  system + `EngineHost` trait). The recommended headless dev target.
- **`EngineHost`** — the Rust trait the Lua bindings call into; the single choke-point where every
  node call can be observed/traced/mocked.
- **Auto-stub `_G` metatable** — the host's fallback that makes any un-implemented binding
  log-and-continue instead of crashing; enables running partial graphs.
- **Trace oracle / `binding_map.json`** — the recorded ordered `(binding, args)` stream from the real
  game; the equivalence target for a graph→code compiler.

---

## 11. Provenance & confidence notes

- **Proven from shipped bytes / live capture:** the Lua version (5.1.2, float build); the module
  system primitives (`import`/`inherit`/`dynamic_import`) and their string set; the `Sys.*`/`_SYS`
  bootstrap; the binding surface size (independently: 58 tables/1285 fns static; 60 tables/1357 raw
  live, 53/~1216 hooked); the event types and the contract/objective lifecycle (read directly from
  ~370 decompiled scripts); the `mecjob.lua` source in §5 (verbatim from the decompiled game).
- **Reimplementation state (as of mid-2026):** the `mercs2_script` host + module system are real and
  run genuine game modules; behavioral coverage of bindings is partial (strong in
  `Debug`/`Sys`/`Pg`/`Object`; `Event` has no event loop yet; most gameplay namespaces are stubbed).
  Treat the Reimpl column in §3 as "how much it *obeys*," while the *call surface* is fully authorable.
- **Inferred/advisory:** the specific Blueprint↔Mercs2 node-category mappings (§2) and the editor
  milestones (§9) are design guidance, not recovered facts.

---

## 12. The one open question the receiving agent should resolve with the human

The surface recommendation (§7.3) depends on **what the editor actually targets**:

- **(a) The editor compiles graphs down to Lua that runs *inside this engine* (reimpl or live game).**
  Then everything above applies directly: target `mercs2_script`, validate with trace equivalence,
  gate behavior on the live game.
- **(b) Mercenaries 2 is only a *reference domain*** — the editor targets some *other* runtime, and
  Mercs2's model is being used as inspiration / a realistic case study. Then `mercs2_script` and the
  live game are purely study material and a trace oracle to compare *design* against; you would never
  wire the editor into the game at all, and §7/§8's "run it in the host" steps become "study the host's
  design and the trace format," not literal integration.

Confirm which of (a)/(b) is true before committing to an integration plan; it changes whether the
game is a build target or a case study.
