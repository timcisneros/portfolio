# Hero Diagram Card Deck

The homepage project diagram is implemented in
[`components/HeroDiagram.tsx`](../components/HeroDiagram.tsx), with its layout
and animation rules in [`styles/globals.css`](../styles/globals.css). It is a
small cyclic deck of project cards, not a generic carousel.

## Card Roles

The rendered deck can contain these real project-card roles:

- `resting`: the current interactive card;
- `entering`: the next current card moving from the rear to the front;
- `leaving`: the outgoing current card moving around and behind the new card;
- `behind`: the completed outgoing card retained at its rear position;
- `preview`: the upcoming card visible at the opposite rear edge.

The three `.hero-card-sheet` elements are decorative depth only. They may fill
out the stack, but they must never replace a still-visible project card during
or immediately after a flip.

## Transition Lifecycle

`startCycle()` records the outgoing index and direction in `transition`, then
updates the active index. During the 400ms CSS animation, the outgoing card is
`leaving` and the new active card is `entering`.

At `animationend`, `finishTransition()` copies the completed transition into
`backing` before clearing `transition`. The leaving and behind branches occupy
the same keyed React slot. React therefore preserves the outgoing DOM element
and changes only its phase class from `hero-diagram--leaving-*` to
`hero-diagram--behind-*`.

For a forward flip, the outgoing card reaches
`translate(-22px, -9px) rotate(-3.6deg) scale(0.975)` and remains at `z-index:
4`, above the decorative sheets and below the active card. Its content stays
visible at the exposed rear edge. The reverse direction mirrors this position.

When another flip starts, the current active card becomes the new outgoing
card. The older backing card remains rendered beneath it until the new outgoing
card reaches and covers the rear pose. At `animationend`, keyed reconciliation
moves the new outgoing node into the backing role and removes the older rear
card. There is therefore no blank-sheet frame between consecutive flips.
Repeated input during a transition remains coalesced into one pending
direction.

While `transition` is active, the deck receives `is-transitioning`. That class
pauses every `.hd-flow-group`, including the entering card. Card motion is then
compositor-friendly transform work over stable SVG pixels instead of transform
work combined with a continuously changing stroke raster. When the card state
settles, the class clears and only the active card's flow resumes; preview,
behind, and leaving roles remain independently paused.

Desktop uses a broad lateral peel. At `480px` and below, mobile-specific
keyframes use a shallower path calibrated to the 24px page gutter. On a 390px
viewport the maximum transformed card remains about 8.7px inside the viewport;
the settled rear poses remain about 16.5px inside. The decorative sheets use
the same restrained mobile geometry so they cannot be clipped by the hero's
overflow boundary either.

## Invariants

- The outgoing project card remains fully opaque and mounted after it reaches
  the rear position.
- The leaving-to-behind phase change must preserve the same DOM node.
- An older backing card remains present until the new leaving card covers and
  replaces it.
- A rear project card stays above decorative sheets and below the active card.
- Mobile card bounds remain inside the viewport throughout the transition.
- Rear and preview cards are `aria-hidden`, inert, and non-interactive.
- Their internal flow animation is paused while they are behind the active
  card.
- Every internal flow animation is paused for the complete card transition and
  the active flow resumes after settling.
- Reduced-motion mode completes the same state transition without playing the
  movement.

The Playwright test `outgoing diagram card remains mounted as the rear card`
marks the leaving DOM node and verifies that the same node becomes the opaque,
`z-index: 4` behind card after the animation.
