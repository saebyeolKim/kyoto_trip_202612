// 사용법: node build-artifact.mjs <PIN> <출력파일>
// private/trip.html을 claude.ai Artifact용 PIN 잠금 페이지로 변환합니다.
// (외부 iframe·스타일시트가 막혀 있어 지도는 링크 버튼으로, 폰트는 Google Fonts로 바꿈)
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";
import vm from "node:vm";

const [pin, out] = process.argv.slice(2);
if (!pin || !out) { console.error("사용법: node build-artifact.mjs <PIN> <출력파일>"); process.exit(1); }
const src = readFileSync(new URL("./private/trip.html", import.meta.url), "utf8");

// --- 1. 스타일 ---
let css = src.slice(src.indexOf("<style>") + 7, src.indexOf("</style>"));
const darkStart = css.indexOf("@media (prefers-color-scheme: dark)");
const darkBlock = css.slice(darkStart, css.indexOf("}\n}", darkStart) + 3);
const darkVars = darkBlock.slice(darkBlock.indexOf("{", darkBlock.indexOf(":root")) + 1, darkBlock.lastIndexOf("}", darkBlock.length - 3)).trim();
css = css.replace(darkBlock,
  `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${darkVars} color-scheme:dark}}\n:root[data-theme="dark"]{${darkVars} color-scheme:dark}`);
css = css
  .replace(/font-family:"Pretendard Variable",Pretendard,/, 'font-family:"Noto Sans KR",')
  .replace(".wrap{max-width:680px;margin:0 auto;padding:0 16px}",
           ".wrap{max-width:680px;margin:0 auto;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}")
  .replace(".hero{padding-top:max(28px,env(safe-area-inset-top));padding-bottom:8px}", ".hero{padding-top:28px;padding-bottom:8px}")
  .replace("nav.top{position:sticky;top:0;", "nav.top{position:sticky;top:env(safe-area-inset-top,0px);")
  .replace("footer{padding:36px 0 calc(40px + env(safe-area-inset-bottom));", "footer{padding-block:36px 40px;");
css += `
[hidden]{display:none!important}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);z-index:30;background:var(--bg)}
a:focus-visible,button:focus-visible,input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.mapnote{font-size:13px;color:var(--sub);margin-top:10px}
#lock{min-height:80vh;display:grid;place-items:center;padding-block:24px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
#lock form{width:100%;max-width:340px;text-align:center}
#lock h1{font-size:26px;letter-spacing:-.03em;margin:8px 0 6px;text-wrap:balance}
#lock p{margin:0 0 24px;color:var(--sub);font-size:15px}
#pin{width:100%;height:58px;border-radius:16px;border:1px solid var(--line);background:var(--paper);color:var(--ink);font:inherit;font-size:24px;font-weight:700;text-align:center;letter-spacing:.4em}
#go{margin-top:12px;width:100%;height:54px;border-radius:16px;background:var(--ink);color:var(--bg);font-size:16px;font-weight:700}
#go:disabled{opacity:.6}
#lock label{display:flex;gap:8px;align-items:center;justify-content:center;margin-top:14px;font-size:14px;color:var(--sub)}
#keep{width:18px;height:18px}
#err{min-height:22px;margin-top:12px;font-size:14px;color:var(--accent);font-weight:600}
`;

// --- 2. 화면 마크업 (암호화 대상) ---
let html = src.slice(src.indexOf("<header"), src.indexOf("</main>") + 7)
  + src.slice(src.indexOf("<footer"), src.indexOf("</footer>") + 9);
html = html.replace(/\s*<iframe class="map" id="stayFrame"[^>]*><\/iframe>/, "");

// --- 3. 일정 데이터 (암호화 대상) ---
const js = src.slice(src.indexOf("<script>") + 8, src.lastIndexOf("</script>"));
const dataJs = js.slice(0, js.indexOf("/* ===== 렌더링"));
const ctx = {}; vm.createContext(ctx);
vm.runInContext(dataJs + "\n;this.__out = { STAY, DAYS, stayQ };", ctx);
const data = JSON.parse(JSON.stringify(ctx.__out));

// --- 4. 암호화 ---
const ITER = 600000;
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify({ html, ...data }))));
const b64 = u => Buffer.from(u).toString("base64");
const payload = JSON.stringify({ i: ITER, s: b64(salt), v: b64(iv), c: b64(ct) });

// --- 5. 렌더러 (평문, 데이터 없음) ---
let render = js.slice(js.indexOf("/* ===== 렌더링"));
render = render
  .replace(/\s*<iframe class="map" loading="lazy" src="\$\{embed\(m\.q, m\.z\)\}"[^>]*><\/iframe>/, "")
  .replace(/document\.getElementById\("stayFrame"\)\.src = embed\(stayQ, 16\);\n?/, "");

const page = `<title>교토 가족여행</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="robots" content="noindex, nofollow">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;800&display=swap">
<style>${css}</style>

<div id="lock">
  <form id="f" autocomplete="off">
    <div class="eyebrow">KYOTO · FAMILY TRIP</div>
    <h1>🔒 교토 가족여행</h1>
    <p>가족에게 받은 PIN을 입력해 주세요</p>
    <input id="pin" type="password" inputmode="numeric" autocomplete="off" aria-label="PIN">
    <button id="go" type="submit">열기</button>
    <label><input type="checkbox" id="keep" checked> 이 기기에서 기억하기</label>
    <div id="err" role="alert"></div>
  </form>
</div>
<div id="app" hidden></div>

<script>
const P = ${payload};
const KEY = "kyoto-trip-pin";
const d64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function unlock(pin) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: d64(P.s), iterations: P.i, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: d64(P.v) }, key, d64(P.c))));
}
const gq = s => encodeURIComponent(s);
const dir = (dest, mode = "transit", origin = "") =>
  \`https://www.google.com/maps/dir/?api=1\${origin ? "&origin=" + gq(origin) : ""}&destination=\${gq(dest)}&travelmode=\${mode}\`;
const place = q => \`https://www.google.com/maps/search/?api=1&query=\${gq(q)}\`;
const route = stops => "https://www.google.com/maps/dir/" + stops.map(gq).join("/");

function start(D) {
  const { STAY, DAYS, stayQ } = D;
  document.getElementById("app").innerHTML = D.html;
  document.getElementById("lock").hidden = true;
  document.getElementById("app").hidden = false;
${render}
}

const f = document.getElementById("f"), go = document.getElementById("go"), err = document.getElementById("err");
f.addEventListener("submit", async e => {
  e.preventDefault();
  const pin = document.getElementById("pin").value.trim();
  if (!pin) return;
  go.disabled = true; go.textContent = "여는 중…"; err.textContent = "";
  try {
    const d = await unlock(pin);
    try { document.getElementById("keep").checked ? localStorage.setItem(KEY, pin) : localStorage.removeItem(KEY); } catch (_) {}
    start(d);
  } catch (_) {
    err.textContent = "PIN이 맞지 않아요. 다시 입력해 주세요.";
    go.disabled = false; go.textContent = "열기";
  }
});
(async () => {
  let saved = null; try { saved = localStorage.getItem(KEY); } catch (_) {}
  if (!saved) return;
  try { start(await unlock(saved)); } catch (_) { try { localStorage.removeItem(KEY); } catch (_) {} }
})();
</script>
`;
writeFileSync(out, page);
console.log("생성 완료:", out, Math.round(page.length / 1024) + "KB");
