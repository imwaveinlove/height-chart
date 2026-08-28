/* ─── editor: image framing ──────────────────────────────── */
function openPanel(id){
  state.editing = id || null;
  const c = id ? state.chars.find(x => x.id === id) : null;
  state.draft = c ? { img:c.img, iz:c.iz, ix:c.ix, iy:c.iy } : { img:null, iz:1, ix:0, iy:0 };
  $("#panelTitle").textContent = c ? "캐릭터 수정" : "캐릭터 추가";
  $("#fName").value = c ? c.name : "";
  $("#fSeries").value = c ? c.series : "";
  $("#fHeight").value = c ? c.height : "";
  $("#delBtn").style.display = c ? "" : "none";
  syncStage();
  $("#panel").classList.add("on");
  $("#panel").setAttribute("aria-hidden", "false");
  $("#scrim").classList.add("on");
  setTimeout(() => $("#fName").focus(), 60);
}
function closePanel(){
  $("#panel").classList.remove("on");
  $("#panel").setAttribute("aria-hidden", "true");
  $("#scrim").classList.remove("on");
  state.editing = null;
  state.draft = { img:null, iz:1, ix:0, iy:0 };
}
function syncStage(){
  const st = $("#stage"), d = state.draft, has = !!d.img;
  st.innerHTML = "";
  st.classList.toggle("empty", !has);

  const list = state.chars.map(c => c.height);
  const h = parseFloat($("#fHeight").value);
  if (list.length && Number.isFinite(h)){
    const all = list.concat([h]);
    const lo = Math.min(...all), hi = Math.max(...all);
    paint(st, hi > lo ? (h - lo) / (hi - lo) : 0.5);
  } else {
    st.style.setProperty("--ch", 210); st.style.setProperty("--cs", "12%"); st.style.setProperty("--cl", "62%");
  }

  if (has){
    const im = document.createElement("img");
    im.src = d.img; im.alt = ""; im.draggable = false;
    im.style.setProperty("--iz", d.iz);
    im.style.setProperty("--ix", d.ix);
    im.style.setProperty("--iy", d.iy);
    st.appendChild(im);
  } else {
    const sp = document.createElement("span");
    sp.className = "initial";
    sp.textContent = [...$("#fName").value.trim()][0] || "?";
    st.appendChild(sp);
  }
  const hint = document.createElement("span");
  hint.className = "hintline";
  hint.textContent = has ? "끌어서 위치 조절" : "클릭 · 드래그 · 붙여넣기";
  st.appendChild(hint);

  $("#izoom").disabled = !has;
  $("#izoom").value = Math.round(d.iz * 100);
  $("#izoomVal").textContent = Math.round(d.iz * 100) + "%";
  $("#fitImgBtn").disabled = !has;
  $("#containBtn").disabled = !has;
  $("#clearImgBtn").disabled = !has;
}

/* object-fit:contain fits the WHOLE picture inside the disc at iz 1, so
   scaling up is what crops — the opposite of cover, where the crop
   happened first and scaling could never give it back.
   fitScale/fillScale/panRange all work in ratios of the disc, so a
   stored framing stays correct at any avatar size. */
function fitScale(im){            /* iz that shows the whole picture */
  return 1;
}
function fillScale(im){           /* iz that fills the circle edge to edge */
  if (!im || !im.naturalWidth) return 1;
  return Math.max(im.naturalWidth, im.naturalHeight) / Math.min(im.naturalWidth, im.naturalHeight);
}
function drawnRatio(im, iz){      /* rendered size, in units of the disc */
  const c = Math.min(1 / im.naturalWidth, 1 / im.naturalHeight) * iz;
  return { w: im.naturalWidth * c, h: im.naturalHeight * c };
}
function panRange(im, iz){
  if (!im || !im.naturalWidth) return { x:0, y:0 };
  const d = drawnRatio(im, iz);
  return { x: Math.abs(d.w - 1) / 2 * 100, y: Math.abs(d.h - 1) / 2 * 100 };
}

/* downscale so localStorage stays small; keep aspect for reframing */
function hasAlpha(g, w, h){
  const d = g.getImageData(0, 0, w, h).data;
  /* sample every 4th pixel — enough to spot a transparent background */
  for (let i = 3; i < d.length; i += 16) if (d[i] < 250) return true;
  return false;
}
function ingest(file){
  if (!file || !file.type.startsWith("image/")){ toast("이미지 파일만 넣을 수 있습니다"); return; }
  const fr = new FileReader();
  fr.onload = () => {
    const img = new Image();
    img.onload = () => {
      const MAX = 480;
      const s = Math.min(1, MAX / Math.max(img.width, img.height));
      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(img.width * s));
      cv.height = Math.max(1, Math.round(img.height * s));
      const g = cv.getContext("2d");
      g.drawImage(img, 0, 0, cv.width, cv.height);
      /* keep a transparent background transparent; JPEG only when opaque */
      const alpha = hasAlpha(g, cv.width, cv.height);
      const data = alpha ? cv.toDataURL("image/png") : cv.toDataURL("image/jpeg", 0.86);
      /* contain means iz 1 already shows all of it */
      state.draft = { img: data, iz:1, ix:0, iy:0 };
      syncStage();
    };
    img.onerror = () => toast("이미지를 읽지 못했습니다");
    img.src = fr.result;
  };
  fr.onerror = () => toast("파일을 읽지 못했습니다");
  fr.readAsDataURL(file);
}

function commit(){
  const name = $("#fName").value.trim();
  const h = parseFloat($("#fHeight").value);
  if (!name){ toast("이름을 입력해 주세요"); $("#fName").focus(); return; }
  if (!Number.isFinite(h) || h < 80 || h > 280){ toast("키는 80~280cm 사이로 입력해 주세요"); $("#fHeight").focus(); return; }
  const d = state.draft;
  const rec = normalize({ id: state.editing || uid(), name, series: $("#fSeries").value.trim(),
                          height: h, img: d.img, fv: 2, iz: d.iz, ix: d.ix, iy: d.iy });
  const i = state.chars.findIndex(x => x.id === rec.id);
  if (i >= 0) state.chars[i] = rec; else state.chars.push(rec);
  save(); render(); closePanel();
  toast(i >= 0 ? `${rec.name} 수정됨` : `${rec.name} 추가됨`);
}

let toastT;
function toast(msg){
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("on");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("on"), 2600);
}
