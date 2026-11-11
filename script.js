document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const toggle = document.querySelector("#theme-toggle");

  function applyTheme(theme) {
    body.classList.toggle("imperial", theme === "imperial");
    toggle.querySelector("span").textContent = theme === "imperial"
      ? "Theme: Imperial Purple / Emerald"
      : "Theme: Emerald / Imperial Purple";
    toggle.setAttribute(
      "aria-label",
      theme === "imperial"
        ? "Switch to Emerald theme"
        : "Switch to Imperial Purple theme"
    );
    localStorage.setItem("theme", theme);
  }

  applyTheme(localStorage.getItem("theme") === "imperial" ? "imperial" : "emerald");
  toggle.addEventListener("click", () => {
    applyTheme(body.classList.contains("imperial") ? "emerald" : "imperial");
  });

  const filterButtons = document.querySelectorAll(".filter");
  const perspectiveButtons = document.querySelectorAll(".perspective-button");
  const projectGrid = document.querySelector(".project-grid");
  const projectCards = Array.from(document.querySelectorAll(".project-card"));
  const kpis = document.querySelectorAll(".kpi");
  const status = document.querySelector("#perspective-status");
  const architectureDialog = document.querySelector("#architecture-dialog");
  const architectureTitle = document.querySelector("#architecture-dialog-title");
  const architectureCategory = document.querySelector("#architecture-dialog-category");
  const architectureSummary = document.querySelector("#architecture-dialog-summary");
  const architectureBreakdown = document.querySelector("#architecture-dialog-breakdown");
  const architectureStack = document.querySelector("#architecture-dialog-stack");
  const architectureVerification = document.querySelector("#architecture-dialog-verification");
  const architectureActions = document.querySelector("#architecture-dialog-actions");
  const architectureClose = document.querySelector(".architecture-dialog-close");
  const architectureData = {
    "Industrial Energy SQL Pipeline": {
      category: "Data engineering · Public repository",
      summary: "End-to-end engineering project using synthetic facility telemetry for ingestion, PostgreSQL analytics, anomaly detection, and reporting.",
      breakdown: [
        "Generates approximately 6.3 million five-minute readings for a fictional network of industrial energy facilities.",
        "Loads CSV data in chunks into PostgreSQL 15 running in Docker, with conflict-safe inserts.",
        "Runs advanced SQL analysis and exports reports, with a FastAPI endpoint for anomaly and ranking data.",
        "Feeds an interactive Metabase dashboard from the local PostgreSQL warehouse."
      ],
      stack: ["Python 3.11", "PostgreSQL 15", "Docker", "psycopg2", "pandas / NumPy", "FastAPI"],
      verification: "pytest data-quality assertions plus PostgreSQL primary-key and ON CONFLICT checks.",
      links: {
        github: "https://github.com/miladgk/industrial-energy-sql-pipeline",
        live: "https://miladgk.github.io/industrial-energy-sql-pipeline/"
      }
    },
    "Amorphous Phase ML": {
      category: "Scientific ML · Public repository",
      summary: "Per-atom machine-learning workflow for distinguishing three amorphous Cu-Zr phases from atomistic simulation data.",
      breakdown: [
        "Processes raw LAMMPS molecular-dynamics trajectories through a post-processing pipeline.",
        "Extracts 18 structural descriptors per atom, including RDF, Voronoi, bond-order, stress, and energy features.",
        "Uses group-aware validation and HistGradientBoosting to produce per-atom phase labels.",
        "Applies explainability and physical post-processing to interpret phase predictions and interface behavior."
      ],
      stack: ["LAMMPS", "Python 3.10", "RDF / Voronoi", "HistGradientBoosting", "SHAP"],
      verification: "Holdout macro F1 of 0.854, group-aware splits, calibration, and explainability analysis.",
      links: {
        github: "https://github.com/miladgk/amorphous-phase-ml",
        live: "https://miladgk.github.io/amorphous-phase-ml/"
      }
    },
    "Aether Climate Engine": {
      category: "Data engineering · Public repository",
      summary: "Real-time meteorological telemetry platform combining anomaly detection, multi-model forecasting, warehouse modeling, and a field dashboard.",
      breakdown: [
        "Ingests global station data from Open-Meteo and AWS S3 through a Python telemetry pipeline.",
        "Routes clean and anomalous data through validation, a ±2σ detector, and a dead-letter queue.",
        "Builds PostgreSQL raw, dbt staging/fact/mart, and Airflow-orchestrated warehouse layers.",
        "Delivers linear, SMA, and EMA forecasts with 365-day year-over-year comparisons in the field dashboard."
      ],
      stack: ["Airflow 2.8.1", "dbt Core", "PostgreSQL 15", "AWS S3", "Terraform", "Forecasting"],
      verification: "pytest mocks, Bandit AST security scanning, dbt tests, and an explicit GitHub Actions CI workflow.",
      links: {
        github: "https://github.com/miladgk/aether-climate-engine",
        live: "https://miladgk.github.io/aether-climate-engine/"
      }
    },
    "Airflow Academy": {
      category: "Product engineering · Private R&D",
      summary: "Browser-based DAG learning and execution platform with validation, isolated runtimes, and streamed logs.",
      breakdown: [
        "Provides a Next.js lesson interface and Monaco-based DAG editor.",
        "Sends authored DAGs to a FastAPI execution API for AST validation.",
        "Runs validated code in concurrency-controlled Docker sandboxes with Airflow 2.8.1.",
        "Streams execution output back to the interface through Server-Sent Events."
      ],
      stack: ["Next.js", "FastAPI", "Docker", "Airflow 2.8.1", "AST validation", "SSE"],
      verification: "Custom AST validators, execution timeouts, concurrency controls, and isolated sandbox boundaries."
    },
    "Smileprint": {
      category: "Compliance platform · Private R&D",
      summary: "Compliance and sustainability platform for structured clinic data, audit history, insights, ESG calculations, and PDF reporting.",
      breakdown: [
        "Accepts clinic entry and CSV import through a FastAPI service.",
        "Persists records in PostgreSQL with an append-only revision ledger.",
        "Runs compliance insight rules, ESG calculations, and anomaly checks over retained revisions.",
        "Exposes a React frontend for compliance insights, ESG calculations, and report workflows."
      ],
      stack: ["FastAPI", "PostgreSQL", "React", "Docker", "Audit ledger"],
      verification: "Append-only audit history, retained revisions, compliance insight rules, and report lineage."
    },
    "Verified FEM Workbench": {
      category: "Computational mechanics · Private R&D",
      summary: "Solver-neutral finite-element workflow centered on review gates, analytical references, and cross-solver comparison.",
      breakdown: [
        "Converts text, GUI, or YAML inputs into a validated solver-neutral model specification.",
        "Requires a review and approval gate before mesh and solver execution.",
        "Generates shared Gmsh meshes for Code_Aster and CalculiX comparison.",
        "Checks global equilibrium, analytical references, and node-by-node results."
      ],
      stack: ["Gmsh", "Code_Aster", "CalculiX", "FEniCSx", "Physics checks"],
      verification: "Verified benchmark cases, analytical references, equilibrium checks, and cross-solver nodal comparison."
    },
    "Parallel Anatomy FEA": {
      category: "HPC simulation · Private R&D",
      summary: "Parallel computational-mechanics pipeline for anatomy/CAD import, robust meshing, simulation, and scientific result export.",
      breakdown: [
        "Imports STEP/STL anatomy or CAD geometry and performs healing and classification.",
        "Generates Gmsh meshes with physical groups and mesh sizing controls.",
        "Runs DOLFINx/UFL models with PETSc and MPI across parameterized cases.",
        "Exports visualization-ready HDF5/XDMF displacement and stress fields."
      ],
      stack: ["Gmsh", "DOLFINx", "UFL", "PETSc", "MPI", "HDF5 / XDMF"],
      verification: "MPI simulation cases, structured scientific result export, and visualization-ready HDF5/XDMF outputs."
    },
    "Quantum ESPRESSO Advisor": {
      category: "Electronic structure · Private R&D",
      summary: "Evidence-backed input/log advisor for reproducible Quantum ESPRESSO correctness and performance analysis.",
      breakdown: [
        "Parses Quantum ESPRESSO inputs and logs into structured analysis records.",
        "Uses ledger rules to connect observed cases with constrained recommendations.",
        "Runs reproducible k-point, hybrid-functional, relaxation, and ensemble benchmark sweeps.",
        "Reports supported, unsupported, and unverified regimes explicitly."
      ],
      stack: ["Fortran", "Python", "Quantum ESPRESSO", "HPC", "Docker"],
      verification: "Benchmark families, an evidence ledger, reproducible sweeps, and explicit evidence-path reporting."
    },
    "Tessera": {
      category: "Mobile product engineering · Private R&D",
      summary: "Kotlin Android application combining Voronoi geometry gameplay with cloud services, local persistence, and privacy controls.",
      breakdown: [
        "Builds geometry-based puzzle gameplay around a Voronoi engine.",
        "Uses Firebase Auth, Firestore, Crashlytics, App Check, Analytics, and Remote Config.",
        "Persists preferences, progress, and puzzle data with Room.",
        "Connects daily puzzles, competition repositories, billing, and consent controls."
      ],
      stack: ["Kotlin", "Firebase", "Room", "Voronoi", "Privacy controls"],
      verification: "Authentication, local persistence, consent controls, and repository-level puzzle flows."
    }
  };
  const perspectiveConfig = {
    all: {
      categories: ["all"],
      order: ["data", "ml", "science", "product"],
      message: "A complete view across data platforms, scientific ML, and computational systems."
    },
    engineering: {
      categories: ["data", "ml", "product"],
      order: ["data", "ml", "product"],
      message: "For data and ML engineering: pipelines, quality, analytics, and deployable intelligence."
    },
    physics: {
      categories: ["science", "ml"],
      order: ["science", "ml"],
      message: "For computational physics and HPC: atomistic modeling, scientific ML, and verified simulation."
    }
  };
  let currentFilter = "all";
  let currentPerspective = "all";

  function setKpiEmphasis(perspective) {
    kpis.forEach(kpi => {
      const relevant = perspective === "all" ||
        kpi.dataset.perspectives.split(" ").includes(perspective);
      kpi.classList.toggle("is-dim", !relevant);
      kpi.classList.toggle("is-focus", relevant && perspective !== "all");
    });
  }

  function renderProjects() {
    const config = perspectiveConfig[currentPerspective];
    const allowed = currentPerspective === "all" && currentFilter !== "all"
      ? [currentFilter]
      : config.categories;
    const visible = projectCards.filter(card =>
      allowed.includes("all") || allowed.includes(card.dataset.category)
    ).filter(card =>
      currentPerspective !== "all" && currentFilter !== "all"
        ? card.dataset.category === currentFilter
        : true
    );
    const order = currentPerspective === "all" && currentFilter !== "all"
      ? [currentFilter]
      : config.order;

    projectCards.forEach(card => card.classList.toggle("hidden", !visible.includes(card)));
    visible
      .sort((a, b) => order.indexOf(a.dataset.category) - order.indexOf(b.dataset.category))
      .forEach(card => projectGrid.appendChild(card));
  }

  function setPerspective(perspective) {
    currentPerspective = perspective;
    currentFilter = "all";
    perspectiveButtons.forEach(button => {
      const active = button.dataset.perspective === perspective;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    filterButtons.forEach(button => {
      button.classList.toggle("active", button.dataset.filter === "all");
    });
    status.textContent = perspectiveConfig[perspective].message;
    setKpiEmphasis(perspective);
    renderProjects();
  }

  perspectiveButtons.forEach(button => {
    button.addEventListener("click", () => setPerspective(button.dataset.perspective));
  });

  filterButtons.forEach(button => {
    button.addEventListener("click", () => {
      const category = button.dataset.filter;
      if (!["all", "data", "ml", "science", "product"].includes(category)) return;
      currentFilter = category;
      currentPerspective = "all";
      filterButtons.forEach(item => item.classList.toggle("active", item === button));
      perspectiveButtons.forEach(item => {
        const active = item.dataset.perspective === "all";
        item.classList.toggle("active", active);
        item.setAttribute("aria-pressed", String(active));
      });
      status.textContent = perspectiveConfig.all.message;
      setKpiEmphasis("all");
      renderProjects();
    });
  });

  function addActionLink(container, label, href) {
    const link = document.createElement("a");
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    container.appendChild(link);
  }

  function openArchitecture(title) {
    const project = architectureData[title];
    if (!project) return;
    architectureTitle.textContent = title;
    architectureCategory.textContent = project.category;
    architectureSummary.textContent = project.summary;
    architectureBreakdown.replaceChildren();
    project.breakdown.forEach(item => {
      const listItem = document.createElement("li");
      listItem.textContent = item;
      architectureBreakdown.appendChild(listItem);
    });
    architectureStack.replaceChildren();
    project.stack.forEach(item => {
      const stackItem = document.createElement("span");
      stackItem.textContent = item;
      architectureStack.appendChild(stackItem);
    });
    architectureVerification.textContent = project.verification;
    architectureActions.replaceChildren();
    if (project.links?.github) addActionLink(architectureActions, "View GitHub repository ↗", project.links.github);
    if (project.links?.live) addActionLink(architectureActions, "Open live demo ↗", project.links.live);
    if (project.links?.doi) addActionLink(architectureActions, "View associated DOI ↗", project.links.doi);
    architectureDialog.showModal();
    requestAnimationFrame(() => architectureDialog.classList.add("is-open"));
  }

  let architectureCloseTimer;
  let lastArchitectureTrigger;
  function closeArchitecture() {
    if (!architectureDialog.open) return;
    architectureDialog.classList.remove("is-open");
    window.clearTimeout(architectureCloseTimer);
    architectureCloseTimer = window.setTimeout(() => architectureDialog.close(), 180);
  }

  projectCards.forEach(card => {
    const title = card.querySelector("h3")?.textContent.trim();
    if (!title || !architectureData[title]) return;
    const action = document.createElement("button");
    action.className = "inspect-architecture";
    action.type = "button";
    action.dataset.project = title;
    action.setAttribute("aria-haspopup", "dialog");
    action.textContent = "Inspect Architecture & Specs →";
    action.addEventListener("click", () => {
      lastArchitectureTrigger = action;
      openArchitecture(title);
    });
    let links = card.querySelector(".card-links");
    if (!links) {
      links = document.createElement("div");
      links.className = "card-links";
      card.appendChild(links);
    }
    links.appendChild(action);
  });

  architectureClose.addEventListener("click", closeArchitecture);
  architectureDialog.addEventListener("cancel", event => {
    event.preventDefault();
    closeArchitecture();
  });
  architectureDialog.addEventListener("click", event => {
    if (event.target === architectureDialog) closeArchitecture();
  });
  architectureDialog.addEventListener("close", () => {
    architectureDialog.classList.remove("is-open");
    lastArchitectureTrigger?.focus();
  });

  setPerspective("all");

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!reduceMotion && finePointer) {
    const spotlightTargets = document.querySelectorAll(".kpi-grid, .kpi, .project-card");
    const pendingPointers = new Map();
    let spotlightFrame = 0;

    function updateSpotlights() {
      pendingPointers.forEach((point, target) => {
        const rect = target.getBoundingClientRect();
        target.style.setProperty("--mouse-x", `${point.x - rect.left}px`);
        target.style.setProperty("--mouse-y", `${point.y - rect.top}px`);
      });
      spotlightFrame = 0;
    }

    spotlightTargets.forEach(target => {
      target.addEventListener("mousemove", event => {
        pendingPointers.set(target, { x: event.clientX, y: event.clientY });
        if (!spotlightFrame) spotlightFrame = requestAnimationFrame(updateSpotlights);
      });
      target.addEventListener("mouseleave", () => {
        pendingPointers.delete(target);
        target.style.removeProperty("--mouse-x");
        target.style.removeProperty("--mouse-y");
      });
    });
  }

  if (window.mermaid) {
    mermaid.initialize({ startOnLoad: true, theme: "dark", securityLevel: "loose" });
  }

  const canvas = document.querySelector("#network-canvas");
  const ctx = canvas.getContext("2d");
  let nodes = [];
  let packets = [];
  let mouse = { x: -1000, y: -1000 };

  function resize() {
    const dpr = devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    nodes = Array.from({ length: 34 }, (_, i) => ({
      x: 35 + Math.random() * (rect.width - 70),
      y: 65 + Math.random() * (rect.height - 120),
      r: Math.random() * 2.5 + 1,
      phase: Math.random() * 7,
      group: i % 3
    }));
  }

  function spawn() {
    if (nodes.length) {
      packets.push({
        a: Math.floor(Math.random() * nodes.length),
        b: Math.floor(Math.random() * nodes.length),
        t: 0
      });
    }
  }

  function draw(time) {
    const imperial = document.body.classList.contains("imperial");
    const palette = imperial
      ? { node: "#66023C", secondary: "#b28cff", packet: "#6f174f" }
      : { node: "#65e1bd", secondary: "#a994ff", packet: "#f4bd73" };
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.lineWidth = 1;
    nodes.forEach((a, i) => nodes.slice(i + 1).forEach(b => {
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      if (distance < 145) {
        ctx.strokeStyle = imperial
          ? `rgba(102,2,60,${(1 - distance / 145) * .58})`
          : `rgba(101,225,189,${(1 - distance / 145) * .25})`;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }));
    nodes.forEach(node => {
      const near = Math.max(0, 1 - Math.hypot(node.x - mouse.x, node.y - mouse.y) / 150);
      const pulse = (Math.sin(time / 500 + node.phase) + 1) * .5;
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.r + near * 4 + pulse, 0, Math.PI * 2);
      ctx.fillStyle = node.group === 1 ? palette.secondary : palette.node;
      ctx.globalAlpha = .35 + near * .65;
      ctx.shadowBlur = near * 18;
      ctx.shadowColor = ctx.fillStyle;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    packets.forEach(packet => {
      packet.t += .008;
      const a = nodes[packet.a];
      const b = nodes[packet.b];
      if (!a || !b) return;
      ctx.beginPath();
      ctx.arc(
        a.x + (b.x - a.x) * packet.t,
        a.y + (b.y - a.y) * packet.t,
        2.4,
        0,
        Math.PI * 2
      );
      ctx.fillStyle = palette.packet;
      ctx.shadowBlur = 12;
      ctx.shadowColor = palette.packet;
      ctx.fill();
      ctx.shadowBlur = 0;
    });
    packets = packets.filter(packet => packet.t < 1);
    if (Math.random() < .035) spawn();
    requestAnimationFrame(draw);
  }

  canvas.addEventListener("pointermove", event => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });
  canvas.addEventListener("pointerleave", () => {
    mouse = { x: -1000, y: -1000 };
  });
  window.addEventListener("resize", resize);
  resize();
  for (let i = 0; i < 8; i++) spawn();
  requestAnimationFrame(draw);
});
