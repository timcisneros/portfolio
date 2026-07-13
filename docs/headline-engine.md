# Animated Headline Engine

This document is the source of truth for the animated portfolio headline. Read
it before changing headline vocabulary, sentence generation, cursor behavior,
timing, formatting, emoji, or tests.

## Purpose

The homepage headline should look like a person drafting and revising text in a
normal text box. It should be dynamic and playful while producing plausible,
useful ideas about what Tim could build for a visitor or their business.

Technology is presented as a tool in service of people. Generated claims must
not imply that software monitors, controls, judges, replaces, manipulates, or
takes decision-making power from people. Human agency is an invariant, not a
tone preference.

The engine intentionally distinguishes between:

- **Committed states:** complete headlines held long enough to read as claims.
- **Transient states:** incomplete text visible while a recognizable edit is in
  progress. A transient state may be grammatically incomplete, but must never be
  held as a finished claim.

## Product Constraints

Every committed headline should be:

- relevant to Tim's portfolio and plausible services;
- semantically compatible at the subject, verb, and object level;
- grammatically correct for its construction;
- understandable without explaining the generator;
- respectful of human agency;
- useful, provocative, or specific enough to help a visitor imagine an
  opportunity;
- short enough to fit the fixed headline area.

Cursor behavior must remain recognizable as ordinary text editing. The visible
vocabulary is intentionally limited to typing, backspacing, caret movement,
selection, replacement, punctuation, restrained formatting, hesitation, and
correction. Do not add abstract semantic visualizations, multiple cursors,
invisible shortcut theater, or motion without an obvious edit.

## Architecture

The system has five layers. Validity flows downward; rendered observations flow
back through telemetry and tests.

```text
vocabulary + semantic capabilities
              |
              v
valid triples + construction renderers
              |
              v
narrative, path, template, and behavior planning
              |
              v
typed edit operations + transaction simulation
              |
              v
persistent runtime + React DOM adapter
              |
              v
caret, selection, text, formatting, and telemetry
```

### Integration Component

[`components/TypewriterHeadline.tsx`](../components/TypewriterHeadline.tsx) is
the current integration boundary. It owns:

- the live vocabulary and capability profiles;
- derived triples and prompt pools;
- React rendering state;
- browser measurement and fit checks;
- the DOM-specific implementations of typing, deletion, selection, caret
  movement, formatting, and emoji garnish;
- scheduling, visibility suspension, and the final behavior scheduler.

The component is intentionally server-rendered with a complete initial sentence.
Visitors with `prefers-reduced-motion: reduce` keep that sentence and do not run
the animation.

The component is large. Future maintenance should extract responsibilities from
it, not add parallel validity or execution systems inside it.

### Headline Modules

| Module | Responsibility |
| --- | --- |
| [`engine.ts`](../lib/headline/engine.ts) | Weighted selection, recency memory, semantic roles, and role-relation compilation. |
| [`grammar.ts`](../lib/headline/grammar.ts) | Third-person, past-tense, gerund, and subject-casing morphology. Irregular forms belong in verb metadata. |
| [`manifest.ts`](../lib/headline/manifest.ts) | Validation and compilation of role-driven subject/verb/object manifests. |
| [`constructions.ts`](../lib/headline/constructions.ts) | Grammar-aware statement, question, stance, counterfactual, and outcome-chain rendering. |
| [`planner.ts`](../lib/headline/planner.ts) | Narrative scoring across recency, domain, family, energy, conceptual distance, quality, and surprise. Also analyzes relation-graph health. |
| [`path.ts`](../lib/headline/path.ts) | Valid semantic bridge paths, dependency ordering, and semantic caret-anchor memory. |
| [`policy.ts`](../lib/headline/policy.ts) | Cross-cutting behavior distribution for paths, templates, operations, slots, navigation, and timing. |
| [`edits.ts`](../lib/headline/edits.ts) | Text diffs, strategy and template registries, semantic ranges, typed operations, composite plans, simulation, and reachability audits. |
| [`runtime.ts`](../lib/headline/runtime.ts) | Persistent operation state machine, checkpoints, pause/resume/cancel, preflight simulation, commit/recovery, and traces. |
| [`text.ts`](../lib/headline/text.ts) | Cached grapheme segmentation, safe caret/range boundaries, and formatting-range transforms. |
| [`audit.ts`](../lib/headline/audit.ts) | Seeded trajectory and rendered-width reachability audits. |

## Vocabulary And Semantic Validity

The primary vocabulary currently lives near the top of
`TypewriterHeadline.tsx`:

- `NOUNS`: subjects shown to visitors;
- `CONNECTORS`: statement connectors such as `that`, `can`, and `could`;
- `MODALS`: question leads;
- `VERBS`: verb forms, accepted links, and subject/object constraints;
- `OBJECTS`: targets with semantic kinds;
- `SUBJECT_CAPABILITIES`: the authoritative subject-specific capability model;
- emoji arrays aligned by noun, verb, and object index.

`VALID_TRIPLES` is derived from these constraints. Do not construct headlines
by taking an unrestricted Cartesian product of words. A triple is valid only
when all subject, verb, object, capability, agency, and construction guards pass.

Quality has three levels:

- `strong`: concrete and credible enough for normal statements;
- `exploratory`: useful mainly in explicitly exploratory questions;
- `supporting`: valid but lower-priority connective material.

Exact quality overrides exist for combinations whose quality cannot be inferred
from general roles. Use overrides sparingly. Prefer correcting semantic roles or
capability profiles when the problem is structural.

### Agency Rules

Reject or rewrite relationships that suggest technology:

- monitors or manages people;
- controls creativity or human behavior;
- makes judgments or approvals for people;
- takes ownership of human decisions;
- manipulates users;
- makes grand promises such as "freeing" people without a concrete mechanism.

Good language makes the tool subordinate and useful: software can serve teams,
support a workflow, clarify information, reduce specific busywork, or help a
person act with better context.

### Adding Vocabulary

When adding a subject, verb, or object:

1. Add its structured metadata, not only display text.
2. Add or inherit capabilities through semantic roles.
3. Confirm statement and question eligibility.
4. Confirm every new relationship is plausible in plain English.
5. Add aligned emoji metadata if the indexed arrays require it.
6. Run graph and reachability audits.
7. Watch several generated examples at normal speed.
8. Add a regression test for any relationship that required a special decision.

Do not add vocabulary merely to increase combination count. It should create a
meaningful new idea surface.

### Communication Vocabulary

Communication is represented as an outcome of demonstrated technical work, not
as a claim that the portfolio owner specializes in communications products.
The evidence in `data/projects.ts` and `data/caseStudies.ts` is specific:

- DSDebug and the React Flow org chart make complex systems visually readable;
- DSDebug exposes workflow state that was buried in machine-oriented exports;
- workforce automation processed adherence metrics and pushed real-time updates;
- onboarding dashboards and reports made operational metrics and process state
  visible;
- the Stringing Report app turns field data into reports crews use on-site;
- the Action Plan Generator turns source material into structured, actionable
  output.

The graph therefore uses `Visualizations` as an evidence-backed artifact and
adds complex workflows, workflow state, real-time updates, operational metrics,
field data, and field reports as outcomes. Existing subjects carry narrow
relationships: dashboards surface updates and metrics, visualizations clarify
workflows, forms organize field data, and internal tools generate field reports.
Do not infer unsupported specialties such as documentation, briefs,
communication strategy, audience management, or client communications.

Technology must not speak for people, manage relationships, decide what should
be communicated, or manipulate an audience. It can make technical state easier
to inspect, understand, structure, and share while people retain authorship,
judgment, and control.

## Constructions And Narrative Planning

Construction plugins render validated semantic terms into two display lines.
Current families include statements, questions, stances, counterfactuals,
reflections, and outcome chains.

`NarrativePlanner` prevents the animation from becoming an independent random
word picker. It balances:

- recent subjects, verbs, objects, keys, domains, and families;
- quiet, curious, playful, and concrete energy;
- near, medium, and far conceptual movement;
- quality and surprise budgets.

`planSemanticPath` can insert one graph-valid bridge between a source and target.
Live coordinated revisions use this for verb/object paths. A bridge is committed
as a complete valid headline, then the queued destination is prioritized before
unrelated decoration or edits.

Construction changes use dependency ordering. For example, a local conversion
changes modal structure before punctuation, but commits only after the complete
multi-line transaction succeeds.

## Editing Model

### Text Differences

`diffTextRevision` computes a useful human-looking replacement. It preserves an
obvious append/remove boundary or a recognizable shared stem, but does not keep
one or two coincidental letters. Shared suffixes require a substantial run; a
lone plural `s` must not remain while the rest of a word is replaced. This is
less mechanically minimal and more consistent with normal text-box editing.

Partial-word insertion is typed cleanly. Typo-repair routines assume a fresh
word boundary and must not run inside a preserved suffix.

### Strategy Registry

The strategy registry selects among:

- insertion;
- deletion;
- fragment-preserving replacement;
- selection replacement;
- backspace reconstruction;
- visible reconsideration.

Recent and frequent strategies are discounted without becoming unreachable.
Strategies produce plans; they do not bypass semantic validation.

### Template Registry

Templates describe the visible editing story between validated states:

- local conversion;
- progressive refinement;
- phrase pruning;
- phrase extension;
- focused revision;
- thought reconstruction.

Templates affect choreography. They are not telemetry labels only. Conversions
and refinements preserve context, pruning selects a target, extension inserts
locally, and reconstruction uses deliberate backspacing.

### Typed Operations

All ordinary planned edits compile to `EditOperation` values:

- `move-caret`;
- `select-range`;
- `delete-selection`;
- `backspace`;
- `insert-text`;
- `replace-punctuation`;
- `transfer-emphasis`;
- `pause`;
- `commit-semantic-state`.

Multi-line construction rewrites contain exactly one final semantic commit.
There must be no commit between line revisions.

### Transaction Simulation

Before visible execution, `simulateEditTransaction` applies operations to an
in-memory two-line model. It records text, caret, selection, operation, and an
intermediate-state policy for every step.

States are classified as:

- `valid`: initial or successfully committed;
- `transient`: allowed only while an operation continues;
- `prohibited`: invalid bounds, missing selections, target mismatch, or another
  execution error.

Only a valid transaction executes. Recovery is visible and progressively scoped;
normal deterministic browser trajectories require zero runtime recoveries.

## Runtime

`HeadlineEditRuntime` is persistent for the lifetime of the headline effect. It
owns the operation index and these phases:

- `idle`;
- `planning`;
- `navigating`;
- `selecting`;
- `mutating`;
- `pausing`;
- `verifying`;
- `committed`;
- `recovering`.

The runtime supports checkpoints, pause, resume, and cancellation. Visibility,
off-screen state, and the manual pause button suspend the active adapter step.
Resume must release the pending adapter step without replaying completed work.
Unmount cancels unfinished work.

The React component is the DOM adapter. It converts typed operations into the
visible primitives. The adapter must never introduce a second source of
semantic truth.

## Human Editing Choreography

The meaningful visible behavior set is considered complete. It includes:

- typing, insertion, and held backspace;
- arrow movement, word jumps, and direct placement;
- forward and backward selection;
- word, phrase, and line replacement;
- shared-prefix, suffix, and middle replacement;
- visible mistakes and corrections;
- plausible reconsideration;
- punctuation changes;
- bold, italic, and underline changes;
- larger phrase and construction rewrites.

Do not add technically distinct editor commands unless a visitor can identify
their visible result. Delete-forward, Home/End, cut/paste, redo, and shortcut
simulation mostly duplicate existing visuals in this presentation.

Formatting is layout-neutral. Applying, changing, or removing bold, italic, or
underline may change how the selected glyphs are painted, but it must not move
the words that follow. Each rendered text run therefore reserves its normal
advance width. Italic uses a paint-only skew instead of the font's italic face,
whose different glyph advances previously shifted the remainder of the line.
Rendered runs preserve whitespace because caret, selection, and formatting cuts
can place a meaningful space at either edge of an inline-block run; allowing
normal inline-block whitespace collapsing makes spaces disappear during edits.

### Caret Anchors

Caret anchor memory tracks subject, connector, modal, verb, object, punctuation,
emphasis, and whole-construction edits. Related nearby edits prefer arrows;
nearby same-line edits may use word jumps; distant or cross-line edits use direct
placement. The behavior policy may vary among safe choices but cannot choose an
unsafe movement for novelty.

### Timing

One timing profile governs an entire typed transaction:

- `crisp` for compact corrections;
- `deliberate` for normal revisions;
- `exploratory` for visible reconsideration.

Timing applies across movement, selection, deletion, insertion, punctuation,
emphasis, pauses, verification, and commit. Avoid independent random timing that
makes one transaction feel internally inconsistent.

### Mistakes

Mistakes are intentionally rare. Immediate mistakes are single adjacent-key
substitutions corrected at a readable pace. Multi-character mistakes are
reserved for slower delayed correction. Complex partial-word edits type cleanly.

Never perform several incorrect and corrected mutations in one rendered frame.
Do not increase mistake rates merely to make the animation look busy.

### Formatting

Formatting is occasional and lower-weight than semantic editing. It must follow
a visible selection. Formatting ranges use exact insertion/deletion transforms
and must not include adjacent spaces, punctuation, or emoji.

Before a full construction rewrite, existing formatting is visibly selected and
cleared. Do not let a formatted range collapse during whole-line deletion,
expand over replacement text, and then clear silently at commit. That sequence
looks like partial formatting corruption followed by an unexplained style loss.

Insertion exactly at the end of a formatted range is outside the range. Insertion
into an empty formatted replacement range extends the range. This distinction
prevents style leakage while preserving formatting during a selected-word
replacement.

Deleting a formatted word's tail creates replacement affinity at the remaining
range end even when a shared prefix keeps the range nonempty. Retyped suffixes
and immediately corrected tail typos therefore extend the original formatting
instead of producing a word whose prefix alone is bold, italic, or underlined.

An empty range created by deleting an entire formatted word receives temporary
replacement affinity. Every subsequently retyped non-whitespace character stays
formatted; leading replacement whitespace moves the insertion point, and
trailing whitespace ends affinity. Clear affinity at semantic hold. Without this
state, only the first retyped character receives the original style.

### Emoji And Unicode

Every caret, selection, deletion, and formatting boundary must be a grapheme
boundary. UTF-16 surrogate-pair checks alone are insufficient. Joined emoji,
skin-tone modifiers, regional flags, and variation selectors may span multiple
code units.

Use helpers in `text.ts`; never slice user-visible text at an unchecked numeric
offset. The replacement glyph `\uFFFD` is a test failure.

Questions already contain `?`. Do not append a second question mark as garnish.

## Scheduler And Distribution

The scheduler separates content edits, decoration, and transitions. Content and
semantic transitions should dominate. Formatting is deliberately uncommon.

`HeadlineBehaviorPolicy` tracks paths, templates, operations, semantic slots,
navigation, and timing. Recent and frequent behavior is discounted. This keeps
variation coordinated rather than allowing independent random systems to
dominate.

Distribution audits group runtime telemetry into behavior families and fail if:

- too few families are represented;
- one family exceeds the allowed dominant share;
- runtime recovery occurs during the normal deterministic trajectory.

When tuning, change weights only after observing normal-speed output. Do not add
new behavior to solve a distribution problem.

## Fit, Motion, And Accessibility

- `getHeadlineFitLines()` exposes the executable corpus of every committed line:
  statement and question variants, construction prompts, punctuation, and
  contextual emoji. Transient mid-edit text is intentionally excluded. The
  corpus is built lazily by `getHeadlineFitLines()` for tests and audits; the
  production component does not construct thousands of audit strings or expose
  their count in rendered markup.
- The hero uses the same `1080px` container and padded content track as the
  rest of the page. On desktop that track is divided between copy and diagram;
  the headline frame fills only the copy column. At `820px` and below the two
  columns stack while retaining the shared container edges.
- Corpus size does not determine layout width. A Chromium audit at a `1440px`
  viewport found 5,329 possible committed lines and a theoretical widest frame
  of 1,177px. That sizing strategy was rejected because it exceeded the site's
  1,080px container and allowed rare optional language to distort the hero.
- Every proposed line is measured against the rendered copy-column frame.
  Candidates that do not fit are skipped; they never enlarge the frame,
  overlap the diagram, or change the page grid. The full corpus remains useful
  for semantic, uniqueness, and reachability audits, not frame geometry.
- Rendered candidate widths use a bounded 512-entry cache. A cache miss uses
  the hidden DOM measurement span once; subsequent checks avoid the
  write-then-`offsetWidth` forced-layout cycle. Font readiness and headline
  resizing clear the cache and update the stored frame width.
- Finished lines may not overflow the fixed headline box.
- Fit checks reserve a small amount of horizontal space for the caret, text
  stroke, underline, and paint-only italic overhang; candidates may not consume
  the box's full plain-text width.
- In-progress text is not treated as a committed fit state.
- The animation pauses when the tab is hidden or the hero is off-screen.
- The visible pause/resume control preserves the active transaction.
- Reduced-motion users receive the complete initial server-rendered sentence.

Grapheme boundaries use a shared `Intl.Segmenter` and a bounded 256-entry cache.
The cache prevents repeated segmentation of the short intermediate strings
created during deletion, caret movement, and correction without allowing an
unbounded long-running animation history. Each visual line is a memoized run
renderer with line-local caret, selection, and formatting props, so an edit on
one line does not rebuild the other line's spans.

## Test-Mode Telemetry

Setting `window.__headlineTestSpeed` before hydration enables accelerated test
mode and test-only data attributes. Production visitors do not receive this
instrumentation.

Important attributes include:

- `data-line1`, `data-line2`, and `data-moving`;
- `data-caret`, `data-selection`, and `data-format`;
- `data-telemetry` for states, modes, families, domains, and edit counts;
- `data-planner` for narrative planner state;
- `data-behavior-policy` for recent behavior and counts;
- `data-edit-trace` for runtime phases and operation indices.

The Playwright trajectory treats `data-telemetry` updates as semantic commit
events. `moving=false` is not a commit signal because a person may pause after
noticing a typo.

## Verification

Run all checks after headline changes:

```bash
npm run typecheck
npm run test
npm run build
npm run test:e2e
git diff --check
```

Playwright uses `next start`, so rebuild before browser tests. Otherwise the
browser may run a stale `.next` bundle.

### Unit Coverage

- [`headline-grammar.test.ts`](../tests/unit/headline-grammar.test.ts): morphology.
- [`headline-engine.test.ts`](../tests/unit/headline-engine.test.ts): semantic
  roles, strategies, templates, operations, transactions, runtime, paths,
  policy, graphemes, ranges, and distribution.
- [`headline-audit.test.ts`](../tests/unit/headline-audit.test.ts): seeded
  trajectories and visual reachability.

### Browser Coverage

The headline test in [`site.spec.ts`](../tests/e2e/site.spec.ts) runs an
accelerated deterministic mobile trajectory beyond 15 committed states and
requires:

- statements, questions, and phrase constructions;
- several semantic and editing families;
- no completed overflow;
- no replacement glyph;
- grapheme-safe caret, selection, and formatting boundaries;
- formatting endpoints on text, not punctuation or emoji;
- no formatting removal without a recently visible selection;
- identical following-word positions across plain, bold, italic, and underline;
- preserved visual width for spaces at rendered-run boundaries;
- exact desktop alignment between the hero and standard section content tracks;
- headline containment within the copy column with no diagram overlap;
- no unexpected runtime recovery;
- no mechanically dominant behavior family;
- working pause and resume.

Add a regression fixture when a real visual bug is found. Do not weaken an
invariant to make a new behavior pass.

## Known Maintenance Boundary

Feature development for the visible manipulation vocabulary is closed. Future
changes should be one of:

- a fix for an observed visual or semantic bug;
- evidence-based timing or weight tuning;
- vocabulary expansion through the semantic model;
- stronger regression coverage;
- extraction that reduces integration-component complexity.

The principal technical debt is the size of `TypewriterHeadline.tsx`. A future
refactor may extract the DOM runtime adapter and vocabulary manifests, but must
preserve the module ownership and invariants described here. Refactoring is not
an opportunity to duplicate planners or weaken transaction validation.

## Semantic Decision Record

This section preserves the product judgments that shaped the semantic model.
These are examples of broader failure classes, not a blacklist of exact
sentences. Fix new instances at the capability, role, construction, or quality
layer rather than adding full-sentence exceptions.

### Preferred Subject Matter

The portfolio owner explicitly values ideas, services, solutions, experiences,
tech, toolkits, frameworks, widgets, and assistants. `Empower` is acceptable
when its object and mechanism preserve human agency and the claim is credible.
AI models working for people can also be a useful frontier-oriented idea. These
preferences never override triple validity or plausibility.

Stances such as "Software should serve your teams" are intentionally useful.
They communicate that technology is subordinate to people. Do not remove all
stance constructions while eliminating generic claims.

### Rejected Relationship Classes

Observed outputs in these classes were rejected as implausible, irrelevant,
overbroad, unimpressive, or contrary to human agency:

- tools monitoring developers;
- consoles freeing people;
- schedulers empowering creators or bots serving creators;
- data generically "working for you" when it suggests manipulation;
- automation generically freeing users;
- models reviewing startups;
- engines or evaluators generically working for people;
- plugins building for a roadmap;
- workbenches connecting or working for a workflow;
- schedulers doing something vague for handoffs;
- forms clarifying bottlenecks or generically automating approvals;
- automations or websites routing time;
- search tools doing something vague for patterns;
- internal tools supporting a roadmap without a concrete relationship;
- APIs tracing bottlenecks, validating arbitrary data, or debugging a product or
  stack without a credible mechanism;
- portals surfacing approvals without sufficient context;
- flows routing approvals or queues surfacing pipelines in vague combinations;
- chatbots debugging a developer stack when the subject normally denotes a
  customer-facing interface;
- databases or features debugging a stack;
- reports connecting a product;
- dashboards or features building for a product;
- backends or modules generically reducing busywork;
- software accelerating records;
- analytics debugging approvals;
- websites working for startups as an unimpressive given;
- solutions helping creators or products working for creators when the claim is
  obvious and adds no useful idea.

These examples establish reusable rules:

1. A technically possible verb is not automatically a natural capability of a
   subject.
2. An object must be something the verb can credibly act on.
3. A grammatical sentence may still be too generic to be useful.
4. Interrogative form does not rescue a weak relationship.
5. Portfolio relevance matters independently of plausibility.
6. Human-serving language must describe assistance, context, or reduced friction
   without transferring power or judgment to technology.

### Root-Cause Policy

When a bad output appears:

1. Confirm whether it was a committed state or a transient edit.
2. Identify the failed layer: subject capability, verb/object role,
   construction eligibility, quality tier, or agency guard.
3. Correct the smallest structural rule that explains the failure class.
4. Audit reachability so useful vocabulary and constructions remain available.
5. Add a regression test at the same abstraction level as the fix.

Do not curate around failures with an expanding list of complete allowed
sentences. Dynamism depends on the semantic graph remaining generative.

## Fresh-Agent Onboarding

A new agent needs no conversation history if it follows this order:

1. Read this document completely.
2. Read the exported types in `lib/headline/` and their unit tests.
3. Locate the vocabulary, capability profiles, derived triples, primitive edit
   functions, and scheduler markers in `TypewriterHeadline.tsx`.
4. Run the complete verification suite before changing behavior.
5. Reproduce a reported sentence as a committed or transient state before
   deciding which layer owns the fix.

Mutable vocabulary inventories, scheduler weights, and timing constants remain
authoritative in code. This document explains how to interpret and change them;
it does not duplicate tables that would drift from executable truth.

## Change Checklist

Before merging any headline change, answer all of these:

- Is every new committed sentence plausible, relevant, and human-serving?
- Is the relationship represented structurally rather than hardcoded as a full
  sentence?
- Does the edit look like something a person could do in a text box?
- Are all text boundaries grapheme-safe?
- Can formatting leak beyond its intended semantic slot?
- Is there exactly one final commit for a multi-line transaction?
- Can pause/resume replay an operation or lose a pending step?
- Does the target fit on mobile and desktop?
- Does the change preserve reduced-motion behavior?
- Are new vocabulary and behaviors reachable?
- Do long-run distribution and runtime-recovery gates still pass?
- Was the production bundle rebuilt before Playwright ran?
