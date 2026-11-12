document.addEventListener("DOMContentLoaded", () => {
  let syncRagProjectContext = null;
  let currentRagContext = "General Profile";

  const THEMES = ["lab", "midnight"];
  const themePickerBtns = document.querySelectorAll(".theme-picker-btn");
  let currentTheme = "lab";

  // Single source of truth for the reduced-motion preference (it can change while the page is open)
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const prefersReducedMotion = () => reducedMotionQuery.matches;
  const scrollBehavior = () => (prefersReducedMotion() ? "auto" : "smooth");

  // Keys typed into form fields, media controls or editable content must keep their native meaning
  function isTypingOrMediaTarget(el) {
    if (!el || !(el instanceof Element)) return false;
    if (el.isContentEditable) return true;
    return Boolean(el.closest("input, textarea, select, video, audio, [contenteditable='true']"));
  }

  // Make a non-button element operable like a button (Enter / Space)
  function makeKeyboardActivatable(el, label) {
    if (!el.hasAttribute("role")) el.setAttribute("role", "button");
    if (!el.hasAttribute("tabindex")) el.tabIndex = 0;
    if (label && !el.hasAttribute("aria-label")) el.setAttribute("aria-label", label);
    el.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        el.click();
      }
    });
  }

  // SMIL animations (<animateMotion> in the schematics) ignore CSS, so pause them explicitly
  function syncSvgMotion(root = document) {
    root.querySelectorAll("svg").forEach(svg => {
      if (typeof svg.pauseAnimations !== "function") return;
      if (!svg.querySelector("animate, animateMotion, animateTransform, set")) return;
      if (prefersReducedMotion()) {
        svg.pauseAnimations();
        svg.setCurrentTime(0);
      } else {
        svg.unpauseAnimations();
      }
    });
  }

  function getSavedTheme() {
    try {
      const saved = localStorage.getItem("portfolio_theme");
      if (saved && THEMES.includes(saved)) return saved;
    } catch (e) {
      console.warn("localStorage unavailable", e);
    }
    return "lab";
  }

  function saveTheme(theme) {
    try {
      localStorage.setItem("portfolio_theme", theme);
    } catch (e) {
      console.warn("Could not save theme", e);
    }
  }

  function updateThemeUI(theme) {
    themePickerBtns.forEach(btn => {
      const isActive = btn.dataset.themeId === theme;
      btn.setAttribute("aria-pressed", String(isActive));
    });
  }

  // Mermaid is only needed for the stage Flowchart tab, so it is loaded on first use
  // instead of blocking page scripts. Version is pinned and checked with SRI.
  const MERMAID_SRC = "https://cdn.jsdelivr.net/npm/mermaid@11.17.2/dist/mermaid.min.js";
  const MERMAID_SRI = "sha384-EOXBFmc3gx5mb+vn0vPvvGqACToJD24hhacX5Yx+8NUUQrHIle/Qi5Bg9o3zKwW2";
  const MERMAID_THEMES = {
    lab: {
      theme: "dark",
      themeVariables: {
        darkMode: true,
        background: "#121417",
        primaryColor: "#181B20",
        primaryBorderColor: "#B6F36A",
        primaryTextColor: "#F0F0EC",
        lineColor: "#B6F36A",
        edgeLabelBackground: "#181B20",
        fontFamily: "Space Grotesk, sans-serif"
      }
    },
    midnight: {
      theme: "dark",
      themeVariables: {
        darkMode: true,
        background: "#111827",
        primaryColor: "#1e293b",
        primaryBorderColor: "#818cf8",
        primaryTextColor: "#f1f5f9",
        lineColor: "#818cf8",
        edgeLabelBackground: "#1e293b",
        fontFamily: "Inter, sans-serif"
      }
    }
  };
  let mermaidLoadPromise = null;

  function loadMermaid() {
    if (window.mermaid) return Promise.resolve(window.mermaid);
    if (!mermaidLoadPromise) {
      mermaidLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = MERMAID_SRC;
        script.integrity = MERMAID_SRI;
        script.crossOrigin = "anonymous";
        script.async = true;
        script.onload = () => window.mermaid ? resolve(window.mermaid) : reject(new Error("Mermaid global missing"));
        script.onerror = () => {
          script.remove();
          mermaidLoadPromise = null; // allow a retry on the next Flowchart open
          reject(new Error("Mermaid failed to load"));
        };
        document.head.appendChild(script);
      });
    }
    return mermaidLoadPromise;
  }

  function configureMermaid(theme) {
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      ...(MERMAID_THEMES[theme] || MERMAID_THEMES.lab)
    });
  }

  // Re-render the stage flowchart in the new theme, only if Mermaid is already in use
  function reRenderMermaid() {
    if (window.mermaid && stageMode === "flowchart") updateStageMermaid();
  }

  function applyTheme(newTheme, isInitial = false) {
    if (!THEMES.includes(newTheme)) return;

    const performUpdate = () => {
      document.documentElement.setAttribute("data-theme", newTheme);
      currentTheme = newTheme;
      updateThemeUI(newTheme);
      if (!isInitial) saveTheme(newTheme);
      reRenderMermaid();
      if (window.themeCanvasUpdate) window.themeCanvasUpdate(newTheme);
    };

    if (
      !isInitial &&
      document.startViewTransition &&
      !prefersReducedMotion()
    ) {
      document.startViewTransition(performUpdate);
    } else {
      performUpdate();
    }
  }

  themePickerBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetTheme = btn.dataset.themeId;
      if (targetTheme && targetTheme !== currentTheme) {
        applyTheme(targetTheme);
      }
    });
  });

  // ------------------------------------------------------------------------
  // Filters, Perspectives & Project Data
  // ------------------------------------------------------------------------
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
      summary: "End-to-end data engineering and analytics solution for industrial telemetry from 20 energy facilities and Fingrid national grid metrics.",
      breakdown: [
        "Generates and processes 5-minute interval time-series telemetry across 20 facilities in Scandinavia with Fingrid TSO grid synchronization.",
        "Loads data in chunks into PostgreSQL 15 running in Docker with range partitioning and conflict-safe inserts.",
        "Runs automated data quality gates and SQL analytics reporting with z-score anomaly scoring.",
        "Serves REST API endpoints on Render cloud and orchestrates local Metabase business intelligence."
      ],
      stack: ["Python 3.11", "PostgreSQL 15", "Docker", "FastAPI", "Metabase", "pytest"],
      verification: "pytest data-quality assertions, 13 range partitions, and automated post-ingest validation gates.",
      mermaid: "flowchart LR\nA[Telemetry] --> B[CSV lake] --> C[Ingestion] --> D[(PostgreSQL)]\nD --> E[Quality] & F[SQL analytics] --> G[Anomaly detection]\nF --> H[Metabase]",
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
      verification: "Spatial holdout macro F1 of 0.733 (Cu64Zr36 F1 0.970), group-aware splits, calibration, and explainability analysis.",
      mermaid: "flowchart LR\nA[LAMMPS] --> B[Descriptors] --> C[Validation] --> D[Group split]\nD --> E[Classifier] --> F[3 phase predictions]\nE --> G[Explainability]",
      links: {
        github: "https://github.com/miladgk/amorphous-phase-ml",
        live: "https://miladgk.github.io/amorphous-phase-ml/"
      }
    },
    "Aether Climate Engine": {
      category: "Data engineering · Public repository",
      summary: "Real-time meteorological telemetry platform combining anomaly detection, multi-model forecasting, warehouse modeling, and a field dashboard.",
      breakdown: [
        "Ingests atmospheric telemetry across 5 global stations from Open-Meteo APIs.",
        "Routes clean and anomalous data through validation contracts, a ±2σ detector, and a dead-letter queue (DLQ).",
        "Builds PostgreSQL raw, dbt staging/fact/mart, and Airflow-orchestrated warehouse layers.",
        "Delivers linear, SMA, and EMA forecasts with 365-day year-over-year comparisons in the field dashboard."
      ],
      stack: ["Airflow 2.8.1", "dbt Core", "PostgreSQL 15", "AWS S3", "Terraform", "Forecasting"],
      verification: "pytest mocks, Bandit AST security scanning, dbt tests, and an explicit GitHub Actions CI workflow.",
      mermaid: "flowchart LR\nA[Open-Meteo / S3] --> B[Ingestion] --> C[(PostgreSQL)] --> D[dbt marts]\nD --> E[Anomaly] & F[Forecasting] --> G[Dashboard]\nH[Airflow] --> B",
      links: {
        github: "https://github.com/miladgk/aether-climate-engine",
        live: "https://miladgk.github.io/aether-climate-engine/"
      }
    },
    "Airflow Academy": {
      category: "Product engineering · Private R&D",
      summary: "Browser-based DAG learning and execution platform with validation, isolated runtimes, and streamed logs.",
      breakdown: [
        "Provides an in-browser Monaco code editor for authoring Apache Airflow DAGs.",
        "Runs real-time Abstract Syntax Tree (AST) validation against 127 validators across 16 curriculum chapters with 189 lessons.",
        "Executes student DAGs in ephemeral Docker sandbox containers with concurrency throttling.",
        "Streams stdout/stderr execution output back to the interface in real time via Server-Sent Events (SSE)."
      ],
      stack: ["Next.js", "FastAPI", "Docker", "Airflow 2.8.1", "AST validation", "SSE"],
      verification: "270 automated unit tests passing, AST pre-flight code grading, and isolated container boundaries.",
      mermaid: "flowchart LR\nA[Monaco] --> B[FastAPI] --> C[AST validation] --> D[Docker sandbox]\nD --> E[Airflow 2.8.1] --> F[SSE logs]"
    },
    "Smileprint": {
      category: "Compliance platform · Private R&D",
      summary: "Compliance and sustainability platform for structured clinic data, audit history, insights, ESG calculations, and PDF reporting.",
      breakdown: [
        "Provides specialized hazardous and clinical waste documentation under Finnish Waste Act (Jätelaki 646/2011) and EU Mercury Regulation.",
        "Enforces append-only revision ledger via PostgreSQL immutability triggers rejecting UPDATE, DELETE, and TRUNCATE.",
        "Runs automated compliance insight engine flagging z-score waste anomalies and separator service events.",
        "Generates monthly ESG and compliance PDF reports with SHA-256 cryptographic integrity hashes."
      ],
      stack: ["FastAPI", "PostgreSQL", "React", "Docker", "Audit ledger"],
      verification: "38 schema migrations, append-only immutability triggers, and SHA-256 hashed audit records.",
      mermaid: "flowchart LR\nA[Clinic data] --> B[FastAPI] --> C[(PostgreSQL)]\nC --> D[Audit ledger] & E[Insights] & F[ESG / PDF]\nB --> G[React frontend]"
    },
    "Verified FEM Workbench": {
      category: "Computational mechanics · Private R&D",
      summary: "Solver-neutral finite-element workflow centered on review gates, analytical references, and cross-solver comparison.",
      breakdown: [
        "Unifies solid CAD geometry, Gmsh meshing, and boundary conditions into a single solver-neutral JSON model.",
        "Enforces non-bypassable review gate and 71-rule physical validation engine before execution.",
        "Solves identical tetrahedral meshes across Code_Aster, CalculiX, and FEniCSx backends.",
        "Performs node-by-node field comparison with consistent nodal load integration verified to 10^-10 N."
      ],
      stack: ["Gmsh", "Code_Aster", "CalculiX", "FEniCSx", "Physics checks"],
      verification: "71-rule physical validation engine, 11 benchmark verification suites, and 810 automated tests.",
      mermaid: "flowchart LR\nA[Model] --> B[Review gate] --> C[Gmsh mesh]\nC --> D[Code_Aster] & E[CalculiX] & G[FEniCSx] --> F[Physics checks]"
    },
    "Quantum ESPRESSO Advisor": {
      category: "Electronic structure · Private R&D",
      summary: "Evidence-backed input/log advisor for reproducible Quantum ESPRESSO correctness and performance analysis.",
      breakdown: [
        "Parses Quantum ESPRESSO namelists and logs into structured diagnostic analysis records.",
        "Delivers verified Fortran patch (update_pot.f90) for charge density extrapolation bug with multiple k-point pools.",
        "Runs sub-second dynamic k-point probing and Amdahl exact-exchange runtime projections.",
        "Grounds all recommendations in mathematical evidence ledger verifying 47 empirical claims across 5 material families."
      ],
      stack: ["Fortran", "Python", "Quantum ESPRESSO", "HPC", "Docker"],
      verification: "47/47 verified mathematical claims in ledger.json, Fortran reproduction package, and empirical cluster benchmarks.",
      mermaid: "flowchart LR\nA[QE input / log] --> B[Parser] --> C[Ledger rules]\nC --> D[Advisor report]\nE[Benchmark sweeps] --> C"
    },
    "Tessera": {
      category: "Mobile product engineering · Private R&D",
      summary: "Kotlin Android application combining Voronoi geometry gameplay with cloud services, local persistence, and privacy controls.",
      breakdown: [
        "Native Android puzzle game in Kotlin and Jetpack Compose built on discrete Voronoi spatial partitioning.",
        "Calculates territorial grid regions under Manhattan and Euclidean distance metrics with deterministic tie-breaking.",
        "Includes 400 precomputed puzzle levels across 4 difficulty tiers persisted in Room database.",
        "Generates deterministic daily puzzles from SHA-256 date seeds with optional Gemini 1.5 Flash critiques."
      ],
      stack: ["Kotlin", "Firebase", "Room", "Voronoi", "Privacy controls"],
      verification: "400 precomputed levels in Room DB, deterministic SHA-256 generator, and discrete Voronoi engine.",
      mermaid: "flowchart LR\nA[Android UI] --> B[Voronoi engine] --> C[Room]\nB --> D[Firestore] --> E[Firebase services]\nF[Auth / consent] --> A"
    }
  };

  const perspectiveConfig = {
    all: {
      categories: ["all"],
      message: "A complete view across data platforms, scientific ML, and computational systems."
    },
    engineering: {
      categories: ["data", "ml", "product"],
      message: "For data and ML engineering: pipelines, quality, analytics, and deployable intelligence."
    },
    physics: {
      categories: ["science", "ml"],
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
    projectCards.forEach(card => card.classList.toggle("hidden", !visible.includes(card)));
    visible
      .sort((a, b) => parseInt(a.dataset.index, 10) - parseInt(b.dataset.index, 10))
      .forEach(card => projectGrid.appendChild(card));

    const firstVisible = visible[0];
    if (firstVisible && (typeof setActiveProject === "function")) {
      if (!activeProjectCard || activeProjectCard.classList.contains("hidden") || !visible.includes(activeProjectCard)) {
        setActiveProject(firstVisible);
      }
    }
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
      const isAll = button.dataset.filter === "all";
      button.classList.toggle("active", isAll);
      button.setAttribute("aria-pressed", String(isAll));
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
      filterButtons.forEach(item => {
        item.classList.toggle("active", item === button);
        item.setAttribute("aria-pressed", String(item === button));
      });
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

  // Publication filter support
  const pubFilters = document.querySelectorAll(".pub-filter");
  const publicationCards = document.querySelectorAll(".publication");
  if (pubFilters.length) {
    pubFilters.forEach(button => {
      button.addEventListener("click", () => {
        const filter = button.dataset.pubFilter;
        pubFilters.forEach(b => {
          b.classList.toggle("active", b === button);
          b.setAttribute("aria-pressed", String(b === button));
        });
        publicationCards.forEach(card => {
          const match = filter === "all" || card.dataset.pub === filter;
          card.classList.toggle("hidden", !match);
        });
        const pubGridEl = document.querySelector(".publication-grid");
        const pubExpandBtnEl = document.querySelector("#pub-expand-btn");
        if (filter !== "all" && pubGridEl && pubExpandBtnEl) {
          pubGridEl.classList.add("is-expanded");
          pubExpandBtnEl.setAttribute("aria-expanded", "true");
          pubExpandBtnEl.textContent = "Collapse to 4 publications (－3)";
        }
      });
    });
  }

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

  document.querySelectorAll(".inspect-architecture").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const title = btn.dataset.project || btn.closest(".project-card")?.dataset?.project || activeProjectCard?.dataset?.project;
      if (title) {
        lastArchitectureTrigger = btn;
        openArchitecture(title);
      }
    });
  });

  document.querySelectorAll(".card-expandable").forEach(el => {
    el.addEventListener("click", e => e.stopPropagation());
  });

  if (architectureClose) architectureClose.addEventListener("click", closeArchitecture);
  if (architectureDialog) {
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
  }

  // ------------------------------------------------------------------------
  // Split-Screen Scrollytelling Showcase & Pinned Stage
  // ------------------------------------------------------------------------
  const stageSticky = document.querySelector(".stage-sticky");
  const stageIndex = document.querySelector("#stage-index");
  const stageBadge = document.querySelector("#stage-badge");
  const stageCategory = document.querySelector("#stage-category");
  const stageTitle = document.querySelector("#stage-title");
  const stageSchematicMount = document.querySelector("#stage-schematic-mount");
  const stageMermaid = document.querySelector("#stage-mermaid");
  const stageMetrics = document.querySelector("#stage-metrics");
  const stageActions = document.querySelector("#stage-actions");
  const stageTabs = document.querySelectorAll(".stage-tab");

  let activeProjectCard = document.querySelector(".project-card.is-active") || projectCards[0];
  let stageMode = "schematic";
  let isUserScrolling = false;
  let clickTimeout = null;
  let morphTimer = null;

  let stageRenderToken = 0;

  function setStageMermaidStatus(message) {
    const note = document.createElement("p");
    note.style.cssText = "color:var(--muted);font-size:0.75rem;padding:20px;text-align:center";
    note.textContent = message;
    stageMermaid.replaceChildren(note);
  }

  async function updateStageMermaid() {
    if (!stageMermaid || !activeProjectCard) return;
    // Each call gets a token so a slow, older render cannot overwrite a newer one
    const token = ++stageRenderToken;
    const title = activeProjectCard.dataset.project || activeProjectCard.querySelector("h3")?.textContent.trim();
    const mermaidCode = architectureData[title]?.mermaid;
    if (!mermaidCode) {
      setStageMermaidStatus("No architecture diagram available.");
      return;
    }

    let mermaid;
    try {
      if (!window.mermaid) setStageMermaidStatus("Loading diagram...");
      mermaid = await loadMermaid();
    } catch (e) {
      console.warn("Mermaid load failed", e);
      if (token === stageRenderToken) setStageMermaidStatus("Diagram unavailable. Check your connection and reopen the Flowchart tab.");
      return;
    }

    try {
      configureMermaid(currentTheme);
      const { svg } = await mermaid.render(`stage-mermaid-svg-${token}`, mermaidCode);
      if (token !== stageRenderToken) return;
      stageMermaid.innerHTML = svg;
    } catch (e) {
      console.warn("Mermaid stage render failed", e);
      if (token === stageRenderToken) setStageMermaidStatus("Diagram could not be rendered.");
    }
  }

  function setActiveProject(card, isInstant = false) {
    if (!card) return;
    const isSameCard = activeProjectCard === card;
    activeProjectCard = card;

    projectCards.forEach(c => {
      const isActive = c === card;
      c.classList.toggle("is-active", isActive);
      const header = c.querySelector(".card-header");
      if (header) header.setAttribute("aria-expanded", String(isActive));
    });

    if (isSameCard && !isInstant) return;

    const updateStageDOM = () => {
      const title = card.dataset.project || card.querySelector("h3")?.textContent.trim();
      const data = architectureData[title];
      const index = card.dataset.index || "01";
      const category = card.dataset.category || "data";
      const statusEl = card.querySelector(".status");
      const isPublic = statusEl?.classList.contains("public");

      if (stageIndex) stageIndex.textContent = index;
      if (stageBadge) {
        stageBadge.textContent = isPublic ? "PUBLIC REPO" : "PRIVATE R&D";
        stageBadge.className = `stage-badge status ${isPublic ? "public" : "private"}`;
      }
      if (stageCategory) {
        const catNames = {
          data: "Data engineering",
          ml: "Scientific ML",
          science: "Computational physics",
          product: "Product engineering"
        };
        stageCategory.textContent = catNames[category] || category;
      }
      if (stageTitle) stageTitle.textContent = title;
      if (typeof syncRagProjectContext === "function" && title !== currentRagContext) {
        syncRagProjectContext(title);
      }

      const cardMetrics = card.querySelector(".metrics");
      if (stageMetrics && cardMetrics) {
        stageMetrics.innerHTML = cardMetrics.innerHTML;
      }

      const cardSchematic = card.querySelector(".card-schematic");
      if (stageSchematicMount && cardSchematic) {
        stageSchematicMount.innerHTML = cardSchematic.outerHTML;
        syncSvgMotion(stageSchematicMount);
      }

      if (stageActions) {
        stageActions.replaceChildren();
        if (data?.links?.github) addActionLink(stageActions, "View repository ↗", data.links.github);
        if (data?.links?.live) addActionLink(stageActions, "Live dashboard ↗", data.links.live);

        const inspectBtn = document.createElement("button");
        inspectBtn.className = "inspect-architecture";
        inspectBtn.type = "button";
        inspectBtn.textContent = "Inspect Architecture & Specs →";
        inspectBtn.addEventListener("click", () => {
          lastArchitectureTrigger = inspectBtn;
          openArchitecture(title);
        });
        stageActions.appendChild(inspectBtn);
      }

      if (stageMode === "flowchart") {
        updateStageMermaid();
      }
    };

    if (isInstant || !stageSticky) {
      updateStageDOM();
    } else {
      stageSticky.classList.add("is-morphing");
      clearTimeout(morphTimer);
      morphTimer = setTimeout(() => {
        updateStageDOM();
        requestAnimationFrame(() => {
          stageSticky.classList.remove("is-morphing");
        });
      }, 140);
    }
  }

  stageTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const mode = tab.dataset.mode;
      if (stageMode === mode) return;
      stageMode = mode;
      stageTabs.forEach(t => {
        const active = t === tab;
        t.classList.toggle("active", active);
        t.setAttribute("aria-selected", String(active));
        t.tabIndex = active ? 0 : -1;
      });
      const schematicView = document.querySelector("#stage-schematic-view");
      const flowchartView = document.querySelector("#stage-flowchart-view");
      if (schematicView) schematicView.classList.toggle("active", mode === "schematic");
      if (flowchartView) {
        flowchartView.classList.toggle("active", mode === "flowchart");
        if (mode === "flowchart") {
          updateStageMermaid();
        }
      }
    });
  });

  // WAI-ARIA tabs: Left/Right/Home/End move between tabs and activate them
  const stageTabList = Array.from(stageTabs);
  stageTabList.forEach((tab, index) => {
    tab.addEventListener("keydown", e => {
      let next = null;
      if (e.key === "ArrowRight") next = stageTabList[(index + 1) % stageTabList.length];
      else if (e.key === "ArrowLeft") next = stageTabList[(index - 1 + stageTabList.length) % stageTabList.length];
      else if (e.key === "Home") next = stageTabList[0];
      else if (e.key === "End") next = stageTabList[stageTabList.length - 1];
      if (!next) return;
      e.preventDefault();
      next.focus();
      next.click();
    });
  });

  projectCards.forEach(card => {
    const header = card.querySelector(".card-header");
    if (!header) return;

    header.addEventListener("click", () => {
      const isMobile = window.innerWidth <= 950;
      if (isMobile && card.classList.contains("is-active")) {
        card.classList.remove("is-active");
        header.setAttribute("aria-expanded", "false");
        return;
      }

      isUserScrolling = true;
      clearTimeout(clickTimeout);
      clickTimeout = setTimeout(() => { isUserScrolling = false; }, 650);

      setActiveProject(card);

      const rect = card.getBoundingClientRect();
      if (rect.top < 80 || rect.bottom > window.innerHeight) {
        card.scrollIntoView({ behavior: scrollBehavior(), block: "nearest" });
      }
    });

    header.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        header.click();
      }
    });
  });

  function updateScrollSpy() {
    if (isUserScrolling || window.innerWidth <= 950) return;
    const visibleCards = projectCards.filter(c => !c.classList.contains("hidden"));
    if (!visibleCards.length) return;

    const focalY = window.innerHeight * 0.42;
    let closestCard = null;
    let minDistance = Infinity;

    visibleCards.forEach(card => {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.top + Math.min(rect.height, 76) / 2;
      const dist = Math.abs(cardCenter - focalY);
      if (dist < minDistance) {
        minDistance = dist;
        closestCard = card;
      }
    });

    if (closestCard && closestCard !== activeProjectCard) {
      setActiveProject(closestCard);
    }
  }

  // Scroll spy observer for project cards
  const scrollObserver = new IntersectionObserver(() => {
    updateScrollSpy();
  }, {
    rootMargin: "-15% 0px -15% 0px",
    threshold: [0, 0.5]
  });

  projectCards.forEach(card => scrollObserver.observe(card));

  // Initialize theme, active card & perspective
  const initialTheme = getSavedTheme();
  applyTheme(initialTheme, true);

  if (activeProjectCard) {
    setActiveProject(activeProjectCard, true);
  }

  setPerspective("all");

  // ------------------------------------------------------------------------
  // Spotlight Cursor Glow Effect
  // ------------------------------------------------------------------------
  const reduceMotion = prefersReducedMotion();
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  if (!reduceMotion && finePointer) {
    const spotlightTargets = document.querySelectorAll(".kpi, .project-card");

    spotlightTargets.forEach(target => {
      target.addEventListener("mousemove", event => {
        const rect = target.getBoundingClientRect();
        target.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
        target.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
      });
      target.addEventListener("mouseleave", () => {
        target.style.removeProperty("--mouse-x");
        target.style.removeProperty("--mouse-y");
      });
    });
  }

  // ------------------------------------------------------------------------
  // Dynamic Hero Canvas Animation (Unique style per theme)
  // ------------------------------------------------------------------------
  let currentScrollY = window.scrollY || window.pageYOffset || 0;
  let scrollVelocity = 0;
  let smoothedScrollVelocity = 0;
  let normalizedScrollProgress = 0;

  const canvas = document.querySelector("#network-canvas");
  if (canvas) {
    const ctx = canvas.getContext("2d");
    let width = 0;
    let height = 0;
    let mouse = { x: -1000, y: -1000 };
    let animId = null;

    // Entity state for different animations
    let labLatticeNodes = [];
    let labLatticeEdges = [];
    let labPackets = [];
    let labRotX = 0.25;
    let labRotY = 0.35;
    let labMouseOffsetX = 0;
    let isCanvasDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let startRotX = 0.25;
    let startRotY = 0.35;
    let dragInertiaX = 0;
    let dragInertiaY = 0;
    let lastDragX = 0;
    let lastDragY = 0;
    let lastTimestamp = 0;
    let lastDragTime = 0;
    let canvasInView = true;

    // Single entry point for (re)starting the animation loop
    function startCanvasLoop() {
      if (animId || prefersReducedMotion() || document.hidden || !canvasInView) return;
      lastTimestamp = performance.now();
      animId = requestAnimationFrame(renderFrame);
    }
    let animSimTime = 0;

    let midnightNodes = [];
    let midnightPackets = [];
    let animTheme = currentTheme;

    function getThemeColors() {
      const style = getComputedStyle(document.documentElement);
      return {
        accent: style.getPropertyValue("--accent").trim() || "#B6F36A",
        accentAlt: style.getPropertyValue("--accent-alt").trim() || "#85E22B",
        ink: style.getPropertyValue("--ink").trim() || "#F0F0EC",
        muted: style.getPropertyValue("--muted").trim() || "#92969C",
        line: style.getPropertyValue("--line").trim() || "#292D32",
        bg: style.getPropertyValue("--bg").trim() || "#0B0C0E"
      };
    }

    let themeColors = getThemeColors();

    function initEntities() {
      if (!width || !height) return;

      // Lab: 3D Icosahedral Atomistic Cluster (<0, 0, 12, 0> ISRO in Cu-Zr Metallic Glass)
      labLatticeNodes = [];
      const phi = (1 + Math.sqrt(5)) / 2; // Golden ratio
      const rawIco = [
        [0, 1, phi], [0, 1, -phi], [0, -1, phi], [0, -1, -phi],
        [1, phi, 0], [1, -phi, 0], [-1, phi, 0], [-1, -phi, 0],
        [phi, 0, 1], [phi, 0, -1], [-phi, 0, 1], [-phi, 0, -1]
      ];
      const icoR = Math.hypot(0, 1, phi);
      const clusterScale = 1.38;

      // Central core atom: Copper (Cu) at origin
      labLatticeNodes.push({
        ox: 0,
        oy: 0,
        oz: 0,
        phase: Math.random() * Math.PI * 2,
        element: "Cu"
      });

      // 12 icosahedral shell vertices: binary alloy mix of Cu and Zr
      // 8 Cu (amber metallic) and 4 Zr (signature lab lime accent)
      const zrIndices = new Set([0, 3, 5, 10]);
      rawIco.forEach((v, idx) => {
        const isZr = zrIndices.has(idx);
        labLatticeNodes.push({
          ox: (v[0] / icoR) * clusterScale,
          oy: (v[1] / icoR) * clusterScale,
          oz: (v[2] / icoR) * clusterScale,
          phase: Math.random() * Math.PI * 2,
          element: isZr ? "Zr" : "Cu"
        });
      });

      // 30 icosahedral shell edges (connecting adjacent vertices)
      labLatticeEdges = [];
      const edgeThreshold = (2 / icoR) * clusterScale * 1.15;
      for (let i = 1; i < labLatticeNodes.length; i++) {
        for (let j = i + 1; j < labLatticeNodes.length; j++) {
          const a = labLatticeNodes[i];
          const b = labLatticeNodes[j];
          const d = Math.hypot(a.ox - b.ox, a.oy - b.oy, a.oz - b.oz);
          if (d <= edgeThreshold) {
            labLatticeEdges.push([i, j]);
          }
        }
      }

      // 12 radial coordination bonds from central atom to all shell vertices
      for (let i = 1; i < labLatticeNodes.length; i++) {
        labLatticeEdges.push([0, i]);
      }
      labPackets = [];

      // Midnight: Stellar particles
      midnightNodes = Array.from({ length: 32 }, (_, i) => ({
        x: 30 + Math.random() * (width - 60),
        y: 40 + Math.random() * (height - 80),
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        r: Math.random() * 2.2 + 1.2,
        phase: Math.random() * Math.PI * 2,
        group: i % 3
      }));
      midnightPackets = [];
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initEntities();
    }

    // --- Renderers per theme ---

    // 0. Lab: 3D Atomistic Crystal Lattice Simulation
    function drawLab(time, dt, colors) {
      ctx.clearRect(0, 0, width, height);

      const cx = width * 0.5;
      const cy = height * 0.5;
      // Balanced size with subtle scroll-driven expansion/contraction
      const fov = 3.6 + Math.min(0.8, normalizedScrollProgress * 0.65);
      const scrollBreath = Math.min(0.035, Math.abs(smoothedScrollVelocity) * 0.00015);
      const size = Math.min(width, height) * (0.285 + scrollBreath);

      // Interactive drag rotation or steady continuous 3D rotation with inertia & scroll coupling
      if (!isCanvasDragging) {
        const scrollRotImpulseY = smoothedScrollVelocity * 0.0022;
        const scrollRotImpulseX = smoothedScrollVelocity * 0.0010;

        labRotY += dt * 0.28 + dragInertiaX + scrollRotImpulseY;
        labRotX += dragInertiaY + scrollRotImpulseX;
        labRotX = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, labRotX));
        dragInertiaX *= 0.92;
        dragInertiaY *= 0.92;

        // Smooth mouse parallax damping when idle
        const targetMouseX = mouse.x > 0 ? -(mouse.x - cx) * 0.0006 : 0;
        labMouseOffsetX += (targetMouseX - labMouseOffsetX) * Math.min(1, dt * 4);
      }
      // While dragging, rotation comes straight from the pointer (pointermove) and the
      // fling velocity is kept, so it can carry on as inertia after release.

      const effectiveRotY = labRotY + labMouseOffsetX;
      const cosY = Math.cos(effectiveRotY);
      const sinY = Math.sin(effectiveRotY);
      const cosX = Math.cos(labRotX);
      const sinX = Math.sin(labRotX);

      // Rotate about Y, then X. +z after rotation points away from the viewer.
      const rotate = (x0, y0, z0) => {
        const x1 = x0 * cosY + z0 * sinY;
        const z1 = -x0 * sinY + z0 * cosY;
        return { x: x1, y: y0 * cosX - z1 * sinX, z: y0 * sinX + z1 * cosX };
      };

      // Project 3D nodes to 2D
      const projected = labLatticeNodes.map(node => {
        // Thermal vibration
        const vib = Math.sin(time * 0.003 + node.phase) * 0.035;
        const x0 = node.ox + vib;
        const y0 = node.oy + vib * 0.8;
        const z0 = node.oz + vib * 0.5;

        const r = rotate(x0, y0, z0);
        const scale = fov / (fov + r.z);
        return {
          px: cx + r.x * scale * size,
          py: cy - r.y * scale * size, // world +y is up on screen, same as the triad
          depth: r.z,
          scale: scale,
          element: node.element
        };
      });

      // Draw Bonds (Edges)
      ctx.lineWidth = 1;
      labLatticeEdges.forEach(([i, j]) => {
        const a = projected[i];
        const b = projected[j];
        const avgDepth = (a.depth + b.depth) * 0.5;
        const alpha = Math.max(0.08, Math.min(0.65, 0.42 - avgDepth * 0.15));

        ctx.strokeStyle = `rgba(182, 243, 106, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.px, a.py);
        ctx.lineTo(b.px, b.py);
        ctx.stroke();
      });

      // Kinetic Electrons traveling across crystal bonds (Vivid Glowing Electric Cyan)
      const packetSpawnChance = 0.045 + Math.min(0.08, Math.abs(smoothedScrollVelocity) * 0.0025);
      if (Math.random() < packetSpawnChance && labLatticeEdges.length) {
        const edge = labLatticeEdges[Math.floor(Math.random() * labLatticeEdges.length)];
        const forward = Math.random() > 0.5;
        labPackets.push({
          edge: forward ? edge : [edge[1], edge[0]],
          t: 0,
          speed: 0.9 + Math.random() * 0.4
        });
      }
      const velocitySpeedFactor = 1 + Math.min(3.0, Math.abs(smoothedScrollVelocity) * 0.018);
      labPackets.forEach(pkt => {
        pkt.t += dt * pkt.speed * velocitySpeedFactor;
        const a = projected[pkt.edge[0]];
        const b = projected[pkt.edge[1]];
        if (!a || !b) return;
        const px = a.px + (b.px - a.px) * pkt.t;
        const py = a.py + (b.py - a.py) * pkt.t;

        // Glowing electric charge packet (distinct cyan color, different from bonds & atoms)
        ctx.save();
        ctx.shadowColor = "#00F0FF";
        ctx.shadowBlur = 9;
        ctx.fillStyle = "#00F0FF";
        ctx.beginPath();
        ctx.arc(px, py, 2.6, 0, Math.PI * 2);
        ctx.fill();

        // Hot white electron core
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.arc(px, py, 1.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
      labPackets = labPackets.filter(p => p.t < 1);

      // Draw Binary Atoms: Cu vs Zr with different sizes and colors (sorted back to front)
      const sorted = projected.slice().sort((a, b) => b.depth - a.depth);
      sorted.forEach(node => {
        const isCu = node.element === "Cu";
        // Realistic atomic radii: Cu is 128 pm (smaller ~3.6px), Zr is 160 pm (larger ~6.2px)
        const baseRadius = isCu ? 3.6 : 6.2;
        const radius = Math.max(1.8, baseRadius * node.scale);
        const alpha = Math.max(0.4, Math.min(1, 0.78 - node.depth * 0.2));

        ctx.save();
        ctx.globalAlpha = alpha;

        if (isCu) {
          // Copper (Cu): Warm metallic amber / bronze
          ctx.shadowColor = "rgba(245, 158, 11, 0.5)";
          ctx.shadowBlur = 7 * node.scale;
          ctx.fillStyle = "#F59E0B";
          ctx.beginPath();
          ctx.arc(node.px, node.py, radius, 0, Math.PI * 2);
          ctx.fill();

          // Specular highlight on Cu
          ctx.fillStyle = "#FDE68A";
          ctx.beginPath();
          ctx.arc(node.px - radius * 0.28, node.py - radius * 0.28, radius * 0.35, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Zirconium (Zr): Distinctly larger, signature lab lime accent
          const zrColor = colors.accent;
          ctx.shadowColor = zrColor;
          ctx.shadowBlur = 10 * node.scale;
          ctx.fillStyle = zrColor;
          ctx.beginPath();
          ctx.arc(node.px, node.py, radius, 0, Math.PI * 2);
          ctx.fill();

          // Specular highlight on Zr
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(node.px - radius * 0.28, node.py - radius * 0.28, radius * 0.3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });

      // 3D XYZ Orientation Triad (Synchronized with lattice rotation)
      const ax = 46;
      const ay = height - 42;
      const axisLen = 26;

      // Project the unit axes with the same rotation as the cluster (screen y up)
      const axes = [
        { name: "X", v: rotate(1, 0, 0), color: "#F59E0B" },
        { name: "Y", v: rotate(0, 1, 0), color: colors.accent },
        { name: "Z", v: rotate(0, 0, 1), color: "#00F0FF" }
      ].map(a => ({ name: a.name, color: a.color, px: ax + a.v.x * axisLen, py: ay - a.v.y * axisLen, depth: a.v.z }));

      // Painter's order: farthest axis (largest depth) first, nearest drawn on top
      axes.sort((a, b) => b.depth - a.depth);

      ctx.save();
      // Center pivot point
      ctx.fillStyle = "rgba(146, 150, 156, 0.4)";
      ctx.beginPath();
      ctx.arc(ax, ay, 2, 0, Math.PI * 2);
      ctx.fill();

      // Render each axis line, tip, and letter label
      axes.forEach(axis => {
        ctx.strokeStyle = axis.color;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(axis.px, axis.py);
        ctx.stroke();

        ctx.fillStyle = axis.color;
        ctx.beginPath();
        ctx.arc(axis.px, axis.py, 2, 0, Math.PI * 2);
        ctx.fill();

        const dx = axis.px - ax;
        const dy = axis.py - ay;
        const d = Math.hypot(dx, dy) || 1;
        const lx = axis.px + (dx / d) * 8;
        const ly = axis.py + (dy / d) * 8;

        ctx.font = "600 9px monospace";
        ctx.fillStyle = axis.color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(axis.name, lx, ly);
      });
      ctx.restore();
    }

    // 1. Midnight: Constellation & gravitational drift
    function drawMidnight(time, colors) {
      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 1;
      for (let i = 0; i < midnightNodes.length; i++) {
        for (let j = i + 1; j < midnightNodes.length; j++) {
          const a = midnightNodes[i];
          const b = midnightNodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 130) {
            ctx.strokeStyle = `rgba(129, 140, 248, ${(1 - dist / 130) * 0.28})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      const speedBoost = 1 + Math.min(2.4, Math.abs(smoothedScrollVelocity) * 0.022);
      const scrollDriftY = -smoothedScrollVelocity * 0.018;

      ctx.save();
      midnightNodes.forEach(node => {
        node.x += node.vx * speedBoost;
        node.y += node.vy * speedBoost + scrollDriftY;
        // Clamp and point the velocity back inside. Flipping the sign alone traps nodes
        // at the edge when scroll drift pushes them further out than one step returns.
        if (node.x < 20) { node.x = 20; node.vx = Math.abs(node.vx); }
        else if (node.x > width - 20) { node.x = width - 20; node.vx = -Math.abs(node.vx); }
        if (node.y < 30) { node.y = 30; node.vy = Math.abs(node.vy); }
        else if (node.y > height - 30) { node.y = height - 30; node.vy = -Math.abs(node.vy); }

        const distMouse = Math.hypot(node.x - mouse.x, node.y - mouse.y);
        const near = Math.max(0, 1 - distMouse / 140);
        const pulse = Math.sin(time / 550 + node.phase) * 0.8;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r + near * 3.5 + pulse, 0, Math.PI * 2);
        ctx.fillStyle = node.group === 1 ? colors.accentAlt : colors.accent;
        ctx.globalAlpha = 0.4 + near * 0.6;
        ctx.shadowBlur = near * 15;
        ctx.shadowColor = colors.accent;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
      ctx.restore();

      const midnightSpawnChance = 0.04 + Math.min(0.08, Math.abs(smoothedScrollVelocity) * 0.002);
      if (Math.random() < midnightSpawnChance && midnightNodes.length > 2) {
        midnightPackets.push({
          a: Math.floor(Math.random() * midnightNodes.length),
          b: Math.floor(Math.random() * midnightNodes.length),
          t: 0
        });
      }
      const packetSpeedMultiplier = 1 + Math.min(2.5, Math.abs(smoothedScrollVelocity) * 0.025);
      midnightPackets.forEach(p => {
        p.t += 0.01 * packetSpeedMultiplier;
        const a = midnightNodes[p.a];
        const b = midnightNodes[p.b];
        if (!a || !b) return;
        ctx.beginPath();
        ctx.arc(a.x + (b.x - a.x) * p.t, a.y + (b.y - a.y) * p.t, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = colors.accentAlt;
        ctx.fill();
      });
      midnightPackets = midnightPackets.filter(p => p.t < 1);
    }

    function renderFrame(timestamp) {
      if (!width || !height || labLatticeNodes.length === 0) {
        resize();
      }

      if (!lastTimestamp) lastTimestamp = timestamp;
      let rawDt = (timestamp - lastTimestamp) / 1000;
      lastTimestamp = timestamp;

      // When tab was in background, clamp to normal single-frame duration (approx 60fps)
      let dt = rawDt;
      if (dt > 0.05 || dt <= 0) {
        dt = 0.016;
      }
      animSimTime += dt * 1000;

      // Smooth scroll velocity decay for realistic physical momentum in canvas
      smoothedScrollVelocity += (scrollVelocity - smoothedScrollVelocity) * Math.min(1, dt * 7.5);
      scrollVelocity *= 0.86;

      const colors = themeColors;
      if (animTheme === "midnight") {
        drawMidnight(animSimTime, colors);
      } else {
        drawLab(animSimTime, dt, colors);
      }

      if (!prefersReducedMotion() && !document.hidden && canvasInView) {
        animId = requestAnimationFrame(renderFrame);
      } else {
        animId = null;
      }
    }

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      } else {
        startCanvasLoop();
      }
    });

    window.themeCanvasUpdate = newTheme => {
      animTheme = newTheme;
      themeColors = getThemeColors();
      initEntities();
      lastTimestamp = performance.now();
      if (prefersReducedMotion()) {
        renderFrame(performance.now());
      } else {
        startCanvasLoop();
      }
    };

    canvas.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      isCanvasDragging = true;
      canvas.classList.add("is-grabbing");
      try { canvas.setPointerCapture(event.pointerId); } catch (e) { }
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      lastDragX = event.clientX;
      lastDragY = event.clientY;
      // Fold the hover parallax into the base rotation so grabbing does not jump
      labRotY += labMouseOffsetX;
      labMouseOffsetX = 0;
      startRotX = labRotX;
      startRotY = labRotY;
      lastDragTime = performance.now();
      dragInertiaX = 0;
      dragInertiaY = 0;
    });

    canvas.addEventListener("pointermove", event => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = event.clientX - rect.left;
      mouse.y = event.clientY - rect.top;

      if (isCanvasDragging) {
        const dx = event.clientX - dragStartX;
        const dy = event.clientY - dragStartY;
        // Front of the cluster moves with the pointer (drag right turns it right, up tilts it up)
        labRotY = startRotY - dx * 0.01;
        labRotX = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, startRotX - dy * 0.01));

        dragInertiaX = -(event.clientX - lastDragX) * 0.008;
        dragInertiaY = -(event.clientY - lastDragY) * 0.008;
        lastDragX = event.clientX;
        lastDragY = event.clientY;
        lastDragTime = performance.now();
        // Under reduced motion there is no running loop, so draw the dragged pose directly
        if (!animId) renderFrame(performance.now());
      }
    });

    function onCanvasPointerUp(event) {
      if (!isCanvasDragging) return;
      isCanvasDragging = false;
      // Holding still before release means no fling
      if (event.type === "pointercancel" || performance.now() - lastDragTime > 80) {
        dragInertiaX = 0;
        dragInertiaY = 0;
      }
      canvas.classList.remove("is-grabbing");
      try { canvas.releasePointerCapture(event.pointerId); } catch (e) { }
    }

    canvas.addEventListener("pointerup", onCanvasPointerUp);
    canvas.addEventListener("pointercancel", onCanvasPointerUp);

    canvas.addEventListener("pointerleave", () => {
      if (!isCanvasDragging) {
        mouse = { x: -1000, y: -1000 };
      }
    });

    // Resize at most once per frame and only when the canvas size or DPR actually changed.
    // resize() clears the canvas, so redraw immediately when no animation loop is running.
    let resizeRaf = null;
    let lastCanvasSize = "";
    function onResize() {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        const rect = canvas.getBoundingClientRect();
        const size = `${Math.round(rect.width)}x${Math.round(rect.height)}@${window.devicePixelRatio || 1}`;
        if (size === lastCanvasSize) return;
        lastCanvasSize = size;
        resize();
        if (!animId) renderFrame(performance.now());
      });
    }

    reducedMotionQuery.addEventListener("change", startCanvasLoop);

    // Stop drawing while the hero is scrolled out of view; resume when it returns
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(entries => {
        canvasInView = entries[entries.length - 1].isIntersecting;
        if (canvasInView) {
          startCanvasLoop();
        } else if (animId) {
          cancelAnimationFrame(animId);
          animId = null;
        }
      }).observe(canvas);
    }

    window.addEventListener("resize", onResize, { passive: true });
    resize();
    lastCanvasSize = `${Math.round(width)}x${Math.round(height)}@${window.devicePixelRatio || 1}`;
    renderFrame(performance.now());
  }

  // ------------------------------------------------------------------------
  // Publications Expand / Collapse Toggle
  // ------------------------------------------------------------------------
  const pubExpandBtn = document.querySelector("#pub-expand-btn");
  const pubGrid = document.querySelector(".publication-grid");

  if (pubExpandBtn && pubGrid) {
    pubExpandBtn.addEventListener("click", () => {
      const isExpanded = pubGrid.classList.toggle("is-expanded");
      pubExpandBtn.setAttribute("aria-expanded", String(isExpanded));
      pubExpandBtn.textContent = isExpanded
        ? "Collapse to 4 publications (－3)"
        : "Flip to all 7 publications (＋3)";
    });
  }

  // ------------------------------------------------------------------------
  // Trajectory Timeline Progressive Illumination
  // ------------------------------------------------------------------------
  const timeline = document.querySelector(".timeline");
  const timelineProgressBar = document.querySelector("#timeline-progress-bar");
  const timelineItems = document.querySelectorAll(".timeline-item");

  function updateTimeline() {
    if (!timeline || !timelineProgressBar) return;
    const rect = timeline.getBoundingClientRect();
    const vh = window.innerHeight;
    const trigger = vh * 0.72;

    const progress = Math.min(1, Math.max(0, (trigger - rect.top) / rect.height));
    timelineProgressBar.style.height = `${(progress * 100).toFixed(1)}%`;

    timelineItems.forEach(item => {
      const itemRect = item.getBoundingClientRect();
      if (itemRect.top <= trigger) {
        item.classList.add("is-illuminated");
      } else {
        item.classList.remove("is-illuminated");
      }
    });
  }

  // ------------------------------------------------------------------------
  // 3D Chapter Scroll Transitions & Floating Chapter Pager Dock
  // ------------------------------------------------------------------------
  const chapterSections = Array.from(document.querySelectorAll(".chapter-section"));
  const chapterDots = document.querySelectorAll(".chapter-dot");
  const chapterPrevBtn = document.querySelector("#chapter-prev");
  const chapterNextBtn = document.querySelector("#chapter-next");

  const chapterIds = ["hero", "work", "arsenal", "trajectory", "publications"];
  let currentChapterIndex = 0;

  function updateChapterProgress() {
    // The dock must keep tracking the current chapter; only the 3D transitions are skipped
    const reduced = prefersReducedMotion();

    const vh = window.innerHeight;
    const viewportCenter = vh * 0.5;
    const transitionZone = vh * 0.75;

    let closestIndex = 0;
    let minDistance = Infinity;

    chapterSections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      const isInside = rect.top <= 140 && rect.bottom >= vh * 0.35;
      const center = rect.top + rect.height * 0.5;
      const distance = Math.abs(center - viewportCenter);

      if (isInside || distance < minDistance) {
        closestIndex = index;
        if (isInside) minDistance = -1;
        else if (minDistance !== -1) minDistance = distance;
      }

      let p = 0;

      if (rect.top > 0) {
        // Section top is below viewport top -> entering from bottom
        const u = Math.max(0, Math.min(1, rect.top / transitionZone));
        p = 3 * u * u - 2 * u * u * u; // smoothstep 0..1
      } else if (rect.bottom < vh) {
        // Section bottom is above viewport bottom -> leaving towards top
        const u = Math.max(0, Math.min(1, (vh - rect.bottom) / transitionZone));
        p = -(3 * u * u - 2 * u * u * u); // smoothstep 0..-1
      } else {
        // Section spans viewport: in active viewing zone
        p = 0;
      }
      if (reduced) p = 0; // flat, untransformed sections under reduced motion

      if (section.id === "work") {
        section.style.transform = "none";
        section.style.opacity = "1";
        section.style.removeProperty("--chapter-rot-x");
        section.style.removeProperty("--chapter-scale");
        section.style.removeProperty("--chapter-y");
        section.style.removeProperty("--chapter-opacity");

        // Keep #work container untransformed so .project-stage remains smoothly pinned,
        // while applying 3D chapter transition to section-head & filter-row
        const head = section.querySelector(".section-head");
        const filters = section.querySelector(".filter-row");
        if (Math.abs(p) < 0.001) {
          if (head) { head.style.transform = "none"; head.style.opacity = "1"; }
          if (filters) { filters.style.transform = "none"; filters.style.opacity = "1"; }
        } else {
          const rotX = (p * 4.5).toFixed(2);
          const translateY = (p * 14).toFixed(1);
          const opacity = (1 - Math.abs(p) * 0.25).toFixed(2);
          if (head) {
            head.style.transform = `perspective(1200px) translate3d(0, ${translateY}px, 0) rotateX(${rotX}deg)`;
            head.style.opacity = opacity;
          }
          if (filters) {
            filters.style.transform = `perspective(1200px) translate3d(0, ${(translateY * 0.7).toFixed(1)}px, 0) rotateX(${(rotX * 0.7).toFixed(2)}deg)`;
            filters.style.opacity = opacity;
          }
        }
        return;
      }

      if (Math.abs(p) < 0.001) {
        // At rest: completely flat and untransformed
        section.style.transform = "none";
        section.style.opacity = "1";
        section.style.removeProperty("--chapter-rot-x");
        section.style.removeProperty("--chapter-scale");
        section.style.removeProperty("--chapter-y");
        section.style.removeProperty("--chapter-opacity");
      } else {
        section.style.removeProperty("transform");
        section.style.removeProperty("opacity");

        const rotX = (p * 5.5).toFixed(2);
        const scale = (1 - Math.abs(p) * 0.045).toFixed(3);
        const translateY = (p * 20).toFixed(1);
        const opacity = (1 - Math.abs(p) * 0.32).toFixed(2);

        section.style.setProperty("--chapter-rot-x", `${rotX}deg`);
        section.style.setProperty("--chapter-scale", scale);
        section.style.setProperty("--chapter-y", `${translateY}px`);
        section.style.setProperty("--chapter-opacity", opacity);
      }
    });

    if (closestIndex !== currentChapterIndex) {
      currentChapterIndex = closestIndex;
      syncChapterDock(closestIndex);
    }
  }

  function syncChapterDock(index) {
    chapterDots.forEach((dot, i) => {
      const isActive = i === index;
      dot.classList.toggle("active", isActive);
      if (isActive) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
  }

  function scrollToChapter(targetId) {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;

    targetElement.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
  }

  chapterDots.forEach(dot => {
    dot.addEventListener("click", () => {
      const chapterId = dot.dataset.chapter;
      scrollToChapter(chapterId);
    });
  });

  if (chapterPrevBtn) {
    chapterPrevBtn.addEventListener("click", () => {
      const prevIndex = Math.max(0, currentChapterIndex - 1);
      scrollToChapter(chapterIds[prevIndex]);
    });
  }

  if (chapterNextBtn) {
    chapterNextBtn.addEventListener("click", () => {
      const nextIndex = Math.min(chapterIds.length - 1, currentChapterIndex + 1);
      scrollToChapter(chapterIds[nextIndex]);
    });
  }

  window.addEventListener("keydown", event => {
    const architectureDialog = document.querySelector("#architecture-dialog");
    if (architectureDialog && architectureDialog.open) return;
    const paperFolioDialog = document.querySelector("#paper-folio-dialog");
    if (paperFolioDialog && paperFolioDialog.open) return;
    if (event.defaultPrevented || event.ctrlKey || event.metaKey) return;
    if (isTypingOrMediaTarget(event.target) || isTypingOrMediaTarget(document.activeElement)) return;
    if (document.activeElement?.closest?.("#rag-chat-panel")) return;

    if (event.key === "PageDown" || (event.altKey && event.key === "ArrowDown")) {
      if (currentChapterIndex < chapterIds.length - 1) {
        event.preventDefault();
        scrollToChapter(chapterIds[currentChapterIndex + 1]);
      }
    } else if (event.key === "PageUp" || (event.altKey && event.key === "ArrowUp")) {
      if (currentChapterIndex > 0) {
        event.preventDefault();
        scrollToChapter(chapterIds[currentChapterIndex - 1]);
      }
    }
  });

  const heroSection = document.querySelector("#hero");
  const heroVisual = document.querySelector(".hero-visual");

  function updateScrollMetrics() {
    const sy = window.scrollY || window.pageYOffset || 0;
    const vh = window.innerHeight || 800;
    const delta = sy - currentScrollY;
    currentScrollY = sy;
    scrollVelocity = delta;
    normalizedScrollProgress = Math.min(2.5, Math.max(0, sy / vh));
  }

  function updateHeroParallax() {
    if (!heroSection || !heroVisual) return;
    if (prefersReducedMotion()) {
      heroVisual.style.removeProperty("--hero-visual-y");
      heroVisual.style.removeProperty("--hero-visual-scale");
      return;
    }

    const rect = heroSection.getBoundingClientRect();
    const vh = window.innerHeight || 800;

    if (rect.bottom < 0 || rect.top > vh) return;

    const heroProgress = Math.max(0, Math.min(1.2, -rect.top / Math.max(1, rect.height)));
    const visualY = (heroProgress * 32).toFixed(1);
    const visualScale = (1 - heroProgress * 0.035).toFixed(3);

    heroVisual.style.setProperty("--hero-visual-y", `${visualY}px`);
    heroVisual.style.setProperty("--hero-visual-scale", visualScale);
  }

  let scrollTicking = false;
  window.addEventListener("scroll", () => {
    if (!scrollTicking) {
      scrollTicking = true;
      requestAnimationFrame(() => {
        updateScrollMetrics();
        if (window.innerWidth > 950) {
          updateScrollSpy();
        }
        updateChapterProgress();
        updateTimeline();
        updateHeroParallax();
        scrollTicking = false;
      });
    }
  }, { passive: true });


  /* ==========================================================================
     Interactive Wide Single-Sheet Page-Flipping Paper Folio
     ========================================================================== */
  const paperFolioData = {
    "nb-cu-2026": {
      "id": "nb-cu-2026",
      "badge": "2026 \u00b7 Materials Today Communications",
      "journal": "Materials Today Communications 54 (2026) 115373",
      "highlightsLabel": "Key Research Highlights",
      "graphicalAbstractCaption": "Graphical Abstract: Atomistic MD modeling of Nb thin film growth on Cu(111) by HiPIMS",
      "sealLabel": "Materials Today Communications · CERN / University of Helsinki Collaboration",
      "doiUrl": "https://doi.org/10.1016/j.mtcomm.2026.115373",
      "title": "Crystallization dynamics and interfacial structure during growth of thin Nb films on Cu by high-power impulse magnetron sputtering: A molecular dynamics study",
      "authors": "Milad Ghaemi, Kostas Sarakinos, Flyura Djurabekova, Alvaro Lopez-Cazalilla, Guillaume Jonathan Rosaz, Sergio Calatroni",
      "pdfUrl": "assets/papers/nb-cu-hipims-2026/Crystallization dynamics and interfacial structure during growth of thin Nb films on Cu by high-power impulse magnetron sputtering A molecular dynamics study.pdf",
      "coverImage": "assets/papers/nb-cu-hipims-2026/cover_image.png",
      "graphicalAbstract": "assets/papers/nb-cu-hipims-2026/Graphical Abstract.jpg",
      "highlights": [
        "Optimal HiPIMS conditions are found at intermediate ion energy (70\u2013100 eV).",
        "Interfacial vacancy concentration exhibits unexpected non-monotonic composition dependence.",
        "Atomic peening, ballistic mixing, and gas implantation compete during deposition.",
        "Crystallization is delayed at high energies, then triggers rapid surface roughening."
      ],
      "keywords": "Nb thin film; Copper; Molecular dynamics; Magnetron sputtering deposition; Superconducting cavities of particle accelerators",
      "abstract": "Improving the performance of niobium (Nb)-coated copper (Cu) Superconducting Radio Frequency (SRF) cavities is crucial for next-generation particle accelerators. Yet, performance is often limited by the reduction of the cavities\u2019 superconducting properties at high accelerating fields, a behavior linked to Nb thin-film growth defects. Using large-scale molecular dynamics (MD) simulations, we systematically investigate the influence of high-power impulse magnetron sputtering (HiPIMS) deposition parameters, specifically ion energy and fraction of ionized species in the deposition flux, on the growth of Nb films on Cu(1 1 1) substrates. We find that high ion energies and ionization fractions induce significant surface roughening during growth, which is in agreement with the available experimental data. Moreover, our simulations reveal that this behavior is driven by the formation and rapid crystallization of a metastable amorphous Nb-Cu phase at the interface. Critically, we discover a nonmonotonic relationship between the composition of the amorphous layer and the concentration of residual vacancy defects. The defect density is minimized at an optimal composition of approximately 45% Cu, increasing for the interfaces with a lesser or greater amount of Cu compared to Nb. This reveals that the optimization of SRF cavities requires not only an increase in ion energy but also an accurate and careful tuning of deposition parameters to engineer the ideal interfacial composition, thereby minimizing the number density of performance-degrading defects.",
      "conclusion": [
        "In this work, we have employed comprehensive MD simulations to unravel the complex mechanisms governing the energetic deposition of Nb thin films on Cu substrates, to provide an atomistic roadmap for improving the SRF cavity performance. Our simulations demonstrate that high ion energy and ionization fraction lead to transient surface roughening. This is driven by the rapid crystallization of a metastable amorphous interface, whose composition is controlled by the deposition parameters.",
        "Crucially, this atomistic finding provides a direct physical rationale for recent experimental observations in Nb-coated SRF cavities. Independent studies by Wang et al. [25] and Carlos et al. [26] demonstrated that cavity performance and critical current density reach a distinct optimum at an intermediate substrate bias of approximately $-75\\text{ V}$, degrading at both higher and lower biases. Our simulation results are consistent with this empirical trend: the intermediate energy range of $70\\text{--}100\\text{ eV}$ (at $f_i \\approx 33\\%$) produces an interfacial composition near $\\text{Cu}_{45}\\text{Nb}_{55}$ that minimizes the retention of performance-degrading vacancy defects, while both lower and higher energies drive the composition away from this optimum and increase the defect density.",
        "The main conclusion of this study is the identification of an optimal processing window for defect minimization. We revealed a nonmonotonic, U-shaped relationship between the Cu concentration in the amorphous interface and the final density of vacancy defects. The minimum number of defects occurs at an optimal composition of $\\sim 45\\%\\text{ Cu}$. This insight fundamentally shifts the optimization paradigm from simply maximizing interfacial mixing to precisely controlling the deposition parameters to achieve this ideal composition. Conditions that require too low-energy deposition fail to create sufficient mixing, while those conditions consisting of too high-energy surpass the optimum point, creating a Cu-rich interface that is also prone to higher defect formation.",
        "These localized vacancy clusters represent the atomistic nucleation stage of nanoscale void formation and can degrade both interfacial adhesion and SRF cavity performance. While our parametric variation of $f_i$ captures the fundamental atomistic effects of different flux compositions, explicitly modeling the macroscopic temporal structure of the HiPIMS pulse, including duty cycle and dynamic ion-flux evolution, represents an important direction for future multiscale simulation efforts."
      ],
      "plates": [
        {
          "id": "fig-1",
          "sheetIndex": 1,
          "type": "image",
          "badge": "FIGURE 01",
          "title": "Multi-scale modeling of Nb thin film growth for SRF applications",
          "src": "assets/papers/nb-cu-hipims-2026/Fig. 1.jpg",
          "caption": "Fig. 1. Multi-scale modeling of Nb thin film growth for SRF applications. (a) Quarter cut of an SRF cavity, showing the support rod, the niobium (cathode), the copper cavity wall, and the plasma sheath region where deposition occurs. The red circle indicates the localized surface area modeled by MD. (b) atomistic simulation setup corresponding to the area marked in (a). The box dimensions are approximately $10.3 \\times 10.3 \\times 5.5\\text{ nm}^3$, with two fixed bottom layers and NVT thermal bath zones to stabilize the system. The remaining atoms evolve under an NVE ensemble. Ionized particles ($\\text{Nb}^+$, $\\text{Ar}^+$, $\\text{Nb}^{++}$) are introduced normal to the surface ($\\theta = 0^\\circ$), while neutral Nb atoms are deposited at random angles between $0^\\circ$ and $75^\\circ$ to mimic realistic deposition conditions in RF cavity geometries."
        },
        {
          "id": "fig-2",
          "sheetIndex": 2,
          "type": "image",
          "badge": "FIGURE 02",
          "title": "Evolution of surface roughness and BCC atomic fraction",
          "src": "assets/papers/nb-cu-hipims-2026/Fig. 2.jpg",
          "caption": "Fig. 2. Evolution of surface roughness parameter $\\sigma$, Eq. (1)(a, c and e) and the BCC atomic fraction $f_{\\text{BCC}} = \\frac{N_{\\text{Nb}}(\\text{BCC})}{N_{\\text{Nb}}}$ (b, d and f) during the deposition simulations of $\\Theta = 22\\text{ ML}$ of Nb on a Cu substrate under different deposition conditions. The panels are organized according to different ionization fractions $f_i$, while the ion energies $E_i$ are color-coded in the legends. The shaded regions represent the standard deviation."
        },
        {
          "id": "fig-3",
          "sheetIndex": 3,
          "type": "image",
          "badge": "FIGURE 03",
          "title": "Partial Radial Distribution Functions (PRDFs)",
          "src": "assets/papers/nb-cu-hipims-2026/Fig. 3.jpg",
          "caption": "Fig. 3. Partial Radial Distribution Functions (PRDFs) characterizing the atomic-scale structure as a function of $f_i$ and $E_i$. (a\u2013c) Nb\u2013Nb correlations reveal that higher $f_i$ and $E_i$ lead to increased film ordering and densification. (d\u2013f) Nb\u2013Cu correlations show that intermixing at the interface is enhanced by both higher $f_i$ and $E_i$. (g\u2013i) Ar\u2013Cu correlations provide direct evidence of $\\text{Ar}^+$ implantation, which increases significantly with higher $f_i$ and $E_i$."
        },
        {
          "id": "fig-4",
          "sheetIndex": 4,
          "type": "image",
          "badge": "FIGURE 04",
          "title": "Mean coordination number (CN) of niobium atoms",
          "src": "assets/papers/nb-cu-hipims-2026/Fig. 4.jpg",
          "caption": "Fig. 4. Mean coordination number (CN) of niobium atoms as a function of depth ($Z$ coordinate) for the three simulated flux compositions: (a) 66%, (b) 33%, and (c) 10% ionized particles. Different colors represent different incident ion energies, as indicated in the legend. The gray dashed line shows the initial top surface position of the pristine Cu substrate."
        },
        {
          "id": "fig-5",
          "sheetIndex": 5,
          "type": "image",
          "badge": "FIGURE 05",
          "title": "Compositional gradient and Cu/Nb concentration profiles",
          "src": "assets/papers/nb-cu-hipims-2026/Fig. 5.jpg",
          "caption": "Fig. 5. Analysis of compositional gradient plotted as the logarithmic Cu/Nb concentration profiles at $\\Theta \\approx 22\\text{ ML}$ for $f_i$ equal to (a) 10%, (b) 33%, and (c) 66%, respectively. Within each panel, different colored lines denote simulation runs for different $E_i$ values for singly ionized species from $50\\text{ eV}$ to $200\\text{ eV}$, as indicated in the legend."
        },
        {
          "id": "fig-6",
          "sheetIndex": 6,
          "type": "image",
          "badge": "FIGURE 06",
          "title": "Interface structure and Voronoi polyhedra distributions",
          "src": "assets/papers/nb-cu-hipims-2026/Fig. 6.jpg",
          "caption": "Fig. 6. Structure of the interface obtained during the thin film deposition with $E_i = 50\\text{ eV}$ and $f_i = 10\\%$ in (a) and (c), and with $E_i = 200\\text{ eV}$ and $f_i = 66\\%$ in (b) and (d). (a) and (b) show the atomic structure of the interface with the atoms colored according to CNA in OVITO. (c) and (d) show the Voronoi polyhedra distributions of the same interfaces shown in (a) and (b). The Voronoi polyhedra emphasize the level of disorder in the interface, although the film under the conditions shown in (b) and (d) is overall much denser."
        },
        {
          "id": "fig-7",
          "sheetIndex": 7,
          "type": "image",
          "badge": "FIGURE 07",
          "title": "Atomic Cu fraction in the disordered interface region",
          "src": "assets/papers/nb-cu-hipims-2026/Fig. 7.jpg",
          "caption": "Fig. 7. Atomic Cu fraction in the disordered interface region as a function of deposition energy $E_i$ and ionization fraction $f_i$ of the deposition flux calculated as $\\frac{N_{\\text{Cu}}(\\text{\u2018Other\u2019})}{N_{\\text{all}}(\\text{\u2018Other\u2019})}$."
        },
        {
          "id": "fig-8",
          "sheetIndex": 8,
          "type": "image",
          "badge": "FIGURE 08",
          "title": "Number of vacancies in Nb away from the interface",
          "src": "assets/papers/nb-cu-hipims-2026/Fig. 8.jpg",
          "caption": "Fig. 8. Number of vacancies that appeared during the thin film growth in Nb away from the interface for all $E_i$ and $f_i$ studied in this work."
        },
        {
          "id": "video-1",
          "sheetIndex": 9,
          "type": "video",
          "badge": "VIDEO 01",
          "title": "Time-resolved visualization of BCC formation ($f_i = 33\\%$, $E_i = 200\\text{ eV}$)",
          "src": "assets/papers/nb-cu-hipims-2026/Video 1.mp4",
          "caption": "Video 1. Time-resolved visualization of BCC formation during deposition at $f_i = 33\\%$ and $E_i = 200\\text{ eV}$. The animation shows an anisotropic amorphous-to-BCC transformation initiated at the critical thickness $\\Theta \\approx 8\\text{ ML}$. Crystallization propagates along the growth direction while lateral spreading remains limited, producing columnar BCC domains and pronounced out-of-plane displacement."
        },
        {
          "id": "video-2",
          "sheetIndex": 10,
          "type": "video",
          "badge": "VIDEO 02",
          "title": "Time-resolved visualization of BCC formation ($f_i = 33\\%$, $E_i = 50\\text{ eV}$)",
          "src": "assets/papers/nb-cu-hipims-2026/Video 2.mp4",
          "caption": "Video 2. Time-resolved visualization of BCC formation during deposition at $f_i = 33\\%$ and $E_i = 50\\text{ eV}$. Early BCC nuclei appear at $\\Theta \\approx 2\\text{--}3\\text{ ML}$ and grow steadily throughout deposition, in contrast to the delayed, anisotropic crystallization observed at $E_i = 200\\text{ eV}$."
        },
        {
          "id": "video-3",
          "sheetIndex": 11,
          "type": "video",
          "badge": "VIDEO 03",
          "title": "Time-resolved evolution of surface roughening ($f_i = 33\\%$, $E_i = 200\\text{ eV}$)",
          "src": "assets/papers/nb-cu-hipims-2026/Video 3.mp4",
          "caption": "Video 3. Time-resolved evolution of surface roughening during deposition at $f_i = 33\\%$ and $E_i = 200\\text{ eV}$. The surface remains smooth ($\\sigma \\approx 1\\text{ \\AA}$) up to $\\Theta \\approx 8\\text{ ML}$ due to atomic peening which suppresses BCC nucleation and maintains a dense amorphous layer. Once the critical thickness is reached, a rapid amorphous-to-BCC transformation produces a sharp roughness increase ($\\Theta \\approx 9\\text{--}14\\text{ ML}$) and localized height variations up to $11\\text{--}12\\text{ \\AA}$ by $\\Theta \\approx 22\\text{ ML}$, consistent with stress-relief-driven hillock formation."
        },
        {
          "id": "video-4",
          "sheetIndex": 12,
          "type": "video",
          "badge": "VIDEO 04",
          "title": "Time-resolved evolution of surface roughening ($f_i = 33\\%$, $E_i = 50\\text{ eV}$)",
          "src": "assets/papers/nb-cu-hipims-2026/Video 4.mp4",
          "caption": "Video 4. Time-resolved evolution of surface roughening during deposition at $f_i = 33\\%$ and $E_i = 50\\text{ eV}$. Gradual surface-feature development and continuous roughness accumulation occur throughout growth. Early BCC nucleation ($\\Theta \\approx 1\\text{ ML}$) and steady statistical roughening indicate morphology evolution governed by adatom mobility under moderate ion energies."
        }
      ]
    },
    "blistering-cu-2024": {
      "id": "blistering-cu-2024",
      "badge": "2024 · Acta Materialia",
      "journal": "Acta Materialia 266 (2024) 119699",
      "highlightsLabel": "Key Findings",
      "graphicalAbstractCaption": "Graphical Abstract: Orientation-dependent blistering of Cu under high fluence keV H ion irradiation",
      "sealLabel": "Acta Materialia · University of Helsinki / CERN Collaboration",
      "doiUrl": "https://doi.org/10.1016/j.actamat.2024.119699",
      "title": "Effect of surface orientation on blistering of copper under high fluence keV hydrogen ion irradiation",
      "authors": "A. Lopez-Cazalilla, C. Serafim, J. Kimari, M. Ghaemi, A.T. Perez-Fontenla, S. Calatroni, A. Grudiev, W. Wuensch, F. Djurabekova",
      "pdfUrl": "assets/papers/blistering_cu_2026/Effect of surface orientation on blistering of copper under high fluence keV hydrogen ion irradiation.pdf",
      "coverImage": "assets/papers/blistering_cu_2026/cover_image.jpg",
      "graphicalAbstract": "assets/papers/blistering_cu_2026/Graphical abstract.jpg",
      "highlights": [
        "Blistering of the irradiated polycrystalline Cu surface does not grow uniformly with ion fluence: initially only some grains exhibit blisters, while others remain intact.",
        "Grains with the $\\{1\\,0\\,0\\}$ orientation are the most prone to blistering, while grains oriented in the $\\{1\\,1\\,0\\}$ are the most resistant to it.",
        "Blister shapes correlate with grain orientation and are explained by the specific behavior of dislocations within the FCC crystal structure.",
        "The delay in blistering is governed by the overlap of the H depth profile and the vacancy depth distribution, not by the penetration depth of the implanted ions."
      ],
      "keywords": "Copper; Hydrogen; Blisters; Molecular dynamics; Crystallographic orientation; Surface effects; Experimental techniques",
      "abstract": "Copper and hydrogen are among the most common elements that are widely used in industrial and fundamental research applications. Copper surfaces are often exposed to hydrogen in the form of charged ions. The hydrogen ions can accelerate towards the surface, resulting in an accumulation of hydrogen below the surface. Harmless in low concentrations, prolonged hydrogen exposure can lead to dramatic changes on copper surfaces. This effect is visible to the naked eye in the form of blisters densely covering the exposed surface. Blisters are structural modifications that can affect the physical properties of the surface including, for example, vacuum dielectric strength. Using scanning electron microscopy we found that the blistering of the irradiated polycrystalline copper surface does not grow uniformly with ion fluence. Initially, only some grains exhibit blisters, while others remain intact. Our experiments indicate that grains with the $\\{1\\,0\\,0\\}$ orientation are the most prone to blistering, while the grains oriented in the $\\{1\\,1\\,0\\}$ are the most resistant to it. Moreover, we noticed that blisters assume different shapes correlating with specific grain orientation. Good agreement of experiments with the atomistic simulations explains the difference in the shapes of the blisters by specific behavior of dislocations within the FCC crystal structure. Moreover, our simulations reveal the correlation of the delay in blister formation on surfaces with certain orientations compared to the others with the dependence of the hydrogen penetration depth and the depth and amount of vacancies in copper on the orientation of the irradiated surface.",
      "conclusion": [
        "In this work, we report the non-uniform blistering of a polycrystalline copper surface under the high fluence $45\\text{ keV}$ negative hydrogen ion irradiation. The morphology analysis of the surfaces irradiated with two different ion fluences revealed that the shape of the blisters grown on different grains was different and correlated with the crystallographic orientation of the grain surface. Moreover, the whole surface of the areas irradiated to high ion fluence was densely covered with blisters fairly uniformly, while at lower fluence the coverage was highly non-uniform: well-developed blisters were seen only on some grains, while the other grains remained flat.",
        "To obtain the insights into mechanisms of copper surface blistering, we carried out a set of molecular dynamics simulations to show how the surface of the differently oriented grains yields under the pressure built up in bubbles formed in copper during the hydrogen ion implantation. The shape of protrusions obtained from the bubbles placed under the surface with different orientations is in good agreement with the shape of blisters observed in experiments. We also were able to explain the delay for blistering on $\\{1\\,1\\,1\\}$ and $\\{1\\,1\\,0\\}$ oriented surfaces compared to that of $\\{1\\,0\\,0\\}$ orientations, when we explicitly considered the crystal structure of copper. We revealed that the difference in blistering is not associated with the difference in the penetration depth of the implanted ions as it was proposed earlier but by the degree of the overlap of the hydrogen depth profile and the vacancy depth distribution. This conclusion is consistent with our experimental observation of the fastest blister growth on the grains of $\\{1\\,0\\,0\\}$ orientations, in which the overlap of depth distributions of the implanted hydrogen atoms and the vacancies created due to ion impacts was the strongest."
      ],
      "plates": [
        {
          "id": "fig-1",
          "sheetIndex": 1,
          "type": "image",
          "badge": "FIGURE 01",
          "title": "Simulation cells with disk- and hemisphere-shaped voids",
          "src": "assets/papers/blistering_cu_2026/Fig. 1.jpg",
          "caption": "Fig. 1. Slice of the different simulation cells. In blue the fixed layer at the bottom. (a) Disk-shaped void and (b) hemisphere-shaped void."
        },
        {
          "id": "fig-2",
          "sheetIndex": 2,
          "type": "image",
          "badge": "FIGURE 02",
          "title": "SEM of the transition area: (1 1 1), (1 0 0) and (1 1 0) grains",
          "src": "assets/papers/blistering_cu_2026/Fig. 2.jpg",
          "caption": "Fig. 2. SEM images of the Cu surface irradiated by $\\text{H}^-$ ions up to a dose of $\\sim 1.3 \\times 10^{19}\\text{ H}^-/\\text{cm}^2$ at the transition area. (a) The surface of two grains is marked as (1 1 1) and (1 0 0). A yellow line marks where the cross-section was carried out. Black circles mark some of the dimples. (b) Cross-sections of the two grains (1 1 1) and (1 0 0) (corresponding to the yellow line in (a)), shown in Figures (d–e) respectively. (c) Surface of the two grains marked as (1 0 0) and (1 1 0). Inset: Zoom of the boundary region between the two grains. (f) Cross-section of a (1 1 0) grain in the transition area shown in (c) by a green line. A Zeiss Crossbeam 540 Focused Ion Beam (FIB)/Scanning Electron Microscope (SEM) was used to perform the cross-section on the sample. Imaging was performed using InLens Secondary Electron Detector at $10\\text{ keV}$ and various magnifications. The areas shown in the cross sections are marked in red, blue and green for (1 0 0), (1 1 1) and (1 1 0), respectively. The horizontal dashed line separates the two different regions explored at the transition area. EBSD maps of the regions explored can be found in insets of (a) and (c) respectively. For a view of the complete EBSD map, see Figure S1b."
        },
        {
          "id": "fig-3",
          "sheetIndex": 3,
          "type": "image",
          "badge": "FIGURE 03",
          "title": "SEM of the high fluence area: blisters on differently oriented grains",
          "src": "assets/papers/blistering_cu_2026/Fig. 3.jpg",
          "caption": "Fig. 3. SEM images of the Cu surface irradiated by $\\text{H}^-$ ions up to a dose of $\\sim 1.3 \\times 10^{19}\\text{ H}^-/\\text{cm}^2$ at the high fluence area. Surface of two grains explored: (a) (1 1 1) and (1 0 0), (b) (1 1 1) and (1 1 0) and (c) (1 0 0) and (1 1 0). Cross-sections of the two grains (d) (1 1 1) and (1 0 0), and (e) (1 1 0). A Zeiss Crossbeam 540 Focused Ion Beam (FIB)/Scanning Electron Microscope (SEM) was used to perform the cross section on the sample. Imaging was performed using InLens Secondary Electron Detector at $10\\text{ keV}$ and various magnifications. Vertical and horizontal dashed lines separate the three different regions explored at the high fluence area. Black circles mark some of the dimples. EBSD maps of the regions explored can be found in insets of (a), (b) and (c) respectively. For a view of the complete EBSD map, see Figure S1c."
        },
        {
          "id": "fig-4",
          "sheetIndex": 4,
          "type": "image",
          "badge": "FIGURE 04",
          "title": "MD protrusions above pressurized H bubbles on (1 0 0), (1 1 1) and (1 1 0)",
          "src": "assets/papers/blistering_cu_2026/Fig. 4.jpg",
          "caption": "Fig. 4. Final configurations (after $100\\text{ ps}$) of surfaces for disk-shaped (a, b, c) and hemispherical-shaped bubbles (g, h, i) using (1 0 0), (1 1 1) and (1 1 0) surfaces orientation, respectively, under $n_\\text{H}/\\text{Vac} = 2$. The directions normal to $\\{1\\,1\\,1\\}$ planes projected onto the differently oriented surfaces are marked in blue. Atoms are colored according to their $z$ position in $\\text{\\AA}$. The lower limit corresponds to the initial level of the surface in each case, and upper limit is chosen for an easier visualization of the protrusion. Top view of cells surfaces at different times for disk-shaped (e, f, g) and hemispherical-shaped bubbles (j, k, l) oriented as (1 0 0), (1 1 1) and (1 1 0), respectively, under $n_\\text{H}/\\text{Vac} = 2$. The view corresponding to (1 0 0) surfaces (a, d) has been tilted for improvement of clearness. Atoms located at the surface and those with centrosymmetry parameter (CSP) smaller than 5 are omitted for clarity. (m) Schematic of the $\\{1\\,1\\,1\\}$ planes projected (dashed blue lines) onto (1 0 0), (1 1 1) and (1 1 0) surfaces."
        },
        {
          "id": "fig-5",
          "sheetIndex": 5,
          "type": "image",
          "badge": "FIGURE 05",
          "title": "Channeling map and H, recoil and vacancy depth distributions",
          "src": "assets/papers/blistering_cu_2026/Fig. 5.jpg",
          "caption": "Fig. 5. (a) Channeling map for the $45\\text{ keV}$ H ion irradiation of Cu calculated using the MDRANGE code. The map is colored according to the mean H penetration depth (in nm, see the color bar) for each crystallographic direction identified by the pair of the polar and azimuthal angles. The main crystallographic directions are indicated at the corners of the map. The plot is generated with the polar and azimuthal angular steps of $1^\\circ$, and each point is the average obtained for 100 impacts. (b) Zoom-in of grain boundary between (1 1 1) (blue) and (1 0 0) (red) grains at the transition area. The rectangular zones marked in each grain are of the same area. (c) Vacancies (black), recoil atoms with the energy above $40\\text{ eV}$ (magenta) depth distributions as well as the H depth profile (olive) obtained by the CASWIN code, averaged over 50 000 H ion impacts. The $y$-axis shows the probability density depth distribution per ion impact. Black, magenta and olive vertical dashed lines mark the maxima of vacancy, recoil and H depth distributions, respectively. (d) H depth profile (open markers) and distribution of recoils with energy above $40\\text{ eV}$ (filled markers) for $\\langle 1\\,0\\,0 \\rangle$ (square), $\\langle 1\\,1\\,1 \\rangle$ (triangle) and $\\langle 1\\,1\\,0 \\rangle$ (diamond) as a function of depth in MDRANGE averaged over 10 000 ion impacts. The recoil profiles are used to model the vacancy profile shown in (c). Vertical lines of different colors mark the maxima of the distributions of the corresponding colors."
        },
        {
          "id": "video-s1",
          "sheetIndex": 6,
          "type": "video",
          "badge": "VIDEO S1",
          "title": "Disk-shaped bubble under a (1 0 0) surface: square protrusion",
          "src": "assets/papers/blistering_cu_2026/Video S1.mp4",
          "caption": "Video S1. Disk-shaped H bubble beneath a (1 0 0) Cu surface under $n_\\text{H}/\\text{Vac} = 2$. The complex dislocation-mediated interaction of the bubble with the surface: stacking faults between Shockley partials extend from the bubble towards the surface in four $\\langle 1\\,1\\,0 \\rangle$ directions on the $\\{1\\,1\\,1\\}$ planes, intersect the (1 0 0) surface at $45^\\circ$ and form the square protrusion of Fig. 4a and 4d."
        },
        {
          "id": "video-s2",
          "sheetIndex": 7,
          "type": "video",
          "badge": "VIDEO S2",
          "title": "Hemispherical bubble under a (1 0 0) surface: terraced protrusion",
          "src": "assets/papers/blistering_cu_2026/Video S2.mp4",
          "caption": "Video S2. Hemispherical H bubble beneath a (1 0 0) Cu surface under $n_\\text{H}/\\text{Vac} = 2$. The curved top of the bubble offers a larger area for shear stress to build up along the $\\{1\\,1\\,1\\}$ slip planes, facilitating the emission of dislocations. The protrusion forms as terraces, multilayered formations that stand out from the surface much more strongly than for the disk-shaped bubble (Fig. 4g and 4j)."
        },
        {
          "id": "video-s3",
          "sheetIndex": 8,
          "type": "video",
          "badge": "VIDEO S3",
          "title": "Disk-shaped bubble under a (1 1 0) surface: rhomboid protrusion",
          "src": "assets/papers/blistering_cu_2026/Video S3.mp4",
          "caption": "Video S3. Disk-shaped H bubble beneath a (1 1 0) Cu surface under $n_\\text{H}/\\text{Vac} = 2$. The stacking faults grow straight to the surface along the $\\{1\\,1\\,1\\}$ planes perpendicular to the (1 1 0) surface. These planes form angles of approximately $71^\\circ$ and $109^\\circ$, the same vertex angles as the rhomboid-shaped protrusion (Fig. 4c and 4f) and the blisters seen in experiment."
        },
        {
          "id": "video-s4",
          "sheetIndex": 9,
          "type": "video",
          "badge": "VIDEO S4",
          "title": "Hemispherical bubble under a (1 1 0) surface: larger terraced rhomboid",
          "src": "assets/papers/blistering_cu_2026/Video S4.mp4",
          "caption": "Video S4. Hemispherical H bubble beneath a (1 1 0) Cu surface under $n_\\text{H}/\\text{Vac} = 2$. The protrusion again appears in a rhomboidal shape, as for the disk-shaped bubble, but it is larger and terraced as on the (1 0 0) surface, a direct consequence of the curvature of the top of the bubble (Fig. 4i and 4l)."
        },
        {
          "id": "video-s5",
          "sheetIndex": 10,
          "type": "video",
          "badge": "VIDEO S5",
          "title": "Disk-shaped bubble under a (1 1 1) surface: triangular protrusion",
          "src": "assets/papers/blistering_cu_2026/Video S5.mp4",
          "caption": "Video S5. Disk-shaped H bubble placed deeper beneath a (1 1 1) Cu surface at higher pressure. Significant plastic deformation develops as a dislocation network between the bubble and the surface. Stacking faults forming along the three $\\{1\\,1\\,1\\}$ planes intersect the (1 1 1) surface in the form of a triangle, producing the triangular protrusion of Fig. 4b and 4e."
        },
        {
          "id": "video-s6",
          "sheetIndex": 11,
          "type": "video",
          "badge": "VIDEO S6",
          "title": "Hemispherical bubble under a (1 1 1) surface: dislocation emission",
          "src": "assets/papers/blistering_cu_2026/Video S6.mp4",
          "caption": "Video S6. Hemispherical H bubble beneath a (1 1 1) Cu surface under $n_\\text{H}/\\text{Vac} = 2$: the complete process of dislocation emission. The protrusion is much less clear, with many triangular shapes standing out, because there are more frequent sites where dislocations can be emitted, and it tends towards a more circular shape than for the disk-shaped bubble (Fig. 4h and 4k)."
        }
      ]
    }
  };

  function initPaperFolio() {
    const dialog = document.querySelector("#paper-folio-dialog");
    if (!dialog) return;

    const pdfBtn = document.querySelector("#paper-folio-pdf-btn");
    const closeBtn = document.querySelector("#paper-folio-close");
    const btnPrev = document.querySelector("#folio-btn-prev");
    const btnNext = document.querySelector("#folio-btn-next");
    const stripEl = document.querySelector("#paper-folio-strip");

    const bookHardcoverCase = document.querySelector("#book-hardcover-case");
    const pageLeft = document.querySelector("#book-page-left");
    const pageRight = document.querySelector("#book-page-right");
    const flippingLeaf = document.querySelector("#book-flipping-leaf");
    const leafFaceFront = document.querySelector("#leaf-face-front");
    const leafFaceBack = document.querySelector("#leaf-face-back");

    const handlePrev = document.querySelector("#handle-prev");
    const handleNext = document.querySelector("#handle-next");
    const handIndicatorPrev = document.querySelector("#hand-indicator-prev");
    const handIndicatorNext = document.querySelector("#hand-indicator-next");

    const zoomOverlay = document.querySelector("#paper-folio-zoom");
    const zoomImg = document.querySelector("#paper-folio-zoom-img");
    const zoomCaption = document.querySelector("#paper-folio-zoom-caption");
    const zoomClose = document.querySelector("#paper-folio-zoom-close");

    let currentPaper = null;
    let currentSpreadIndex = 0; // 0 = front cover, 1 = front matter, then plates, conclusions, back cover

    // Spread layout for N plates: 0 cover | 1 front matter | 2..N+1 plates | N+2 conclusions | N+3 back cover
    const plateCount = () => (currentPaper ? currentPaper.plates.length : 0);
    const conclusionSpread = () => plateCount() + 2;
    const backCoverSpread = () => plateCount() + 3;
    const isPlateSpread = i => i >= 2 && i <= plateCount() + 1;
    let isFlipping = false;
    let isDragging = false;
    let dragDirection = null; // 'next' or 'prev'
    let startX = 0;
    let startY = 0;
    let targetSpreadIndex = 0;

    function replaceFrac(str) {
      let idx = 0;
      while ((idx = str.indexOf("\\frac{", idx)) !== -1) {
        let numStart = idx + 6;
        let depth = 1;
        let numEnd = -1;
        for (let i = numStart; i < str.length; i++) {
          if (str[i] === "{") depth++;
          else if (str[i] === "}") {
            depth--;
            if (depth === 0) { numEnd = i; break; }
          }
        }
        if (numEnd === -1 || str[numEnd + 1] !== "{") {
          idx += 6;
          continue;
        }
        let denStart = numEnd + 2;
        depth = 1;
        let denEnd = -1;
        for (let i = denStart; i < str.length; i++) {
          if (str[i] === "{") depth++;
          else if (str[i] === "}") {
            depth--;
            if (depth === 0) { denEnd = i; break; }
          }
        }
        if (denEnd === -1) {
          idx += 6;
          continue;
        }
        const num = str.slice(numStart, numEnd);
        const den = str.slice(denStart, denEnd);

        function fmtTerm(t) {
          t = t.replace(/\\text\{([^}]+)\}/g, "$1");
          t = t.replace(/N_(?:\{Nb\}|Nb)/g, "<i>N</i><sub>Nb</sub>");
          t = t.replace(/N_(?:\{Cu\}|Cu)/g, "<i>N</i><sub>Cu</sub>");
          t = t.replace(/N_(?:\{all\}|all)/g, "<i>N</i><sub>all</sub>");
          t = t.replace(/[‘'\u2018\u2019]Other['’\u2018\u2019]/g, "'Other'");
          return t;
        }
        const html = `<span class="folio-math"><span class="math-frac"><span class="math-num">${fmtTerm(num)}</span><span class="math-denom">${fmtTerm(den)}</span></span></span>`;
        str = str.slice(0, idx) + html + str.slice(denEnd + 1);
        idx += html.length;
      }
      return str;
    }

    function formatScientificText(text) {
      if (!text) return "";
      let out = text.replace(/\$([^$]+)\$/g, (match, expr) => {
        let s = expr;
        s = replaceFrac(s);
        s = s.replace(/\\text\{([^}]+)\}/g, "$1");
        s = s.replace(/f_(?:\{?\\text\{BCC\}|\{?BCC\}?)/g, `<i class="math-var">f</i><sub>BCC</sub>`);
        s = s.replace(/([A-Za-z]+)\^\{?(\+{1,2}|\-{1,2}|\d+\+?)\}?/g, "$1<sup>$2</sup>");
        s = s.replace(/Cu_\{?(\d+)\}?Nb_\{?(\d+)\}?/g, "Cu<sub>$1</sub>Nb<sub>$2</sub>");
        s = s.replace(/nm\^3/g, "nm<sup>3</sup>");
        s = s.replace(/\\AA|&#8491;|Å/g, "&#8491;");
        s = s.replace(/\\sigma/g, "&sigma;");
        s = s.replace(/\\theta\s*=\s*0\^\\circ/g, "&theta; = 0&deg;");
        s = s.replace(/0\^\\circ/g, "0&deg;");
        s = s.replace(/75\^\\circ/g, "75&deg;");
        s = s.replace(/\\Theta/g, "&Theta;");
        s = s.replace(/\\approx/g, "&approx;");
        s = s.replace(/\\sim/g, "&sim;");
        s = s.replace(/\\times/g, "&times;");
        s = s.replace(/\\--|--/g, "&ndash;");
        s = s.replace(/\\%/g, "%");
        s = s.replace(/\bf_i\b/g, "<i>f<sub>i</sub></i>");
        s = s.replace(/\bE_i\b/g, "<i>E<sub>i</sub></i>");
        s = s.replace(/\bfi\b/g, "<i>f<sub>i</sub></i>");
        s = s.replace(/\bEi\b/g, "<i>E<sub>i</sub></i>");
        s = s.replace(/\bZ\b/g, "<i>Z</i>");
        // Generic pieces (after the specific rules above, so those keep precedence)
        s = s.replace(/\\,/g, " ");
        s = s.replace(/\^\\circ/g, "&deg;");
        s = s.replace(/\^\{([^{}]+)\}/g, "<sup>$1</sup>");
        s = s.replace(/\^([0-9+\-])/g, "<sup>$1</sup>");
        s = s.replace(/_\{([^{}]+)\}/g, "<sub>$1</sub>");
        s = s.replace(/([A-Za-z])_([A-Za-z0-9])/g, "$1<sub>$2</sub>");
        s = s.replace(/\\\{/g, "{").replace(/\\\}/g, "}");
        s = s.replace(/\\langle\s*/g, "&lang;").replace(/\s*\\rangle/g, "&rang;");
        return `<span class="folio-math-term">${s}</span>`;
      });
      out = out.replace(/\bfi\s*=\s*(\d+)%/g, "<i>f<sub>i</sub></i> = $1%");
      out = out.replace(/\bEi\s*=\s*(\d+)\s*(?:eV)?/g, "<i>E<sub>i</sub></i> = $1 eV");
      return out;
    }

    // Readable text for aria-label / alt (no LaTeX, no tags)
    function plainScientificText(text) {
      const tmp = document.createElement("div");
      tmp.innerHTML = formatScientificText(text);
      return tmp.textContent.replace(/"/g, "'").trim();
    }

    // Split the conclusions at the sentence boundary closest to half of the text, so both
    // pages carry a similar amount. A paragraph cut in two continues on the right page.
    function splitConclusion(paragraphs) {
      const pieces = [];
      paragraphs.forEach((para, pi) => {
        para.split(/(?<=[.!?])\s+(?=[A-Z])/).forEach(sentence => pieces.push({ pi, sentence }));
      });
      const total = pieces.reduce((n, p) => n + p.sentence.length, 0);
      let best = 1;
      let bestDiff = Infinity;
      let cum = 0;
      for (let k = 1; k < pieces.length; k++) {
        cum += pieces[k - 1].sentence.length;
        // The left page also holds the "Conclusions" heading, so aim slightly below half
        const diff = Math.abs(cum - total * 0.47);
        if (diff < bestDiff) { bestDiff = diff; best = k; }
      }
      const group = list => {
        const out = [];
        list.forEach(p => {
          const last = out[out.length - 1];
          if (last && last.pi === p.pi) last.text += " " + p.sentence;
          else out.push({ pi: p.pi, text: p.sentence });
        });
        return out;
      };
      const left = group(pieces.slice(0, best));
      const right = group(pieces.slice(best));
      const continued = left.length && right.length && left[left.length - 1].pi === right[0].pi;
      return { left: left.map(p => p.text), right: right.map(p => p.text), continued };
    }

    // Shrink long captions / conclusions until they fit their page; scroll as a last resort
    const FIT_SELECTORS = ".plate-caption-text, .conclusion-body";
    const FIT_MIN_PX = 10.5;
    function fitPageText(root) {
      root.querySelectorAll(FIT_SELECTORS).forEach(el => {
        el.style.fontSize = "";
        el.classList.remove("is-scrollable");
        if (!el.clientHeight) return; // not laid out yet (hidden leaf); refitted when shown
        let size = parseFloat(getComputedStyle(el).fontSize);
        while (el.scrollHeight > el.clientHeight + 1 && size > FIT_MIN_PX) {
          size -= 0.5;
          el.style.fontSize = `${size}px`;
        }
        if (el.scrollHeight > el.clientHeight + 1) el.classList.add("is-scrollable");
      });
    }

    function setPage(el, spreadIndex, side) {
      el.innerHTML = getPageHtml(spreadIndex, side);
      fitPageText(el);
      requestAnimationFrame(() => fitPageText(el));
    }

    // Both conclusion pages use the same (smallest fitted) font size
    function equalizeConclusionFont() {
      const bodies = [pageLeft, pageRight].map(p => p.querySelector(".conclusion-body")).filter(Boolean);
      if (bodies.length !== 2) return;
      const min = Math.min(...bodies.map(b => parseFloat(getComputedStyle(b).fontSize)));
      bodies.forEach(b => { b.style.fontSize = `${min}px`; });
    }

    function getPageHtml(spreadIndex, side) {
      if (!currentPaper) return "";

      // State 0: Closed Front Hardcover
      if (spreadIndex === 0) {
        if (side === 'left') {
          return `<div class="page-content page-blank"></div>`;
        }
        return `
          <div class="hardcover-surface cover-front" role="button" tabindex="0" aria-label="Open paper folio">
            <div class="cover-spine-groove"></div>
          </div>
        `;
      }

      // Spread 1: Front Matter (Pages 1 & 2)
      if (spreadIndex === 1) {
        if (side === 'left') {
          const highlightsHtml = currentPaper.highlights.map(h => `<li>${formatScientificText(h)}</li>`).join("");
          return `
            <div class="page-content page-frontmatter">
              <div class="page-running-header">
                <span class="rh-journal">${currentPaper.journal}</span>
                <a class="rh-doi" href="${currentPaper.doiUrl}" target="_blank" rel="noopener noreferrer">doi:${currentPaper.doiUrl.replace("https://doi.org/", "")} ↗</a>
              </div>
              <h2 class="book-paper-title">${currentPaper.title}</h2>
              <p class="book-paper-authors">${currentPaper.authors}</p>
              
              <div class="book-highlights-section">
                <h3 class="book-section-label">${currentPaper.highlightsLabel || "Key Research Highlights"}</h3>
                <ul class="book-highlights-bullets">
                  ${highlightsHtml}
                </ul>
              </div>

              <div class="book-keywords-section">
                <h3 class="book-section-label">Keywords</h3>
                <p class="book-keywords-text">${currentPaper.keywords}</p>
              </div>

              <div class="page-footer-num num-left">1</div>
            </div>
          `;
        } else {
          return `
            <div class="page-content page-abstract">
              <div class="page-running-header">
                <span class="rh-section">Abstract &amp; Graphical Overview</span>
              </div>
              <h3 class="book-abstract-heading">Abstract</h3>
              <p class="book-abstract-p">${formatScientificText(currentPaper.abstract)}</p>

              <div class="book-ga-box">
                <div class="book-ga-img-wrap" data-zoom-src="${currentPaper.graphicalAbstract}" data-zoom-caption="${currentPaper.graphicalAbstractCaption}">
                  <img src="${currentPaper.graphicalAbstract}" alt="Graphical Abstract" class="book-ga-img">
                  <span class="ga-zoom-badge">🔍 Click to zoom</span>
                </div>
              </div>

              <div class="page-footer-num num-right">2</div>
            </div>
          `;
        }
      }

      // Plate spreads: one figure or video per spread
      if (isPlateSpread(spreadIndex)) {
        const plateIndex = spreadIndex - 2;
        const plate = currentPaper.plates[plateIndex];
        const leftPageNum = 2 * spreadIndex - 1;
        const rightPageNum = 2 * spreadIndex;
        const isVideo = plate.type === "video";

        if (side === 'left') {
          return `
            <div class="page-content page-plate-media">
              <div class="page-running-header">
                <span class="rh-section">${plate.badge} · Scientific Plate</span>
              </div>
              <div class="plate-media-container">
                ${isVideo ? `
                  <video class="book-plate-video" controls playsinline preload="metadata">
                    <source src="${plate.src}" type="video/mp4">
                    Your browser does not support the video tag.
                  </video>
                ` : `
                  <div class="book-plate-img-wrap" data-zoom-src="${plate.src}" data-zoom-caption="${plate.badge} · ${plate.title}">
                    <img class="book-plate-img" src="${plate.src}" alt="${plate.badge} · ${plainScientificText(plate.title)}">
                    <span class="plate-zoom-badge">🔍 Expand Figure</span>
                  </div>
                `}
              </div>
              <div class="page-footer-num num-left">${leftPageNum}</div>
            </div>
          `;
        } else {
          return `
            <div class="page-content page-plate-caption caption-revealed">
              <div class="page-running-header">
                <span class="rh-section">Plate Description &amp; Analysis</span>
              </div>
              <div class="caption-card-inner">
                <div class="plate-badge-row">
                  <span class="plate-badge">${plate.badge}</span>
                  <span class="plate-tag">${isVideo ? "Molecular Dynamics Animation" : "High-Resolution Simulation"}</span>
                </div>
                <h3 class="plate-title">${formatScientificText(plate.title)}</h3>
                <div class="plate-rule"></div>
                <div class="plate-caption-text">
                  ${formatScientificText(plate.caption)}
                </div>
              </div>
              <div class="page-footer-num num-right">${rightPageNum}</div>
            </div>
          `;
        }
      }

      // Conclusions spread: paragraphs split across the two pages
      if (spreadIndex === conclusionSpread()) {
        const split = splitConclusion(currentPaper.conclusion);
        const toHtml = (list, firstContinued = false) => list
          .map((t, i) => `<p${firstContinued && i === 0 ? ' class="para-continued"' : ""}>${formatScientificText(t)}</p>`)
          .join("");
        if (side === 'left') {
          return `
            <div class="page-content page-conclusion">
              <div class="page-running-header">
                <span class="rh-section">Discussion &amp; Conclusions</span>
              </div>
              <h2 class="book-conclusion-title">Conclusions</h2>
              <div class="conclusion-body">
                ${toHtml(split.left)}
              </div>
              <div class="page-footer-num num-left">${2 * spreadIndex - 1}</div>
            </div>
          `;
        } else {
          return `
            <div class="page-content page-conclusion">
              <div class="page-running-header">
                <span class="rh-section">Conclusions (Continued)</span>
              </div>
              <div class="conclusion-body">
                ${toHtml(split.right, split.continued)}
              </div>
              <div class="conclusion-seal">
                <span class="seal-mark">✦ ✦ ✦</span>
                <span class="seal-label">${currentPaper.sealLabel}</span>
              </div>
              <div class="page-footer-num num-right">${2 * spreadIndex}</div>
            </div>
          `;
        }
      }

      // Closed back hardcover
      if (spreadIndex === backCoverSpread()) {
        if (side === 'left') {
          return `<div class="page-content page-blank"></div>`;
        }
        return `
          <div class="hardcover-surface cover-back">
            <div class="cover-spine-groove"></div>
            <div class="backcover-overlay-content">
              <div class="backcover-actions">
                <button class="backcover-btn btn-reopen" id="backcover-reopen" type="button">
                  ← Reopen Book (First Page)
                </button>
                <a class="backcover-btn btn-pdf" href="${encodeURI(currentPaper.pdfUrl)}" target="_blank" rel="noopener noreferrer" download>
                  📄 Download Full PDF ↗
                </a>
                <button class="backcover-btn btn-close" id="backcover-close" type="button">
                  × Return to Portfolio
                </button>
              </div>
            </div>
          </div>
        `;
      }

      return "";
    }

    function wirePageInteractions(container) {
      if (!container) return;
      container.querySelectorAll("[data-zoom-src]").forEach(el => {
        el.addEventListener("click", () => {
          openZoom(el.dataset.zoomSrc, el.dataset.zoomCaption || "", el);
        });
        makeKeyboardActivatable(el, `Enlarge: ${el.dataset.zoomCaption || "figure"}`);
      });

      const coverFront = container.querySelector(".cover-front");
      if (coverFront) {
        coverFront.style.cursor = "pointer";
        coverFront.addEventListener("click", () => {
          if (!isDragging) {
            flipToSpread(1);
          }
        });
        makeKeyboardActivatable(coverFront); // role, tabindex and label are set in the markup
      }

      const btnReopen = container.querySelector("#backcover-reopen");
      if (btnReopen) {
        btnReopen.addEventListener("click", () => {
          flipToSpread(0);
        });
      }

      const btnClose = container.querySelector("#backcover-close");
      if (btnClose) {
        btnClose.addEventListener("click", closeFolio);
      }
    }

    // Book pose: closed (front or back cover, centered) or open (two-page spread, shifted right)
    function setBookPose(spreadIndex) {
      bookHardcoverCase.dataset.pose = (spreadIndex === 0 || spreadIndex === backCoverSpread()) ? "closed" : "open";
    }

    function renderSpread(spreadIndex, isAfterTurn = false) {
      if (!currentPaper) return;
      setBookPose(spreadIndex);

      // Update case state class
      bookHardcoverCase.classList.remove("state-front-cover", "state-back-cover", "state-open-spread");
      if (spreadIndex === 0) {
        bookHardcoverCase.classList.add("state-front-cover");
      } else if (spreadIndex === backCoverSpread()) {
        bookHardcoverCase.classList.add("state-back-cover");
      } else {
        bookHardcoverCase.classList.add("state-open-spread");
      }

      // Pause existing video if any
      const existingVideo = bookHardcoverCase.querySelector("video");
      if (existingVideo) existingVideo.pause();

      setPage(pageLeft, spreadIndex, 'left');
      setPage(pageRight, spreadIndex, 'right');

      wirePageInteractions(pageLeft);
      wirePageInteractions(pageRight);
      requestAnimationFrame(() => {
        fitPageText(pageLeft);
        fitPageText(pageRight);
        equalizeConclusionFont();
      });

      // Staggered caption reveal on right page
      if (isPlateSpread(spreadIndex)) {
        const captionCard = pageRight.querySelector(".page-plate-caption");
        if (captionCard) {
          if (isAfterTurn) {
            captionCard.classList.add("caption-pending");
            captionCard.classList.remove("caption-revealed");
            setTimeout(() => {
              captionCard.classList.remove("caption-pending");
              captionCard.classList.add("caption-revealed");
            }, 60);
          } else {
            captionCard.classList.remove("caption-pending");
            captionCard.classList.add("caption-revealed");
          }
        }
      }

      updateNavUI();
    }

    function updateNavUI() {
      if (!currentPaper) return;

      if (btnPrev) btnPrev.disabled = currentSpreadIndex === 0;
      if (btnNext) btnNext.disabled = currentSpreadIndex === backCoverSpread();

      const isClosed = currentSpreadIndex === 0 || currentSpreadIndex === backCoverSpread();
      if (handlePrev) handlePrev.style.display = isClosed ? "none" : "flex";
      if (handleNext) handleNext.style.display = isClosed ? "none" : "flex";

      // Dynamic handle hints
      if (handleNext) {
        const hintNext = handleNext.querySelector(".handle-hint");
        if (hintNext) {
          if (currentSpreadIndex === 0) hintNext.textContent = "Click or drag to open";
          else if (currentSpreadIndex === conclusionSpread()) hintNext.textContent = "Close to back cover";
          else hintNext.textContent = "Drag to turn page";
        }
      }

      if (handlePrev) {
        const hintPrev = handlePrev.querySelector(".handle-hint");
        if (hintPrev) {
          if (currentSpreadIndex === 1) hintPrev.textContent = "Close to front cover";
          else if (currentSpreadIndex === backCoverSpread()) hintPrev.textContent = "Drag to reopen";
          else hintPrev.textContent = "Drag to turn back";
        }
      }

      // Update pagination dots
      if (stripEl) {
        stripEl.querySelectorAll(".folio-dot-item").forEach(item => {
          const idx = parseInt(item.dataset.spreadIndex, 10);
          const isActive = idx === currentSpreadIndex;
          item.classList.toggle("active", isActive);
          if (isActive) item.setAttribute("aria-current", "page");
          else item.removeAttribute("aria-current");
        });
      }
    }

    // =========================================================================
    // Real-Time 2D/3D Deformable Corner-Fold Engine (Turn.js / Flipbook Physics)
    // =========================================================================

    let currentAnimId = null;
    let lastCornerX = 0;
    let lastCornerY = 0;

    // Sutherland-Hodgman Polygon Clipper against Half-Plane (nx*X + ny*Y <= d0 or >= d0)
    function clipPolygonHalfPlane(poly, nx, ny, d0, keepLess) {
      const out = [];
      const n = poly.length;
      if (n === 0) return out;
      for (let i = 0; i < n; i++) {
        const cur = poly[i];
        const prev = poly[(i + n - 1) % n];
        const curVal = nx * cur[0] + ny * cur[1] - d0;
        const prevVal = nx * prev[0] + ny * prev[1] - d0;
        const curInside = keepLess ? curVal <= 1e-4 : curVal >= -1e-4;
        const prevInside = keepLess ? prevVal <= 1e-4 : prevVal >= -1e-4;

        if (curInside) {
          if (!prevInside) {
            const denom = curVal - prevVal;
            const t = Math.abs(denom) < 1e-6 ? 0 : -prevVal / denom;
            out.push([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]);
          }
          out.push(cur);
        } else if (prevInside) {
          const denom = curVal - prevVal;
          const t = Math.abs(denom) < 1e-6 ? 0 : -prevVal / denom;
          out.push([prev[0] + t * (cur[0] - prev[0]), prev[1] + t * (cur[1] - prev[1])]);
        }
      }
      return out;
    }

    // Apply Forward Deformable Fold from Bottom-Right Corner (W, H)
    function applyForwardFold(x, y, W, H) {
      if (x > W) x = W;
      if (y > H) y = H;

      // Constrain distance from bottom spine (0, H) <= W
      const dSpine = Math.hypot(x, H - y);
      if (dSpine > W) {
        const r = W / Math.max(1, dSpine);
        x = x * r;
        y = H - (H - y) * r;
      }

      // Constrain distance from top spine (0, 0) <= sqrt(W^2 + H^2)
      const maxDiag = Math.hypot(W, H);
      const dDiag = Math.hypot(x, y);
      if (dDiag > maxDiag) {
        const r = maxDiag / Math.max(1, dDiag);
        x = x * r;
        y = y * r;
      }

      const vx = W - x;
      const vy = H - y;
      const len = Math.hypot(vx, vy);

      if (len < 2) {
        leafFaceFront.style.clipPath = "none";
        leafFaceBack.style.clipPath = "polygon(0 0, 0 0, 0 0)";
        leafFaceBack.style.transform = "matrix(1, 0, 0, 1, 0, 0)";
        handIndicatorNext.style.transform = "translate3d(0px, 0px, 0)";
        return;
      }

      const nx = vx / len;
      const ny = vy / len;
      const mx = (W + x) / 2;
      const my = (H + y) / 2;
      const d0 = nx * mx + ny * my;

      // Reflection matrix components
      const r00 = 1 - 2 * nx * nx;
      const r01 = -2 * nx * ny;
      const r02 = 2 * d0 * nx;
      const r10 = -2 * nx * ny;
      const r11 = 1 - 2 * ny * ny;
      const r12 = 2 * d0 * ny;

      // Un-mirrored screen matrix: M_screen = M_refl * M_convert (det = +1.0)
      const a = -r00;
      const b = -r10;
      const c = r01;
      const d = r11;
      const e = r00 * W + r02;
      const f = r10 * W + r12;

      const rect = [[0, 0], [W, 0], [W, H], [0, H]];
      const frontPoly = clipPolygonHalfPlane(rect, nx, ny, d0, true);
      // Flap polygon in left-page coordinate space
      const flapPolyLeft = clipPolygonHalfPlane(rect, -nx, ny, d0 - nx * W, false);

      if (frontPoly.length >= 3) {
        leafFaceFront.style.clipPath = `polygon(${frontPoly.map(p => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(', ')})`;
      } else {
        leafFaceFront.style.clipPath = "polygon(0 0, 0 0, 0 0)";
      }

      if (flapPolyLeft.length >= 3) {
        leafFaceBack.style.clipPath = `polygon(${flapPolyLeft.map(p => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(', ')})`;
        leafFaceBack.style.transform = `matrix(${a.toFixed(6)}, ${b.toFixed(6)}, ${c.toFixed(6)}, ${d.toFixed(6)}, ${e.toFixed(2)}, ${f.toFixed(2)})`;
      } else {
        leafFaceBack.style.clipPath = "polygon(0 0, 0 0, 0 0)";
      }

      // Clenched hand follows corner point only while dragging
      if (isDragging) {
        const tilt = -12 + (Math.atan2(vy, vx) * 180 / Math.PI) * 0.35;
        handIndicatorNext.style.transform = `translate3d(${(x - W).toFixed(1)}px, ${(y - H).toFixed(1)}px, 0) scale(0.9) rotate(${tilt.toFixed(1)}deg)`;
      }
    }

    // Apply Backward Deformable Fold from Bottom-Left Corner (0, H)
    function applyBackwardFold(x, y, W, H) {
      if (x < 0) x = 0;
      if (y > H) y = H;

      // Constrain distance from bottom spine (W, H) <= W
      const dSpine = Math.hypot(W - x, H - y);
      if (dSpine > W) {
        const r = W / Math.max(1, dSpine);
        x = W - (W - x) * r;
        y = H - (H - y) * r;
      }

      // Constrain distance from top spine (W, 0) <= sqrt(W^2 + H^2)
      const maxDiag = Math.hypot(W, H);
      const dDiag = Math.hypot(W - x, y);
      if (dDiag > maxDiag) {
        const r = maxDiag / Math.max(1, dDiag);
        x = W - (W - x) * r;
        y = y * r;
      }

      const vx = 0 - x;
      const vy = H - y;
      const len = Math.hypot(vx, vy);

      if (len < 2) {
        leafFaceFront.style.clipPath = "none";
        leafFaceBack.style.clipPath = "polygon(0 0, 0 0, 0 0)";
        leafFaceBack.style.transform = "matrix(1, 0, 0, 1, 0, 0)";
        handIndicatorPrev.style.transform = "translate3d(0px, 0px, 0)";
        return;
      }

      const nx = vx / len;
      const ny = vy / len;
      const mx = x / 2;
      const my = (H + y) / 2;
      const d0 = nx * mx + ny * my;

      const r00 = 1 - 2 * nx * nx;
      const r01 = -2 * nx * ny;
      const r02 = 2 * d0 * nx;
      const r10 = -2 * nx * ny;
      const r11 = 1 - 2 * ny * ny;
      const r12 = 2 * d0 * ny;

      // Un-mirrored screen matrix: M_screen = M_refl * M_convert (det = +1.0)
      const a = -r00;
      const b = -r10;
      const c = r01;
      const d = r11;
      const e = r00 * W + r02;
      const f = r10 * W + r12;

      const rect = [[0, 0], [W, 0], [W, H], [0, H]];
      const frontPoly = clipPolygonHalfPlane(rect, nx, ny, d0, true);
      // Flap polygon in right-page coordinate space
      const flapPolyRight = clipPolygonHalfPlane(rect, -nx, ny, d0 - nx * W, false);

      if (frontPoly.length >= 3) {
        leafFaceFront.style.clipPath = `polygon(${frontPoly.map(p => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(', ')})`;
      } else {
        leafFaceFront.style.clipPath = "polygon(0 0, 0 0, 0 0)";
      }

      if (flapPolyRight.length >= 3) {
        leafFaceBack.style.clipPath = `polygon(${flapPolyRight.map(p => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(', ')})`;
        leafFaceBack.style.transform = `matrix(${a.toFixed(6)}, ${b.toFixed(6)}, ${c.toFixed(6)}, ${d.toFixed(6)}, ${e.toFixed(2)}, ${f.toFixed(2)})`;
      } else {
        leafFaceBack.style.clipPath = "polygon(0 0, 0 0, 0 0)";
      }

      if (isDragging) {
        const tilt = 12 - (Math.atan2(vy, -vx) * 180 / Math.PI) * 0.35;
        handIndicatorPrev.style.transform = `translate3d(${x.toFixed(1)}px, ${(y - H).toFixed(1)}px, 0) scale(0.9) rotate(${tilt.toFixed(1)}deg)`;
      }
    }

    // Animation Loop for Spring / Easing Arc Release
    function animateCornerFold(direction, x0, y0, x1, y1, duration, onComplete) {
      if (currentAnimId) {
        cancelAnimationFrame(currentAnimId);
        currentAnimId = null;
      }

      const startTime = performance.now();
      const W = flippingLeaf.offsetWidth || (bookHardcoverCase.offsetWidth / 2);
      const H = flippingLeaf.offsetHeight || 600;

      function step(now) {
        const elapsed = now - startTime;
        const t = Math.min(1, elapsed / duration);
        const e = 1 - Math.pow(1 - t, 3); // Cubic ease-out

        const curX = x0 + (x1 - x0) * e;
        const curY = y0 + (y1 - y0) * e - 50 * Math.sin(Math.PI * e);

        if (direction === 'next') {
          applyForwardFold(curX, curY, W, H);
        } else {
          applyBackwardFold(curX, curY, W, H);
        }

        if (t < 1) {
          currentAnimId = requestAnimationFrame(step);
        } else {
          currentAnimId = null;
          if (typeof onComplete === 'function') {
            onComplete();
          }
        }
      }

      currentAnimId = requestAnimationFrame(step);
    }

    // Forward Drag (Bottom-Right Handle)
    function onPointerDownNext(e) {
      if (e.button !== 0 || isFlipping || currentSpreadIndex >= backCoverSpread()) return;

      isDragging = true;
      dragDirection = 'next';
      targetSpreadIndex = currentSpreadIndex + 1;

      try {
        handleNext.setPointerCapture(e.pointerId);
      } catch (err) { }

      handleNext.classList.add("is-grabbing");
      if (handlePrev) handlePrev.style.visibility = "hidden";
      handIndicatorNext.classList.add("hand-clenched");
      startX = e.clientX;
      startY = e.clientY;

      flippingLeaf.style.transformOrigin = "";
      flippingLeaf.style.transformStyle = "";
      leafFaceFront.style.backfaceVisibility = "visible";
      leafFaceBack.style.backfaceVisibility = "visible";

      flippingLeaf.style.left = "auto";
      flippingLeaf.style.right = "10px";
      flippingLeaf.style.width = "calc(50% - 10px)";

      setPage(leafFaceFront, currentSpreadIndex, 'right');
      setPage(leafFaceBack, targetSpreadIndex, 'left');
      setPage(pageRight, targetSpreadIndex, 'right');

      const nextCap = pageRight.querySelector(".page-plate-caption");
      if (nextCap) {
        nextCap.classList.add("caption-pending");
        nextCap.classList.remove("caption-revealed");
      }

      flippingLeaf.style.display = "block";
      const W = flippingLeaf.offsetWidth || (bookHardcoverCase.offsetWidth / 2);
      const H = flippingLeaf.offsetHeight || 600;

      lastCornerX = W;
      lastCornerY = H;

      applyForwardFold(W, H, W, H);
    }

    function onPointerMoveNext(e) {
      if (!isDragging || dragDirection !== 'next') return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const W = flippingLeaf.offsetWidth || (bookHardcoverCase.offsetWidth / 2);
      const H = flippingLeaf.offsetHeight || 600;

      const targetX = W + dx;
      const targetY = H + dy;
      lastCornerX = targetX;
      lastCornerY = targetY;

      applyForwardFold(targetX, targetY, W, H);
    }

    function onPointerUpNext(e) {
      if (!isDragging || dragDirection !== 'next') return;
      isDragging = false;

      try {
        handleNext.releasePointerCapture(e.pointerId);
      } catch (err) { }

      handleNext.classList.remove("is-grabbing");
      if (handlePrev) handlePrev.style.visibility = "";

      const W = flippingLeaf.offsetWidth || (bookHardcoverCase.offsetWidth / 2);
      const H = flippingLeaf.offsetHeight || 600;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const dragDist = startX - e.clientX;
      const progress = Math.max(0, dragDist / W);
      const isQuickClick = Math.abs(dx) < 12 && Math.abs(dy) < 12;

      if (isQuickClick || progress >= 0.28) {
        isFlipping = true;
        animateCornerFold('next', lastCornerX, lastCornerY, -W * 0.96, H, 340, () => {
          currentSpreadIndex = targetSpreadIndex;
          renderSpread(currentSpreadIndex, true);

          flippingLeaf.style.display = "none";
          leafFaceFront.style.clipPath = "none";
          leafFaceBack.style.clipPath = "none";
          leafFaceBack.style.transform = "";

          handIndicatorNext.classList.remove("hand-clenched");
          handIndicatorNext.style.transform = "";
          isFlipping = false;
        });
      } else {
        isFlipping = true;
        animateCornerFold('next', lastCornerX, lastCornerY, W, H, 280, () => {
          setPage(pageRight, currentSpreadIndex, 'right');
          wirePageInteractions(pageRight);

          flippingLeaf.style.display = "none";
          leafFaceFront.style.clipPath = "none";
          leafFaceBack.style.clipPath = "none";
          leafFaceBack.style.transform = "";

          handIndicatorNext.classList.remove("hand-clenched");
          handIndicatorNext.style.transform = "";
          isFlipping = false;
        });
      }
    }

    // Backward Drag (Bottom-Left Handle)
    function onPointerDownPrev(e) {
      if (e.button !== 0 || isFlipping || currentSpreadIndex <= 0) return;

      isDragging = true;
      dragDirection = 'prev';
      targetSpreadIndex = currentSpreadIndex - 1;

      try {
        handlePrev.setPointerCapture(e.pointerId);
      } catch (err) { }

      handlePrev.classList.add("is-grabbing");
      if (handleNext) handleNext.style.visibility = "hidden";
      handIndicatorPrev.classList.add("hand-clenched");
      startX = e.clientX;
      startY = e.clientY;

      flippingLeaf.style.transformOrigin = "";
      flippingLeaf.style.transformStyle = "";
      leafFaceFront.style.backfaceVisibility = "visible";
      leafFaceBack.style.backfaceVisibility = "visible";

      flippingLeaf.style.left = "10px";
      flippingLeaf.style.right = "auto";
      flippingLeaf.style.width = "calc(50% - 10px)";

      setPage(leafFaceFront, currentSpreadIndex, 'left');
      setPage(leafFaceBack, targetSpreadIndex, 'right');
      setPage(pageLeft, targetSpreadIndex, 'left');

      flippingLeaf.style.display = "block";
      const W = flippingLeaf.offsetWidth || (bookHardcoverCase.offsetWidth / 2);
      const H = flippingLeaf.offsetHeight || 600;

      lastCornerX = 0;
      lastCornerY = H;

      applyBackwardFold(0, H, W, H);
    }

    function onPointerMovePrev(e) {
      if (!isDragging || dragDirection !== 'prev') return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const W = flippingLeaf.offsetWidth || (bookHardcoverCase.offsetWidth / 2);
      const H = flippingLeaf.offsetHeight || 600;

      const targetX = 0 + dx;
      const targetY = H + dy;
      lastCornerX = targetX;
      lastCornerY = targetY;

      applyBackwardFold(targetX, targetY, W, H);
    }

    function onPointerUpPrev(e) {
      if (!isDragging || dragDirection !== 'prev') return;
      isDragging = false;

      try {
        handlePrev.releasePointerCapture(e.pointerId);
      } catch (err) { }

      handlePrev.classList.remove("is-grabbing");
      if (handleNext) handleNext.style.visibility = "";

      const W = flippingLeaf.offsetWidth || (bookHardcoverCase.offsetWidth / 2);
      const H = flippingLeaf.offsetHeight || 600;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      const dragDist = e.clientX - startX;
      const progress = Math.max(0, dragDist / W);
      const isQuickClick = Math.abs(dx) < 12 && Math.abs(dy) < 12;

      if (isQuickClick || progress >= 0.28) {
        isFlipping = true;
        animateCornerFold('prev', lastCornerX, lastCornerY, W * 1.96, H, 340, () => {
          currentSpreadIndex = targetSpreadIndex;
          renderSpread(currentSpreadIndex, true);

          flippingLeaf.style.display = "none";
          leafFaceFront.style.clipPath = "none";
          leafFaceBack.style.clipPath = "none";
          leafFaceBack.style.transform = "";

          handIndicatorPrev.classList.remove("hand-clenched");
          handIndicatorPrev.style.transform = "";
          isFlipping = false;
        });
      } else {
        isFlipping = true;
        animateCornerFold('prev', lastCornerX, lastCornerY, 0, H, 280, () => {
          setPage(pageLeft, currentSpreadIndex, 'left');
          wirePageInteractions(pageLeft);

          flippingLeaf.style.display = "none";
          leafFaceFront.style.clipPath = "none";
          leafFaceBack.style.clipPath = "none";
          leafFaceBack.style.transform = "";

          handIndicatorPrev.classList.remove("hand-clenched");
          handIndicatorPrev.style.transform = "";
          isFlipping = false;
        });
      }
    }

    handleNext.addEventListener("pointerdown", onPointerDownNext);
    handleNext.addEventListener("pointermove", onPointerMoveNext);
    handleNext.addEventListener("pointerup", onPointerUpNext);
    handleNext.addEventListener("pointercancel", onPointerUpNext);

    handlePrev.addEventListener("pointerdown", onPointerDownPrev);
    handlePrev.addEventListener("pointermove", onPointerMovePrev);
    handlePrev.addEventListener("pointerup", onPointerUpPrev);
    handlePrev.addEventListener("pointercancel", onPointerUpPrev);

    // Keyboard accessibility for handles
    handleNext.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        flipToSpread(currentSpreadIndex + 1);
      }
    });
    handlePrev.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        flipToSpread(currentSpreadIndex - 1);
      }
    });

    // Programmatic flip function for buttons and keyboard with Deformable Corner Fold
    function flipToSpread(targetIndex) {
      if (isFlipping) return;
      const clamped = Math.max(0, Math.min(backCoverSpread(), targetIndex));
      if (clamped === currentSpreadIndex) return;

      if (prefersReducedMotion()) {
        currentSpreadIndex = clamped;
        renderSpread(currentSpreadIndex, false);
        return;
      }

      isFlipping = true;
      targetSpreadIndex = clamped;
      setBookPose(clamped);

      const dir = targetSpreadIndex > currentSpreadIndex ? 'next' : 'prev';

      if (dir === 'next') {
        flippingLeaf.style.transformOrigin = "";
        flippingLeaf.style.transformStyle = "";
        leafFaceFront.style.backfaceVisibility = "visible";
        leafFaceBack.style.backfaceVisibility = "visible";

        flippingLeaf.style.left = "auto";
        flippingLeaf.style.right = "10px";
        flippingLeaf.style.width = "calc(50% - 10px)";

        setPage(leafFaceFront, currentSpreadIndex, 'right');
        setPage(leafFaceBack, targetSpreadIndex, 'left');
        setPage(pageRight, targetSpreadIndex, 'right');

        const nextCap = pageRight.querySelector(".page-plate-caption");
        if (nextCap) {
          nextCap.classList.add("caption-pending");
          nextCap.classList.remove("caption-revealed");
        }

        flippingLeaf.style.display = "block";
        const W = flippingLeaf.offsetWidth || (bookHardcoverCase.offsetWidth / 2);
        const H = flippingLeaf.offsetHeight || 600;

        animateCornerFold('next', W, H, -W * 0.96, H, 360, () => {
          currentSpreadIndex = targetSpreadIndex;
          renderSpread(currentSpreadIndex, true);

          flippingLeaf.style.display = "none";
          leafFaceFront.style.clipPath = "none";
          leafFaceBack.style.clipPath = "none";
          leafFaceBack.style.transform = "";
          isFlipping = false;
        });
      } else {
        flippingLeaf.style.transformOrigin = "";
        flippingLeaf.style.transformStyle = "";
        leafFaceFront.style.backfaceVisibility = "visible";
        leafFaceBack.style.backfaceVisibility = "visible";

        flippingLeaf.style.left = "10px";
        flippingLeaf.style.right = "auto";
        flippingLeaf.style.width = "calc(50% - 10px)";

        setPage(leafFaceFront, currentSpreadIndex, 'left');
        setPage(leafFaceBack, targetSpreadIndex, 'right');
        setPage(pageLeft, targetSpreadIndex, 'left');

        flippingLeaf.style.display = "block";
        const W = flippingLeaf.offsetWidth || (bookHardcoverCase.offsetWidth / 2);
        const H = flippingLeaf.offsetHeight || 600;

        animateCornerFold('prev', 0, H, W * 1.96, H, 360, () => {
          currentSpreadIndex = targetSpreadIndex;
          renderSpread(currentSpreadIndex, true);

          flippingLeaf.style.display = "none";
          leafFaceFront.style.clipPath = "none";
          leafFaceBack.style.clipPath = "none";
          leafFaceBack.style.transform = "";
          isFlipping = false;
        });
      }
    }

    // Zoom Lightbox
    let zoomTrigger = null;

    function openZoom(src, captionText, trigger = null) {
      zoomTrigger = trigger;
      zoomImg.src = src;
      zoomImg.alt = captionText || "Enlarged figure";
      zoomCaption.textContent = captionText || "";
      zoomOverlay.classList.add("is-active");
      zoomOverlay.setAttribute("aria-hidden", "false");
      zoomClose.focus();
    }

    function closeZoom() {
      if (!zoomOverlay.classList.contains("is-active")) return;
      zoomOverlay.classList.remove("is-active");
      zoomOverlay.setAttribute("aria-hidden", "true");
      zoomImg.src = "";
      if (zoomTrigger && zoomTrigger.isConnected) zoomTrigger.focus();
      zoomTrigger = null;
    }

    zoomClose.addEventListener("click", closeZoom);
    zoomOverlay.addEventListener("click", e => {
      if (e.target === zoomOverlay) closeZoom();
    });

    // Dialog Open / Close
    function openFolio(paperId, initialSpread = 0) {
      const data = paperFolioData[paperId];
      if (!data) return;

      currentPaper = data;
      currentSpreadIndex = initialSpread;

      if (pdfBtn) pdfBtn.href = encodeURI(data.pdfUrl);
      if (data.coverImage) {
        bookHardcoverCase.style.setProperty('--paper-cover-img', `url('${encodeURI(data.coverImage)}')`);
      } else {
        bookHardcoverCase.style.removeProperty('--paper-cover-img');
      }

      // Build pagination dots with tooltips (one per spread)
      if (stripEl) {
        const dotsHtml = [];

        // 0: Cover
        dotsHtml.push(`
          <button class="folio-dot-item ${initialSpread === 0 ? 'active' : ''}" type="button" data-spread-index="0" ${initialSpread === 0 ? 'aria-current="page"' : ''} aria-label="Front Cover">
            <span class="dot-pip"></span>
            <span class="dot-tooltip">Front Hardcover</span>
          </button>
        `);

        // 1: Overview
        dotsHtml.push(`
          <button class="folio-dot-item ${initialSpread === 1 ? 'active' : ''}" type="button" data-spread-index="1" ${initialSpread === 1 ? 'aria-current="page"' : ''} aria-label="Pages 01-02: Abstract & Title">
            <span class="dot-pip"></span>
            <span class="dot-tooltip">Pages 01-02 · Abstract &amp; Title</span>
          </button>
        `);

        // One dot per plate
        currentPaper.plates.forEach((plate, pIdx) => {
          const spreadIdx = pIdx + 2;
          const isActive = spreadIdx === initialSpread;
          dotsHtml.push(`
            <button class="folio-dot-item ${isActive ? 'active' : ''}" type="button" data-spread-index="${spreadIdx}" ${isActive ? 'aria-current="page"' : ''} aria-label="${plate.badge}: ${plainScientificText(plate.title)}">
              <span class="dot-pip"></span>
              <span class="dot-tooltip"><strong>${plate.badge}</strong> · ${formatScientificText(plate.title)}</span>
            </button>
          `);
        });

        // Conclusions and back cover
        const cs = conclusionSpread();
        const bs = backCoverSpread();
        const pad = n => String(n).padStart(2, "0");
        dotsHtml.push(`
          <button class="folio-dot-item ${initialSpread === cs ? 'active' : ''}" type="button" data-spread-index="${cs}" ${initialSpread === cs ? 'aria-current="page"' : ''} aria-label="Pages ${pad(2 * cs - 1)}-${pad(2 * cs)}: Conclusions">
            <span class="dot-pip"></span>
            <span class="dot-tooltip">Pages ${pad(2 * cs - 1)}-${pad(2 * cs)} · Conclusions</span>
          </button>
        `);
        dotsHtml.push(`
          <button class="folio-dot-item ${initialSpread === bs ? 'active' : ''}" type="button" data-spread-index="${bs}" ${initialSpread === bs ? 'aria-current="page"' : ''} aria-label="Back Hardcover">
            <span class="dot-pip"></span>
            <span class="dot-tooltip">Back Hardcover (Colophon &amp; PDF)</span>
          </button>
        `);

        stripEl.innerHTML = dotsHtml.join("");

        stripEl.querySelectorAll(".folio-dot-item").forEach(item => {
          item.addEventListener("click", () => {
            const idx = parseInt(item.dataset.spreadIndex, 10);
            flipToSpread(idx);
          });
        });
      }

      bookHardcoverCase.classList.add("no-pose-anim");
      renderSpread(currentSpreadIndex, false);
      const bookViewport = document.querySelector("#book-viewport");
      bookViewport.classList.remove("is-entering");
      void bookViewport.offsetWidth;
      bookViewport.classList.add("is-entering");

      dialog.showModal();
      requestAnimationFrame(() => requestAnimationFrame(() => bookHardcoverCase.classList.remove("no-pose-anim")));
      requestAnimationFrame(() => {
        dialog.classList.add("is-open");
      });
    }

    function closeFolio() {
      if (!dialog.open) return;
      const v = bookHardcoverCase.querySelector("video");
      if (v) v.pause();

      closeZoom();
      dialog.classList.remove("is-open");
      setTimeout(() => {
        dialog.close();
      }, 250);
    }

    // Trigger buttons on publication cards
    let folioTrigger = null;
    document.querySelectorAll(".open-paper-folio").forEach(btn => {
      btn.addEventListener("click", () => {
        folioTrigger = btn;
        openFolio(btn.dataset.paperId, 0);
      });
    });

    // Escape fires "cancel": close the zoom first, otherwise run the animated close
    dialog.addEventListener("cancel", e => {
      e.preventDefault();
      if (zoomOverlay.classList.contains("is-active")) closeZoom();
      else closeFolio();
    });

    // Runs however the dialog closes: stop media, reset the zoom, restore focus
    dialog.addEventListener("close", () => {
      dialog.classList.remove("is-open");
      dialog.querySelectorAll("video").forEach(v => v.pause());
      closeZoom();
      if (folioTrigger && folioTrigger.isConnected) folioTrigger.focus();
    });

    closeBtn.addEventListener("click", closeFolio);
    btnPrev.addEventListener("click", () => flipToSpread(currentSpreadIndex - 1));
    btnNext.addEventListener("click", () => flipToSpread(currentSpreadIndex + 1));

    dialog.addEventListener("click", e => {
      if (e.target === dialog) {
        closeFolio();
      }
    });

    window.addEventListener("keydown", e => {
      if (!dialog.open || zoomOverlay.classList.contains("is-active")) return;
      // Arrow keys seek in video controls and move within buttons' native behaviour elsewhere
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || isTypingOrMediaTarget(e.target)) return;

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        flipToSpread(currentSpreadIndex - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        flipToSpread(currentSpreadIndex + 1);
      }
    });
  }

  initPaperFolio();

  /* ==========================================================================
     LLM-RAG Technical Assistant Chatbot Module
     Configurable Cloudflare Worker Backend + Local Verified Fallback
     ========================================================================== */
  // Cloudflare Worker RAG Backend URL (Paste your deployed worker URL here)
  // e.g. "https://milad-portfolio-rag.<your-subdomain>.workers.dev"
  const RAG_WORKER_URL = "https://milad-portfolio-rag.miladghaemi68.workers.dev";

  function initRagChatbot() {
    const launcher = document.querySelector("#rag-chat-launcher");
    const panel = document.querySelector("#rag-chat-panel");
    const closeBtn = document.querySelector("#rag-panel-close");
    const contextSelect = document.querySelector("#rag-context-select");
    const messagesContainer = document.querySelector("#rag-messages");
    const inputForm = document.querySelector("#rag-input-form");
    const textarea = document.querySelector("#rag-input");
    const sendBtn = document.querySelector("#rag-send-btn");
    const charCount = document.querySelector("#rag-char-count");

    if (!launcher || !panel || !messagesContainer || !textarea) return;

    let isRagOpen = false;
    let isThinking = false;
    const ragHistory = [];

    // Quick prompts per project. Every topic is documented in the worker's knowledge base.
    // `local` names the offline answer used when the worker is unreachable:
    // "architecture" | "stack" | "verification" are built from architectureData (site content),
    // anything else is a key in PROFILE_LOCAL_ANSWERS.
    const QUICK_CHIPS = {
      "Industrial Energy SQL Pipeline": [
        { q: "How are PostgreSQL partitioning and idempotent ingestion designed?", local: "architecture" },
        { q: "How is real Fingrid grid data combined with the synthetic telemetry?", local: "architecture" },
        { q: "How are data quality and z-score anomalies verified?", local: "verification" }
      ],
      "Amorphous Phase ML": [
        { q: "Which 18 descriptors does the phase classifier use?", local: "architecture" },
        { q: "How does spatial holdout validation prevent leakage?", local: "verification" },
        { q: "What does SHAP reveal about the three Cu-Zr phases?", local: "architecture" }
      ],
      "Aether Climate Engine": [
        { q: "How does the dead-letter queue handle anomalous telemetry?", local: "architecture" },
        { q: "How are the dbt staging, fact, and mart layers organized?", local: "architecture" },
        { q: "Which forecasting models does Aether compare?", local: "stack" }
      ],
      "Airflow Academy": [
        { q: "How does AST validation grade student DAGs?", local: "architecture" },
        { q: "How are Docker sandboxes isolated and throttled?", local: "architecture" },
        { q: "How are execution logs streamed over SSE?", local: "verification" }
      ],
      "Smileprint": [
        { q: "How do the append-only audit triggers work?", local: "architecture" },
        { q: "How are SHA-256 hashes used in the PDF reports?", local: "verification" },
        { q: "Which Finnish and EU regulations does it cover?", local: "architecture" }
      ],
      "Verified FEM Workbench": [
        { q: "What does the non-bypassable review gate check?", local: "architecture" },
        { q: "How are Code_Aster, CalculiX, and FEniCSx results compared?", local: "verification" },
        { q: "Which analytical benchmarks verify the solvers?", local: "verification" }
      ],
      "Quantum ESPRESSO Advisor": [
        { q: "What bug does the update_pot.f90 patch fix?", local: "architecture" },
        { q: "How are k-point probing and Amdahl projections done?", local: "architecture" },
        { q: "How does the evidence ledger verify its 47 claims?", local: "verification" }
      ],
      "Tessera": [
        { q: "How does the discrete Voronoi engine break ties?", local: "architecture" },
        { q: "How are daily puzzles generated from SHA-256 seeds?", local: "architecture" },
        { q: "How are the 400 levels stored with Room?", local: "stack" }
      ],
      "General Profile": [
        { q: "Summarize Milad's PhD research and publications", local: "publications" },
        { q: "Which HPC systems has Milad used?", local: "hpc" },
        { q: "What was the CERN collaboration on Nb/Cu films?", local: "cern" },
        { q: "What are Milad's core data engineering skills?", local: "skills" }
      ]
    };

    // Offline answers for the profile chips. Only facts already published on this page.
    const PROFILE_LOCAL_ANSWERS = {
      publications: () => {
        const items = Array.from(document.querySelectorAll(".publication")).map(card => {
          const year = card.querySelector(".year")?.textContent.trim() || "";
          const journal = (card.querySelector(".journal")?.textContent || "").replace("↗", "").trim();
          const title = card.querySelector("h3")?.textContent.trim() || "";
          return `- **${journal} (${year}):** ${title}`;
        });
        return {
          answer: `Milad completed a PhD in Materials Research & Nanosciences at the **University of Helsinki** (2021 to 2026), focused on atomistic modeling of thin-film growth, irradiation, and metallic glasses.\n\nPeer-reviewed publications (${items.length}):\n${items.join("\n")}`,
          sources: [{ title: "Portfolio: Publications section" }]
        };
      },
      hpc: () => ({
        answer: "Milad's HPC work runs on Finnish CSC national systems and university clusters: **Puhti**, **Mahti**, **Ukko**, and **Kale**, using Slurm and MPI for large-scale LAMMPS molecular dynamics. He has no experience on LUMI.",
        sources: [{ title: "Portfolio: Technical arsenal" }]
      }),
      cern: () => ({
        answer: "With CERN collaborators, Milad modeled the growth of Nb films on Cu for superconducting RF cavities using large-scale molecular dynamics of DCMS and HiPIMS deposition. CERN provided SEM and XPS data; the modeling was computational.\n\nKey result (*Materials Today Communications*, 2026): residual vacancy defects depend non-monotonically on the Cu content of the amorphous Nb-Cu interface, with a minimum near **45% Cu**, reached at intermediate ion energies of **70 to 100 eV**.",
        sources: [{ title: "Materials Today Communications (2026)" }]
      }),
      skills: () => {
        const card = Array.from(document.querySelectorAll(".arsenal-card"))
          .find(c => /data engineering/i.test(c.querySelector("h3")?.textContent || ""));
        const pills = card ? Array.from(card.querySelectorAll(".pill-list span")).map(el => el.textContent.trim()) : [];
        return {
          answer: `Core data engineering and orchestration toolkit: ${pills.map(p => `\`${p}\``).join(", ")}.\n\nSee the **Industrial Energy SQL Pipeline** and **Aether Climate Engine** projects for these tools in production-style pipelines.`,
          sources: [{ title: "Portfolio: Technical arsenal" }]
        };
      }
    };

    function buildProjectLocalAnswer(projectName, kind) {
      const project = architectureData[projectName];
      if (!project) return null;
      const source = [{ title: `${projectName}: portfolio summary` }];
      if (kind === "stack") {
        return {
          answer: `**${projectName}** (${project.category})\n\nStack: ${project.stack.map(t => `\`${t}\``).join(", ")}\n\n${project.summary}`,
          sources: source
        };
      }
      if (kind === "verification") {
        return {
          answer: `**${projectName}: verification**\n\n${project.verification}\n\n${project.summary}`,
          sources: source
        };
      }
      return {
        answer: `**${projectName}**\n\n${project.summary}\n${project.breakdown.map(b => `- ${b}`).join("\n")}`,
        sources: source
      };
    }

    function findChip(question) {
      for (const [context, chips] of Object.entries(QUICK_CHIPS)) {
        const chip = chips.find(c => c.q === question);
        if (chip) return { context, chip };
      }
      return null;
    }

    function localAnswer(question) {
      const found = findChip(question);
      if (found) {
        const { context, chip } = found;
        const result = PROFILE_LOCAL_ANSWERS[chip.local]
          ? PROFILE_LOCAL_ANSWERS[chip.local]()
          : buildProjectLocalAnswer(context, chip.local);
        if (result) return result;
      }
      return {
        answer: "The live assistant is unavailable right now, so I can only answer the suggested questions below from the portfolio itself. For full project details, use **Inspect Architecture & Specs** on any project.",
        sources: []
      };
    }

    function escapeHtml(str) {
      if (!str) return "";
      return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    }

    function renderMarkdown(text) {
      if (!text) return "";
      let raw = escapeHtml(text);

      // Code blocks ```...```
      raw = raw.replace(/```([a-z0-9_-]*)\n([\s\S]*?)```/gi, (match, lang, code) => {
        return `<pre><code>${code.trim()}</code></pre>`;
      });

      // Inline code `...`
      raw = raw.replace(/`([^`]+)`/g, "<code>$1</code>");

      // Bold **...**
      raw = raw.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

      // Bullet lists
      const lines = raw.split("\n");
      let inList = false;
      const htmlLines = [];

      for (const line of lines) {
        const bulletMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
        if (bulletMatch) {
          if (!inList) {
            htmlLines.push("<ul>");
            inList = true;
          }
          htmlLines.push(`<li>${bulletMatch[2]}</li>`);
        } else {
          if (inList) {
            htmlLines.push("</ul>");
            inList = false;
          }
          if (line.trim().length > 0) {
            htmlLines.push(`<p>${line}</p>`);
          }
        }
      }
      if (inList) htmlLines.push("</ul>");

      return htmlLines.join("\n");
    }

    // Context: "auto" follows the page (viewport section / selected project card);
    // picking an entry in the dropdown pins that context until "Auto" is chosen again.
    let contextMode = "auto";
    let autoContext = "General Profile";
    let isWorkInView = false;

    if (contextSelect) {
      Object.keys(QUICK_CHIPS).forEach(name => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        contextSelect.appendChild(opt);
      });
      contextSelect.addEventListener("change", () => {
        if (contextSelect.value === "auto") {
          contextMode = "auto";
          syncContext(autoContext);
        } else {
          contextMode = "manual";
          syncContext(contextSelect.value);
        }
      });
    }

    function updateAutoOption() {
      const autoOpt = contextSelect?.querySelector('option[value="auto"]');
      if (autoOpt) autoOpt.textContent = `Auto: ${autoContext}`;
    }

    function syncContext(projectName) {
      currentRagContext = projectName || "General Profile";
      renderQuickChips(currentRagContext);
    }

    // Called by the page (scroll position / project cards)
    function setAutoContext(name) {
      autoContext = name || "General Profile";
      updateAutoOption();
      if (contextMode === "auto" && autoContext !== currentRagContext) syncContext(autoContext);
    }

    // Project selections only drive the assistant while the Systems section is on screen
    syncRagProjectContext = projectName => {
      if (isWorkInView) setAutoContext(projectName);
    };

    // Suggested questions live inside the thread (they wrap and scroll vertically with it)
    let suggestionsBlock = null;

    function keepSuggestionsLast() {
      if (suggestionsBlock) messagesContainer.appendChild(suggestionsBlock);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function renderQuickChips(contextKey) {
      const chips = QUICK_CHIPS[contextKey] || QUICK_CHIPS["General Profile"] || [];
      const block = document.createElement("div");
      block.className = "rag-suggestions";
      block.setAttribute("role", "group");
      block.setAttribute("aria-label", `Suggested questions about ${contextKey}`);
      const title = document.createElement("div");
      title.className = "rag-suggestions-title";
      title.textContent = `Suggested · ${contextKey}`;
      block.appendChild(title);
      chips.forEach(({ q }) => {
        const btn = document.createElement("button");
        btn.className = "rag-chip-btn";
        btn.type = "button";
        btn.textContent = q;
        btn.addEventListener("click", () => handleUserSend(q));
        block.appendChild(btn);
      });
      if (suggestionsBlock) suggestionsBlock.remove();
      suggestionsBlock = block;
      keepSuggestionsLast();
    }

    function appendMessage(role, text, sources = [], { record = true } = {}) {
      const msgDiv = document.createElement("div");
      msgDiv.className = `rag-msg msg-${role}`;

      const bubbleDiv = document.createElement("div");
      bubbleDiv.className = "rag-msg-bubble";

      if (role === "assistant") {
        bubbleDiv.innerHTML = renderMarkdown(text);
        if (sources && sources.length) {
          const sourcesRow = document.createElement("div");
          sourcesRow.className = "rag-sources-row";
          sourcesRow.innerHTML = "<span>Verified Sources:</span> " + sources.map(s => `<span class="rag-source-pill">${escapeHtml(s.title || s.projectName || s.project)}</span>`).join(" ");
          bubbleDiv.appendChild(sourcesRow);
        }
      } else {
        bubbleDiv.textContent = text;
      }

      msgDiv.appendChild(bubbleDiv);
      messagesContainer.appendChild(msgDiv);
      keepSuggestionsLast();

      if (record) {
        ragHistory.push({ role, content: text });
        if (ragHistory.length > 6) ragHistory.shift();
      }
    }

    function showThinkingIndicator() {
      const msgDiv = document.createElement("div");
      msgDiv.className = "rag-msg msg-assistant rag-thinking-msg";
      msgDiv.id = "rag-thinking-indicator";

      const bubble = document.createElement("div");
      bubble.className = "rag-msg-bubble rag-typing-bubble";
      bubble.innerHTML = "<span></span><span></span><span></span>";

      msgDiv.appendChild(bubble);
      messagesContainer.appendChild(msgDiv);
      keepSuggestionsLast();
    }

    function removeThinkingIndicator() {
      const indicator = document.querySelector("#rag-thinking-indicator");
      if (indicator) indicator.remove();
    }

    const RAG_TIMEOUT_MS = 20000;

    // Returns { answer, sources, offline }. Never throws: any worker failure
    // (unset URL, network error, timeout, cold-start error, bad payload) falls back to local answers.
    async function queryAssistant(userQuery, history) {
      if (RAG_WORKER_URL) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), RAG_TIMEOUT_MS);
        try {
          const response = await fetch(RAG_WORKER_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              message: userQuery,
              activeProject: currentRagContext,
              history
            })
          });
          if (response.ok) {
            const data = await response.json();
            if (typeof data.answer === "string" && data.answer.trim()) {
              return {
                answer: data.answer,
                sources: Array.isArray(data.sources) ? data.sources : [],
                offline: false
              };
            }
          }
          console.warn("RAG worker returned an unusable response", response.status);
        } catch (err) {
          console.warn("RAG worker unreachable, using local answers", err);
        } finally {
          clearTimeout(timer);
        }
      }
      return { ...localAnswer(userQuery), offline: true };
    }

    async function handleUserSend(text) {
      const query = (text || textarea.value || "").trim();
      if (!query || isThinking) return;

      textarea.value = "";
      textarea.style.height = "auto";
      charCount.textContent = "0 / 500";
      sendBtn.disabled = true;

      // Snapshot history before adding the current question, so it is not sent twice
      const historySnapshot = ragHistory.slice(-6);
      appendMessage("user", query);
      isThinking = true;
      showThinkingIndicator();

      try {
        const result = await queryAssistant(query, historySnapshot);
        removeThinkingIndicator();
        // Offline answers stay out of the history sent to the model
        appendMessage("assistant", result.answer, result.sources, { record: !result.offline });
      } catch (err) {
        removeThinkingIndicator();
        console.error("RAG assistant failed", err);
        appendMessage("assistant", "Something went wrong while answering. Please try again in a moment.", [], { record: false });
      } finally {
        isThinking = false;
        sendBtn.disabled = textarea.value.trim().length === 0;
      }
    }

    // Keep the panel inside the visible area when the on-screen keyboard opens.
    // Fixed elements are laid out against the layout viewport, which the keyboard
    // does not shrink on iOS (and by default on Android), so measure the visual viewport.
    let viewportRaf = null;
    function syncPanelToViewport() {
      const vv = window.visualViewport;
      if (!vv) return;
      if (Math.abs(vv.scale - 1) > 0.01) {
        // Pinch-zoomed: leave the panel at its normal size
        panel.style.removeProperty("--rag-vv-height");
        panel.style.removeProperty("--rag-kb-inset");
        return;
      }
      const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      panel.style.setProperty("--rag-vv-height", `${Math.round(vv.height)}px`);
      panel.style.setProperty("--rag-kb-inset", `${Math.round(inset)}px`);
    }
    function scheduleViewportSync() {
      if (!isRagOpen || viewportRaf) return;
      viewportRaf = requestAnimationFrame(() => {
        viewportRaf = null;
        syncPanelToViewport();
      });
    }
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", scheduleViewportSync, { passive: true });
      window.visualViewport.addEventListener("scroll", scheduleViewportSync, { passive: true });
    }

    // Event Listeners
    launcher.addEventListener("click", () => {
      if (isRagOpen) {
        closeRagPanel();
        return;
      }
      isRagOpen = true;
      syncPanelToViewport();
      panel.classList.toggle("is-open", isRagOpen);
      panel.setAttribute("aria-hidden", String(!isRagOpen));
      launcher.setAttribute("aria-expanded", String(isRagOpen));
      if (isRagOpen) {
        setTimeout(() => textarea.focus(), 150);
      }
    });

    function closeRagPanel() {
      if (!isRagOpen) return;
      const hadFocus = panel.contains(document.activeElement);
      isRagOpen = false;
      panel.classList.remove("is-open");
      panel.setAttribute("aria-hidden", "true");
      launcher.setAttribute("aria-expanded", "false");
      // The panel becomes visibility:hidden, so focus inside it would be lost
      if (hadFocus) launcher.focus();
    }

    closeBtn.addEventListener("click", closeRagPanel);

    window.addEventListener("keydown", e => {
      if (e.key !== "Escape" || !isRagOpen) return;
      // A modal dialog on top handles its own Escape
      if (document.querySelector("dialog[open]")) return;
      closeRagPanel();
    });

    textarea.addEventListener("input", () => {
      const len = textarea.value.length;
      charCount.textContent = `${len} / 500`;
      sendBtn.disabled = len === 0 || isThinking;

      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 84)}px`;
    });

    textarea.addEventListener("keydown", e => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        inputForm.dispatchEvent(new Event("submit"));
      }
    });

    inputForm.addEventListener("submit", e => {
      e.preventDefault();
      handleUserSend();
    });

    // Initial greeting
    appendMessage("assistant", "Hello! I am Milad Ghaemi's AI Technical Assistant. Ask me about system architectures, data pipelines, physics modeling, or research publications. Select any project in the portfolio to focus our context!", [], { record: false });

    // Initialize chips for initial context
    syncContext("General Profile");

    // Follow the viewport: project context while the Systems section is on screen,
    // General Profile elsewhere. Project changes inside #work come from setActiveProject.
    const workSection = document.querySelector("#work");
    if (workSection && "IntersectionObserver" in window) {
      new IntersectionObserver(entries => {
        const entry = entries[entries.length - 1];
        isWorkInView = entry.isIntersecting;
        if (entry.isIntersecting) {
          const title = activeProjectCard?.dataset?.project;
          if (title) setAutoContext(title);
        } else {
          setAutoContext("General Profile");
        }
      }, { rootMargin: "-30% 0px -30% 0px" }).observe(workSection);
    }
  }

  initRagChatbot();

  syncSvgMotion();
  reducedMotionQuery.addEventListener("change", () => {
    syncSvgMotion();
    updateChapterProgress();
    updateHeroParallax();
  });

  updateScrollMetrics();
  updateHeroParallax();
  updateChapterProgress();
  updateTimeline();
});
