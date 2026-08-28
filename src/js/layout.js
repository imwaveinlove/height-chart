/* ─── layout ─────────────────────────────────────────────── */
function bounds(list){
  const hs = list.map(c => c.height);
  let lo = Math.min(...hs), hi = Math.max(...hs);
  if (hi - lo < 8){ const m = (hi + lo) / 2; lo = m - 4; hi = m + 4; }
  const pad = Math.max(2, (hi - lo) * 0.1);
  return { lo: Math.floor((lo - pad) / 2) * 2, hi: Math.ceil((hi + pad) / 2) * 2 };
}
/* greedy: first lane whose last occupant clears this one */
function packLanes(pos, step){
  const last = [];
  const lane = pos.map(p => {
    for (let i = 0; i < last.length; i++) if (p - last[i] >= step){ last[i] = p; return i; }
    last.push(p); return last.length - 1;
  });
  return { lane, count: Math.max(1, last.length) };
}

function computeLayout(){
  const list = [...state.chars].sort((a, b) => a.height - b.height || a.name.localeCompare(b.name, "ko"));
  if (!list.length) return null;

  const { lo, hi } = bounds(list);
  const span = hi - lo;
  const cLo = list[0].height, cHi = list[list.length - 1].height;
  const tOf = h => (cHi > cLo ? (h - cLo) / (cHi - cLo) : 0.5);
  const D = state.size, ppc = state.ppc, vert = state.orient === "v";
  const view = $("#fieldwrap");
  const viewW = view.clientWidth || 1200;
  const viewH = Math.max(360, (window.innerHeight || 800) - 260);

  if (!vert){
    const step = D + HGAP;
    const tokW = D + 34;
    let xs;
    if (state.mode === "rank"){
      const inner = Math.max(viewW - PAD * 2, (list.length - 1) * step);
      xs = list.map((_, i) => PAD + (list.length === 1 ? inner / 2 : (inner * i) / (list.length - 1)));
    } else {
      xs = list.map(c => PAD + (c.height - lo) * ppc);
    }
    const { lane, count } = packLanes(xs, step);
    const LANE = D + LABEL + VGAP;
    const H = RH + count * LANE + 22;
    const axisW = state.mode === "prop" ? PAD * 2 + span * ppc : 0;
    const W = Math.max(viewW, axisW, Math.ceil(xs[xs.length - 1] + PAD));
    const axisPx = state.mode === "prop" ? ppc : (W - PAD * 2) / span;
    const items = list.map((c, i) => ({
      c, t: tOf(c.height), lane: lane[i],
      cx: xs[i],
      cy: H - RH - 10 - lane[i] * LANE - LABEL - D / 2,
      tickAt: state.mode === "prop" ? xs[i] : PAD + (c.height - lo) * axisPx,
    }));
    return { vert:false, list, items, lo, hi, span, D, W, H, LANE, tokW, axisPx,
             baseline: H - RH, blockBot: L => H - RH - 10 - L * LANE };
  }

  const tokW = D + 11 + VTEXT;
  const step = D + VGAP2;
  const top0 = D / 2 + 20;
  let ys;
  if (state.mode === "rank"){
    const inner = Math.max(viewH - top0 * 2, (list.length - 1) * step);
    ys = list.map((_, i) => top0 + (list.length === 1 ? inner / 2 : (inner * (list.length - 1 - i)) / (list.length - 1)));
  } else {
    ys = list.map(c => top0 + (hi - c.height) * ppc);
  }
  /* pack from the top downwards, so sort keys must ascend */
  const order = list.map((_, i) => i).sort((a, b) => ys[a] - ys[b]);
  const packed = packLanes(order.map(i => ys[i]), step);
  const lane = [];
  order.forEach((idx, k) => { lane[idx] = packed.lane[k]; });
  const count = packed.count;

  const H = Math.max(viewH, Math.ceil(ys[0] + top0));
  const axisPx = state.mode === "prop" ? ppc : (H - top0 * 2) / span;
  const W = Math.max(view.clientWidth || 0, GUT + 34 + count * (tokW + VCOL) + 12);
  const items = list.map((c, i) => ({
    c, t: tOf(c.height), lane: lane[i],
    cx: GUT + 34 + lane[i] * (tokW + VCOL) + D / 2,
    cy: ys[i],
    tickAt: state.mode === "prop" ? ys[i] : top0 + (hi - c.height) * axisPx,
  }));
  return { vert:true, list, items, lo, hi, span, D, W, H, tokW, top0, axisPx,
           baseline: GUT, laneX: L => GUT + 34 + L * (tokW + VCOL) };
}
