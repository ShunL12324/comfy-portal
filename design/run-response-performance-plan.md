# Run page response: findings and implementation plan

Date: 2026-09-29. Scope: reduce Workflow → Run response latency without changing node layouts or generation behavior. Keep Gluestack, NativeWind, the existing sheet and navigation. No new UI framework. Initial diagnosis used passive probes; a later user-authorized Release installation is recorded below.

## Evidence and limits

- Passive instrumentation on the connected iPhone recorded press callbacks below 1 ms for the reported interactions; the next JS requestAnimationFrame callback arrived roughly 515, 697, 980 ms later, with a maximum around 2,024 ms. Timer drift reached 2,198 ms. This supports post-click main-JS work, not an intentional press delay.
- A requestAnimationFrame callback is **not** proof of when a native frame appeared. Native frame presentation and transition completion need separate measurement.
- An idle simulator probe showed maximum drift around 19 ms. It does not characterize the physical device.
- The phone has 16 workflow records, 8–29 nodes each; serialized assets total approximately 73 KB. The workflow observed by the write probe has eight nodes. Two unchanged initialization writes each took about 1 ms. Those writes are wasteful, but cannot explain a two-second stall by themselves.
- The Hermes CPU sample contains React render/commit work, Reanimated mapper creation / worklet serialization and GC. `ReactFabric-dev` render logging also appears. The capture includes idle time, recursive frames and only a few navigations; it does not establish reliable percentage attribution or prove a particular library is the root cause.
- Server timeouts/503s are real but navigation handlers do not await the server. Distinguish disconnected-server state from local screen-entry latency.
- Debug instrumentation is temporary, in ignored `.expo` files. No prompt text, credentials or screen content was collected. Timing hooks expire automatically; workflow instrumentation was explicitly restored.

## Current implementation findings

| Layer | Current behavior | Consequence |
| --- | --- | --- |
| Input writes | `updateNodeInput` previously routed through `updateWorkflow`, which cloned the entire graph, even for an identical value | Every node reference changed; the existing `memo(NodeComponent)` could not skip unrelated nodes |
| Derived workflow records | Every `commit` reconstructs all records via `materializeWorkflows` | Unrelated workflow record subscribers see new references, and list filtering/sorting runs again |
| Run subscription | The screen subscribes to the whole active workflow record and computes all nodes from it | Individual input edits invalidate parent calculations |
| Mounting | `NodesTabContent` maps every node into a keyboard-aware ScrollView | All complex controls and their animation hooks mount together |
| Node execution | SeedControl registers generation hooks in a component effect and unregisters on unmount | Virtualization, filtering or switching away from Nodes can change which generation hooks exist |
| Persistence | Zustand persist serializes all assets/bindings through createJSONStorage on store writes | AsyncStorage is asynchronous, but JSON serialization happens before it is called |
| Generation state | Every BaseNode reads the shared GenerationStatus context | Queue/media/status updates can invalidate all node shells, despite node-id-specific output |
| Route imports | Node type registry and Assistant are statically imported | First-entry module work may differ from subsequent entries; measure both |

## Recommended architecture

Retain Zustand. Use Immer selectively for nested graph editing after defining canonical data boundaries. Do not wrap the current entire store with Immer unchanged: `assets[].data` and the materialized `workflow[].data` share objects, whereas Immer requires a unidirectional state tree.

Canonical ownership:

- Workflow asset: graph nodes keyed by existing node IDs, metadata and revision.
- Binding: server/source association and usage information.
- Run session: active asset ID, node order, seed mode and transient editing/generation state.
- View records: derived projections, not another mutable copy of the graph.
- Server catalogue / observations: separate network state; failures must not block route entry.

The graph is already keyed by node ID. Do not migrate it merely to claim normalization. Start by preserving references and improving subscriptions within the existing persisted schema.

### Stage 1: remove avoidable work and measure (highest priority)

1. Keep the current narrow fix: identical primitive input writes return before publishing state; changed inputs preserve all untouched node references and clone only externally supplied values. Two regression tests cover no-op publication/persistence and mutation isolation/reference stability.
2. Batch related edits (width + height, generation seed updates) into one graph transaction and one persistence notification. Do not write initialized values from mount effects when no actual edit occurred.
3. Preserve materialized record identity when its asset and binding are unchanged. Use a bounded/rebuilt cache or memoized projections; never retain every historic graph revision.
4. Give each node a stable ID and a selector for that node. Parent list subscribes to node ordering, not the complete graph. Search may derive matching IDs, but ordinary input edits should not rebuild every child. Avoid selectors returning a freshly allocated object/array on every read.
5. Measure shell mount, first usable controls, heavy subtree commits and native transition completion. Compare cold/warm entries separately; React DevTools/profiling overhead must be controlled.
6. Reduce animation setup for static node decorations and controls with no active animation. Preserve the approved tab/filter motion and node layout. Avoid replacing animated parents conditionally if that would remount descendants and lose input state.
7. Only split/defer expensive subtrees when measurements justify it. Show usable navigation promptly, but do not hide unchanged latency behind an artificial spinner or fixed timeout.

Acceptance: unchanged initialization publishes no workflow writes; a one-node edit preserves other node references; unrelated workflow records retain identity; node layout/keyboard behavior is unchanged. Repeat real-device timing with the same workflow before attributing the improvement to this stage.

### Stage 2: execution must not depend on visible components

Before any list virtualization:

- Move Random/Fixed seed mode into explicit per-run-session state; initialize defaults once per session, not on each mount. Preserve current intended mode behavior across Nodes/Assistant and search changes.
- Build a generation snapshot through a pure, node-type-aware preparation pipeline. Apply random seeds to all eligible graph nodes, even if they are off-screen; retain linked inputs unchanged.
- Apply generated seed updates in one transaction, then build/persist the exact pending-job snapshot submitted to ComfyUI.
- Keep upload/shared-image actions explicit. A recycled view must not repeat uploads or clear selected files.
- Add regression cases for off-screen nodes, search-hidden nodes, generating from Assistant, returning to Nodes, linked seeds, and concurrent/queued runs.

This is a correctness requirement, not just an optimization. Existing component hooks are incompatible with freely mounting/unmounting node rows.

### Stage 3: bounded mounting and lazy selector content

- After Stage 2, use the existing Gorhom `BottomSheetFlatList` integration on phones and the appropriate list on wider layouts; evaluate keyboard-controller integration with actual inputs before replacing the current scroll adapter.
- Start with enough items to fill the viewport and small additional batches, tuned from measurements. Do not invent fixed `getItemLayout` heights for variable-height node cards.
- Preserve target-node navigation with `scrollToIndex`/measurement recovery instead of the current repeated delayed y-offset scrolls.
- Persist or explicitly commit input drafts across list recycling. A focused field must not disappear during editing.
- Mount expensive selector list/preview content when the selector is opened, retaining existing modal lifecycle and refresh behavior.
- Prefer the existing RN/Gorhom list stack first. FlashList is an optional later comparison, not a required migration for an eight-node graph.

Acceptance: same graph submits the same fixed-seed prompt with any scroll position; random seeds cover hidden nodes; shared images upload once; keyboard, slider editing, scrolling at every sheet detent and target-node navigation still work.

### Stage 4: persistence proportional to edits (lower priority for current size)

- The current 73 KB dataset is not evidence that a database migration is needed.
- If measured serialization becomes significant, persist changed assets/bindings by key rather than serializing the entire library on every keystroke. Introduce a versioned migration with read-back verification before removing the old key.
- Coalesce **before serialization**. Debouncing `AsyncStorage.setItem` after `createJSONStorage` has already called JSON.stringify does not remove JSON CPU work.
- Define durability explicitly: bounded save interval, flush on blur/background/navigation where appropriate, visible save failures. Background callbacks are best effort; document the remaining abrupt-process-kill loss window.
- Keep the existing pending-job durable flush before external queue submission; do not weaken that boundary for UI responsiveness.
- MMKV/SQLite are not first-line fixes: changing the storage engine does not by itself remove React mount work or whole-state serialization.

## Library decisions

| Choice | Decision |
| --- | --- |
| Zustand | Keep; already supports narrow subscriptions and the current application architecture |
| Immer | Useful for canonical graph transactions; selective adoption after eliminating duplicated mutable aliases; not a promise of lower initial-render latency |
| RN/Gorhom virtualized lists | Reuse after generation semantics are independent of row mounts |
| TanStack Query | Separate future discussion for request caching/deduplication; not needed to fix local press-to-Run rendering |
| Redux Toolkit / Jotai migration | No demonstrated benefit sufficient to justify a broad rewrite |
| Storage engine migration | Defer until persistence timings justify it |

## Verification plan

- Primary metric: physical iPhone press release → first usable Run controls; record next-JS-frame and native transition timing separately.
- Compare the same small (8-node), medium (~25-node), and larger synthetic workflow; measure cold and warm entries separately, including server offline.
- Aim for immediate press feedback (<100 ms), no repeated >100 ms JS stalls after warm entry, and usable warm-entry controls within roughly 250–300 ms. These are proposed acceptance targets, not measured results.
- Use a release-equivalent/device build as a later comparison when device installation is allowed. Current debug findings do not predict exact release timings.
- React commit profiling: changing one input should not rerender unrelated node contents or unrelated workflows. Count graph publications/persistence writes per action.
- Preserve focused input drafts, step/range constraints, sheet dragging, node search, linked inputs, fixed/random seed semantics and pending-job recovery.
- Current code fix: 13 relevant Jest tests and TypeScript passed. No post-fix phone performance improvement has yet been established. No new dependency, list migration or broad store rewrite was performed during this research.

## References

- Zustand Immer middleware: https://zustand.docs.pmnd.rs/reference/middlewares/immer
- Immer structural sharing and no-op behavior: https://immerjs.github.io/immer/performance/
- Immer unidirectional-tree requirement: https://immerjs.github.io/immer/pitfalls/
- Zustand persistence: https://zustand.docs.pmnd.rs/reference/middlewares/persist
- React Native FlatList tuning: https://reactnative.dev/docs/optimizing-flatlist-configuration
- Gorhom BottomSheetFlatList: https://gorhom.dev/react-native-bottom-sheet/components/bottomsheetflatlist

## Follow-up: Servers → Workflows is also affected

A subsequent passive iPhone trace distinguished the full navigation hierarchy and timed Expo Router's queue. Three ordinary Servers → Workflows entries showed:

| Entry | Press → queue execution | Queue execution | Press → next JS frame callback |
| --- | ---: | ---: | ---: |
| 1 | ~1 ms | 1.8 ms | 334.8 ms |
| 2 | ~1 ms | 1.1 ms | 322.3 ms |
| 3 | ~7 ms | 0.9 ms | 305.4 ms |

With rapid repeat presses/back navigation, callbacks overlapped, next-frame waits reached 2,728.9 ms and timer drift reached 2,873.0 ms. Some later touches were also delivered hundreds of milliseconds late. These durations are overlapping observations, not additive per-screen render costs.

This narrows the initial bottleneck to work after navigation dispatch: screen render/commit, effects, or synchronous JS/UI interaction. It does not identify an individual component and does not prove the native transition itself lasts that long. Route-state event timing is not native frame presentation timing.

Both Servers and Workflows use RefreshSurface, which initializes animated SVG dot groups even when the refresh indicator is invisible. Workflows also instantiates per-card edit/source modal wrappers. These are candidates to measure, not proven causes: closed modal content may already be gated by its library. React dev instrumentation is another confounder.

The next controlled capture must combine route timestamps with CPU/commit measurements during **Servers → Workflows**, plus an ordinary Settings route as a comparison. Do not expand the store rewrite or remove animations on the strength of these traces alone. Duplicate pushes are separately reproducible but a press guard would mask repetition without fixing response latency. A newly attempted navigation guard was fully withdrawn at the user's request. No further business-code fixes are authorized by this diagnostic phase; the earlier workflow-store narrow fix was retained separately for subsequent review and commit.

## Joint iPhone CPU / navigation / React capture

Diagnostic only; no additional product changes. Capture: .expo/joint-iphone-cpu.json
and .expo/joint-iphone-trace.json (ignored local artifacts). Hooks restored after capture.

- Ordinary Servers → Workflows press-to-next-JS-rAF: 298–322 ms.
- Ordinary Workflows → Run: 424–530 ms. Representative initial React root render:
  177–206 ms, with subsequent commits. Durations are inclusive; do not sum nested components.
- Router queue dispatch ordinarily about 1–2 ms. Rapid sequences had outliers.
- A 1771 ms Servers → Workflows interval contained 145 CPU samples,
  128 with leaf [GC Young Gen]. This is sample evidence, not exact wall-time attribution.
- A rapid repeated navigation interval deferred JS rAF callbacks for several seconds;
  it contained 347 GC samples out of 470. Timers being deferred does not establish
  that native presentation or all JS callbacks stopped continuously.
- GC appears during several allocation paths: React development instrumentation
  (logComponentRender / structuredClone), Reanimated worklet serialization and
  freezeObjectInDev / error-stack capture, CSS interop and React element creation.
  Collection at an allocation site does not establish that site as the sole allocator.
- Original React DevTools commit hook reached 184 ms; our fiber inspection normally
  around 1–2 ms, maximum 37 ms. CPU profiling also adds overhead. These are development
  session measurements, not release performance estimates.
- The component top-50 capture was dominated by inclusive navigator ancestors and
  cannot identify the slowest business component. Do not claim a specific card,
  refresh artwork, node, or state library as the proven root cause.
- Next useful isolation: same build with DevTools disconnected, then development
  instrumentation / release comparison, followed by targeted component self-time
  and allocation inspection. Keep phone installation subject to the user's wishes.

## Release installation follow-up

The user subsequently requested a physical-device Release build. The first installed
build exited before JS startup because ExpoModulesCore.framework was absent from the
app bundle. Regenerating Pods with `EXPO_PRECOMPILED_FLAVOR=release pod install`
added ExpoModulesCore to the generated framework-embedding script. Rebuilding with
the same flavor and Release configuration produced a package containing the framework.
The replacement was installed, launched, and its process remained running during the
startup observation. These native generated files/build products are not tracked.

This verifies startup only; no controlled Release navigation latency measurement or
user-confirmed performance improvement has yet been recorded. Development overhead
remains a supported contributor, not a proven exclusive cause of the original delay.
