// Cloudflare Worker: free-trial timer per IP address and member login for
// the Kerala Panchayat Tenders dashboard.
//
// Bindings (Cloudflare dashboard -> Worker -> Settings):
//   KV namespace  TRIAL            stores trial start times and login-failure counters
//   Secret        SECRET           long random string; signs login tokens and hashes IPs
//   Secret        USERS            JSON of members, e.g. {"allwinjeby":"allwin@123","ravi":"pass2"}
//   Variable      ALLOWED_ORIGIN   https://allwinjeby.github.io
//   Variable      TRIAL_SECONDS    180 (optional)
//
// Endpoints:
//   GET  /status   -> {authed, user} or {authed:false, remaining, limit}
//   POST /login    {username, password} -> {token, user} | 401
//
// The trial clock starts the first time an IP address opens the app and is
// shared by every browser and device on that IP. Raw IPs are never stored,
// only a salted SHA-256 hash, kept for 30 days.

const TOKEN_DAYS = 30;
const enc = new TextEncoder();

function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256(text) {
  return hex(await crypto.subtle.digest("SHA-256", enc.encode(text)));
}
async function hmac(secret, text) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(text)));
}
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function users(env) {
  try {
    const u = JSON.parse(env.USERS || "{}");
    return Object.fromEntries(Object.entries(u).map(([k, v]) => [k.trim().toLowerCase(), String(v)]));
  } catch {
    return {};
  }
}

async function makeToken(env, user) {
  const exp = Date.now() + TOKEN_DAYS * 864e5;
  const payload = `${user}|${exp}`;
  return btoa(`${payload}|${await hmac(env.SECRET, payload)}`);
}
async function readToken(env, token) {
  if (!token) return null;
  try {
    const [user, exp, sig] = atob(token).split("|");
    if (!user || !exp || !sig || Date.now() > Number(exp)) return null;
    if (!safeEqual(sig, await hmac(env.SECRET, `${user}|${exp}`))) return null;
    return users(env)[user] !== undefined ? user : null; // removing a member revokes their token
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    };
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (!env.SECRET || !env.TRIAL) return json({ error: "Worker is not configured (SECRET secret or TRIAL KV binding missing)." }, 500);

    const url = new URL(request.url);
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const ipKey = await sha256(`${env.SECRET}|${ip}`);
    const limit = Number(env.TRIAL_SECONDS || 180);

    if (url.pathname === "/status" && request.method === "GET") {
      const bearer = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
      const user = await readToken(env, bearer);
      if (user) return json({ authed: true, user });
      let rec = await env.TRIAL.get(`ip:${ipKey}`, "json");
      if (!rec) {
        rec = { first: Date.now() };
        await env.TRIAL.put(`ip:${ipKey}`, JSON.stringify(rec), { expirationTtl: 30 * 86400 });
      }
      const remaining = Math.max(0, Math.round(limit - (Date.now() - rec.first) / 1000));
      return json({ authed: false, remaining, limit });
    }

    if (url.pathname === "/login" && request.method === "POST") {
      const failKey = `fail:${ipKey}`;
      const fails = Number((await env.TRIAL.get(failKey)) || 0);
      if (fails >= 10) return json({ error: "Too many attempts. Try again in 15 minutes." }, 429);
      let body = {};
      try {
        body = await request.json();
      } catch {}
      const user = String(body.username || "").trim().toLowerCase();
      const expected = users(env)[user];
      if (expected === undefined || !safeEqual(String(body.password || ""), expected)) {
        await env.TRIAL.put(failKey, String(fails + 1), { expirationTtl: 900 });
        return json({ error: "Wrong username or password." }, 401);
      }
      return json({ token: await makeToken(env, user), user });
    }

    return json({ error: "Not found" }, 404);
  },
};
