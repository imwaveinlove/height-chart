/* ─── export: PNG ────────────────────────────────────────── */
function loadImage(src){
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = src;
  });
}
function roundRect(g, x, y, w, h, r){
  if (g.roundRect){ g.beginPath(); g.roundRect(x, y, w, h, r); return; }
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
/* mirrors .disc img: object-fit contain, then scale(iz), then translate(ix%,iy%) */
function drawFramed(g, img, cx, cy, D, iz, ix, iy){
  g.save();
  g.beginPath(); g.arc(cx, cy, D / 2, 0, Math.PI * 2); g.clip();
  const contain = Math.min(D / img.width, D / img.height) * iz;
  const w = img.width * contain, h = img.height * contain;
  g.drawImage(img, cx - w / 2 + (ix / 100) * D, cy - h / 2 + (iy / 100) * D, w, h);
  g.restore();
}
function wrapText(g, text, maxW, maxLines){
  const words = text.split(/(\s+)/);
  const lines = [];
  let cur = "";
  const push = () => { if (cur) lines.push(cur.trim()); cur = ""; };
  for (const w of words){
    if (g.measureText(cur + w).width <= maxW || !cur){ cur += w; continue; }
    push();
    if (lines.length >= maxLines) break;
    cur = w.trim();
  }
  if (lines.length < maxLines) push();
  /* hard-break a single word that still overflows */
  for (let i = 0; i < lines.length; i++){
    while (g.measureText(lines[i]).width > maxW && lines[i].length > 1) lines[i] = lines[i].slice(0, -1);
  }
  return lines.slice(0, maxLines);
}

async function buildPNG(){
  const L = computeLayout();
  if (!L) throw new Error("empty");
  try { await document.fonts.ready; } catch(e){}

  const M = 26, HEAD = 58, DPR = 2;
  const W = L.W + M * 2, H = L.H + HEAD + M * 2;
  const cv = document.createElement("canvas");
  cv.width = W * DPR; cv.height = H * DPR;
  const g = cv.getContext("2d");
  g.scale(DPR, DPR);

  const col = {
    field: cssVar("--field"), paper: cssVar("--paper"), ink: cssVar("--ink"),
    ink2: cssVar("--ink-2"), ink3: cssVar("--ink-3"), rule: cssVar("--rule"), ruleSoft: cssVar("--rule-soft"),
  };
  const SANS = '"IBM Plex Sans KR","Apple SD Gothic Neo",sans-serif';
  const MONO = '"IBM Plex Mono",monospace';

  const paper2 = cssVar("--paper-2");
  if (paper2){
    const lg = g.createLinearGradient(0, 0, 0, H);
    lg.addColorStop(0, col.paper); lg.addColorStop(1, paper2);
    g.fillStyle = lg;
  } else g.fillStyle = col.paper;
  g.fillRect(0, 0, W, H);

  /* header */
  g.fillStyle = col.ink;
  g.font = `700 26px "Bricolage Grotesque",${SANS}`;
  g.textBaseline = "alphabetic";
  g.fillText("캐릭터 키 비교", M, M + 22);
  g.save();
  g.fillStyle = col.ink3; g.font = `500 12px ${MONO}`; g.textAlign = "right";
  g.fillText("@whitecotchi", W - M, M + 20);
  g.restore();
  const hs = L.list.map(c => c.height);
  const avg = (hs.reduce((a, b) => a + b, 0) / hs.length).toFixed(1);
  g.fillStyle = col.ink3;
  g.font = `500 12px ${MONO}`;
  g.fillText(`${hs.length}명 · ${fmt(hs[0])}–${fmt(hs[hs.length - 1])}cm · 평균 ${avg}cm`, M, M + 42);

  /* field */
  const OX = M, OY = M + HEAD;
  g.save();
  roundRect(g, OX, OY, L.W, L.H, 10);
  g.fillStyle = col.field; g.fill();
  g.strokeStyle = col.rule; g.lineWidth = 1; g.stroke();
  g.clip();
  g.translate(OX, OY);

  /* graph-paper ruling */
  const gs = state.mode === "prop" ? (state.ppc >= 24 ? state.ppc : state.ppc * 5) : 60;
  g.strokeStyle = col.ruleSoft; g.lineWidth = 1; g.globalAlpha = 0.7;
  g.beginPath();
  if (L.vert){
    for (let x = 0; x <= L.W; x += 60){ g.moveTo(x + .5, 0); g.lineTo(x + .5, L.H); }
    const off = state.mode === "prop" ? L.top0 % gs : 0;
    for (let y = off; y <= L.H; y += gs){ g.moveTo(0, y + .5); g.lineTo(L.W, y + .5); }
  } else {
    const off = state.mode === "prop" ? PAD : 0;
    for (let x = off; x <= L.W; x += gs){ g.moveTo(x + .5, 0); g.lineTo(x + .5, L.H); }
    for (let y = 0; y <= L.H; y += 60){ g.moveTo(0, y + .5); g.lineTo(L.W, y + .5); }
  }
  g.stroke();
  g.globalAlpha = 1;

  /* ruler baseline + ticks */
  g.fillStyle = col.ink; g.globalAlpha = .8;
  if (L.vert) g.fillRect(GUT - 1, 0, 1.5, L.H); else g.fillRect(0, L.baseline, L.W, 1.5);
  g.globalAlpha = 1;

  if (state.mode === "prop"){
    const { step, lab } = tickPlan();
    g.textBaseline = "middle";
    for (let h = L.lo; h <= L.hi; h += step){
      const major = h % lab === 0;
      g.fillStyle = major ? col.ink3 : col.rule;
      if (L.vert){
        const y = L.top0 + (L.hi - h) * state.ppc;
        const w = major ? 12 : 6;
        g.fillRect(GUT - 1 - w, y, w, 1);
        if (major){
          g.fillStyle = col.ink3; g.font = `500 11px ${MONO}`; g.textAlign = "left";
          g.fillText(String(h), 6, y);
        }
      } else {
        const x = PAD + (h - L.lo) * state.ppc;
        g.fillRect(x - .5, L.baseline, 1, major ? 12 : 6);
        if (major){
          g.fillStyle = col.ink3; g.font = `500 11px ${MONO}`; g.textAlign = "center";
          g.fillText(String(h), x, L.baseline + 22);
        }
      }
    }
  }
  g.fillStyle = col.ink3; g.font = `500 10px ${MONO}`; g.textAlign = "left"; g.textBaseline = "middle";
  if (L.vert) g.fillText("CM", 6, 10); else g.fillText("CM", 12, L.H - 12);

  /* leaders + emphasised ticks */
  for (const it of L.items){
    g.strokeStyle = rampCss(it.t, .5); g.lineWidth = 1; g.setLineDash([3, 3]);
    g.beginPath();
    if (L.vert){ g.moveTo(L.baseline, it.cy + .5); g.lineTo(it.cx - L.D / 2 - 4, it.cy + .5); }
    else { g.moveTo(it.cx + .5, L.blockBot(it.lane)); g.lineTo(it.cx + .5, L.baseline); }
    g.stroke(); g.setLineDash([]);
    g.fillStyle = rampCss(it.t);
    g.beginPath();
    if (L.vert) g.arc(L.baseline, it.cy, 3, 0, Math.PI * 2);
    else g.arc(it.cx, L.baseline, 3, 0, Math.PI * 2);
    g.fill();
    if (L.vert) g.fillRect(GUT - 17, it.tickAt - 1, 16, 2);
    else g.fillRect(it.tickAt - 1, L.baseline, 2, 16);
  }

  /* tokens */
  const imgs = new Map();
  await Promise.all(L.items.filter(it => it.c.img).map(async it => {
    try { imgs.set(it.c.id, await loadImage(it.c.img)); } catch(e){}
  }));

  for (const it of L.items){
    const c = it.c, D = L.D, cx = it.cx, cy = it.cy;
    g.save();
    g.shadowColor = "rgba(20,24,31,.20)"; g.shadowBlur = 14; g.shadowOffsetY = 5;
    g.fillStyle = rampCss(it.t);
    g.beginPath(); g.arc(cx, cy, D / 2, 0, Math.PI * 2); g.fill();
    g.restore();

    const im = imgs.get(c.id);
    if (im) drawFramed(g, im, cx, cy, D, c.iz, c.ix, c.iy);
    else {
      g.fillStyle = inkOn(it.t);
      g.font = `700 ${Math.round(D * .4)}px "Bricolage Grotesque",${SANS}`;
      g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText([...c.name][0] || "?", cx, cy + D * .02);
    }
    g.strokeStyle = rampCss(it.t, .55); g.lineWidth = 1.5;
    g.beginPath(); g.arc(cx, cy, D / 2 + 3.5, 0, Math.PI * 2); g.stroke();

    /* label block */
    const alignC = !L.vert;
    const tx = alignC ? cx : cx + D / 2 + 11;
    const maxW = alignC ? L.tokW : VTEXT;
    let ty = alignC ? cy + D / 2 + 18 : cy;
    g.textAlign = alignC ? "center" : "left";
    g.textBaseline = "middle";

    const lines = [];
    g.font = `600 12.5px ${SANS}`;
    for (const s of wrapText(g, c.name, maxW, 2)) lines.push({ s, f:`600 12.5px ${SANS}`, c:col.ink, lh:16 });
    if (c.series){
      g.font = `400 10.5px ${SANS}`;
      for (const s of wrapText(g, c.series, maxW, 2)) lines.push({ s, f:`400 10.5px ${SANS}`, c:col.ink3, lh:13 });
    }
    const chipH = 18, blockH = lines.reduce((a, l) => a + l.lh, 0) + chipH + 5;
    if (!alignC) ty = cy - blockH / 2 + 8;
    for (const l of lines){
      g.font = l.f; g.fillStyle = l.c;
      g.fillText(l.s, tx, ty);
      ty += l.lh;
    }
    /* cm chip */
    g.font = `600 11.5px ${MONO}`;
    const label = fmt(c.height) + "cm";
    const tw = g.measureText(label).width, cw = tw + 15;
    const cxx = alignC ? tx - cw / 2 : tx;
    roundRect(g, cxx, ty - 2, cw, chipH, 9);
    g.fillStyle = rampCss(it.t, .14); g.fill();
    g.strokeStyle = rampCss(it.t, .32); g.lineWidth = 1; g.stroke();
    const chipShift = parseFloat(cssVar("--chip")) || 0;
    const rc = ramp(it.t);
    g.fillStyle = `hsl(${rc.h} ${rc.s}% ${rc.l + toneNow() + chipShift}%)`;
    g.textAlign = alignC ? "center" : "left";
    g.fillText(label, alignC ? tx : cxx + 7.5, ty + chipH / 2 - 2);
  }

  g.restore();
  return new Promise((res, rej) => cv.toBlob(b => (b ? res(b) : rej(new Error("blob"))), "image/png"));
}
