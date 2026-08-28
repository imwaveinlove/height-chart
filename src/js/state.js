/* ─── constants ──────────────────────────────────────────── */
const HGAP = 18, VGAP = 20;   // clearance between tokens
const PAD  = 78;              // horizontal padding, horizontal mode
const LABEL = 68;             // label band under a disc, horizontal mode
const RH   = 40;              // ruler band, horizontal mode
const GUT  = 66;              // ruler gutter, vertical mode
const VTEXT = 148;            // label column beside a disc, vertical mode
const VGAP2 = 14, VCOL = 20;  // vertical-mode gaps

const RAMPS = {
  /* saturation dips through the middle so the teal→amber sweep
     reads as muted sage, never fluorescent green */
  base: [
    { p:0,   h:184, s:44, l:37 },
    { p:0.5, h:104, s:17, l:48 },
    { p:1,   h:26,  s:66, l:47 },
  ],
  /* 백코모드: 라일락 → 솜사탕 핑크 → 피치. 초록을 아예 지나지 않는다 */
  baekco: [
    { p:0,   h:264, s:58, l:74 },
    { p:0.5, h:330, s:74, l:74 },
    { p:1,   h:24,  s:84, l:71 },
  ],
  /* 블루레몬: 볕든 레몬 → 물빛 → 깊은 바다. 중간 채도를 낮춰
     노랑에서 파랑으로 넘어갈 때 형광 연두를 지나지 않게 한다 */
  bluelemon: [
    { p:0,    h:45,  s:88, l:66 },
    { p:0.20, h:74,  s:38, l:62 },
    { p:0.55, h:170, s:42, l:57 },
    { p:1,    h:206, s:66, l:50 },
  ],
  /* 블루밍: 하늘색 → 파스텔 민트 → 바다. 큰 키일수록 물이 깊어진다 */
  blooming: [
    { p:0,   h:202, s:76, l:78 },
    { p:0.5, h:166, s:56, l:71 },
    { p:1,   h:194, s:62, l:55 },
  ],
};
const activeRamp = () => RAMPS[document.documentElement.getAttribute("data-theme")] || RAMPS.base;

const SEED = [
  { name:"쿠기사키 노바라", series:"주술회전", height:160 },
  { name:"미도리야 이즈쿠", series:"나의 히어로 아카데미아", height:166 },
  { name:"바쿠고 카츠키",   series:"나의 히어로 아카데미아", height:172 },
  { name:"이타도리 유지",   series:"주술회전", height:173 },
  { name:"후시구로 메구미", series:"주술회전", height:175 },
  { name:"토도로키 쇼토",   series:"나의 히어로 아카데미아", height:176 },
  { name:"아이자와 쇼타",   series:"나의 히어로 아카데미아", height:183 },
  { name:"나나미 켄토",     series:"주술회전", height:184 },
  { name:"고죠 사토루",     series:"주술회전", height:190 },
];

/* A file exported by "HTML로 저장" carries its own data and its own
   storage key, so it never collides with the page it came from. */
const BAKED = (typeof window.__HC_SEED__ === "object" && window.__HC_SEED__) || null;
const KEY = BAKED ? "height-chart/x-" + BAKED.eid : "height-chart/v1";

const state = {
  chars: [], mode:"prop", orient:"h", theme:"baekco", ppc:60, ppcH:60, ppcV:26, size:84,
  editing:null, draft:{ img:null, iz:1, ix:0, iy:0 },
};

const $ = (s, r=document) => r.querySelector(s);
const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (v,a,b) => Math.min(b, Math.max(a, v));
const fmt = n => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/* ─── persistence ────────────────────────────────────────── */
function adopt(d){
  if (!d || !Array.isArray(d.chars)) return false;
  const chars = d.chars.map(normalize).filter(Boolean);
  if (!chars.length) return false;
  state.chars = chars;
  if (d.mode === "rank" || d.mode === "prop") state.mode = d.mode;
  if (d.orient === "v" || d.orient === "h") state.orient = d.orient;
  const th = d.theme === "pado" ? "bluelemon" : d.theme;   /* 첫 이름이 파도였다 */
  if (["light","dark","baekco","blooming","bluelemon"].indexOf(th) >= 0) state.theme = th;
  if (Number.isFinite(d.ppcH)) state.ppcH = clamp(d.ppcH, 18, 130);
  if (Number.isFinite(d.ppcV)) state.ppcV = clamp(d.ppcV, 18, 130);
  if (Number.isFinite(d.ppc)) state.ppc = clamp(d.ppc, 18, 130);
  else state.ppc = state.orient === "v" ? state.ppcV : state.ppcH;
  if (Number.isFinite(d.size)) state.size = clamp(d.size, 52, 150);
  return true;
}
function load(){
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch(e){}
  if (raw){ try { if (adopt(JSON.parse(raw))) return; } catch(e){} }
  if (BAKED && adopt(BAKED)) return;
  state.chars = SEED.map(normalize);
}
function snapshot(){
  const h = state.orient === "h" ? state.ppc : state.ppcH;
  const v = state.orient === "v" ? state.ppc : state.ppcV;
  return { chars:state.chars, mode:state.mode, orient:state.orient, theme:state.theme,
           ppc:state.ppc, ppcH:h, ppcV:v, size:state.size };
}
function save(){
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot()));
    $("#savedAt").textContent = "저장됨 " + new Date().toLocaleTimeString("ko-KR", { hour:"2-digit", minute:"2-digit" });
  } catch(e){
    $("#savedAt").textContent = "저장 공간이 가득 찼습니다 — 이미지를 줄이거나 캐릭터를 지워 주세요";
  }
}
function normalize(c){
  const h = Number(c && c.height);
  if (!c || !Number.isFinite(h)) return null;
  return {
    id: c.id || uid(),
    name: String(c.name || "이름 없음").slice(0, 40),
    series: String(c.series || "").slice(0, 40),
    height: clamp(Math.round(h * 2) / 2, 80, 280),
    img: typeof c.img === "string" && c.img.startsWith("data:image") ? c.img : null,
    /* fv 2 = framing measured against object-fit:contain. Anything older
       was measured against cover, where the same number frames something
       else entirely — reset it to the whole picture instead of guessing. */
    fv: 2,
    iz: c.fv === 2 ? clamp(Number(c.iz) || 1, 0.25, 6) : 1,
    ix: c.fv === 2 ? clamp(Number(c.ix) || 0, -1000, 1000) : 0,
    iy: c.fv === 2 ? clamp(Number(c.iy) || 0, -1000, 1000) : 0,
  };
}
