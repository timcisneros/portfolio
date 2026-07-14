import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { ArrowRightIcon } from "./Icons";

// A compact BPMN-style view of the Ticket System's governed run lifecycle,
// drawn inside a pool with execution and operator-review swimlanes:
//
//   Lane "System" (automated pipeline):
//     ● start → Ticket → Run → ◇ Verify → Finalize → ◉ end
//   Lane "Human" (review):
//     the Verify "no" branch drops to Triage, Review, and an explicit Rerun,
//     which starts a fresh attempt under the same authority controls.
//
// The lane boundary is the point: automation runs in the System lane, anything
// unverified crosses to a human in the Human lane, then returns. A folded-corner
// data object ("Evidence") and a bracketed annotation ("finished & verified?")
// attach via dotted associations. Sequence flows have no arrowheads — direction
// reads from the dash animation. Pure CSS; motion off under
// prefers-reduced-motion (see globals.css).

const TASKS = [
  { x: 110, y: 80, w: 84, cx: 152, label: "Ticket" },
  { x: 232, y: 80, w: 104, cx: 284, label: "Run" },
  { x: 452, y: 80, w: 88, cx: 496, label: "Finalize" },
  { x: 346, y: 294, w: 100, cx: 396, label: "Triage" },
  { x: 196, y: 294, w: 104, cx: 248, label: "Review" },
  { x: 62, y: 294, w: 100, cx: 112, label: "Rerun" },
];

const FLOWS = [
  "M83,100 H110", // start → Ticket
  "M194,100 H232", // Ticket → Run
  "M336,100 H372", // Run → Verify
  "M420,100 H452", // Verify → Finalize (yes)
  "M540,100 H559", // Finalize → end
  "M396,124 V294", // Verify → Triage (no)
  "M346,314 H300", // Triage → Review
  "M196,314 H162", // Review → Rerun
  "M140,294 C180,236 258,176 284,120", // Rerun → Run
];

const TicketSystemDiagram = () => (
    <svg
      className="hd-svg"
      viewBox="0 0 600 410"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Pool (named) + two swimlanes. */}
      <rect className="hd-pool" x="1" y="1" width="598" height="408" />
      <path className="hd-pool" d="M25,1 V409" />
      <path className="hd-pool" d="M49,1 V409" />
      <path className="hd-pool" d="M25,220 H599" />
      <text
        className="hd-lane-label"
        x="13"
        y="209"
        transform="rotate(-90 13 205)"
      >
        Governed work
      </text>
      <text
        className="hd-lane-label"
        x="37"
        y="114"
        transform="rotate(-90 37 110)"
      >
        Execution
      </text>
      <text
        className="hd-lane-label"
        x="37"
        y="318"
        transform="rotate(-90 37 314)"
      >
        Review
      </text>

      {/* Associations (dotted) — attach the artifacts. */}
      <path className="hd-assoc" d="M284,70 L284,80 M284,120 L284,145 M396,76 L396,58" />

      {/* Sequence flows. */}
      <g className="hd-flow-group">
        <path className="hd-flow" d={FLOWS.join(" ")} />
      </g>

      {/* Text annotation on the gateway (BPMN artifact). */}
      <text className="hd-cond hd-annot-text" x="398" y="52">
        finished & verified?
      </text>

      {/* Data object (input) — Automate runs against an explicit authority. */}
      <>
        <text className="hd-cond hd-data-label" x="284" y="19">
          Authority
        </text>
        <path className="hd-data" d="M262,27 H296 L306,37 V71 H262 Z" />
        <path className="hd-data" d="M296,27 V37 H306" />
      </>

      {/* Data object (output) — the audit record. */}
      <>
        <path className="hd-data" d="M262,145 H296 L306,155 V193 H262 Z" />
        <path className="hd-data" d="M296,145 V155 H306" />
        <text className="hd-cond hd-data-label" x="284" y="207">
          Evidence
        </text>
      </>

      {/* Start event — thin circle. */}
      <circle className="hd-event" cx="70" cy="100" r="13" />

      {TASKS.map((task) => (
        <React.Fragment key={task.label}>
          <rect
            className="hd-task"
            x={task.x}
            y={task.y}
            width={task.w}
            height="40"
            rx="9"
          />
          <text className="hd-label" x={task.cx} y={task.y + 24}>
            {task.label}
          </text>
        </React.Fragment>
      ))}

      {/* Verify — exclusive gateway. */}
      <>
        <polygon
          className="hd-gateway"
          points="396,76 420,100 396,124 372,100"
        />
        <path className="hd-gateway-mark" d="M390,94 L402,106" />
        <path className="hd-gateway-mark" d="M402,94 L390,106" />
      </>

      {/* End event — thick circle. */}
      <circle className="hd-event hd-event-end" cx="572" cy="100" r="13" />

      {/* Branch condition labels — drawn last so nothing clips them. */}
      <text className="hd-cond" x="436" y="91">
        yes
      </text>
      <text className="hd-cond" x="410" y="205">
        no
      </text>
    </svg>
);

type DiagramNode = {
  x: number;
  y: number;
  label?: string;
  note?: string;
  type?: "task" | "gateway" | "start" | "end";
  width?: number;
};

type DiagramArtifact = { x: number; y: number; label: string };

type DetailedDiagramProps = {
  laneTop: string;
  laneBottom: string;
  nodes: DiagramNode[];
  flows: string[];
  conditions?: { x: number; y: number; label: string }[];
  artifacts?: DiagramArtifact[];
  associations?: string[];
};

const DetailedDiagram = ({
  laneTop,
  laneBottom,
  nodes,
  flows,
  conditions = [],
  artifacts = [],
  associations = [],
}: DetailedDiagramProps) => (
  <svg
    className="hd-svg hd-logic-svg"
    viewBox="0 0 600 410"
    fill="none"
    aria-hidden="true"
    preserveAspectRatio="xMidYMid meet"
  >
    <rect className="hd-pool" x="1" y="1" width="598" height="408" />
    <path className="hd-pool" d="M49,1 V409" />
    <path className="hd-pool" d="M49,220 H599" />
    <text className="hd-lane-label" x="25" y="114" transform="rotate(-90 25 110)">
      {laneTop}
    </text>
    <text className="hd-lane-label" x="25" y="318" transform="rotate(-90 25 314)">
      {laneBottom}
    </text>

    {associations.length > 0 && <path className="hd-assoc" d={associations.join(" ")} />}

    <g className="hd-flow-group">
      <path className="hd-flow" d={flows.join(" ")} />
    </g>

    {artifacts.map((artifact) => (
      <React.Fragment key={artifact.label}>
        <path
          className="hd-data"
          d={`M${artifact.x},${artifact.y} h30 l9,9 v36 h-39 z`}
        />
        <path
          className="hd-data"
          d={`M${artifact.x + 30},${artifact.y} v9 h9`}
        />
        <text className="hd-cond hd-data-label" x={artifact.x + 19} y={artifact.y + 58}>
          {artifact.label}
        </text>
      </React.Fragment>
    ))}

    {nodes.map((node) => {
      const type = node.type ?? "task";
      const width = node.width ?? 82;
      return (
        <React.Fragment key={`${node.label ?? type}-${node.x}-${node.y}`}>
          {type === "task" && (
            <rect className="hd-task" x={node.x - width / 2} y={node.y - 20} width={width} height="40" rx="9" />
          )}
          {type === "gateway" && (
            <>
              <polygon className="hd-gateway" points={`${node.x},${node.y - 24} ${node.x + 24},${node.y} ${node.x},${node.y + 24} ${node.x - 24},${node.y}`} />
              <path className="hd-gateway-mark" d={`M${node.x - 6},${node.y - 6} L${node.x + 6},${node.y + 6} M${node.x + 6},${node.y - 6} L${node.x - 6},${node.y + 6}`} />
            </>
          )}
          {(type === "start" || type === "end") && (
            <circle className={`hd-event${type === "end" ? " hd-event-end" : ""}`} cx={node.x} cy={node.y} r="13" />
          )}
          {node.label && (
            <text className={type === "task" ? "hd-label" : "hd-cond hd-node-caption"} x={node.x} y={type === "task" ? node.y + 4 : node.y + 40}>
              {node.label}
            </text>
          )}
          {node.note && (
            <text className="hd-step-note" x={node.x} y={node.y + 15}>
              {node.note}
            </text>
          )}
        </React.Fragment>
      );
    })}

    {conditions.map((condition) => (
      <text key={`${condition.label}-${condition.x}`} className="hd-cond" x={condition.x} y={condition.y}>
        {condition.label}
      </text>
    ))}
  </svg>
);

const PROJECT_CARDS = [
  {
    name: "Ticket System",
    target: "project-ticket-system",
    summary: "Bounded agents turn explicit authority into auditable evidence.",
    diagram: <TicketSystemDiagram />,
  },
  {
    name: "DSDebug",
    target: "project-dsdebug",
    summary: "Dense workflow JSON becomes a graph you can trace and edit.",
    diagram: (
      <DetailedDiagram
        laneTop="Client pipeline"
        laneBottom="Workbench"
        nodes={[
          { x: 72, y: 102, type: "start" },
          { x: 142, y: 102, label: "Load", width: 76 },
          { x: 244, y: 102, label: "Parse JSON", width: 92 },
          { x: 358, y: 102, label: "Render graph", width: 100 },
          { x: 480, y: 102, label: "Manage vars", width: 92 },
          { x: 552, y: 102, type: "end" },
          { x: 480, y: 304, label: "Variables", width: 88 },
          { x: 358, y: 304, label: "Edit canvas", width: 94 },
          { x: 244, y: 304, label: "Console", width: 82 },
        ]}
        flows={[
          "M85,102 H104", "M180,102 H198", "M290,102 H308",
          "M408,102 H434", "M526,102 H539",
        ]}
        artifacts={[{ x: 102, y: 154, label: "upload / template" }]}
        associations={[
          "M121,154 C124,140 132,128 142,122",
          "M480,284 V122",
          "M358,284 V122",
          "M244,284 V122",
        ]}
      />
    ),
  },
  {
    name: "Self-Hosted YouTube",
    target: "project-my-youtube",
    summary: "A self-hosted server stands between the browser and Google.",
    diagram: (
      <DetailedDiagram
        laneTop="Browser"
        laneBottom="Self-hosted server"
        nodes={[
          { x: 72, y: 102, type: "start" },
          { x: 142, y: 102, label: "Request", width: 82 },
          { x: 492, y: 102, label: "Render / play", width: 108 },
          { x: 572, y: 102, type: "end" },
          { x: 180, y: 292, label: "Feed or watch?", type: "gateway" },
          { x: 300, y: 258, label: "RSS + DB", width: 82 },
          { x: 424, y: 258, label: "SSR + images", width: 100 },
          { x: 300, y: 334, label: "Extract stream", width: 108 },
          { x: 440, y: 334, label: "Media proxy", width: 94 },
        ]}
        flows={[
          "M85,102 H101", "M183,102 C190,162 180,220 180,268",
          "M204,280 C228,268 246,258 256,258", "M344,258 H374",
          "M474,258 C500,220 506,168 500,122",
          "M204,304 C230,318 240,334 246,334", "M354,334 H393",
          "M487,334 C530,276 532,180 506,122", "M546,102 H559",
        ]}
        conditions={[{ x: 232, y: 244, label: "feed" }, { x: 232, y: 348, label: "watch" }]}
      />
    ),
  },
  {
    name: "Action Plan",
    target: "project-action-plan",
    summary: "Video captions become one constrained, structured action plan.",
    diagram: (
      <DetailedDiagram
        laneTop="Interface"
        laneBottom="LLM pipeline"
        nodes={[
          { x: 72, y: 102, type: "start" },
          { x: 140, y: 102, label: "Paste URL", width: 86 },
          { x: 420, y: 102, label: "Show result", width: 96 },
          { x: 530, y: 102, label: "Copy / share", width: 88 },
          { x: 170, y: 292, label: "Fetch video", width: 92 },
          { x: 286, y: 292, label: "Transcript?", type: "gateway" },
          { x: 392, y: 258, label: "Captions", width: 78 },
          { x: 392, y: 334, label: "Metadata", width: 82 },
          { x: 512, y: 292, label: "OpenAI plan", width: 92 },
        ]}
        flows={[
          "M85,102 H97", "M183,102 C188,164 170,222 170,272",
          "M216,292 H262", "M310,280 C326,270 338,258 353,258",
          "M310,304 C326,316 338,334 351,334",
          "M431,258 C458,260 467,278 466,286",
          "M433,334 C458,326 468,308 466,298",
          "M512,272 C506,204 458,150 428,122", "M468,102 H486",
        ]}
        conditions={[{ x: 333, y: 242, label: "captions" }, { x: 335, y: 354, label: "fallback" }]}
        artifacts={[{ x: 330, y: 150, label: "structured plan" }, { x: 500, y: 154, label: "share link" }]}
        associations={["M369,172 C392,154 410,138 416,122", "M519,154 C522,142 526,132 530,122"]}
      />
    ),
  },
  {
    name: "Waydaw",
    target: "project-waydaw",
    summary: "Explicit diagnostics make a fragile compatibility stack explainable.",
    diagram: (
      <DetailedDiagram
        laneTop="Harness"
        laneBottom="Investigation"
        nodes={[
          { x: 72, y: 102, type: "start" },
          { x: 142, y: 102, label: "./bin/check", width: 92 },
          { x: 268, y: 102, label: "Read-only probes", width: 112 },
          { x: 390, y: 102, label: "Ready?", type: "gateway" },
          { x: 510, y: 102, label: "Launchers", width: 88 },
          { x: 572, y: 102, type: "end" },
          { x: 390, y: 292, label: "Focused probe", width: 104 },
          { x: 252, y: 292, label: "Capture evidence", width: 112 },
          { x: 116, y: 292, label: "Document why", width: 102 },
        ]}
        flows={[
          "M85,102 H96", "M188,102 H212", "M324,102 H366", "M414,102 H466",
          "M390,126 V272", "M338,292 H308", "M196,292 H167",
          "M116,272 C138,210 220,156 268,122", "M554,102 H559",
        ]}
        conditions={[{ x: 442, y: 91, label: "ready" }, { x: 410, y: 205, label: "investigate" }]}
        artifacts={[{ x: 468, y: 250, label: "logs" }, { x: 100, y: 330, label: "investigation docs" }, { x: 474, y: 146, label: "shared prefix" }]}
        associations={["M468,273 H442", "M139,352 C132,334 122,322 116,312", "M493,146 V122"]}
      />
    ),
  },
];

const CARD_ORDER = [
  "project-dsdebug",
  "project-my-youtube",
  "project-ticket-system",
  "project-action-plan",
  "project-waydaw",
];

const CARDS = [...PROJECT_CARDS].sort(
  (left, right) => CARD_ORDER.indexOf(left.target) - CARD_ORDER.indexOf(right.target),
);

type ProjectLogicCard = (typeof CARDS)[number];

type CardPhase = "preview" | "behind" | "resting" | "entering" | "leaving";
type SwipeAxis = "pending" | "horizontal" | "vertical";

type SwipeGesture = {
  pointerId: number;
  startX: number;
  startY: number;
  startedAt: number;
  axis: SwipeAxis;
};

const MOBILE_CARD_QUERY = "(max-width: 820px)";
const SWIPE_DISTANCE = 48;
const SWIPE_FLICK_DISTANCE = 28;
const SWIPE_FLICK_VELOCITY = 0.45;
const SWIPE_AXIS_SLOP = 8;

const ActiveCard = memo(({
  card,
  direction,
  phase,
  renderDiagram = true,
  onTransitionEnd,
  onNext,
}: {
  card: ProjectLogicCard;
  direction: 1 | -1;
  phase: CardPhase;
  renderDiagram?: boolean;
  onTransitionEnd?: () => void;
  onNext?: () => void;
}) => (
  <article
    className={`hero-diagram${phase === "resting" || phase === "entering" ? " is-active" : ""} hero-diagram--${phase}-${direction > 0 ? "next" : "previous"}`}
    aria-hidden={phase === "leaving" || phase === "behind" || phase === "preview"}
    inert={phase === "leaving" || phase === "behind" || phase === "preview" ? true : undefined}
    onAnimationEnd={(event) => {
      if (event.target === event.currentTarget) onTransitionEnd?.();
    }}
  >
    <a
      href={`#${card.target}`}
      className="hd-card-project-link"
    >
      <header className="hd-card-header">
        <h2>{card.name}</h2>
      </header>
      <p className="hd-card-summary">{card.summary}</p>
      {renderDiagram && card.diagram}
    </a>
    {onNext && (
      <button type="button" className="hd-card-next" onClick={onNext} aria-label="Show next project card">
        <ArrowRightIcon width={16} height={16} strokeWidth={1.75} />
      </button>
    )}
  </article>
));

ActiveCard.displayName = "ActiveCard";

const HeroDiagram = () => {
  const [active, setActive] = useState(0);
  const [transition, setTransition] = useState<{ from: number; direction: 1 | -1 } | null>(null);
  const [backing, setBacking] = useState<{ from: number; direction: 1 | -1 } | null>(null);
  const deckRef = useRef<HTMLElement>(null);
  const activeRef = useRef(0);
  const isTransitioningRef = useRef(false);
  const pendingDirectionRef = useRef<1 | -1 | null>(null);
  const swipeRef = useRef<SwipeGesture | null>(null);
  const suppressClickRef = useRef(false);
  const suppressClickTimerRef = useRef<number | null>(null);

  const startCycle = useCallback((direction: 1 | -1) => {
    const from = activeRef.current;
    const next = (from + direction + CARDS.length) % CARDS.length;

    isTransitioningRef.current = true;
    setTransition({ from, direction });
    activeRef.current = next;
    setActive(next);
  }, []);

  const finishTransition = useCallback(() => {
    if (!isTransitioningRef.current || !transition) return;

    // Preserve the outgoing node as a real rear card. The leaving and behind
    // branches share a keyed slot below, so React updates its phase without
    // replacing it with a blank decorative sheet at the animation boundary.
    setBacking(transition);
    setTransition(null);
    isTransitioningRef.current = false;

    const pendingDirection = pendingDirectionRef.current;
    pendingDirectionRef.current = null;
    if (pendingDirection) startCycle(pendingDirection);
  }, [startCycle, transition]);

  const cycle = useCallback((delta: number) => {
    const direction = delta > 0 ? 1 : -1;

    if (isTransitioningRef.current) {
      // Coalesce repeated input into one follow-up flip instead of repeatedly
      // remounting two SVG cards during the current animation.
      pendingDirectionRef.current = direction;
      return;
    }

    startCycle(direction);
  }, [startCycle]);

  const cycleNext = useCallback(() => cycle(1), [cycle]);
  const next = (active + 1) % CARDS.length;

  const beginSwipe = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (
      event.pointerType === "mouse" ||
      !event.isPrimary ||
      event.button !== 0 ||
      isTransitioningRef.current ||
      !window.matchMedia(MOBILE_CARD_QUERY).matches ||
      (event.target as Element).closest(".hd-card-next")
    ) {
      return;
    }

    swipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startedAt: event.timeStamp,
      axis: "pending",
    };
  }, []);

  const updateSwipe = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = swipeRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    if (gesture.axis !== "pending") return;

    const distanceX = Math.abs(event.clientX - gesture.startX);
    const distanceY = Math.abs(event.clientY - gesture.startY);
    if (Math.max(distanceX, distanceY) < SWIPE_AXIS_SLOP) return;

    if (distanceX > distanceY * 1.15) gesture.axis = "horizontal";
    if (distanceY > distanceX * 1.15) gesture.axis = "vertical";
  }, []);

  const endSwipe = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const gesture = swipeRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    swipeRef.current = null;
    const distanceX = event.clientX - gesture.startX;
    const distanceY = event.clientY - gesture.startY;
    const elapsed = Math.max(event.timeStamp - gesture.startedAt, 1);
    const isHorizontal =
      gesture.axis !== "vertical" &&
      Math.abs(distanceX) > Math.abs(distanceY) * 1.2;
    const clearsDistance = Math.abs(distanceX) >= SWIPE_DISTANCE;
    const clearsFlick =
      Math.abs(distanceX) >= SWIPE_FLICK_DISTANCE &&
      Math.abs(distanceX) / elapsed >= SWIPE_FLICK_VELOCITY;

    if (!isHorizontal || (!clearsDistance && !clearsFlick)) return;

    // A completed swipe still produces a synthetic click on some browsers.
    // Consume only that click so the card does not also navigate to its case
    // study after changing the visible project.
    suppressClickRef.current = true;
    if (suppressClickTimerRef.current !== null) {
      window.clearTimeout(suppressClickTimerRef.current);
    }
    suppressClickTimerRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
      suppressClickTimerRef.current = null;
    }, 400);

    cycle(distanceX < 0 ? 1 : -1);
  }, [cycle]);

  const cancelSwipe = useCallback(() => {
    swipeRef.current = null;
  }, []);

  const suppressSwipeClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (!suppressClickRef.current) return;

    event.preventDefault();
    event.stopPropagation();
    suppressClickRef.current = false;
    if (suppressClickTimerRef.current !== null) {
      window.clearTimeout(suppressClickTimerRef.current);
      suppressClickTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (transition && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finishTransition();
    }
  }, [finishTransition, transition]);

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;

    let isVisible = true;
    const syncMotion = () => {
      deck.classList.toggle("is-motion-paused", document.hidden || !isVisible);
    };
    const observer = typeof IntersectionObserver === "undefined"
      ? null
      : new IntersectionObserver(([entry]) => {
          isVisible = entry.isIntersecting;
          syncMotion();
        }, { rootMargin: "120px 0px" });

    observer?.observe(deck);
    document.addEventListener("visibilitychange", syncMotion);
    syncMotion();

    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", syncMotion);
    };
  }, []);

  useEffect(() => () => {
    if (suppressClickTimerRef.current !== null) {
      window.clearTimeout(suppressClickTimerRef.current);
    }
  }, []);

  return (
    <section
      ref={deckRef}
      className={`hero-diagram-deck${transition ? " is-transitioning" : ""}`}
      aria-label="Project logic diagrams"
    >
      <div
        className="hero-diagram-stack"
        onPointerDown={beginSwipe}
        onPointerMove={updateSwipe}
        onPointerUp={endSwipe}
        onPointerCancel={cancelSwipe}
        onClickCapture={suppressSwipeClick}
      >
        <span className="hero-card-sheet hero-card-sheet-1" aria-hidden="true" />
        <span className="hero-card-sheet hero-card-sheet-2" aria-hidden="true" />
        <span className="hero-card-sheet hero-card-sheet-3" aria-hidden="true" />
        <ActiveCard
          key={CARDS[next].target}
          card={CARDS[next]}
          direction={1}
          phase="preview"
          renderDiagram={false}
        />
        {backing && (
          <ActiveCard
            key={CARDS[backing.from].target}
            card={CARDS[backing.from]}
            direction={backing.direction}
            phase="behind"
            renderDiagram={false}
          />
        )}
        {transition && (
          <ActiveCard
            key={CARDS[transition.from].target}
            card={CARDS[transition.from]}
            direction={transition.direction}
            phase="leaving"
            onTransitionEnd={finishTransition}
          />
        )}
        <ActiveCard
          key={CARDS[active].target}
          card={CARDS[active]}
          direction={transition?.direction ?? 1}
          phase={transition ? "entering" : "resting"}
          onNext={cycleNext}
        />
      </div>
      <span className="hd-card-status" aria-live="polite">
        Showing {CARDS[active].name}
      </span>
    </section>
  );
};

export default HeroDiagram;
