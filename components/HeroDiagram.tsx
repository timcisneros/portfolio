import React from "react";

// An abstract BPMN 2.0 process for how I build software — synthesized from the
// whole body of work, using real notation rather than a decorative shape. It is
// drawn inside a pool with two swimlanes so the structure fills its space:
//
//   Lane "System" (automated pipeline):
//     ● start → Observe → Automate → ◇ Verify → Record → ◉ end
//   Lane "Human" (review):
//     the Verify "no" branch drops across the lane boundary to Triage, then
//     Learn, then Harden, which reworks the run back into Automate — which
//     reruns against the (now strengthened) Authority it operates under.
//
// The lane boundary is the point: automation runs in the System lane, anything
// unverified crosses to a human in the Human lane, then returns. A folded-corner
// data object ("Evidence") and a bracketed annotation ("finished & verified?")
// attach via dotted associations. Sequence flows have no arrowheads — direction
// reads from the dash animation. Pure CSS; motion off under
// prefers-reduced-motion (see globals.css).

const TASKS = [
  { x: 110, y: 80, w: 84, cx: 152, label: "Observe", delay: 0.1 },
  { x: 232, y: 80, w: 104, cx: 284, label: "Automate", delay: 0.24 },
  { x: 452, y: 80, w: 88, cx: 496, label: "Record", delay: 0.5 },
  { x: 346, y: 294, w: 100, cx: 396, label: "Triage", delay: 0.64 },
  { x: 196, y: 294, w: 104, cx: 248, label: "Learn", delay: 0.76 },
  { x: 62, y: 294, w: 100, cx: 112, label: "Harden", delay: 0.88 },
];

const FLOWS = [
  { d: "M83,100 H110", delay: 0 }, // start → Observe
  { d: "M194,100 H232", delay: 0.12 }, // Observe → Automate
  { d: "M336,100 H372", delay: 0.24 }, // Automate → Verify
  { d: "M420,100 H452", delay: 0.36 }, // Verify → Record (yes)
  { d: "M540,100 H559", delay: 0.48 }, // Record → end
  { d: "M396,124 V294", delay: 0.6 }, // Verify → Triage (no)
  { d: "M346,314 H300", delay: 0.72 }, // Triage → Learn
  { d: "M196,314 H162", delay: 0.84 }, // Learn → Harden
  { d: "M140,294 C180,236 258,176 284,120", delay: 0.96 }, // Harden → Automate (rework)
];

const HeroDiagram = () => (
  <div className="hero-diagram" aria-hidden="true">
    <svg
      className="hd-svg"
      viewBox="0 0 600 410"
      fill="none"
      role="img"
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
        Bounded execution
      </text>
      <text
        className="hd-lane-label"
        x="37"
        y="114"
        transform="rotate(-90 37 110)"
      >
        System
      </text>
      <text
        className="hd-lane-label"
        x="37"
        y="318"
        transform="rotate(-90 37 314)"
      >
        Human
      </text>

      {/* Associations (dotted) — attach the artifacts. */}
      <path className="hd-assoc" d="M284,70 L284,80" />
      <path className="hd-assoc" d="M496,120 L496,145" />
      <path className="hd-assoc" d="M396,76 L396,58" />

      {/* Sequence flows. */}
      {FLOWS.map((flow) => (
        <path
          key={flow.d}
          className="hd-flow"
          d={flow.d}
          style={{ animationDelay: `${flow.delay}s` }}
        />
      ))}

      {/* Text annotation on the gateway (BPMN artifact). */}
      <text className="hd-cond hd-annot-text" x="398" y="52">
        finished & verified?
      </text>

      {/* Data object (input) — Automate runs against an explicit authority. */}
      <g className="hd-node" style={{ animationDelay: "0.18s" }}>
        <text className="hd-cond hd-data-label" x="284" y="19">
          Authority
        </text>
        <path className="hd-data" d="M262,27 H296 L306,37 V71 H262 Z" />
        <path className="hd-data" d="M296,27 V37 H306" />
      </g>

      {/* Data object (output) — the audit record. */}
      <g className="hd-node" style={{ animationDelay: "0.58s" }}>
        <path className="hd-data" d="M474,145 H508 L518,155 V193 H474 Z" />
        <path className="hd-data" d="M508,145 V155 H518" />
        <text className="hd-cond hd-data-label" x="496" y="207">
          Evidence
        </text>
      </g>

      {/* Start event — thin circle. */}
      <g className="hd-node" style={{ animationDelay: "0s" }}>
        <circle className="hd-event" cx="70" cy="100" r="13" />
      </g>

      {TASKS.map((task) => (
        <g
          key={task.label}
          className="hd-node"
          style={{ animationDelay: `${task.delay}s` }}
        >
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
        </g>
      ))}

      {/* Verify — exclusive gateway. */}
      <g className="hd-node" style={{ animationDelay: "0.38s" }}>
        <polygon
          className="hd-gateway"
          points="396,76 420,100 396,124 372,100"
        />
        <path className="hd-gateway-mark" d="M390,94 L402,106" />
        <path className="hd-gateway-mark" d="M402,94 L390,106" />
      </g>

      {/* End event — thick circle. */}
      <g className="hd-node" style={{ animationDelay: "0.52s" }}>
        <circle className="hd-event hd-event-end" cx="572" cy="100" r="13" />
      </g>

      {/* Branch condition labels — drawn last so nothing clips them. */}
      <text className="hd-cond" x="436" y="91">
        yes
      </text>
      <text className="hd-cond" x="410" y="205">
        no
      </text>
    </svg>
  </div>
);

export default HeroDiagram;
