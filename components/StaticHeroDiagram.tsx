const StaticHeroDiagram = () => (
  <section className="hero-diagram-deck" aria-label="Project logic diagrams">
    <div className="hero-diagram-stack">
      <span className="hero-card-sheet hero-card-sheet-1" aria-hidden="true" />
      <span className="hero-card-sheet hero-card-sheet-2" aria-hidden="true" />
      <span className="hero-card-sheet hero-card-sheet-3" aria-hidden="true" />
      <article className="hero-diagram hero-diagram--preview-next" aria-hidden="true">
        <a className="hd-card-project-link" tabIndex={-1}>
          <header className="hd-card-header">
            <h2>Self-Hosted YouTube</h2>
          </header>
          <p className="hd-card-summary">
            A self-hosted server stands between the browser and Google.
          </p>
        </a>
      </article>
      <article className="hero-diagram is-active hero-diagram--resting-next">
        <a
          href="#project-dsdebug"
          className="hd-card-project-link"
          aria-label="Read about DSDebug"
        >
          <header className="hd-card-header">
            <h2>DSDebug</h2>
          </header>
          <p className="hd-card-summary">
            Dense workflow JSON becomes a graph you can trace and edit.
          </p>
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
              Client pipeline
            </text>
            <text className="hd-lane-label" x="25" y="318" transform="rotate(-90 25 314)">
              Workbench
            </text>
            <path
              className="hd-assoc"
              d="M121,154 C124,140 132,128 142,122 M480,284 V122 M358,284 V122 M244,284 V122"
            />
            <g className="hd-flow-group">
              <path
                className="hd-flow"
                d="M85,102 H104 M180,102 H198 M290,102 H308 M408,102 H434 M526,102 H539"
              />
            </g>
            <path className="hd-data" d="M102,154 h30 l9,9 v36 h-39 z" />
            <path className="hd-data" d="M132,154 v9 h9" />
            <text className="hd-cond hd-data-label" x="121" y="212">
              upload / template
            </text>
            <circle className="hd-event" cx="72" cy="102" r="13" />
            <rect className="hd-task" x="104" y="82" width="76" height="40" rx="9" />
            <text className="hd-label" x="142" y="106">Load</text>
            <rect className="hd-task" x="198" y="82" width="92" height="40" rx="9" />
            <text className="hd-label" x="244" y="106">Parse JSON</text>
            <rect className="hd-task" x="308" y="82" width="100" height="40" rx="9" />
            <text className="hd-label" x="358" y="106">Render graph</text>
            <rect className="hd-task" x="434" y="82" width="92" height="40" rx="9" />
            <text className="hd-label" x="480" y="106">Manage vars</text>
            <circle className="hd-event hd-event-end" cx="552" cy="102" r="13" />
            <rect className="hd-task" x="436" y="284" width="88" height="40" rx="9" />
            <text className="hd-label" x="480" y="308">Variables</text>
            <rect className="hd-task" x="311" y="284" width="94" height="40" rx="9" />
            <text className="hd-label" x="358" y="308">Edit canvas</text>
            <rect className="hd-task" x="203" y="284" width="82" height="40" rx="9" />
            <text className="hd-label" x="244" y="308">Console</text>
          </svg>
        </a>
        <span className="hd-card-next" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </article>
    </div>
    <span className="hd-card-status" aria-live="polite">
      Showing DSDebug
    </span>
  </section>
);

export default StaticHeroDiagram;
