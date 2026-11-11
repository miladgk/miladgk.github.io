document.addEventListener("DOMContentLoaded", () => {
  const THEMES = ["lab", "midnight"];
  const themePickerBtns = document.querySelectorAll(".theme-picker-btn");
  let currentTheme = "lab";

  // Cache initial mermaid diagram code before Mermaid renders SVG (excluding stage flowchart)
  const mermaidElements = Array.from(document.querySelectorAll(".mermaid:not(#stage-mermaid)"));
  mermaidElements.forEach(el => {
    el.dataset.mermaidCode = el.textContent.trim();
  });

  function getSystemTheme() {
    return "lab";
  }

  function getSavedTheme() {
    try {
      const saved = localStorage.getItem("portfolio_theme");
      if (saved && THEMES.includes(saved)) return saved;
    } catch (e) {
      console.warn("localStorage unavailable", e);
    }
    return getSystemTheme();
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

  function reRenderMermaid(theme) {
    if (!window.mermaid) return;
    const configs = {
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

    try {
      const activeConfig = configs[theme] || configs.lab;
      window.mermaid.initialize({
        startOnLoad: false,
        securityLevel: "loose",
        ...activeConfig
      });

      const staticMermaidNodes = Array.from(document.querySelectorAll(".mermaid:not(#stage-mermaid)"));
      staticMermaidNodes.forEach(el => {
        el.removeAttribute("data-processed");
        el.textContent = el.dataset.mermaidCode || "";
      });

      if (staticMermaidNodes.length) {
        window.mermaid.run({ nodes: staticMermaidNodes });
      }
      if (typeof updateStageMermaid === "function" && typeof stageMode !== "undefined" && stageMode === "flowchart") {
        updateStageMermaid();
      }
    } catch (err) {
      console.warn("Mermaid re-render failed", err);
    }
  }

  function applyTheme(newTheme, isInitial = false) {
    if (!THEMES.includes(newTheme)) return;

    const performUpdate = () => {
      document.documentElement.setAttribute("data-theme", newTheme);
      currentTheme = newTheme;
      updateThemeUI(newTheme);
      if (!isInitial) saveTheme(newTheme);
      reRenderMermaid(newTheme);
      if (window.themeCanvasUpdate) window.themeCanvasUpdate(newTheme);
    };

    if (
      !isInitial &&
      document.startViewTransition &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches
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

  // System color scheme change listener
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      try {
        if (!localStorage.getItem("portfolio_theme")) {
          applyTheme("lab");
        }
      } catch (err) {}
    });
  }

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
      verification: "Holdout macro F1 of 0.854, group-aware splits, calibration, and explainability analysis.",
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
      mermaid: "flowchart LR\nA[Model] --> B[Review gate] --> C[Gmsh mesh]\nC --> D[Code_Aster] & E[CalculiX] --> F[Physics checks]"
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

  // Publication filter support
  const pubFilters = document.querySelectorAll(".pub-filter");
  const publicationCards = document.querySelectorAll(".publication");
  if (pubFilters.length) {
    pubFilters.forEach(button => {
      button.addEventListener("click", () => {
        const filter = button.dataset.pubFilter;
        pubFilters.forEach(b => b.classList.toggle("active", b === button));
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
  let isTransitioning = false;
  let clickTimeout = null;
  let morphTimer = null;
  let transitionTimer = null;

  async function updateStageMermaid() {
    if (!stageMermaid || !window.mermaid || !activeProjectCard) return;
    const title = activeProjectCard.dataset.project || activeProjectCard.querySelector("h3")?.textContent.trim();
    const mermaidCode = architectureData[title]?.mermaid;
    if (!mermaidCode) {
      stageMermaid.innerHTML = "<p style='color:var(--muted);font-size:0.75rem;padding:20px;text-align:center'>No architecture diagram available.</p>";
      return;
    }
    try {
      stageMermaid.innerHTML = "";
      const uniqueId = `stage-mermaid-${Date.now()}`;
      const { svg } = await window.mermaid.render(uniqueId, mermaidCode);
      stageMermaid.innerHTML = svg;
    } catch (e) {
      console.warn("Mermaid stage render failed", e);
      stageMermaid.textContent = mermaidCode;
      stageMermaid.removeAttribute("data-processed");
      try {
        window.mermaid.run({ nodes: [stageMermaid] });
      } catch (err) {}
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

      const cardMetrics = card.querySelector(".metrics");
      if (stageMetrics && cardMetrics) {
        stageMetrics.innerHTML = cardMetrics.innerHTML;
      }

      const cardSchematic = card.querySelector(".card-schematic");
      if (stageSchematicMount && cardSchematic) {
        stageSchematicMount.innerHTML = cardSchematic.outerHTML;
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
        card.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

  let scrollRaf = null;
  window.addEventListener("scroll", () => {
    if (window.innerWidth <= 950) return;
    if (!scrollRaf) {
      scrollRaf = requestAnimationFrame(() => {
        updateScrollSpy();
        scrollRaf = null;
      });
    }
  }, { passive: true });

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
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  let lastScrollY = currentScrollY;
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

    function initEntities() {
      if (!width || !height) return;

      // Lab: 3D Crystal Lattice Simulation (FCC / Octahedral cluster)
      labLatticeNodes = [];
      const coords = [-1, 0, 1];
      for (let x of coords) {
        for (let y of coords) {
          for (let z of coords) {
            // Cut corner to form FCC-like coordination polyhedron
            if (Math.abs(x) + Math.abs(y) + Math.abs(z) <= 2) {
              // Binary alloy sites: Cu (smaller, atomic radius 128 pm) vs Zr (larger, atomic radius 160 pm)
              const isCu = ((x + y + z + 10) % 2 === 0);
              labLatticeNodes.push({
                ox: x,
                oy: y,
                oz: z,
                phase: Math.random() * Math.PI * 2,
                element: isCu ? "Cu" : "Zr"
              });
            }
          }
        }
      }

      labLatticeEdges = [];
      for (let i = 0; i < labLatticeNodes.length; i++) {
        for (let j = i + 1; j < labLatticeNodes.length; j++) {
          const a = labLatticeNodes[i];
          const b = labLatticeNodes[j];
          const d = Math.hypot(a.ox - b.ox, a.oy - b.oy, a.oz - b.oz);
          if (d <= 1.5) {
            labLatticeEdges.push([i, j]);
          }
        }
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
        const targetMouseX = mouse.x > 0 ? (mouse.x - cx) * 0.0006 : 0;
        const targetMouseY = mouse.y > 0 ? (mouse.y - cy) * 0.0005 : 0;
        labMouseOffsetX += (targetMouseX - labMouseOffsetX) * Math.min(1, dt * 4);
      } else {
        dragInertiaX = 0;
        dragInertiaY = 0;
        labMouseOffsetX = 0;
      }

      const effectiveRotY = labRotY + labMouseOffsetX;
      const cosY = Math.cos(effectiveRotY);
      const sinY = Math.sin(effectiveRotY);
      const cosX = Math.cos(labRotX);
      const sinX = Math.sin(labRotX);

      // Project 3D nodes to 2D
      const projected = labLatticeNodes.map(node => {
        // Thermal vibration
        const vib = Math.sin(time * 0.003 + node.phase) * 0.035;
        const x0 = node.ox + vib;
        const y0 = node.oy + vib * 0.8;
        const z0 = node.oz + vib * 0.5;

        // Rotate Y then X
        const x1 = x0 * cosY + z0 * sinY;
        const z1 = -x0 * sinY + z0 * cosY;
        const y1 = y0 * cosX - z1 * sinX;
        const z2 = y0 * sinX + z1 * cosX;

        const scale = fov / (fov + z2);
        return {
          px: cx + x1 * scale * size,
          py: cy + y1 * scale * size,
          depth: z2,
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
      const sorted = projected.slice().sort((a, b) => a.depth - b.depth);
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

      // Project 3D unit vectors using current 3D rotation matrix
      // X vector (1, 0, 0)
      const xx1 = cosY, xz1 = -sinY;
      const xy1 = -xz1 * sinX;
      const xpx = ax + xx1 * axisLen;
      const xpy = ay - xy1 * axisLen;

      // Y vector (0, 1, 0) - vertical up
      const yy1 = cosX;
      const ypx = ax;
      const ypy = ay - yy1 * axisLen;

      // Z vector (0, 0, 1) - out of screen
      const zx1 = sinY, zz1 = cosY;
      const zy1 = -zz1 * sinX;
      const zpx = ax + zx1 * axisLen;
      const zpy = ay - zy1 * axisLen;

      const axes = [
        { name: "X", px: xpx, py: xpy, depth: xz1 * cosX, color: "#F59E0B" },
        { name: "Y", px: ypx, py: ypy, depth: sinX, color: colors.accent },
        { name: "Z", px: zpx, py: zpy, depth: zz1 * cosX, color: "#00F0FF" }
      ];

      // Sort by depth so closer axis renders on top
      axes.sort((a, b) => a.depth - b.depth);

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

      midnightNodes.forEach(node => {
        node.x += node.vx * speedBoost;
        node.y += node.vy * speedBoost + scrollDriftY;
        if (node.x < 20 || node.x > width - 20) node.vx *= -1;
        if (node.y < 30 || node.y > height - 30) node.vy *= -1;

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

    // Future-proof Theme Stubs (Preserving all 6 theme hooks)
    function drawPaper(time, dt, colors) {}
    function drawTerminal(time, dt, colors) {}
    function drawAurora(time, dt, colors) {}
    function drawSwiss(time, dt, colors) {}

    function renderFrame(timestamp) {
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

      const colors = getThemeColors();
      if (animTheme === "midnight") {
        drawMidnight(animSimTime, colors);
      } else if (animTheme === "paper") {
        drawPaper(animSimTime, dt, colors);
      } else if (animTheme === "terminal") {
        drawTerminal(animSimTime, dt, colors);
      } else if (animTheme === "aurora") {
        drawAurora(animSimTime, dt, colors);
      } else if (animTheme === "swiss") {
        drawSwiss(animSimTime, dt, colors);
      } else {
        drawLab(animSimTime, dt, colors);
      }

      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        animId = requestAnimationFrame(renderFrame);
      }
    }

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        lastTimestamp = performance.now();
      }
    });

    window.themeCanvasUpdate = newTheme => {
      animTheme = newTheme;
      initEntities();
      lastTimestamp = performance.now();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        renderFrame(performance.now());
      }
    };

    canvas.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      isCanvasDragging = true;
      canvas.classList.add("is-grabbing");
      try { canvas.setPointerCapture(event.pointerId); } catch (e) {}
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      lastDragX = event.clientX;
      lastDragY = event.clientY;
      startRotX = labRotX;
      startRotY = labRotY;
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
        labRotY = startRotY + dx * 0.01;
        labRotX = Math.max(-Math.PI * 0.45, Math.min(Math.PI * 0.45, startRotX + dy * 0.01));

        dragInertiaX = (event.clientX - lastDragX) * 0.008;
        dragInertiaY = (event.clientY - lastDragY) * 0.008;
        lastDragX = event.clientX;
        lastDragY = event.clientY;
      }
    });

    function onCanvasPointerUp(event) {
      if (!isCanvasDragging) return;
      isCanvasDragging = false;
      canvas.classList.remove("is-grabbing");
      try { canvas.releasePointerCapture(event.pointerId); } catch (e) {}
    }

    canvas.addEventListener("pointerup", onCanvasPointerUp);
    canvas.addEventListener("pointercancel", onCanvasPointerUp);

    canvas.addEventListener("pointerleave", () => {
      if (!isCanvasDragging) {
        mouse = { x: -1000, y: -1000 };
      }
    });

    window.addEventListener("resize", resize);
    resize();
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
  const chapterDock = document.querySelector("#chapter-dock");
  const chapterDots = document.querySelectorAll(".chapter-dot");
  const chapterPrevBtn = document.querySelector("#chapter-prev");
  const chapterNextBtn = document.querySelector("#chapter-next");

  const chapterIds = ["hero", "work", "arsenal", "trajectory", "publications"];
  let currentChapterIndex = 0;

  function updateChapterProgress() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

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
      dot.setAttribute("aria-selected", String(isActive));
    });
  }

  function scrollToChapter(targetId) {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;

    targetElement.scrollIntoView({ behavior: "smooth", block: "start" });
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
    if (["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) return;

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
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
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
    updateScrollMetrics();
    if (!scrollTicking) {
      requestAnimationFrame(() => {
        updateChapterProgress();
        updateTimeline();
        updateHeroParallax();
        scrollTicking = false;
      });
      scrollTicking = true;
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
    "doiUrl": "https://doi.org/10.1016/j.mtcomm.2026.115373",
    "title": "Crystallization dynamics and interfacial structure during growth of thin Nb films on Cu by high-power impulse magnetron sputtering: A molecular dynamics study",
    "authors": "Milad Ghaemi, Kostas Sarakinos, Flyura Djurabekova, Alvaro Lopez-Cazalilla, Guillaume Jonathan Rosaz, Sergio Calatroni",
    "pdfUrl": "assets/papers/nb-cu-hipims-2026/Crystallization dynamics and interfacial structure during growth of thin Nb films on Cu by high-power impulse magnetron sputtering A molecular dynamics study.pdf",
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
        "title": "Time-resolved visualization of BCC formation (fi=33%, Ei=200 eV)",
        "src": "assets/papers/nb-cu-hipims-2026/Video 1.mp4",
        "caption": "Video 1. Time-resolved visualization of BCC formation during deposition at $f_i = 33\\%$ and $E_i = 200\\text{ eV}$. The animation shows an anisotropic amorphous-to-BCC transformation initiated at the critical thickness $\\Theta \\approx 8\\text{ ML}$. Crystallization propagates along the growth direction while lateral spreading remains limited, producing columnar BCC domains and pronounced out-of-plane displacement."
      },
      {
        "id": "video-2",
        "sheetIndex": 10,
        "type": "video",
        "badge": "VIDEO 02",
        "title": "Time-resolved visualization of BCC formation (fi=33%, Ei=50 eV)",
        "src": "assets/papers/nb-cu-hipims-2026/Video 2.mp4",
        "caption": "Video 2. Time-resolved visualization of BCC formation during deposition at $f_i = 33\\%$ and $E_i = 50\\text{ eV}$. Early BCC nuclei appear at $\\Theta \\approx 2\\text{--}3\\text{ ML}$ and grow steadily throughout deposition, in contrast to the delayed, anisotropic crystallization observed at $E_i = 200\\text{ eV}$."
      },
      {
        "id": "video-3",
        "sheetIndex": 11,
        "type": "video",
        "badge": "VIDEO 03",
        "title": "Time-resolved evolution of surface roughening (fi=33%, Ei=200 eV)",
        "src": "assets/papers/nb-cu-hipims-2026/Video 3.mp4",
        "caption": "Video 3. Time-resolved evolution of surface roughening during deposition at $f_i = 33\\%$ and $E_i = 200\\text{ eV}$. The surface remains smooth ($\\sigma \\approx 1\\text{ \\AA}$) up to $\\Theta \\approx 8\\text{ ML}$ due to atomic peening which suppresses BCC nucleation and maintains a dense amorphous layer. Once the critical thickness is reached, a rapid amorphous-to-BCC transformation produces a sharp roughness increase ($\\Theta \\approx 9\\text{--}14\\text{ ML}$) and localized height variations up to $11\\text{--}12\\text{ \\AA}$ by $\\Theta \\approx 22\\text{ ML}$, consistent with stress-relief-driven hillock formation."
      },
      {
        "id": "video-4",
        "sheetIndex": 12,
        "type": "video",
        "badge": "VIDEO 04",
        "title": "Time-resolved evolution of surface roughening (fi=33%, Ei=50 eV)",
        "src": "assets/papers/nb-cu-hipims-2026/Video 4.mp4",
        "caption": "Video 4. Time-resolved evolution of surface roughening during deposition at $f_i = 33\\%$ and $E_i = 50\\text{ eV}$. Gradual surface-feature development and continuous roughness accumulation occur throughout growth. Early BCC nucleation ($\\Theta \\approx 1\\text{ ML}$) and steady statistical roughening indicate morphology evolution governed by adatom mobility under moderate ion energies."
      }
    ]
  }
};

  function initPaperFolio() {
    const dialog = document.querySelector("#paper-folio-dialog");
    if (!dialog) return;

    const badgeEl = document.querySelector("#paper-folio-badge");
    const counterEl = document.querySelector("#paper-folio-counter");
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
    const leafShadow = document.querySelector("#leaf-shadow-overlay");

    const handlePrev = document.querySelector("#handle-prev");
    const handleNext = document.querySelector("#handle-next");
    const handIndicatorPrev = document.querySelector("#hand-indicator-prev");
    const handIndicatorNext = document.querySelector("#hand-indicator-next");

    const zoomOverlay = document.querySelector("#paper-folio-zoom");
    const zoomImg = document.querySelector("#paper-folio-zoom-img");
    const zoomCaption = document.querySelector("#paper-folio-zoom-caption");
    const zoomClose = document.querySelector("#paper-folio-zoom-close");

    let currentPaper = null;
    let currentSpreadIndex = 0; // 0 = Front Cover, 1..14 = Spreads, 15 = Back Cover
    let isFlipping = false;
    let isDragging = false;
    let dragDirection = null; // 'next' or 'prev'
    let startX = 0;
    let startY = 0;
    let targetSpreadIndex = 0;

function formatScientificText(text) {
      if (!text) return "";
      return text.replace(/\$([^$]+)\$/g, (match, expr) => {
        let s = expr;
        // Fractions
        s = s.replace(/f_(?:\\text\{BCC\}|BCC)\s*=\s*\\frac\{([^}]+)\}\{([^}]+)\}/g, (m, n, d) => {
          const num = n.replace(/N_(?:\\text\{Nb\}|Nb)\(BCC\)/g, "<i>N</i><sub>Nb</sub>(BCC)").replace(/\\text\{([^}]+)\}/g, "$1");
          const denom = d.replace(/N_(?:\\text\{Nb\}|Nb)/g, "<i>N</i><sub>Nb</sub>").replace(/\\text\{([^}]+)\}/g, "$1");
          return `<span class="folio-math"><i class="math-var">f</i><sub>BCC</sub> = <span class="math-frac"><span class="math-num">${num}</span><span class="math-denom">${denom}</span></span></span>`;
        });
        s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, (m, n, d) => {
          const num = n.replace(/N_(?:\\text\{Cu\}|Cu)/g, "<i>N</i><sub>Cu</sub>").replace(/[‘']Other['’]/g, "'Other'").replace(/\\text\{([^}]+)\}/g, "$1");
          const denom = d.replace(/N_(?:\\text\{all\}|all)/g, "<i>N</i><sub>all</sub>").replace(/[‘']Other['’]/g, "'Other'").replace(/\\text\{([^}]+)\}/g, "$1");
          return `<span class="folio-math"><span class="math-frac"><span class="math-num">${num}</span><span class="math-denom">${denom}</span></span></span>`;
        });
        s = s.replace(/\\text\{([^}]+)\}/g, "$1");
        s = s.replace(/Nb\^(\+|\+\+)/g, "Nb<sup>$1</sup>");
        s = s.replace(/Ar\^\+/g, "Ar<sup>+</sup>");
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
        s = s.replace(/\bZ\b/g, "<i>Z</i>");
        return `<span class="folio-math-term">${s}</span>`;
      });
    }

    function getPageHtml(spreadIndex, side) {
      if (!currentPaper) return "";

      // State 0: Closed Front Hardcover
      if (spreadIndex === 0) {
        if (side === 'left') {
          return `
            <div class="page-content page-endpaper">
              <div class="endpaper-frame">
                <div class="endpaper-crest">❦</div>
                <div class="endpaper-title">${currentPaper.journal}</div>
                <div class="endpaper-sub">Special Offprint Edition · 2026</div>
                <div class="endpaper-colophon">Computational Materials Physics · University of Helsinki</div>
              </div>
            </div>
          `;
        }
        return `
          <div class="hardcover-surface cover-front">
            <div class="cover-spine-groove"></div>
            <div class="cover-inner-frame">
              <div class="cover-header-meta">
                <span class="cover-journal-name">${currentPaper.journal}</span>
                <span class="cover-edition-tag">Special Offprint Edition · 2026</span>
              </div>
              <div class="cover-title-block">
                <h1 class="cover-title">${currentPaper.title}</h1>
                <p class="cover-subtitle">A Molecular Dynamics Study</p>
              </div>
              <div class="cover-authors-block">
                <p class="cover-authors">${currentPaper.authors}</p>
                <div class="cover-divider"></div>
                <p class="cover-affiliation">Superconducting Radio Frequency (SRF) Cavity Research</p>
              </div>
              <div class="cover-crest">
                <svg class="crest-svg" viewBox="0 0 48 48" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5">
                  <circle cx="24" cy="24" r="20" stroke-dasharray="3 3"/>
                  <path d="M24 10v28M10 24h28M15 15l18 18M33 15L15 33"/>
                  <circle cx="24" cy="24" r="5" fill="currentColor"/>
                </svg>
                <span class="cover-crest-label">Computational Physics &amp; Materials Science</span>
              </div>
            </div>
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
                <span class="rh-journal">Materials Today Communications 54 (2026) 115373</span>
                <a class="rh-doi" href="${currentPaper.doiUrl}" target="_blank" rel="noopener noreferrer">doi:10.1016/j.mtcomm.2026.115373 ↗</a>
              </div>
              <h2 class="book-paper-title">${currentPaper.title}</h2>
              <p class="book-paper-authors">${currentPaper.authors}</p>
              
              <div class="book-highlights-section">
                <h3 class="book-section-label">Key Research Highlights</h3>
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
                <div class="book-ga-img-wrap" data-zoom-src="${currentPaper.graphicalAbstract}" data-zoom-caption="Graphical Abstract: Atomistic MD modeling of Nb thin film growth on Cu(111) by HiPIMS">
                  <img src="${currentPaper.graphicalAbstract}" alt="Graphical Abstract" class="book-ga-img">
                  <span class="ga-zoom-badge">🔍 Click to zoom</span>
                </div>
              </div>

              <div class="page-footer-num num-right">2</div>
            </div>
          `;
        }
      }

      // Spreads 2 to 13: 12 Scientific Plates (Pages 3 to 26)
      if (spreadIndex >= 2 && spreadIndex <= 13) {
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
                    <img class="book-plate-img" src="${plate.src}" alt="${plate.badge} · ${plate.title}">
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
                <h3 class="plate-title">${plate.title}</h3>
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

      // Spread 14: Conclusions Spread (Pages 27 & 28)
      if (spreadIndex === 14) {
        if (side === 'left') {
          return `
            <div class="page-content page-conclusion">
              <div class="page-running-header">
                <span class="rh-section">Discussion &amp; Conclusions</span>
              </div>
              <h2 class="book-conclusion-title">Conclusions</h2>
              <div class="conclusion-body">
                <p>${formatScientificText(currentPaper.conclusion[0])}</p>
                <p>${formatScientificText(currentPaper.conclusion[1])}</p>
              </div>
              <div class="page-footer-num num-left">27</div>
            </div>
          `;
        } else {
          return `
            <div class="page-content page-conclusion">
              <div class="page-running-header">
                <span class="rh-section">Conclusions (Continued)</span>
              </div>
              <div class="conclusion-body">
                <p>${formatScientificText(currentPaper.conclusion[2])}</p>
                <p>${formatScientificText(currentPaper.conclusion[3])}</p>
              </div>
              <div class="conclusion-seal">
                <span class="seal-mark">✦ ✦ ✦</span>
                <span class="seal-label">Materials Today Communications · CERN / University of Helsinki Collaboration</span>
              </div>
              <div class="page-footer-num num-right">28</div>
            </div>
          `;
        }
      }

      // State 15: Closed Back Hardcover
      if (spreadIndex === 15) {
        if (side === 'left') {
          return `
            <div class="page-content page-endpaper">
              <div class="endpaper-frame">
                <div class="endpaper-crest">❦</div>
                <div class="endpaper-title">${currentPaper.journal}</div>
                <div class="endpaper-sub">Computational Research Library</div>
                <div class="endpaper-colophon">End of Scientific Offprint · 2026</div>
              </div>
            </div>
          `;
        }
        return `
          <div class="hardcover-surface cover-back">
            <div class="cover-spine-groove"></div>
            <div class="cover-inner-frame">
              <div class="backcover-colophon">
                <div class="colophon-crest">
                  <svg class="crest-svg" viewBox="0 0 48 48" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="24" cy="24" r="20" stroke-dasharray="3 3"/>
                    <path d="M16 24h16M24 16v16"/>
                    <circle cx="24" cy="24" r="4" fill="currentColor"/>
                  </svg>
                </div>
                <h3 class="backcover-title">Research Publication Offprint</h3>
                <p class="backcover-cite">Ghaemi, M., Sarakinos, K., Djurabekova, F., Lopez-Cazalilla, A., Rosaz, G.J., Calatroni, S. (2026). Crystallization dynamics and interfacial structure during growth of thin Nb films on Cu by high-power impulse magnetron sputtering: A molecular dynamics study. <em>Materials Today Communications</em>, 54, 115373.</p>
                
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
          </div>
        `;
      }

      return "";
    }

    function wirePageInteractions(container) {
      if (!container) return;
      container.querySelectorAll("[data-zoom-src]").forEach(el => {
        el.addEventListener("click", () => {
          openZoom(el.dataset.zoomSrc, el.dataset.zoomCaption || "");
        });
      });

      const coverFront = container.querySelector(".cover-front");
      if (coverFront) {
        coverFront.style.cursor = "pointer";
        coverFront.addEventListener("click", () => {
          if (!isDragging) {
            flipToSpread(1);
          }
        });
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

    function renderSpread(spreadIndex, isAfterTurn = false) {
      if (!currentPaper) return;

      // Update case state class
      bookHardcoverCase.classList.remove("state-front-cover", "state-back-cover", "state-open-spread");
      if (spreadIndex === 0) {
        bookHardcoverCase.classList.add("state-front-cover");
      } else if (spreadIndex === 15) {
        bookHardcoverCase.classList.add("state-back-cover");
      } else {
        bookHardcoverCase.classList.add("state-open-spread");
      }

      // Pause existing video if any
      const existingVideo = bookHardcoverCase.querySelector("video");
      if (existingVideo) existingVideo.pause();

      pageLeft.innerHTML = getPageHtml(spreadIndex, 'left');
      pageRight.innerHTML = getPageHtml(spreadIndex, 'right');

      wirePageInteractions(pageLeft);
      wirePageInteractions(pageRight);

      // Staggered caption reveal on right page
      if (spreadIndex >= 2 && spreadIndex <= 13) {
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

      // Update counter text if element exists
      if (counterEl) {
        if (currentSpreadIndex === 0) {
          counterEl.textContent = "Front Hardcover (Closed)";
        } else if (currentSpreadIndex === 1) {
          counterEl.textContent = "Spread 01 / 14 · Pages 01-02 (Title & Abstract)";
        } else if (currentSpreadIndex >= 2 && currentSpreadIndex <= 13) {
          const pIdx = currentSpreadIndex - 2;
          const plate = currentPaper.plates[pIdx];
          const pLeft = String(2 * currentSpreadIndex - 1).padStart(2, "0");
          const pRight = String(2 * currentSpreadIndex).padStart(2, "0");
          counterEl.textContent = `Spread ${String(currentSpreadIndex).padStart(2, "0")} / 14 · Pages ${pLeft}-${pRight} (${plate.badge})`;
        } else if (currentSpreadIndex === 14) {
          counterEl.textContent = "Spread 14 / 14 · Pages 27-28 (Conclusions)";
        } else if (currentSpreadIndex === 15) {
          counterEl.textContent = "Back Hardcover (Closed)";
        }
      }

      if (btnPrev) btnPrev.disabled = currentSpreadIndex === 0;
      if (btnNext) btnNext.disabled = currentSpreadIndex === 15;

      if (handlePrev) handlePrev.style.display = currentSpreadIndex === 0 ? "none" : "flex";
      if (handleNext) handleNext.style.display = currentSpreadIndex === 15 ? "none" : "flex";

      // Dynamic handle hints
      if (handleNext) {
        const hintNext = handleNext.querySelector(".handle-hint");
        if (hintNext) {
          if (currentSpreadIndex === 0) hintNext.textContent = "Click or drag to open";
          else if (currentSpreadIndex === 14) hintNext.textContent = "Close to back cover";
          else hintNext.textContent = "Drag to turn page";
        }
      }

      if (handlePrev) {
        const hintPrev = handlePrev.querySelector(".handle-hint");
        if (hintPrev) {
          if (currentSpreadIndex === 1) hintPrev.textContent = "Close to front cover";
          else if (currentSpreadIndex === 15) hintPrev.textContent = "Drag to reopen";
          else hintPrev.textContent = "Drag to turn back";
        }
      }

      // Update pagination dots
      if (stripEl) {
        stripEl.querySelectorAll(".folio-dot-item").forEach(item => {
          const idx = parseInt(item.dataset.spreadIndex, 10);
          const isActive = idx === currentSpreadIndex;
          item.classList.toggle("active", isActive);
          item.setAttribute("aria-selected", String(isActive));
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

      // Clenched hand follows corner point
      const tilt = -12 + (Math.atan2(vy, vx) * 180 / Math.PI) * 0.35;
      handIndicatorNext.style.transform = `translate3d(${(x - W).toFixed(1)}px, ${(y - H).toFixed(1)}px, 0) scale(0.9) rotate(${tilt.toFixed(1)}deg)`;
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

      const tilt = 12 - (Math.atan2(vy, -vx) * 180 / Math.PI) * 0.35;
      handIndicatorPrev.style.transform = `translate3d(${x.toFixed(1)}px, ${(y - H).toFixed(1)}px, 0) scale(0.9) rotate(${tilt.toFixed(1)}deg)`;
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
      if (e.button !== 0 || isFlipping || currentSpreadIndex >= 15) return;

      isDragging = true;
      dragDirection = 'next';
      targetSpreadIndex = currentSpreadIndex + 1;

      try {
        handleNext.setPointerCapture(e.pointerId);
      } catch (err) {}

      handleNext.classList.add("is-grabbing");
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

      leafFaceFront.innerHTML = getPageHtml(currentSpreadIndex, 'right');
      leafFaceBack.innerHTML = getPageHtml(targetSpreadIndex, 'left');
      pageRight.innerHTML = getPageHtml(targetSpreadIndex, 'right');

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
      } catch (err) {}

      handleNext.classList.remove("is-grabbing");

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
          pageRight.innerHTML = getPageHtml(currentSpreadIndex, 'right');
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
      } catch (err) {}

      handlePrev.classList.add("is-grabbing");
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

      leafFaceFront.innerHTML = getPageHtml(currentSpreadIndex, 'left');
      leafFaceBack.innerHTML = getPageHtml(targetSpreadIndex, 'right');
      pageLeft.innerHTML = getPageHtml(targetSpreadIndex, 'left');

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
      } catch (err) {}

      handlePrev.classList.remove("is-grabbing");

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
          pageLeft.innerHTML = getPageHtml(currentSpreadIndex, 'left');
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
      const clamped = Math.max(0, Math.min(15, targetIndex));
      if (clamped === currentSpreadIndex) return;

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) {
        currentSpreadIndex = clamped;
        renderSpread(currentSpreadIndex, false);
        return;
      }

      isFlipping = true;
      targetSpreadIndex = clamped;

      const dir = targetSpreadIndex > currentSpreadIndex ? 'next' : 'prev';

      if (dir === 'next') {
        flippingLeaf.style.transformOrigin = "";
        flippingLeaf.style.transformStyle = "";
        leafFaceFront.style.backfaceVisibility = "visible";
        leafFaceBack.style.backfaceVisibility = "visible";

        flippingLeaf.style.left = "auto";
        flippingLeaf.style.right = "10px";
        flippingLeaf.style.width = "calc(50% - 10px)";

        leafFaceFront.innerHTML = getPageHtml(currentSpreadIndex, 'right');
        leafFaceBack.innerHTML = getPageHtml(targetSpreadIndex, 'left');
        pageRight.innerHTML = getPageHtml(targetSpreadIndex, 'right');

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

        leafFaceFront.innerHTML = getPageHtml(currentSpreadIndex, 'left');
        leafFaceBack.innerHTML = getPageHtml(targetSpreadIndex, 'right');
        pageLeft.innerHTML = getPageHtml(targetSpreadIndex, 'left');

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
    function openZoom(src, captionText) {
      zoomImg.src = src;
      zoomCaption.textContent = captionText || "";
      zoomOverlay.classList.add("is-active");
      zoomOverlay.setAttribute("aria-hidden", "false");
    }

    function closeZoom() {
      zoomOverlay.classList.remove("is-active");
      zoomOverlay.setAttribute("aria-hidden", "true");
      zoomImg.src = "";
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

      if (badgeEl) badgeEl.textContent = data.badge;
      if (pdfBtn) pdfBtn.href = encodeURI(data.pdfUrl);

      // Build Pagination Dots with Tooltips (16 states: 0 to 15)
      if (stripEl) {
        const dotsHtml = [];
        
        // 0: Cover
        dotsHtml.push(`
          <button class="folio-dot-item ${initialSpread === 0 ? 'active' : ''}" type="button" data-spread-index="0" role="tab" aria-selected="${initialSpread === 0}" aria-label="Front Cover">
            <span class="dot-pip"></span>
            <span class="dot-tooltip">Front Hardcover</span>
          </button>
        `);

        // 1: Overview
        dotsHtml.push(`
          <button class="folio-dot-item ${initialSpread === 1 ? 'active' : ''}" type="button" data-spread-index="1" role="tab" aria-selected="${initialSpread === 1}" aria-label="Pages 01-02: Abstract & Title">
            <span class="dot-pip"></span>
            <span class="dot-tooltip">Pages 01-02 · Abstract &amp; Title</span>
          </button>
        `);

        // 2..13: 12 Scientific Plates
        currentPaper.plates.forEach((plate, pIdx) => {
          const spreadIdx = pIdx + 2;
          const isActive = spreadIdx === initialSpread;
          dotsHtml.push(`
            <button class="folio-dot-item ${isActive ? 'active' : ''}" type="button" data-spread-index="${spreadIdx}" role="tab" aria-selected="${isActive}" aria-label="${plate.badge}: ${plate.title}">
              <span class="dot-pip"></span>
              <span class="dot-tooltip"><strong>${plate.badge}</strong> · ${plate.title}</span>
            </button>
          `);
        });

        // 14: Conclusions
        dotsHtml.push(`
          <button class="folio-dot-item ${initialSpread === 14 ? 'active' : ''}" type="button" data-spread-index="14" role="tab" aria-selected="${initialSpread === 14}" aria-label="Pages 27-28: Conclusions">
            <span class="dot-pip"></span>
            <span class="dot-tooltip">Pages 27-28 · Conclusions</span>
          </button>
        `);

        // 15: Back Cover
        dotsHtml.push(`
          <button class="folio-dot-item ${initialSpread === 15 ? 'active' : ''}" type="button" data-spread-index="15" role="tab" aria-selected="${initialSpread === 15}" aria-label="Back Hardcover">
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

      renderSpread(currentSpreadIndex, false);

      dialog.showModal();
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
    document.querySelectorAll(".open-paper-folio").forEach(btn => {
      btn.addEventListener("click", () => {
        const pid = btn.dataset.paperId;
        openFolio(pid, 0);
      });
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
      if (!dialog.open) return;

      if (zoomOverlay.classList.contains("is-active")) {
        if (e.key === "Escape") {
          e.preventDefault();
          closeZoom();
        }
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        flipToSpread(currentSpreadIndex - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        flipToSpread(currentSpreadIndex + 1);
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeFolio();
      }
    });
  }

  initPaperFolio();

  updateScrollMetrics();
  updateHeroParallax();
  updateChapterProgress();
  updateTimeline();
});
