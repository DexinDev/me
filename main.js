document.getElementById("year").textContent = new Date().getFullYear();

/* ------------------------------------------------------------------ *
 * Skill field
 * A small force-directed graph. Nodes belong to groups; same-group
 * nodes attract and stay linked, everything repels at close range,
 * the cursor pushes things around and any node can be dragged.
 * ------------------------------------------------------------------ */
(() => {
  const canvas = document.getElementById("skills");
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const groups = {
    lang:    { color: "#5eead4", label: "Languages" },
    backend: { color: "#7dd3fc", label: "Backend" },
    front:   { color: "#c4b5fd", label: "Frontend" },
    data:    { color: "#fca5a5", label: "Data" },
    domain:  { color: "#fcd34d", label: "Domain" },
    infra:   { color: "#86efac", label: "Infra & Ops" },
    cloud:   { color: "#f0abfc", label: "Cloud" },
    cms:     { color: "#fdba74", label: "CMS" },
  };

  const seed = [
    ["Python", "lang", 1.35],
    ["Go", "lang", 1.15],
    ["PHP", "lang", 1],
    ["JS", "lang", 1.2],
    ["Swift", "lang", .85],
    ["Java", "lang", .85],
    ["C#", "lang", .85],
    ["Laravel", "backend", 1],
    ["Django", "backend", 1],
    ["Node", "backend", 1],
    ["Express", "backend", .85],
    ["React", "front", 1.1],
    ["Advanced CSS", "front", .9],
    ["PostgreSQL", "data", 1.05],
    ["MySQL", "data", .95],
    ["Computer Vision", "domain", 1.1],
    ["AI", "domain", 1.15],
    ["Docker", "infra", 1.1],
    ["Kubernetes", "infra", 1],
    ["Linux", "infra", 1],
    ["Nginx", "infra", .85],
    ["Terraform", "infra", .8],
    ["GitLab CI", "infra", .9],
    ["Prometheus", "infra", .85],
    ["Grafana", "infra", .85],
    ["AWS", "cloud", 1.1],
    ["DigitalOcean", "cloud", .9],
    ["WordPress", "cms", .95],
    ["Drupal", "cms", .8],
  ];

  let nodes = [];
  let W = 0, H = 0, dpr = 1;
  const pointer = { x: null, y: null, active: false };
  let dragging = null;
  let hovered = null;

  const rand = (a, b) => a + Math.random() * (b - a);

  function build() {
    nodes = seed.map(([name, group, weight]) => ({
      name,
      group,
      r: 5 + weight * 6,
      x: rand(W * 0.2, W * 0.8),
      y: rand(H * 0.2, H * 0.8),
      vx: rand(-0.2, 0.2),
      vy: rand(-0.2, 0.2),
    }));
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width;
    H = rect.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = "500 12px 'JetBrains Mono', monospace";
    if (!nodes.length) build();
  }

  function step() {
    const cx = W / 2, cy = H / 2;

    for (const n of nodes) {
      if (n === dragging) continue;

      // drift toward centre so the cloud never escapes the frame
      n.vx += (cx - n.x) * 0.00035;
      n.vy += (cy - n.y) * 0.00035;

      for (const m of nodes) {
        if (m === n) continue;
        let dx = n.x - m.x;
        let dy = n.y - m.y;
        let d2 = dx * dx + dy * dy || 0.01;
        const d = Math.sqrt(d2);

        // short-range repulsion between everything
        const push = 320 / d2;
        n.vx += (dx / d) * push;
        n.vy += (dy / d) * push;

        // same group tugs together at medium range
        if (m.group === n.group && d > 90) {
          n.vx -= (dx / d) * 0.02;
          n.vy -= (dy / d) * 0.02;
        }
      }

      // cursor pushes nodes away
      if (pointer.active && pointer.x != null) {
        const dx = n.x - pointer.x;
        const dy = n.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 140 * 140) {
          const d = Math.sqrt(d2) || 1;
          const f = (1 - d / 140) * 2.4;
          n.vx += (dx / d) * f;
          n.vy += (dy / d) * f;
        }
      }

      n.vx *= 0.9;
      n.vy *= 0.9;
      n.x += n.vx;
      n.y += n.vy;

      const pad = n.r + 8;
      if (n.x < pad) { n.x = pad; n.vx *= -0.5; }
      if (n.x > W - pad) { n.x = W - pad; n.vx *= -0.5; }
      if (n.y < pad) { n.y = pad; n.vy *= -0.5; }
      if (n.y > H - pad) { n.y = H - pad; n.vy *= -0.5; }
    }
  }

  function linkAlpha(a, b) {
    if (a.group !== b.group) return 0;
    const dx = a.x - b.x, dy = a.y - b.y;
    const d = Math.hypot(dx, dy);
    if (d > 220) return 0;
    return (1 - d / 220) * 0.4;
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const focus = hovered;

    // links first
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        let alpha = linkAlpha(a, b);
        if (!alpha) continue;
        if (focus && focus.group !== a.group) alpha *= 0.15;
        ctx.strokeStyle = hexA(groups[a.group].color, alpha);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // nodes
    for (const n of nodes) {
      const c = groups[n.group].color;
      const dim = focus && focus.group !== n.group;
      const lit = !focus || focus.group === n.group;

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = hexA(c, dim ? 0.12 : 0.9);
      ctx.fill();

      if (lit) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2);
        ctx.strokeStyle = hexA(c, 0.25);
        ctx.stroke();
      }

      ctx.fillStyle = dim ? "rgba(231,233,238,.28)" : "rgba(231,233,238,.92)";
      ctx.textBaseline = "middle";
      ctx.fillText(n.name, n.x + n.r + 8, n.y);
    }

    drawLegend();
  }

  function drawLegend() {
    let x = 16, y = 22;
    ctx.textBaseline = "middle";
    for (const k of Object.keys(groups)) {
      const g = groups[k];
      const w = 14 + ctx.measureText(g.label).width + 28;
      if (x + w > W - 12) { x = 16; y += 22; }
      ctx.beginPath();
      ctx.arc(x + 4, y, 4, 0, Math.PI * 2);
      ctx.fillStyle = g.color;
      ctx.fill();
      ctx.fillStyle = "rgba(154,161,173,.85)";
      ctx.fillText(g.label, x + 14, y);
      x += w;
    }
  }

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  }

  function pick(x, y) {
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (Math.hypot(n.x - x, n.y - y) < n.r + 12) return n;
    }
    return null;
  }

  function local(e) {
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }

  canvas.addEventListener("pointermove", (e) => {
    const p = local(e);
    pointer.x = p.x; pointer.y = p.y; pointer.active = true;
    if (dragging) { dragging.x = p.x; dragging.y = p.y; dragging.vx = dragging.vy = 0; }
    else { hovered = pick(p.x, p.y); }
  });

  canvas.addEventListener("pointerdown", (e) => {
    const p = local(e);
    dragging = pick(p.x, p.y);
    if (dragging) canvas.setPointerCapture(e.pointerId);
  });

  const release = () => { dragging = null; };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("pointerleave", () => {
    pointer.active = false; pointer.x = pointer.y = null; hovered = null;
  });

  let raf;
  function loop() {
    if (!reduced) step();
    draw();
    raf = requestAnimationFrame(loop);
  }

  const io = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { if (!raf) loop(); }
    else if (raf) { cancelAnimationFrame(raf); raf = null; }
  }, { threshold: 0.05 });

  window.addEventListener("resize", resize);
  resize();
  io.observe(canvas);
})();
