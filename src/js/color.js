/* ─── colour ─────────────────────────────────────────────── */
function ramp(t){
  t = clamp(t, 0, 1);
  const R = activeRamp();
  let i = 0;
  while (i < R.length - 2 && t > R[i + 1].p) i++;
  const a = R[i], b = R[i + 1], u = (t - a.p) / (b.p - a.p);
  /* take the short arc: 330°→24° must cross red, not loop back
     through blue and green */
  let dh = b.h - a.h;
  if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  return {
    h: Math.round(((a.h + dh * u) % 360 + 360) % 360),
    s: Math.round(a.s + (b.s - a.s) * u),
    l: Math.round(a.l + (b.l - a.l) * u),
  };
}
function paint(el, t){
  const c = ramp(t);
  el.style.setProperty("--ch", c.h);
  el.style.setProperty("--cs", c.s + "%");
  el.style.setProperty("--cl", c.l + "%");
}
const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const toneNow = () => parseFloat(cssVar("--tone")) || 0;
/* the same colour the DOM shows, resolved for canvas */
function rampCss(t, alpha){
  const c = ramp(t), l = c.l + toneNow();
  return `hsl(${c.h} ${c.s}% ${l}%${alpha == null ? "" : " / " + alpha})`;
}
function inkOn(t){
  const c = ramp(t), shift = parseFloat(cssVar("--ink-shift")) || -28;
  return `hsl(${c.h} ${c.s + 14}% ${c.l + toneNow() + shift}%)`;
}
