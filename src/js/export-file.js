/* ─── export: standalone HTML ────────────────────────────── */
/* JSON that is safe to sit inside a script element */
function safeJSON(v){
  return JSON.stringify(v)
    .replace(/</g, "\u003c")
    .replace(/\u2028/g, "\u2028")
    .replace(/\u2029/g, "\u2029");
}
function buildHTML(){
  const doc = document.documentElement.cloneNode(true);
  /* Strip only the nodes render() regenerates, each scoped to the container
     that owns it. Bare class selectors are not safe here: the image stage
     carries .empty as a state flag and an unscoped ".empty" deleted it,
     which took #stage out of the saved file and broke its boot. */
  doc.querySelectorAll(
    "#plot .tok, #plot .leader, #plot .empty, " +
    "#ruler .tick, #ruler .rlab, #ruler .runit, #ruler .base, " +
    "#stats .stat, script[data-seed]"
  ).forEach(n => n.remove());
  const t = doc.querySelector("#toast"); if (t){ t.textContent = ""; t.className = "toast"; }
  const p = doc.querySelector("#panel"); if (p){ p.className = "panel"; p.setAttribute("aria-hidden", "true"); }
  const sc = doc.querySelector("#scrim"); if (sc) sc.className = "scrim";
  const st = doc.querySelector("#stage"); if (st){ st.innerHTML = '<span class="initial">?</span>'; st.className = "stage empty"; }
  ["#plot", "#grid", "#ruler", "#fieldwrap"].forEach(s => { const n = doc.querySelector(s); if (n) n.removeAttribute("style"); });
  const sa = doc.querySelector("#savedAt"); if (sa) sa.textContent = "";

  const data = Object.assign(snapshot(), { eid: uid() });
  const seed = doc.ownerDocument.createElement("script");
  seed.setAttribute("data-seed", "1");
  seed.textContent = "window.__HC_SEED__=" + safeJSON(data) + ";";
  const first = doc.querySelector("script");
  if (first && first.parentNode) first.parentNode.insertBefore(seed, first);
  else doc.querySelector("body").appendChild(seed);

  return "<!doctype html>\n" + doc.outerHTML;
}

/* ─── saving ─────────────────────────────────────────────── */
const dlCap = (() => {
  try {
    if (window.claude && typeof window.claude.use === "function")
      return window.claude.use("downloads").catch(() => null);
  } catch(e){}
  return Promise.resolve(null);
})();

async function saveFile(filename, data){
  const cap = await dlCap;
  if (cap && typeof cap.save === "function"){
    await cap.save({ filename, data });
    return "saved";
  }
  const blob = data instanceof Blob ? data : new Blob([data], { type:"text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "saved";
}
function saveError(e){
  const code = e && e.code;
  if (code === "declined") return;                        /* the viewer said no */
  if (code === "too_large") { toast("파일이 16MB를 넘습니다 — 이미지를 줄여 주세요"); return; }
  if (code === "rate_limited") { toast("잠시 후 다시 눌러 주세요"); return; }
  toast("저장하지 못했습니다");
}
function stamp(){
  const d = new Date();
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

async function doPNG(){
  const b = $("#pngBtn");
  if (!state.chars.length){ toast("저장할 캐릭터가 없습니다"); return; }
  b.disabled = true; b.textContent = "그리는 중…";
  try {
    const blob = await buildPNG();
    await saveFile(`캐릭터키비교-${stamp()}.png`, blob);
    toast("PNG를 저장했습니다");
  } catch(e){ saveError(e); }
  finally { b.disabled = false; b.textContent = "🖼 PNG로 저장"; }
}
async function doHTML(){
  const b = $("#htmlBtn");
  b.disabled = true;
  try {
    await saveFile(`캐릭터키비교-${stamp()}.html`, buildHTML());
    toast("HTML을 저장했습니다 — 열면 지금 데이터 그대로 나옵니다");
  } catch(e){ saveError(e); }
  finally { b.disabled = false; }
}
