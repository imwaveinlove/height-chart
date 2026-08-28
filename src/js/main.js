/* ─── wiring ─────────────────────────────────────────────── */
$("#addBtn").addEventListener("click", () => openPanel(null));
$("#closeBtn").addEventListener("click", closePanel);
$("#cancelBtn").addEventListener("click", closePanel);
$("#scrim").addEventListener("click", closePanel);
$("#saveBtn").addEventListener("click", commit);
$("#delBtn").addEventListener("click", () => {
  const c = state.chars.find(x => x.id === state.editing);
  if (!c) return;
  state.chars = state.chars.filter(x => x.id !== state.editing);
  save(); render(); closePanel();
  toast(`${c.name} 삭제됨`);
});
$("#fName").addEventListener("input", syncStage);
$("#fHeight").addEventListener("input", syncStage);
$("#panel").addEventListener("keydown", e => {
  if (e.key === "Escape") closePanel();
  if (e.key === "Enter" && e.target.tagName === "INPUT" && e.target.type !== "range"){ e.preventDefault(); commit(); }
});

/* image: pick, drop, paste, pan, zoom */
const stage = $("#stage");
$("#pickBtn").addEventListener("click", () => $("#file").click());
stage.addEventListener("click", () => { if (!state.draft.img) $("#file").click(); });
stage.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " "){ e.preventDefault(); $("#file").click(); } });
$("#file").addEventListener("change", e => { ingest(e.target.files[0]); e.target.value = ""; });
["dragenter", "dragover"].forEach(t => stage.addEventListener(t, e => { e.preventDefault(); stage.classList.add("dz"); }));
["dragleave", "drop"].forEach(t => stage.addEventListener(t, e => { e.preventDefault(); stage.classList.remove("dz"); }));
stage.addEventListener("drop", e => { if (e.dataTransfer.files[0]) ingest(e.dataTransfer.files[0]); });
document.addEventListener("paste", e => {
  if (!$("#panel").classList.contains("on")) return;
  const items = (e.clipboardData && e.clipboardData.items) || [];
  for (const it of items) if (it.type.startsWith("image/")){ ingest(it.getAsFile()); return; }
});
$("#izoom").addEventListener("input", e => {
  state.draft.iz = clamp(Number(e.target.value) / 100, 0.25, 6);
  $("#izoomVal").textContent = Math.round(state.draft.iz * 100) + "%";
  const im = stage.querySelector("img");
  if (!im) return;
  const r = panRange(im, state.draft.iz);
  state.draft.ix = clamp(state.draft.ix, -r.x, r.x);
  state.draft.iy = clamp(state.draft.iy, -r.y, r.y);
  im.style.setProperty("--iz", state.draft.iz);
  im.style.setProperty("--ix", state.draft.ix);
  im.style.setProperty("--iy", state.draft.iy);
});
$("#fitImgBtn").addEventListener("click", () => {
  const im = stage.querySelector("img");
  state.draft.iz = clamp(fillScale(im), 0.25, 6);
  state.draft.ix = 0; state.draft.iy = 0;
  syncStage();
});
/* object-fit:cover already crops to the short side, so the scale that
   brings the whole picture back into view is exactly its aspect ratio */
$("#containBtn").addEventListener("click", () => {
  state.draft.iz = fitScale(stage.querySelector("img"));
  state.draft.ix = 0; state.draft.iy = 0;
  syncStage();
});
$("#clearImgBtn").addEventListener("click", () => { state.draft = { img:null, iz:1, ix:0, iy:0 }; syncStage(); });

let pan = null;
stage.addEventListener("pointerdown", e => {
  if (!state.draft.img) return;
  pan = { x:e.clientX, y:e.clientY, ix:state.draft.ix, iy:state.draft.iy,
          size:stage.clientWidth, r:panRange(stage.querySelector("img"), state.draft.iz) };
  stage.setPointerCapture(e.pointerId);
  stage.classList.add("dragging");
});
stage.addEventListener("pointermove", e => {
  if (!pan) return;
  state.draft.ix = clamp(pan.ix + ((e.clientX - pan.x) / pan.size) * 100, -pan.r.x, pan.r.x);
  state.draft.iy = clamp(pan.iy + ((e.clientY - pan.y) / pan.size) * 100, -pan.r.y, pan.r.y);
  const im = stage.querySelector("img");
  if (im){ im.style.setProperty("--ix", state.draft.ix); im.style.setProperty("--iy", state.draft.iy); }
});
["pointerup", "pointercancel"].forEach(t => stage.addEventListener(t, () => { pan = null; stage.classList.remove("dragging"); }));

/* view controls */
function syncZoomUI(){
  $("#zoom").value = state.ppc;
  $("#zoomVal").textContent = state.ppc + " px/cm";
}
function setOrient(o){
  if (o !== state.orient){
    /* a vertical chart wants a much smaller cm-to-pixel scale than a
       horizontal one, so each orientation keeps its own */
    if (state.orient === "h") state.ppcH = state.ppc; else state.ppcV = state.ppc;
    state.ppc = o === "v" ? state.ppcV : state.ppcH;
    syncZoomUI();
  }
  state.orient = o;
  $("#oH").setAttribute("aria-pressed", String(o === "h"));
  $("#oV").setAttribute("aria-pressed", String(o === "v"));
  save(); render();
}
function setMode(m){
  state.mode = m;
  $("#mProp").setAttribute("aria-pressed", String(m === "prop"));
  $("#mRank").setAttribute("aria-pressed", String(m === "rank"));
  $("#zoomKnob").classList.toggle("off", m !== "prop");
  $("#zoom").disabled = m !== "prop";
  $("#fitBtn").disabled = m !== "prop";
  save(); render();
}
$("#oH").addEventListener("click", () => setOrient("h"));
$("#oV").addEventListener("click", () => setOrient("v"));
$("#mProp").addEventListener("click", () => setMode("prop"));
$("#mRank").addEventListener("click", () => setMode("rank"));

$("#zoom").addEventListener("input", e => {
  state.ppc = Number(e.target.value);
  $("#zoomVal").textContent = state.ppc + " px/cm";
  render();
});
$("#zoom").addEventListener("change", save);
$("#size").addEventListener("input", e => {
  state.size = Number(e.target.value);
  $("#sizeVal").textContent = state.size + " px";
  render();
});
$("#size").addEventListener("change", save);
$("#fitBtn").addEventListener("click", () => {
  if (!state.chars.length) return;
  const { lo, hi } = bounds(state.chars);
  const avail = state.orient === "v"
    ? Math.max(360, (window.innerHeight || 800) - 260) - (state.size + 40)
    : $("#fieldwrap").clientWidth - PAD * 2;
  state.ppc = clamp(Math.floor(avail / (hi - lo)), 18, 130);
  syncZoomUI();
  save(); render();
});

$("#pngBtn").addEventListener("click", doPNG);
$("#htmlBtn").addEventListener("click", doHTML);
$("#resetBtn").addEventListener("click", () => {
  state.chars = SEED.map(normalize);
  save(); render();
  toast("예시 데이터로 되돌렸습니다");
});
function setTheme(t){
  state.theme = t;
  document.documentElement.setAttribute("data-theme", t);
  for (const b of $("#themeSeg").children) b.setAttribute("aria-pressed", String(b.dataset.set === t));
  save(); render();
}
$("#themeSeg").addEventListener("click", e => {
  const b = e.target.closest("button[data-set]");
  if (b) setTheme(b.dataset.set);
});

let rt;
addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(render, 140); });

/* ─── boot ───────────────────────────────────────────────── */
load();
$("#zoom").value = state.ppc;
$("#zoomVal").textContent = state.ppc + " px/cm";
$("#size").value = state.size;
$("#sizeVal").textContent = state.size + " px";
$("#oH").setAttribute("aria-pressed", String(state.orient === "h"));
$("#oV").setAttribute("aria-pressed", String(state.orient === "v"));
setTheme(state.theme);
setMode(state.mode);
