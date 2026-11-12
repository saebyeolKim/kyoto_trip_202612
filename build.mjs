// 사용법: node build.mjs <PIN>
// private/trip.html(원본, git에 안 올라감)을 PIN으로 암호화해서 index.html(잠금 화면)을 만듭니다.
import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto } from "node:crypto";

const pin = process.argv[2];
if (!pin) { console.error("사용법: node build.mjs <PIN>"); process.exit(1); }

const ITER = 600000;
const plain = readFileSync(new URL("./private/trip.html", import.meta.url), "utf8");
const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]);
const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)));
const b64 = u => Buffer.from(u).toString("base64");
const payload = JSON.stringify({ i: ITER, s: b64(salt), v: b64(iv), c: b64(ct) });

const tpl = readFileSync(new URL("./lock.html", import.meta.url), "utf8");
writeFileSync(new URL("./index.html", import.meta.url), tpl.replace("__PAYLOAD__", payload));
console.log("index.html 생성 완료 (" + Math.round(payload.length / 1024) + "KB)");
