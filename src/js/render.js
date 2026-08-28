/* ─── DOM render ─────────────────────────────────────────── */
function render(){
  const plot = $("#plot"), ruler = $("#ruler"), grid = $("#grid"), wrap = $("#fieldwrap");
  plot.querySelectorAll(".tok,.leader,.empty").forEach(n => n.remove());
  ruler.innerHTML = "";

  const L = computeLayout();
  renderStats(L);
  wrap.classList.toggle("vert", state.orient === "v");

  if (!L){
    plot.style.width = "100%"; plot.style.height = "320px";
    grid.style.setProperty("--gx", "60px"); grid.style.setProperty("--gy", "60px");
    grid.style.setProperty("--gx-off", "0px"); grid.style.setProperty("--gy-off", "0px");
    const e = document.createElement("div");
    e.className = "empty";
    e.textContent = "아직 캐릭터가 없습니다. ‘＋ 캐릭터 추가’로 첫 인물을 올려 보세요.";
    plot.appendChild(e);
    return;
  }

  plot.style.width = L.W + "px";
  plot.style.height = L.H + "px";

  /* graph-paper ruling, aligned to the ruler's own cm ticks */
  const gs = state.mode === "prop" ? (state.ppc >= 24 ? state.ppc : state.ppc * 5) : 60;
  if (L.vert){
    grid.style.setProperty("--gx", "60px");
    grid.style.setProperty("--gy", gs + "px");
    grid.style.setProperty("--gx-off", "0px");
    grid.style.setProperty("--gy-off", (state.mode === "prop" ? L.top0 % gs : 0) + "px");
    grid.style.setProperty("--gmask", "linear-gradient(to right,transparent 0,#000 " + GUT + "px)");
  } else {
    grid.style.setProperty("--gx", gs + "px");
    grid.style.setProperty("--gy", "60px");
    grid.style.setProperty("--gx-off", (state.mode === "prop" ? PAD : 0) + "px");
    grid.style.setProperty("--gy-off", "0px");
    grid.style.setProperty("--gmask", "linear-gradient(to bottom,transparent 0,#000 40px)");
  }

  renderRuler(ruler, L);

  for (const it of L.items){
    const leader = document.createElement("div");
    leader.className = "leader " + (L.vert ? "v" : "h");
    paint(leader, it.t);
    if (L.vert){
      leader.style.left = L.baseline + "px";
      leader.style.top = it.cy + "px";
      leader.style.width = Math.max(0, it.cx - L.D / 2 - 4 - L.baseline) + "px";
    } else {
      leader.style.left = it.cx + "px";
      leader.style.top = L.blockBot(it.lane) + "px";
      leader.style.height = Math.max(0, L.baseline - L.blockBot(it.lane)) + "px";
    }
    plot.appendChild(leader);

    plot.appendChild(buildToken(it, L));
  }
}

function buildToken(it, L){
  const c = it.c, D = L.D;
  const tok = document.createElement("button");
  tok.type = "button";
  tok.className = "tok " + (L.vert ? "v" : "h");
  tok.style.setProperty("--d", D + "px");
  paint(tok, it.t);
  if (L.vert){
    tok.style.left = (it.cx - D / 2) + "px";
    tok.style.top = (it.cy - D / 2) + "px";
    tok.style.width = L.tokW + "px";
  } else {
    tok.style.left = (it.cx - L.tokW / 2) + "px";
    tok.style.top = (it.cy - D / 2) + "px";
    tok.style.width = L.tokW + "px";
  }
  tok.setAttribute("aria-label", `${c.name} ${fmt(c.height)}cm — 수정`);

  const disc = document.createElement("div");
  disc.className = "disc";
  if (c.img){
    const im = document.createElement("img");
    im.src = c.img; im.alt = ""; im.draggable = false;
    im.style.setProperty("--iz", c.iz);
    im.style.setProperty("--ix", c.ix);
    im.style.setProperty("--iy", c.iy);
    disc.appendChild(im);
  } else {
    const sp = document.createElement("span");
    sp.className = "initial";
    sp.textContent = [...c.name][0] || "?";
    disc.appendChild(sp);
  }
  tok.appendChild(disc);

  const meta = document.createElement("div");
  meta.className = "meta";
  const nm = document.createElement("span"); nm.className = "nm"; nm.textContent = c.name;
  meta.appendChild(nm);
  if (c.series){ const sr = document.createElement("span"); sr.className = "sr"; sr.textContent = c.series; meta.appendChild(sr); }
  const cm = document.createElement("span"); cm.className = "cm"; cm.textContent = fmt(c.height) + "cm";
  meta.appendChild(cm);
  tok.appendChild(meta);

  tok.addEventListener("click", () => openPanel(c.id));
  return tok;
}

function tickPlan(){
  const p = state.ppc;
  return { step: p >= 46 ? 1 : p >= 26 ? 2 : 5, lab: p >= 46 ? 5 : 10 };
}

function renderRuler(ruler, L){
  const base = document.createElement("div");
  base.className = "base";
  if (L.vert){
    ruler.style.cssText = `left:0;top:0;width:${GUT}px;height:${L.H}px`;
    base.style.cssText = `left:${GUT - 1}px;top:0;width:1.5px;height:100%`;
  } else {
    ruler.style.cssText = `left:0;bottom:0;width:${L.W}px;height:${RH}px`;
    base.style.cssText = `left:0;top:0;width:100%;height:1.5px`;
  }
  ruler.appendChild(base);

  if (state.mode === "prop"){
    const { step, lab } = tickPlan();
    for (let h = L.lo; h <= L.hi; h += step){
      const major = h % lab === 0;
      const t = document.createElement("div");
      t.className = "tick";
      if (L.vert){
        const y = L.top0 + (L.hi - h) * state.ppc;
        const w = major ? 12 : 6;
        t.style.cssText = `left:${GUT - 1 - w}px;top:${y}px;width:${w}px;height:1px;` +
          (major ? "background:var(--ink-3)" : "");
        ruler.appendChild(t);
        if (major){
          const l = document.createElement("div");
          l.className = "rlab";
          l.textContent = h;
          l.style.cssText = `right:${GUT - 1 + 4}px;top:${y - 8}px;text-align:right`;
          l.style.right = "auto"; l.style.left = "6px";
          ruler.appendChild(l);
        }
      } else {
        const x = PAD + (h - L.lo) * state.ppc;
        t.style.cssText = `left:${x}px;top:0;width:1px;height:${major ? 12 : 6}px;transform:translateX(-.5px);` +
          (major ? "background:var(--ink-3)" : "");
        ruler.appendChild(t);
        if (major){
          const l = document.createElement("div");
          l.className = "rlab";
          l.textContent = h;
          l.style.cssText = `left:${x}px;top:16px;transform:translateX(-50%)`;
          ruler.appendChild(l);
        }
      }
    }
  }

  const unit = document.createElement("div");
  unit.className = "runit";
  unit.textContent = "cm";
  unit.style.cssText = L.vert ? "left:6px;top:4px" : "left:12px;bottom:6px";
  ruler.appendChild(unit);

  for (const it of L.items){
    const hit = document.createElement("div");
    hit.className = "tick";
    paint(hit, it.t);
    const col = "hsl(var(--ch) var(--cs) calc(var(--cl) + var(--tone)))";
    if (L.vert) hit.style.cssText = `left:${GUT - 1 - 16}px;top:${it.tickAt}px;width:16px;height:2px;background:${col}`;
    else        hit.style.cssText = `left:${it.tickAt}px;top:0;width:2px;height:16px;transform:translateX(-1px);background:${col}`;
    ruler.appendChild(hit);
  }
}

function renderStats(L){
  const box = $("#stats");
  box.innerHTML = "";
  if (!L){ box.innerHTML = '<div class="stat"><span class="k">인원</span><span class="v">0</span></div>'; return; }
  const hs = L.list.map(c => c.height);
  const avg = hs.reduce((a, b) => a + b, 0) / hs.length;
  const rows = [
    ["인원", String(hs.length), "명"],
    ["최단", fmt(hs[0]), "cm"],
    ["최장", fmt(hs[hs.length - 1]), "cm"],
    ["평균", avg.toFixed(1), "cm"],
    ["편차", fmt(hs[hs.length - 1] - hs[0]), "cm"],
  ];
  for (const [k, v, u] of rows){
    const d = document.createElement("div");
    d.className = "stat";
    const ke = document.createElement("span"); ke.className = "k"; ke.textContent = k;
    const ve = document.createElement("span"); ve.className = "v"; ve.textContent = v;
    const s = document.createElement("small"); s.textContent = u; ve.appendChild(s);
    d.append(ke, ve);
    box.appendChild(d);
  }
}
