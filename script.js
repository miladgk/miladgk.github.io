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

  updateScrollMetrics();
  updateHeroParallax();
  updateChapterProgress();
  updateTimeline();
});
