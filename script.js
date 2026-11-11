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

  setPerspective("all");

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
