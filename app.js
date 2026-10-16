(() => {
  "use strict";
  const doc = document.documentElement;
  doc.classList.add("js");
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- idioma (PT / EN) ---------------- */
  const i18nNodes = $$("[data-en]");
  i18nNodes.forEach((n) => { n.dataset.pt = n.innerHTML; });
  const labelNodes = $$("[data-en-label]");
  labelNodes.forEach((n) => { n.dataset.ptLabel = n.getAttribute("aria-label") || ""; });
  const T = {
    pt: { title: "Diego Murari | Desenvolvedor Full Stack", clear: "Limpar filtro", copy: "Copiar e-mail", copied: "E-mail copiado", sound: "Ver a demonstração completa com som", quiet: "Voltar ao modo silencioso", steps: ["A chegar", "Na portaria", "No pátio", "Descarregando", "Concluído"] },
    en: { title: "Diego Murari | Full Stack Developer", clear: "Clear filter", copy: "Copy e-mail", copied: "E-mail copied", sound: "Watch full demo with sound", quiet: "Back to silent mode", steps: ["Expected", "At the gate", "In the yard", "Unloading", "Done"] },
  };
  let lang = "pt";
  const setLang = (l) => {
    lang = l;
    doc.lang = l === "en" ? "en" : "pt-BR";
    i18nNodes.forEach((n) => { n.innerHTML = l === "en" ? n.dataset.en : n.dataset.pt; });
    labelNodes.forEach((n) => n.setAttribute("aria-label", l === "en" ? n.dataset.enLabel : n.dataset.ptLabel));
    $$("#lang span").forEach((s) => s.classList.toggle("on", s.dataset.l === l));
    document.title = T[l].title;
    try { localStorage.setItem("lang", l); } catch (e) { /* sem armazenamento */ }
    renderChips();
    refreshSound();
    paintBoard();
  };
  $("#lang").addEventListener("click", () => setLang(lang === "pt" ? "en" : "pt"));

  /* ---------------- trilha: o caminhão avança com a rolagem ---------------- */
  const stationLinks = $$("#stations a[data-station]");
  const targets = stationLinks.map((a) => $(a.getAttribute("href")));
  const rail = $(".rail");
  const truck = $("#truck");
  const fill = $("#railFill");
  let ticking = false;
  const tick = () => {
    ticking = false;
    const y = scrollY + innerHeight * 0.35;
    const tops = targets.map((t) => t.getBoundingClientRect().top + scrollY);
    let i = 0;
    for (let k = 0; k < tops.length; k++) if (y >= tops[k]) i = k;
    const nextTop = tops[i + 1] ?? document.documentElement.scrollHeight;
    const frac = Math.min(1, Math.max(0, (y - tops[i]) / Math.max(1, nextTop - tops[i])));
    let p = (i + frac) / (tops.length - 1);
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) p = 1;
    p = Math.min(1, Math.max(0, p));
    const w = rail.clientWidth;
    const tw = truck.getBoundingClientRect().width || 40;
    truck.style.transform = `translateX(${p * (w - tw)}px)`;
    fill.style.width = `${p * w}px`;
    const active = p >= 1 ? tops.length - 1 : i;
    stationLinks.forEach((a, k) => { a.classList.toggle("is-on", k === active); a.classList.toggle("is-done", k < active); });
  };
  const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(tick); } };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  tick();

  /* ---------------- painel de pátio ilustrativo ---------------- */
  const plates = ["QRS4F56", "MKT7A21", "JDA3B90", "RPL5C44", "HZN8E15", "TBC2D67"];
  let plateIx = 0;
  const loads = [0, 1, 2].map((k) => ({ plate: plates[plateIx++ % plates.length], step: [3, 2, 0][k], hh: 8 + k * 2 }));
  const boardEl = $("#loads");
  boardEl.setAttribute("aria-hidden", "true");
  const paintBoard = () => {
    boardEl.innerHTML = loads.map((l) => `<li class="load"><b>${l.plate}</b><span class="steps">${[0, 1, 2, 3, 4].map((s) => `<i class="${s < l.step ? "on" : s === l.step ? "now" : ""}"></i>`).join("")}</span><small>${T[lang].steps[l.step]} · ${String(l.hh).padStart(2, "0")}:${String((l.plate.charCodeAt(1) * 7) % 60).padStart(2, "0")}</small></li>`).join("");
  };
  paintBoard();
  let boardTimer;
  const advance = () => {
    const l = loads[Math.floor(Math.random() * loads.length)];
    if (l.step >= 4) { l.plate = plates[plateIx++ % plates.length]; l.step = 0; } else l.step += 1;
    paintBoard();
  };
  const startBoard = () => { if (!reduce && !boardTimer) boardTimer = setInterval(advance, 1700); };
  const stopBoard = () => { clearInterval(boardTimer); boardTimer = null; };
  new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? startBoard() : stopBoard())), { threshold: 0.2 }).observe($(".board"));

  /* ---------------- projetos: palco de mídia + filtro ---------------- */
  const items = $$(".item");
  const medias = { "v-nexus": $("#v-nexus"), "v-receb": $("#v-receb"), "v-dxf": $("#v-dxf") };
  const frame = $(".stage-frame");
  const soundBtn = $("#soundBtn");
  let current = "v-nexus";
  let withSound = false;

  const ensureSrc = (v) => { if (v.tagName === "VIDEO" && !v.src && v.dataset.src) v.src = v.dataset.src; };
  const resetAudio = () => {
    withSound = false;
    Object.values(medias).forEach((m) => { if (m.tagName === "VIDEO") { m.muted = true; m.controls = false; } });
    refreshSound();
  };
  const refreshSound = () => { soundBtn.textContent = withSound ? T[lang].quiet : T[lang].sound; };
  const show = (id) => {
    if (id === current && medias[id].classList.contains("is-on")) return;
    current = id;
    resetAudio();
    Object.entries(medias).forEach(([k, m]) => {
      const on = k === id;
      m.classList.toggle("is-on", on);
      if (m.tagName === "VIDEO") {
        if (on) { ensureSrc(m); if (!reduce) m.play().catch(() => {}); else m.controls = true; }
        else m.pause();
      }
    });
    $(".stage").classList.toggle("dxf-on", id === "v-dxf");
  };
  const itemObs = new IntersectionObserver((es) => {
    es.forEach((e) => {
      if (e.isIntersecting) {
        items.forEach((it) => it.classList.toggle("is-active", it === e.target));
        show(e.target.dataset.media);
      }
    });
  }, { rootMargin: "-42% 0px -42% 0px", threshold: 0 });
  items.forEach((it) => itemObs.observe(it));
  ensureSrc(medias["v-nexus"]);

  soundBtn.addEventListener("click", () => {
    const m = medias[current];
    if (!m || m.tagName !== "VIDEO") return;
    if (!withSound) { withSound = true; m.muted = false; m.controls = true; m.currentTime = 0; m.play().catch(() => {}); }
    else resetAudio();
    refreshSound();
  });

  // filtro por tecnologia
  const norm = (s) => s.toLowerCase().replace(/[^a-z0-9.+]/g, "");
  const tagCount = {};
  items.forEach((it) => it.dataset.tags.split(",").forEach((t) => { tagCount[t] = (tagCount[t] || 0) + 1; }));
  const chipTags = Object.keys(tagCount).sort((a, b) => tagCount[b] - tagCount[a] || a.localeCompare(b));
  let filter = null;
  const chipsEl = $("#chips");
  function renderChips() {
    chipsEl.innerHTML = chipTags.map((t) => `<button type="button" class="chip" aria-pressed="${filter === t}" data-tag="${t}">${t}</button>`).join("") + (filter ? `<button type="button" class="chip clear" data-tag="">${T[lang].clear}</button>` : "");
  }
  chipsEl.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    filter = b.dataset.tag && b.dataset.tag !== filter ? b.dataset.tag : null;
    applyFilter();
    renderChips();
    const f = chipsEl.querySelector(`[data-tag="${filter || ""}"]`);
    if (f) f.focus({ preventScroll: true });
  });
  function applyFilter() {
    items.forEach((it) => {
      const has = !filter || it.dataset.tags.split(",").includes(filter);
      it.classList.toggle("dim", !has);
      $$(".tags li", it).forEach((li) => li.classList.toggle("hit", !!filter && has && norm(li.textContent).startsWith(norm(filter))));
    });
    if (filter) {
      const first = items.find((it) => it.dataset.tags.split(",").includes(filter));
      const activeHas = items.some((it) => it.classList.contains("is-active") && it.dataset.tags.split(",").includes(filter));
      if (first && !activeHas) first.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    }
  }
  renderChips();

  /* ---------------- revelar ao rolar ---------------- */
  const reveal = $$(".about h2, .prose p, .facts div, .projects-intro > *, .jobs > li, .stack, .edu, .contact h2, .contact .lead, .contact .cta, .mailline");
  if ("IntersectionObserver" in window && !reduce) {
    reveal.forEach((n) => n.classList.add("rv"));
    const rvObs = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); rvObs.unobserve(e.target); } }), { threshold: 0.12 });
    reveal.forEach((n) => rvObs.observe(n));
  }

  // o caminhão sai quando o contato aparece
  new IntersectionObserver((es, o) => es.forEach((e) => { if (e.isIntersecting) { $(".contact").classList.add("go"); o.disconnect(); } }), { threshold: 0.35 }).observe($(".contact"));

  /* ---------------- copiar e-mail ---------------- */
  const copyBtn = $("#copyMail");
  const copyLabel = $("#copyLabel");
  copyBtn.addEventListener("click", async () => {
    const mail = copyBtn.dataset.mail;
    try { await navigator.clipboard.writeText(mail); }
    catch (e) { const t = document.createElement("textarea"); t.value = mail; document.body.append(t); t.select(); document.execCommand("copy"); t.remove(); }
    copyLabel.textContent = T[lang].copied;
    setTimeout(() => { copyLabel.innerHTML = lang === "en" ? copyLabel.dataset.en : copyLabel.dataset.pt; }, 1800);
  });

  $("#year").textContent = new Date().getFullYear();

  /* ---------------- idioma inicial ---------------- */
  let start = "pt";
  try {
    const q = new URLSearchParams(location.search).get("lang");
    const s = localStorage.getItem("lang");
    start = q || s || ((navigator.language || "").toLowerCase().startsWith("en") ? "en" : "pt");
  } catch (e) { /* sem armazenamento */ }
  if (start !== "pt") setLang(start === "en" ? "en" : "pt");
})();
