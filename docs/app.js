/* Kerala Panchayat Tenders — storefront app (no build step, no dependencies) */
(function(){
  "use strict";

  // ===================================================================
  // Constants
  // ===================================================================
  var SEARCH_URL = "https://etenders.kerala.gov.in/nicgep/app?page=FrontEndAdvancedSearch&service=page";
  var RESULTS_URL = "https://etenders.kerala.gov.in/nicgep/app?page=ResultOfTenders&service=page";
  var PAGE = 24;
  var GROUPS = [
    {key: "roads", name: "Roads & Paths", icon: "road", c: "#4f46e5", blurb: "Concrete roads, tarring, interlock, footpaths, culverts"},
    {key: "buildings", name: "Buildings", icon: "building", c: "#ea580c", blurb: "Anganwadis, schools, health centres, halls, toilets"},
    {key: "water", name: "Water & Drainage", icon: "droplet", c: "#0284c7", blurb: "Drains, canals, drinking water, wells, ponds"},
    {key: "walls", name: "Walls & Protection", icon: "brick", c: "#b45309", blurb: "Side protection, retaining and compound walls"},
    {key: "electrical", name: "Electrical & Lighting", icon: "zap", c: "#ca8a04", blurb: "Street lights, high mast, electrification, solar"},
    {key: "waste", name: "Waste & Sanitation", icon: "recycle", c: "#16a34a", blurb: "MCF / RRF, bins, sanitation works"},
    {key: "supply", name: "Supply & Equipment", icon: "package", c: "#7c3aed", blurb: "Materials, furniture, boards, equipment"},
    {key: "services", name: "Services & Hiring", icon: "briefcase", c: "#475569", blurb: "Vehicle hire, AMC, surveys, cleaning"},
    {key: "agri", name: "Agriculture & Environment", icon: "sprout", c: "#4d7c0f", blurb: "Farming, nurseries, fencing"},
    {key: "other", name: "Other works", icon: "layers", c: "#db2777", blurb: "Colony development and other works"}
  ];
  var G = {}; GROUPS.forEach(function(g){ G[g.key] = g; });
  var PANCHAYAT = {"Grama Panchayat": 1, "Block Panchayat": 1, "District Panchayat": 1, "Panchayat (other)": 1};
  var BANDS = [[0, 1e5, "Under ₹1 L"], [1e5, 5e5, "₹1 – 5 L"], [5e5, 1e6, "₹5 – 10 L"], [1e6, 2.5e6, "₹10 – 25 L"], [2.5e6, 1e7, "₹25 L – 1 Cr"], [1e7, Infinity, "₹1 Cr +"]];
  var CLOSE_OPTS = [["0", "Closing today"], ["3", "Within 3 days"], ["7", "Within a week"], ["14", "Within 2 weeks"], ["30", "Within a month"]];
  var AI_OPTS = [["high", "High profit chance"], ["good", "Medium or high profit"], ["easy", "Easy or moderate work"], ["rated", "Analysed by AI"]];
  var SORTS = [["closing", "Closing soonest"], ["newest", "Newest first"], ["value-desc", "Value: high to low"], ["value-asc", "Value: low to high"], ["profit", "Best profit chance (AI)"]];
  var FACET_KEYS = ["district", "body", "job", "band", "pbs", "close", "ai"];
  var ARR_KEYS = ["district", "body", "job", "band", "pbs"];
  var TYPE_COLOR = {"Grama Panchayat": "#0e7a55", "Block Panchayat": "#0284c7", "District Panchayat": "#7c3aed", "Municipality": "#ea580c", "Corporation": "#db2777"};

  // ===================================================================
  // Icons (24px line icons, consistent 2px stroke)
  // ===================================================================
  var IC = {
    search: '<circle cx="11" cy="11" r="7.5"/><path d="m20.5 20.5-4.2-4.2"/>',
    home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
    grid: '<rect x="3" y="3" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="2"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="2"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2"/>',
    heart: '<path d="M19.5 13.6 12 21l-7.5-7.4A5 5 0 1 1 12 7.1a5 5 0 1 1 7.5 6.5Z"/>',
    chart: '<path d="M3 3v18h18"/><path d="M7.5 16v-4"/><path d="M12 16V8"/><path d="M16.5 16v-6.5"/>',
    sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    pin: '<path d="M19.5 10c0 5.5-7.5 11.5-7.5 11.5S4.5 15.5 4.5 10a7.5 7.5 0 0 1 15 0Z"/><circle cx="12" cy="10" r="2.8"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
    cal: '<rect x="3.5" y="4.5" width="17" height="16" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3.5 10h17"/>',
    sparkle: '<path d="M12 3.5l1.9 5 5.1 1.9-5.1 1.9-1.9 5-1.9-5-5.1-1.9 5.1-1.9Z"/><path d="M19 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z"/>',
    bell: '<path d="M6 9a6 6 0 0 1 12 0c0 6.5 2.5 8 2.5 8h-17S6 15.5 6 9"/><path d="M10.2 20.5a2 2 0 0 0 3.6 0"/>',
    right: '<path d="m9 5 7 7-7 7"/>',
    left: '<path d="m15 5-7 7 7 7"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    moon: '<path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a6.6 6.6 0 0 0 10 10Z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    download: '<path d="M12 3.5v12m0 0-4.5-4.5M12 15.5l4.5-4.5"/><path d="M4.5 20.5h15"/>',
    share: '<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 13.3 7.6 4M15.8 6.7l-7.6 4"/>',
    copy: '<rect x="9" y="9" width="11.5" height="11.5" rx="2.5"/><path d="M5.5 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v.5"/>',
    ext: '<path d="M14 3.5h6.5V10M10 14 20.5 3.5"/><path d="M19.5 14v4.5a2 2 0 0 1-2 2h-12a2 2 0 0 1-2-2v-12a2 2 0 0 1 2-2H10"/>',
    flame: '<path d="M12 21.5a6.5 6.5 0 0 0 6.5-6.5c0-4.5-3.5-6.5-4.5-10.5-2.5 2-3.5 4.5-3.5 6.5-1-1-1.5-2-1.5-3.5-2 1.5-3.5 4-3.5 7.5a6.5 6.5 0 0 0 6.5 6.5Z"/>',
    trend: '<path d="m3 17 6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    landmark: '<path d="M3 21h18M5 21v-9.5M19 21v-9.5M9.5 21v-9.5M14.5 21v-9.5"/><path d="M2.5 9.5 12 3.5l9.5 6Z"/>',
    rupee: '<path d="M6.5 4h11M6.5 8.5h11M6.5 4h3.8a4.5 4.5 0 0 1 0 9H6.5l8.5 7.5"/>',
    chat: '<path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.6-4.3a8.5 8.5 0 1 1 15.4-4.7Z"/>',
    phone: '<path d="M21 16.5v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.1 3.8 2 2 0 0 1 3.1 1.6h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L7.1 9.4a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
    mail: '<rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="m3 6 9 7 9-7"/>',
    phoneapp: '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M12 7.5v7m0 0-3-3m3 3 3-3"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9Z"/>',
    list: '<path d="M8.5 6h12M8.5 12h12M8.5 18h12"/><circle cx="4" cy="6" r=".6"/><circle cx="4" cy="12" r=".6"/><circle cx="4" cy="18" r=".6"/>',
    lock: '<rect x="4.5" y="10.5" width="15" height="10.5" rx="2.5"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
    crown: '<path d="m3 7 4.5 4L12 4.5l4.5 6.5L21 7l-2 11H5Z"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    calc: '<rect x="4.5" y="2.5" width="15" height="19" rx="2.5"/><path d="M8 6.5h8M8 11h.01M12 11h.01M16 11h.01M8 14.5h.01M12 14.5h.01M16 14.5h.01M8 18h.01M12 18h4"/>',
    doc: '<path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8Z"/><path d="M14 2.5V8h5.5M8.5 13h7M8.5 17h5"/>',
    road: '<path d="M6 21 9.5 3M18 21 14.5 3"/><path d="M12 5v2.5M12 11v2.5M12 17v2.5"/>',
    building: '<path d="M6 21.5V4.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17"/><path d="M6 12H4a1.5 1.5 0 0 0-1.5 1.5v8M18 9h2a1.5 1.5 0 0 1 1.5 1.5v11M2 21.5h20"/><path d="M10 6.5h4M10 10.5h4M10 14.5h4M10.5 21.5V18h3v3.5"/>',
    droplet: '<path d="M12 2.8s-6.5 7-6.5 12a6.5 6.5 0 0 0 13 0c0-5-6.5-12-6.5-12Z"/><path d="M9 15a3 3 0 0 0 3 3"/>',
    brick: '<rect x="2.5" y="4" width="19" height="16" rx="2"/><path d="M2.5 9.3h19M2.5 14.7h19M9 4v5.3M15 4v5.3M6 9.3v5.4M12 9.3v5.4M18 9.3v5.4M9 14.7V20M15 14.7V20"/>',
    zap: '<path d="M13.5 2.5 4 14h7.5l-1 7.5L20 10h-7.5Z"/>',
    recycle: '<path d="M7.2 19.5H5a2 2 0 0 1-1.7-3l3.6-6.3"/><path d="M11 19.5h8a2 2 0 0 0 1.7-3l-1.5-2.6"/><path d="m14 16.5-3 3 3 3"/><path d="M8.3 14.4 7 10.2l-4.2 1.1"/><path d="m9.6 6.4 1-1.8a2 2 0 0 1 3.5 0l4 6.9"/><path d="m13.8 10.6 4.2 1.1 1.1-4.2"/>',
    package: '<path d="M21 8 12 3 3 8v8.5l9 5 9-5Z"/><path d="m3 8 9 5 9-5M12 13v8.5M7.5 5.5l9 5"/>',
    briefcase: '<rect x="2.5" y="7" width="19" height="13.5" rx="2.5"/><path d="M15.5 7V5a2 2 0 0 0-2-2h-3a2 2 0 0 0-2 2v2M2.5 13h19"/>',
    sprout: '<path d="M7 21h10M12 21v-9.5"/><path d="M12 11.5C12 7.5 9 4.5 4 4.5c0 4 3 7 8 7Z"/><path d="M12 11.5c0-3 2.5-6 7-6 0 4-3 6-7 6Z"/>',
    layers: '<path d="m12 2.5 9.5 5-9.5 5-9.5-5Z"/><path d="m2.5 16.5 9.5 5 9.5-5M2.5 12l9.5 5 9.5-5"/>'
  };
  function icon(name, cls){ return '<svg class="i' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true">' + (IC[name] || "") + "</svg>"; }

  // ===================================================================
  // Helpers
  // ===================================================================
  var $ = function(id){ return document.getElementById(id); };
  var SVGNS = "http://www.w3.org/2000/svg";
  function lsGet(k, d){ try{ var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); }catch(e){ return d; } }
  function lsSet(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
  function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
  function trimNum(x){ return x.toFixed(x >= 100 ? 0 : 2).replace(/\.?0+$/, ""); }
  function inr(n){
    if(n == null) return null;
    if(n >= 1e7) return "₹" + trimNum(n / 1e7) + " Cr";
    if(n >= 1e5) return "₹" + trimNum(n / 1e5) + " L";
    return "₹" + Math.round(n).toLocaleString("en-IN");
  }
  function inrFull(n){ return n == null ? "—" : "₹" + Math.round(n).toLocaleString("en-IN"); }
  function num(n){ return Math.round(n).toLocaleString("en-IN"); }
  function fmtDate(iso, opts){
    if(!iso) return "—";
    var d = new Date(iso + "T00:00:00");
    return isNaN(d) ? iso : d.toLocaleDateString("en-IN", opts || {day: "numeric", month: "short", year: "numeric"});
  }
  function addDays(iso, n){ var d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function slug(s){ return String(s || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function closingMs(t){
    var m = /(\d{1,2})-([A-Za-z]{3})-(\d{4})\s+(\d{1,2}):(\d{2})\s*([AP]M)/i.exec(t.closing_time || "");
    if(!m) return t.closing_date ? Date.parse(t.closing_date + "T17:00:00+05:30") : null;
    var mon = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12}[m[2].toLowerCase()];
    var h = +m[4] % 12 + (m[6].toUpperCase() === "PM" ? 12 : 0), p = function(n){ return String(n).padStart(2, "0"); };
    return Date.parse(m[3] + "-" + p(mon) + "-" + p(m[1]) + "T" + p(h) + ":" + m[5] + ":00+05:30");
  }
  function daysLeft(iso){ return iso && meta.today ? Math.round((Date.parse(iso) - Date.parse(meta.today)) / 864e5) : null; }
  function countdown(t){
    var ms = t._close; if(ms == null) return "—";
    var left = ms - Date.now(); if(left <= 0) return "Closed";
    var d = Math.floor(left / 864e5), h = Math.floor(left % 864e5 / 36e5), m = Math.floor(left % 36e5 / 6e4);
    return d ? d + "d " + h + "h" : h ? h + "h " + m + "m" : m + "m";
  }
  function closesLabel(t){
    var d = daysLeft(t.closing_date), time = (t.closing_time || "").replace(/^.*?(\d{1,2}:\d{2}\s*[AP]M)$/i, "$1");
    if(d === 0) return "Closes today" + (time ? ", " + time : "");
    if(d === 1) return "Closes tomorrow";
    if(d !== null && d < 7) return "Closes in " + d + " days";
    return "Closes " + fmtDate(t.closing_date, {day: "numeric", month: "short"});
  }
  function bandOf(v){ if(v == null) return "u"; for(var i = 0; i < BANDS.length; i++) if(v >= BANDS[i][0] && v < BANDS[i][1]) return String(i); return "u"; }
  function toast(msg){ var t = $("toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toast._t); toast._t = setTimeout(function(){ t.classList.remove("on"); }, 2000); }
  function copy(text, msg){
    if(navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function(){ toast(msg); }, function(){ prompt("Copy:", text); });
    else prompt("Copy:", text);
  }
  var reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function countUp(el, to, fmt){
    fmt = fmt || num;
    if(reduceMotion || !el){ if(el) el.textContent = fmt(to); return; }
    var start = performance.now(), dur = 900;
    (function step(now){
      var p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(to * e);
      if(p < 1) requestAnimationFrame(step);
    })(start);
  }

  // ===================================================================
  // Data + personal state
  // ===================================================================
  var all = [], open = [], byId = {}, meta = {}, newIds = new Set(), aiIdx = {}, aiCount = 0, bodies = {};
  var saved = new Set(lsGet("saved", [])), follows = new Set(lsGet("follows", [])), notes = lsGet("notes", {}) || {};
  var visitBase = null, NOW = Date.now(), loaded = false;
  function isOpen(t){ return !(t._close && t._close < NOW); }
  function isNewForYou(t){ return visitBase && t.first_seen > visitBase; }
  function grpOf(t){ return G[t.grp] ? t.grp : "other"; }

  // ===================================================================
  // Routing: #/path?filters
  // ===================================================================
  var R = {}, F = {};
  function emptyF(){ return {district: [], body: [], job: [], band: [], pbs: [], close: "", ai: "", sort: "closing", q: ""}; }
  function parseHash(){
    var h = location.hash.replace(/^#/, "") || "/";
    var qi = h.indexOf("?"), path = qi >= 0 ? h.slice(0, qi) : h, query = qi >= 0 ? h.slice(qi + 1) : "";
    var parts = path.split("/").filter(Boolean).map(function(p){ try{ return decodeURIComponent(p); }catch(e){ return p; } });
    var r = {view: "home"};
    if(parts[0] === "c" && G[parts[1]]){ r = {view: "browse", grp: parts[1], kind: parts[2] || ""}; }
    else if(parts[0] === "all"){ r = {view: "browse"}; }
    else if(parts[0] === "search"){ r = {view: "browse", search: true}; }
    else if(parts[0] === "p" && parts[1]){ r = {view: "browse", pb: parts[1]}; }
    else if(parts[0] === "d" && parts[1]){ r = {view: "browse", dist: parts[1]}; }
    else if(parts[0] === "saved"){ r = {view: "browse", saved: true}; }
    else if(parts[0] === "following"){ r = {view: "browse", following: true}; }
    else if(parts[0] === "categories"){ r = {view: "categories"}; }
    else if(parts[0] === "panchayats"){ r = {view: "panchayats"}; }
    else if(parts[0] === "insights"){ r = {view: "insights"}; }
    else if(parts[0] === "t" && parts[1]){ r = {view: "tender", tid: parts[1]}; }
    var f = emptyF(), p = new URLSearchParams(query);
    ["district", "body", "job", "band"].forEach(function(k){ if(p.get(k)) f[k] = p.get(k).split(",").filter(Boolean); });
    if(p.get("pb")) f.pbs = p.get("pb").split("|").filter(Boolean);
    ["close", "ai", "sort", "q"].forEach(function(k){ if(p.get(k)) f[k] = p.get(k); });
    return {r: r, f: f};
  }
  function routePath(r){
    if(r.view === "browse"){
      if(r.grp) return "/c/" + r.grp + (r.kind ? "/" + r.kind : "");
      if(r.search) return "/search";
      if(r.pb) return "/p/" + encodeURIComponent(r.pb);
      if(r.dist) return "/d/" + encodeURIComponent(r.dist);
      if(r.saved) return "/saved";
      if(r.following) return "/following";
      return "/all";
    }
    if(r.view === "categories") return "/categories";
    if(r.view === "panchayats") return "/panchayats";
    if(r.view === "insights") return "/insights";
    if(r.view === "tender") return "/t/" + encodeURIComponent(r.tid);
    return "/";
  }
  function query(f){
    var p = new URLSearchParams();
    ["district", "body", "job", "band"].forEach(function(k){ if(f[k] && f[k].length) p.set(k, f[k].join(",")); });
    if(f.pbs && f.pbs.length) p.set("pb", f.pbs.join("|"));
    if(f.close) p.set("close", f.close);
    if(f.ai) p.set("ai", f.ai);
    if(f.sort && f.sort !== "closing") p.set("sort", f.sort);
    if(f.q) p.set("q", f.q);
    var s = p.toString().replace(/%2C/g, ",");
    return s ? "?" + s : "";
  }
  function href(r, f){ return "#" + routePath(r) + (f ? query(f) : ""); }
  function go(h, replace){
    if(replace){ history.replaceState(null, "", h); render(); }
    else if(location.hash === h) render();
    else location.hash = h;
  }

  // ===================================================================
  // Filtering engine
  // ===================================================================
  function inScope(t, r){
    if(!isOpen(t)) return false;
    if(r.grp && grpOf(t) !== r.grp) return false;
    if(r.kind && slug(t.kind) !== r.kind) return false;
    if(r.pb && t.body_name !== r.pb) return false;
    if(r.dist && t.district !== r.dist) return false;
    if(r.saved && !saved.has(t.id)) return false;
    if(r.following && !follows.has(t.body_name)) return false;
    return true;
  }
  function matchQ(t, q){
    if(!q) return true;
    var words = q.toLowerCase().split(/\s+/).filter(Boolean);
    for(var i = 0; i < words.length; i++) if(t._hay.indexOf(words[i]) < 0) return false;
    return true;
  }
  function facetVal(t, k){
    if(k === "district") return t.district || "";
    if(k === "body") return t.body_type || "";
    if(k === "job") return t.job || "Other";
    if(k === "band") return bandOf(t.value);
    if(k === "pbs") return t.body_name || "";
  }
  function passF(t, f, skip){
    for(var i = 0; i < ARR_KEYS.length; i++){
      var k = ARR_KEYS[i];
      if(k !== skip && f[k].length && f[k].indexOf(facetVal(t, k)) < 0) return false;
    }
    if(skip !== "close" && f.close !== ""){ var d = daysLeft(t.closing_date); if(d === null || d < 0 || d > +f.close) return false; }
    if(skip !== "ai" && f.ai){
      var a = t._ai; if(!a) return false;
      if(f.ai === "high" && a.pc !== "High") return false;
      if(f.ai === "good" && a.pc === "Low") return false;
      if(f.ai === "easy" && !(a.dl === "Easy" || a.dl === "Moderate")) return false;
    }
    return matchQ(t, f.q);
  }
  function sortList(list, sort){
    var by = {
      closing: function(a, b){ return (a._close || 9e15) - (b._close || 9e15); },
      newest: function(a, b){ return (b.published_date || "").localeCompare(a.published_date || "") || (a._close || 0) - (b._close || 0); },
      "value-desc": function(a, b){ return (b.value == null ? -1 : b.value) - (a.value == null ? -1 : a.value); },
      "value-asc": function(a, b){ return (a.value == null ? 9e15 : a.value) - (b.value == null ? 9e15 : b.value); },
      profit: function(a, b){ return (b._ai ? b._ai.p : -1) - (a._ai ? a._ai.p : -1) || (a._ai ? a._ai.d : 99) - (b._ai ? b._ai.d : 99) || (b.value || 0) - (a.value || 0); }
    };
    return list.sort(by[sort] || by.closing);
  }

  // ===================================================================
  // Shared UI pieces
  // ===================================================================
  function aiBadge(t){
    var a = t._ai; if(!a) return "";
    return '<span class="bdg ai' + (a.pc === "High" ? " high" : "") + '" title="AI: profit chance ' + esc(a.pc) + ", difficulty " + esc(a.dl) + '">' + icon("sparkle") + "Profit " + esc(a.pc) + " · " + a.d + "/10</span>";
  }
  function badges(t){
    var d = daysLeft(t.closing_date), out = "";
    if(newIds.has(t.id)) out += '<span class="bdg new">' + icon("flame") + "New</span>";
    else if(isNewForYou(t)) out += '<span class="bdg new">New for you</span>';
    if(d !== null && d >= 0 && d <= 3) out += '<span class="bdg soon">' + icon("clock") + (d === 0 ? "Today" : d + "d left") + "</span>";
    return out + aiBadge(t);
  }
  function timeBar(t){
    var total = t.published_date && t.closing_date ? (Date.parse(t.closing_date) - Date.parse(t.published_date)) / 864e5 : 0;
    var left = daysLeft(t.closing_date);
    if(!total || left == null || left < 0) return "";
    return '<div class="timebar' + (left <= 3 ? " urgent" : "") + '" style="width:' + Math.max(4, Math.min(100, left / total * 100)).toFixed(0) + '%"></div>';
  }
  function card(t, i){
    var g = G[grpOf(t)], isSaved = saved.has(t.id), val = inr(t.value);
    return '<article class="pcard anim" style="--c:' + g.c + ";--i:" + Math.min(i || 0, 12) + '" data-tid="' + esc(t.tender_id) + '" tabindex="0">' +
      '<div class="pc-top"><span class="pc-cat">' + icon(g.icon) + "<span>" + esc(t.kind || g.name) + '</span></span>' +
      '<button class="fav" type="button" data-fav="' + esc(t.id) + '" aria-pressed="' + isSaved + '" aria-label="' + (isSaved ? "Remove from saved" : "Save tender") + '">' + icon("heart") + "</button></div>" +
      "<h3>" + esc(t.title) + "</h3>" +
      '<div class="pc-org">' + icon("landmark") + "<span>" + (follows.has(t.body_name) ? "♥ " : "") + esc(t.body_name) + (t.district ? " · " + esc(t.district) : "") + "</span></div>" +
      '<div class="pc-price">' + (val ? "<b>" + val + "</b>" + (t.emd != null ? "<span>EMD " + inr(t.emd) + "</span>" : "") : t.details_fetched ? '<b class="na" title="The panchayat did not publish a value for this tender">Value not disclosed</b>' : '<b class="na" title="Values are read from each tender page on the portal; this one is next in the queue">Value coming soon</b>') + "</div>" +
      '<div class="pc-badges">' + badges(t) + "</div>" +
      '<div class="pc-foot">' + icon("clock") + "<span>" + esc(closesLabel(t)) + '</span><span class="cta">View' + icon("right") + "</span></div>" +
      timeBar(t) + "</article>";
  }
  function skeletons(n){ var s = ""; for(var i = 0; i < n; i++) s += '<div class="skel"></div>'; return s; }
  function sectionHead(ic, title, sub, link, linkText){
    return '<div class="sec-head"><div><h2>' + icon(ic) + esc(title) + "</h2>" + (sub ? "<p>" + esc(sub) + "</p>" : "") + "</div>" +
      (link ? '<a class="seeall" href="' + link + '">' + esc(linkText || "See all") + icon("right") + "</a>" : "") + "</div>";
  }
  function rail(list, id){
    return '<div class="rail-wrap"><button class="rail-btn l" type="button" data-rail="' + id + '" data-dir="-1" aria-label="Scroll left">' + icon("left") + "</button>" +
      '<div class="rail" id="' + id + '">' + list.map(card).join("") + "</div>" +
      '<button class="rail-btn r" type="button" data-rail="' + id + '" data-dir="1" aria-label="Scroll right">' + icon("right") + "</button></div>";
  }

  // ===================================================================
  // Universal search with suggestions
  // ===================================================================
  function hl(text, q){
    var w = (q || "").trim().split(/\s+/)[0];
    if(!w) return esc(text);
    var i = text.toLowerCase().indexOf(w.toLowerCase());
    return i < 0 ? esc(text) : esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + w.length)) + "</mark>" + esc(text.slice(i + w.length));
  }
  function suggestions(q){
    q = q.trim(); var ql = q.toLowerCase(), out = [];
    if(!q){
      out.push({sec: "Find a panchayat", h: "#/panchayats", ic: "landmark", t: "Browse all panchayats & local bodies", m: num(Object.keys(bodies).length)});
      GROUPS.slice(0, 6).forEach(function(g){ out.push({sec: "Popular categories", h: href({view: "browse", grp: g.key}), ic: g.icon, c: g.c, t: g.name, m: num(stats.groups[g.key] || 0) + " open"}); });
      return out;
    }
    var words = ql.split(/\s+/);
    var n = 0; open.forEach(function(t){ if(matchQ(t, q)) n++; });
    out.push({sec: "Search", h: href({view: "browse", search: true}, Object.assign(emptyF(), {q: q})), ic: "search", t: "Tenders matching “" + q + "”", m: num(n)});
    Object.keys(bodies).filter(function(b){ var h = (b + " " + (bodies[b].district || "")).toLowerCase(); return words.every(function(w){ return h.indexOf(w) >= 0; }); })
      .sort(function(a, b){ var ap = a.toLowerCase().indexOf(ql) === 0, bp = b.toLowerCase().indexOf(ql) === 0; return ap !== bp ? (ap ? -1 : 1) : bodies[b].count - bodies[a].count; })
      .slice(0, 7).forEach(function(b){ out.push({sec: "Panchayats & local bodies", h: href({view: "browse", pb: b}), ic: "landmark", t: b, m: (bodies[b].count || 0) + " open" + (bodies[b].district ? " · " + bodies[b].district : "")}); });
    GROUPS.forEach(function(g){ if(g.name.toLowerCase().indexOf(ql) >= 0) out.push({sec: "Categories", h: href({view: "browse", grp: g.key}), ic: g.icon, c: g.c, t: g.name, m: num(stats.groups[g.key] || 0)}); });
    Object.keys(stats.kinds).filter(function(k){ return k.toLowerCase().indexOf(ql) >= 0; }).slice(0, 5).forEach(function(k){
      var info = stats.kinds[k], g = G[info.grp];
      out.push({sec: "Kinds of work", h: href({view: "browse", grp: info.grp, kind: slug(k)}), ic: g.icon, c: g.c, t: k, m: num(info.n)});
    });
    Object.keys(stats.districts).filter(function(d){ return d.toLowerCase().indexOf(ql) >= 0; }).forEach(function(d){
      out.push({sec: "Districts", h: href({view: "browse", dist: d}), ic: "pin", t: d, m: num(stats.districts[d])});
    });
    return out;
  }
  function attachSuggest(box){
    var input = box.querySelector("input"), list = null, items = [], active = -1;
    function close(){ if(list){ list.remove(); list = null; } }
    function show(){
      items = suggestions(input.value); active = items.length ? 0 : -1;
      if(!list){ list = document.createElement("div"); list.className = "suggest"; list.setAttribute("role", "listbox"); box.appendChild(list); }
      var sec = "", html = "";
      items.forEach(function(it, i){
        if(it.sec !== sec){ sec = it.sec; html += '<div class="sec">' + esc(sec) + "</div>"; }
        html += '<a href="' + it.h + '" role="option" data-i="' + i + '" aria-selected="' + (i === active) + '"' + (it.c ? ' style="--c:' + it.c + '"' : "") + '><span class="ic">' + icon(it.ic) + '</span><span class="nm">' + hl(it.t, input.value) + '</span><span class="meta">' + esc(it.m || "") + "</span></a>";
      });
      list.innerHTML = html || '<div class="sec">No matches</div>';
    }
    function move(d){
      if(!list || !items.length) return;
      active = (active + d + items.length) % items.length;
      Array.prototype.forEach.call(list.querySelectorAll("a"), function(a, i){ a.setAttribute("aria-selected", i === active); if(i === active) a.scrollIntoView({block: "nearest"}); });
    }
    input.addEventListener("focus", show);
    input.addEventListener("input", show);
    input.addEventListener("keydown", function(e){
      if(e.key === "ArrowDown"){ e.preventDefault(); move(1); }
      else if(e.key === "ArrowUp"){ e.preventDefault(); move(-1); }
      else if(e.key === "Enter"){
        e.preventDefault();
        var target = active >= 0 && items[active] ? items[active].h : href({view: "browse", search: true}, Object.assign(emptyF(), {q: input.value.trim()}));
        close(); input.blur(); go(target);
      } else if(e.key === "Escape"){ close(); input.blur(); }
    });
    input.addEventListener("blur", function(){ setTimeout(close, 160); });
    box.addEventListener("mousedown", function(e){ var a = e.target.closest(".suggest a"); if(a){ e.preventDefault(); close(); input.blur(); go(a.getAttribute("href")); } });
    var goBtn = box.querySelector(".go");
    if(goBtn) goBtn.addEventListener("click", function(){ close(); go(href({view: "browse", search: true}, Object.assign(emptyF(), {q: input.value.trim()}))); });
  }

  // ===================================================================
  // Stats used across views
  // ===================================================================
  var stats = {groups: {}, kinds: {}, districts: {}};
  function computeStats(){
    stats = {pb: {}, groups: {}, kinds: {}, districts: {}, groupNew: {}, groupSoon: {}, groupMax: {}, total: open.length, nNew: 0, soon: 0, high: 0, bodies: new Set()};
    open.forEach(function(t){
      var g = grpOf(t), d = daysLeft(t.closing_date);
      stats.groups[g] = (stats.groups[g] || 0) + 1;
      var k = stats.kinds[t.kind] || (stats.kinds[t.kind] = {grp: g, n: 0}); k.n++;
      if(t.district) stats.districts[t.district] = (stats.districts[t.district] || 0) + 1;
      if(newIds.has(t.id)){ stats.nNew++; stats.groupNew[g] = (stats.groupNew[g] || 0) + 1; }
      if(d !== null && d >= 0 && d <= 3){ stats.soon++; stats.groupSoon[g] = (stats.groupSoon[g] || 0) + 1; }
      if(t._ai && t._ai.pc === "High") stats.high++;
      if(t.value) stats.groupMax[g] = Math.max(stats.groupMax[g] || 0, t.value);
      var pb = stats.pb[t.body_name] || (stats.pb[t.body_name] = {n: 0, soon: 0, nw: 0});
      pb.n++; if(d !== null && d >= 0 && d <= 7) pb.soon++; if(newIds.has(t.id)) pb.nw++;
      stats.bodies.add(t.body_name);
    });
  }

  // ===================================================================
  // Views
  // ===================================================================
  var view = $("view");
  function setView(html){
    view.classList.remove("view"); void view.offsetWidth; view.classList.add("view");
    view.innerHTML = html;
    view.querySelectorAll("[data-suggest]").forEach(attachSuggest);
    view.querySelectorAll("[data-count]").forEach(function(el){ countUp(el, +el.dataset.count); });
  }

  function renderHome(){
    var soon = sortList(open.filter(function(t){ var d = daysLeft(t.closing_date); return d !== null && d >= 0 && d <= 3; }), "closing").slice(0, 12);
    var fresh = sortList(open.slice(), "newest").slice(0, 12);
    var picks = sortList(open.filter(function(t){ return t._ai && t._ai.pc === "High"; }), "profit").slice(0, 12);
    var kinds = Object.keys(stats.kinds).sort(function(a, b){ return stats.kinds[b].n - stats.kinds[a].n; }).slice(0, 14);
    var dists = Object.keys(stats.districts).sort(function(a, b){ return stats.districts[b] - stats.districts[a]; });
    var dmax = dists.length ? stats.districts[dists[0]] : 1;
    var ticker = fresh.slice(0, 10).map(function(t){ return '<a href="#/t/' + encodeURIComponent(t.tender_id) + '"><b>' + esc(inr(t.value) || "New") + "</b>" + esc(t.title.slice(0, 80)) + " · " + esc(t.body_name) + "</a>"; }).join("");
    var nBanner = 0, nFol = 0;
    if(visitBase && lsGet("visitDismissed", "") !== meta.today) open.forEach(function(t){ if(isNewForYou(t)){ nBanner++; if(follows.has(t.body_name)) nFol++; } });
    var topPb = Object.keys(stats.pb).filter(function(n){ return PANCHAYAT[(bodies[n] || {}).type]; }).sort(function(a, b){ return stats.pb[b].n - stats.pb[a].n; }).slice(0, 8);
    var quick = [
      ["#/panchayats", "landmark", "Find your panchayat", Object.keys(bodies).length],
      ['#/all?close=0', "flame", "Closing today", open.filter(function(t){ return daysLeft(t.closing_date) === 0; }).length],
      ['#/all?sort=newest', "bell", "New today", stats.nNew],
      aiCount ? ['#/all?ai=high&sort=profit', "sparkle", "High profit (AI)", stats.high] : null,
      [href({view: "browse", grp: "roads"}), "road", "Roads", stats.groups.roads || 0],
      [href({view: "browse", grp: "buildings", kind: "anganwadis"}), "building", "Anganwadis", (stats.kinds.Anganwadis || {}).n || 0]
    ].filter(Boolean);
    setView(
      '<section class="hero"><span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span><div class="wrap">' +
        '<span class="eyebrow"><span class="dot"></span>Live · updated ' + esc(meta.last_run ? new Date(meta.last_run).toLocaleString("en-IN", {day: "numeric", month: "short", hour: "numeric", minute: "2-digit"}) : "daily") + "</span>" +
        "<h1>Find your next <span>panchayat contract</span> in seconds.</h1>" +
        '<p class="lead">Every open public works tender from Kerala\'s ' + num(stats.bodies.size) + " panchayats and local bodies, sorted into categories, with AI profit analysis and a cost calculator.</p>" +
        '<div class="sbox big" data-suggest>' + icon("search") + '<input type="search" placeholder="Search work or panchayat, e.g. “concrete road” or “Kuzhalmannam”" autocomplete="off" aria-label="Search tenders"><button class="go" type="button">' + icon("search") + '<span class="t">Search</span></button></div>' +
        '<div class="quick">' + quick.map(function(q){ return '<a href="' + q[0] + '">' + icon(q[1]) + esc(q[2]) + " <b>" + num(q[3]) + "</b></a>"; }).join("") + "</div>" +
        '<div class="stats">' +
          '<div class="stat"><div class="n" data-count="' + stats.total + '">0</div><div class="l">Open tenders</div></div>' +
          '<div class="stat"><div class="n" data-count="' + stats.nNew + '">0</div><div class="l">Added today</div></div>' +
          '<div class="stat"><div class="n" data-count="' + stats.soon + '">0</div><div class="l">Closing in 3 days</div></div>' +
          '<div class="stat"><div class="n" data-count="' + stats.bodies.size + '">0</div><div class="l">Panchayats & local bodies</div></div>' +
        "</div>" +
        (ticker ? '<div class="ticker"><span class="lbl">' + icon("bell") + 'Just in</span><div class="track"><div class="run">' + ticker + ticker + "</div></div></div>" : "") +
      "</div></section>" +
      '<div class="wrap">' +
        (nBanner ? '<div class="banner">' + icon("bell") + "<span><b>" + num(nBanner) + "</b> new tenders since your last visit" + (nFol ? " · <b>" + nFol + "</b> from panchayats you follow" : "") + '</span><a class="pillbtn primary" href="#/all?sort=newest">Show them</a><button class="x" type="button" data-dismiss aria-label="Dismiss">×</button></div>' : "") +
        (follows.size ? sectionHead("heart", "Your panchayats", "Panchayats you follow", "#/following", "All their tenders") +
          '<div class="chips">' + Array.from(follows).sort().map(function(b){ return '<a class="chip" href="' + href({view: "browse", pb: b}) + '"><span class="dot"></span>' + esc(b) + " <b>" + ((bodies[b] || {}).count || 0) + "</b></a>"; }).join("") + "</div>" : "") +
        sectionHead("grid", "Shop by category", "Pick a category to see every kind of work inside it", "#/categories", "All categories") +
        '<div class="tiles">' + GROUPS.filter(function(g){ return stats.groups[g.key]; }).map(function(g, i){
          return '<a class="tile anim" style="--c:' + g.c + ";--i:" + i + '" href="' + href({view: "browse", grp: g.key}) + '"><span class="go">' + icon("right") + "</span>" +
            '<span class="bubble">' + icon(g.icon) + "</span><h3>" + esc(g.name) + '</h3><div class="cnt"><b>' + num(stats.groups[g.key]) + "</b>open tenders</div>" +
            '<div class="sub">' + esc(g.blurb) + (stats.groupNew[g.key] ? " · " + stats.groupNew[g.key] + " new today" : "") + "</div></a>";
        }).join("") + "</div>" +
        sectionHead("pin", "Browse by district", "", "#/insights", "See the map") +
        '<div class="dgrid">' + dists.map(function(d, i){ return '<a class="dtile anim" style="--i:' + i + '" href="' + href({view: "browse", dist: d}) + '"><span class="pin">' + icon("pin") + "</span><div><b>" + esc(d) + "</b><span>" + num(stats.districts[d]) + ' open</span></div><span class="bar" style="width:' + (stats.districts[d] / dmax * 100).toFixed(0) + '%"></span></a>'; }).join("") + "</div>" +
        (soon.length ? sectionHead("flame", "Closing soon", "Bid before these close in the next 3 days", "#/all?close=3", "See all " + num(stats.soon)) + rail(soon, "rSoon") : "") +
        (picks.length ? sectionHead("sparkle", "AI top picks", "Tenders our AI rates as a high profit chance", "#/all?ai=high&sort=profit") + rail(picks, "rPicks") : "") +
        sectionHead("bell", "Just added", "The newest tenders on the portal", "#/all?sort=newest") + rail(fresh, "rFresh") +
        sectionHead("landmark", "Search by panchayat", "Open any panchayat to see all its tenders, or follow it to get alerts", "#/panchayats", "All panchayats") +
        '<div class="sbox pbhome"><span class="ic">' + icon("landmark") + '</span><input id="homePb" type="search" placeholder="Type your panchayat name…" autocomplete="off" aria-label="Find a panchayat"></div>' +
        '<div class="pbgrid" style="margin-top:12px">' + topPb.map(pbCard).join("") + "</div>" +
        sectionHead("trend", "Popular kinds of work", "", "#/categories", "Browse all") +
        '<div class="chips">' + kinds.map(function(k){ var g = G[stats.kinds[k].grp]; return '<a class="chip" style="--c:' + g.c + '" href="' + href({view: "browse", grp: g.key, kind: slug(k)}) + '"><span class="dot"></span>' + esc(k) + " <b>" + num(stats.kinds[k].n) + "</b></a>"; }).join("") + "</div>" +
      "</div>"
    );
    var hp = $("homePb");
    if(hp) hp.addEventListener("keydown", function(e){ if(e.key === "Enter"){ e.preventDefault(); go("#/panchayats?q=" + encodeURIComponent(hp.value.trim())); } });
    if(hp) hp.addEventListener("input", function(){ var v = hp.value.trim(); clearTimeout(hp._t); if(v.length >= 3) hp._t = setTimeout(function(){ go("#/panchayats?q=" + encodeURIComponent(v)); setTimeout(function(){ var q = $("pbQ"); if(q){ q.focus(); q.setSelectionRange(q.value.length, q.value.length); } }, 60); }, 500); });
    var dismiss = view.querySelector("[data-dismiss]");
    if(dismiss) dismiss.onclick = function(){ lsSet("visitDismissed", meta.today); dismiss.parentNode.remove(); };
  }

  function initials(name){
    return name.replace(/ (Grama|Block|District) Panchayat$| Municipality$| Corporation$/, "").split(/\s+/).slice(0, 2).map(function(w){ return w[0] || ""; }).join("").toUpperCase() || "P";
  }
  function pbCard(name, i){
    var b = bodies[name] || {}, st = stats.pb[name] || {n: 0, soon: 0, nw: 0}, c = TYPE_COLOR[b.type] || "#475569", f = follows.has(name);
    return '<a class="pbcard anim' + (st.n ? "" : " empty") + '" style="--c:' + c + ";--i:" + Math.min(i || 0, 14) + '" href="' + href({view: "browse", pb: name}) + '">' +
      '<span class="av">' + esc(initials(name)) + '</span><div class="pbm"><b>' + esc(name) + "</b><span>" + icon("pin") + esc(b.district || "Kerala") + " · " + esc((b.type || "Local body").replace(" Panchayat", "")) + "</span>" +
      '<div class="pbs">' + (st.n ? "<em><b>" + num(st.n) + "</b> open</em>" : "<em>No open tenders</em>") + (st.soon ? "<em>" + st.soon + " closing this week</em>" : "") + (st.nw ? '<em class="nw">' + st.nw + " new</em>" : "") + "</div></div>" +
      '<button class="fav" type="button" data-follow="' + esc(name) + '" aria-pressed="' + f + '" aria-label="' + (f ? "Unfollow " : "Follow ") + esc(name) + '">' + icon("heart") + "</button></a>";
  }
  var PB = {list: [], shown: 0, io: null};
  var PTYPES = [["", "All local bodies"], ["panchayats", "All panchayats"], ["Grama Panchayat", "Grama"], ["Block Panchayat", "Block"], ["District Panchayat", "District"], ["Municipality", "Municipalities"], ["Corporation", "Corporations"]];
  function renderPanchayats(){
    var type = F.body.length === 3 ? "panchayats" : (F.body[0] || ""), dist = F.district[0] || "";
    var dists = Object.keys(stats.districts).sort();
    setView('<div class="wrap"><nav class="crumbs"><a href="#/">Home</a>' + icon("right") + "<span>Panchayats</span></nav>" +
      '<div class="bhead" style="--c:#0e7a55"><span class="bubble" style="--c:#0e7a55">' + icon("landmark") + "</span><div><h1>Find a panchayat</h1><p>" + num(Object.keys(bodies).length) + " panchayats and local bodies. Open one to see all its tenders, or tap ♥ to follow it.</p></div></div>" +
      '<div class="pbtools"><div class="sbox">' + icon("search") + '<input id="pbQ" type="search" placeholder="Type a panchayat name, e.g. Kuzhalmannam, Valakom…" autocomplete="off" value="' + esc(F.q) + '" aria-label="Search panchayats"></div>' +
      '<select id="pbSort" aria-label="Sort"><option value="count">Most open tenders</option><option value="az">A to Z</option><option value="soon">Most closing this week</option></select></div>' +
      '<div class="kinds" id="pbTypes">' + PTYPES.map(function(t){ return '<button type="button" class="chip' + (t[0] === type ? " on" : "") + '" data-ptype="' + t[0] + '">' + esc(t[1]) + "</button>"; }).join("") + "</div>" +
      '<div class="kinds" id="pbDists"><button type="button" class="chip' + (dist ? "" : " on") + '" data-pdist="">All districts</button>' + dists.map(function(d){ return '<button type="button" class="chip' + (d === dist ? " on" : "") + '" data-pdist="' + esc(d) + '">' + esc(d) + "</button>"; }).join("") + "</div>" +
      '<div class="toolbar"><div class="count" id="pbCount"></div></div><div class="pbgrid" id="pbGrid"></div><div class="sentinel" id="pbSentinel"></div></div>');
    $("pbSort").value = ["az", "soon"].indexOf(F.sort) >= 0 ? F.sort : "count";
    var qt; $("pbQ").addEventListener("input", function(){ clearTimeout(qt); var v = this.value; qt = setTimeout(function(){ F.q = v.trim(); updatePanchayats(); }, 120); });
    $("pbSort").onchange = function(){ F.sort = this.value; updatePanchayats(); };
    $("pbTypes").onclick = function(e){ var b = e.target.closest("[data-ptype]"); if(!b) return; var v = b.dataset.ptype;
      F.body = v === "panchayats" ? ["Grama Panchayat", "Block Panchayat", "District Panchayat"] : v ? [v] : [];
      this.querySelectorAll(".chip").forEach(function(c){ c.classList.toggle("on", c === b); }); updatePanchayats(); };
    $("pbDists").onclick = function(e){ var b = e.target.closest("[data-pdist]"); if(!b) return; F.district = b.dataset.pdist ? [b.dataset.pdist] : [];
      this.querySelectorAll(".chip").forEach(function(c){ c.classList.toggle("on", c === b); }); updatePanchayats(); };
    updatePanchayats();
  }
  function updatePanchayats(){
    var words = (F.q || "").toLowerCase().split(/\s+/).filter(Boolean);
    PB.list = Object.keys(bodies).filter(function(n){
      var b = bodies[n];
      if(F.body.length && F.body.indexOf(b.type) < 0) return false;
      if(F.district.length && F.district.indexOf(b.district) < 0) return false;
      var h = (n + " " + (b.district || "")).toLowerCase();
      return words.every(function(w){ return h.indexOf(w) >= 0; });
    });
    var st = function(n){ return stats.pb[n] || {n: 0, soon: 0}; }, q0 = words[0] || "";
    PB.list.sort(function(a, b){
      if(q0){ var ap = a.toLowerCase().indexOf(q0) === 0, bp = b.toLowerCase().indexOf(q0) === 0; if(ap !== bp) return ap ? -1 : 1; }
      if(F.sort === "az") return a.localeCompare(b);
      if(F.sort === "soon") return st(b).soon - st(a).soon || st(b).n - st(a).n;
      return st(b).n - st(a).n || a.localeCompare(b);
    });
    PB.shown = 0; $("pbGrid").innerHTML = "";
    var withOpen = PB.list.filter(function(n){ return st(n).n; }).length;
    $("pbCount").innerHTML = "<b>" + num(PB.list.length) + "</b> panchayats & local bodies · " + num(withOpen) + " with open tenders" +
      (!PB.list.length ? '<div class="empty"><div class="art">' + icon("landmark") + "</div><h3>No panchayat matches “" + esc(F.q) + "”</h3><p>It may not have published an e-tender yet. Panchayats appear here once they publish one. You can also <a href=\"" + href({view: "browse", search: true}, Object.assign(emptyF(), {q: F.q})) + "\">search tenders mentioning “" + esc(F.q) + "”</a>.</p></div>" : "");
    morePanchayats();
    var p = new URLSearchParams(); if(F.q) p.set("q", F.q); if(F.district.length) p.set("district", F.district.join(",")); if(F.body.length) p.set("body", F.body.join(",")); if(F.sort && F.sort !== "count" && F.sort !== "closing") p.set("sort", F.sort);
    var h = "#/panchayats" + (p.toString() ? "?" + p.toString().replace(/%2C/g, ",") : ""); if(location.hash !== h) history.replaceState(null, "", h); cur = location.hash;
    if(PB.io) PB.io.disconnect();
    PB.io = new IntersectionObserver(function(es){ if(es[0].isIntersecting) morePanchayats(); }, {rootMargin: "600px"});
    PB.io.observe($("pbSentinel"));
  }
  function morePanchayats(){
    var g = $("pbGrid"); if(!g || PB.shown >= PB.list.length) return;
    var next = PB.list.slice(PB.shown, PB.shown + 48);
    g.insertAdjacentHTML("beforeend", next.map(pbCard).join(""));
    PB.shown += next.length;
  }

  function renderCategories(){
    setView('<div class="wrap"><nav class="crumbs"><a href="#/">Home</a>' + icon("right") + "<span>All categories</span></nav>" +
      '<div class="bhead" style="--c:var(--brand)"><span class="bubble" style="--c:#0e7a55">' + icon("grid") + "</span><div><h1>All categories</h1><p>" + num(stats.total) + " open tenders in " + Object.keys(stats.kinds).length + " kinds of work</p></div></div>" +
      '<div class="cats">' + GROUPS.filter(function(g){ return stats.groups[g.key]; }).map(function(g, i){
        var ks = Object.keys(stats.kinds).filter(function(k){ return stats.kinds[k].grp === g.key; }).sort(function(a, b){ return stats.kinds[b].n - stats.kinds[a].n; });
        return '<section class="catcard anim" style="--c:' + g.c + ";--i:" + i + '"><header><span class="bubble">' + icon(g.icon) + '</span><a href="' + href({view: "browse", grp: g.key}) + '"><h3>' + esc(g.name) + "</h3><span>" + num(stats.groups[g.key]) + " open tenders</span></a></header><ul>" +
          ks.map(function(k){ return '<li><a href="' + href({view: "browse", grp: g.key, kind: slug(k)}) + '"><span>' + esc(k) + "</span><b>" + num(stats.kinds[k].n) + "</b></a></li>"; }).join("") + "</ul></section>";
      }).join("") + "</div></div>");
  }

  // ---------- browse (category / search / panchayat / district / saved) ----------
  var B = {list: [], shown: 0, io: null};
  function browseTitle(){
    if(R.grp){ var g = G[R.grp]; var kname = R.kind ? Object.keys(stats.kinds).filter(function(k){ return slug(k) === R.kind; })[0] : ""; return {t: kname || g.name, sub: kname ? g.name : g.blurb, ic: g.icon, c: g.c, kname: kname}; }
    if(R.pb){ var b = bodies[R.pb] || {}; return {t: R.pb, sub: [b.type, b.district].filter(Boolean).join(" · "), ic: "landmark", c: "#0e7a55"}; }
    if(R.dist) return {t: R.dist + " district", sub: "All panchayat and local body tenders in " + R.dist, ic: "pin", c: "#0284c7"};
    if(R.saved) return {t: "Saved tenders", sub: "Tenders you saved with ♥ (kept in this browser)", ic: "heart", c: "#e11d48"};
    if(R.following) return {t: "Panchayats you follow", sub: Array.from(follows).join(", ") || "Follow a panchayat to see its tenders here", ic: "star", c: "#ca8a04"};
    if(F.q) return {t: "Results for “" + F.q + "”", sub: "Matching title, panchayat, district, location or Tender ID", ic: "search", c: "#0e7a55"};
    return {t: "All tenders", sub: "Every open panchayat and local body tender in Kerala", ic: "list", c: "#0e7a55"};
  }
  function renderBrowse(){
    var T = browseTitle(), crumbs = '<a href="#/">Home</a>';
    if(R.grp){ crumbs += icon("right") + (T.kname ? '<a href="' + href({view: "browse", grp: R.grp}) + '">' + esc(G[R.grp].name) + "</a>" + icon("right") + "<span>" + esc(T.kname) + "</span>" : "<span>" + esc(G[R.grp].name) + "</span>"); }
    else crumbs += icon("right") + "<span>" + esc(T.t) + "</span>";
    var kindChips = "";
    if(R.grp){
      var ks = Object.keys(stats.kinds).filter(function(k){ return stats.kinds[k].grp === R.grp; }).sort(function(a, b){ return stats.kinds[b].n - stats.kinds[a].n; });
      kindChips = '<div class="kinds" style="--c:' + G[R.grp].c + '"><a class="chip' + (R.kind ? "" : " on") + '" href="' + href({view: "browse", grp: R.grp}, F) + '">All <b>' + num(stats.groups[R.grp] || 0) + "</b></a>" +
        ks.map(function(k){ return '<a class="chip' + (slug(k) === R.kind ? " on" : "") + '" href="' + href({view: "browse", grp: R.grp, kind: slug(k)}, F) + '">' + esc(k) + " <b>" + num(stats.kinds[k].n) + "</b></a>"; }).join("") + "</div>";
    }
    var pstats = "", follow = "";
    if(R.pb){
      var isF = follows.has(R.pb), plist = open.filter(function(t){ return t.body_name === R.pb; }), pb = bodies[R.pb] || {};
      var soonN = plist.filter(function(t){ var d = daysLeft(t.closing_date); return d !== null && d >= 0 && d <= 7; }).length;
      pstats = '<div class="pstats"><div><b>' + num(plist.length) + "</b>open tenders</div><div><b>" + num(soonN) + "</b>closing this week</div>" + (pb.seen ? "<div><b>" + num(pb.seen) + "</b>tracked since " + esc(fmtDate(pb.firstSeen, {day: "numeric", month: "short"})) + "</div>" : "") + "</div>" +
        (plist.length ? "" : '<p class="muted">No open e-tenders right now' + (pb.lastSeen ? " · last seen " + esc(fmtDate(pb.lastSeen)) : "") + ". Follow it to be alerted when it publishes one.</p>");
      follow = '<button class="pillbtn' + (isF ? " primary" : "") + '" type="button" data-follow="' + esc(R.pb) + '">' + icon("heart") + (isF ? "Following" : "Follow") + "</button>";
    }
    setView('<div class="wrap"><nav class="crumbs">' + crumbs + "</nav>" +
      '<div class="bhead" style="--c:' + T.c + '"><span class="bubble" style="--c:' + T.c + '">' + icon(T.ic) + "</span><div><h1>" + esc(T.t) + "</h1><p>" + esc(T.sub) + "</p>" + pstats + "</div>" +
        '<div class="acts">' + follow + '<button class="pillbtn" type="button" data-share>' + icon("share") + 'Share</button><button class="pillbtn" type="button" data-csv>' + icon("download") + "CSV</button></div></div>" +
      kindChips +
      '<div class="browse"><aside class="facets" id="facets" aria-label="Filters"></aside><section>' +
        '<div class="toolbar"><div class="count" id="bCount"></div><span class="sp"></span>' +
        '<button class="pillbtn fbtn" type="button" data-sheet>' + icon("sliders") + 'Filters <span id="fCount"></span></button>' +
        '<label class="sr" for="sortSel">Sort</label><select id="sortSel">' + SORTS.map(function(s){ return '<option value="' + s[0] + '"' + (F.sort === s[0] ? " selected" : "") + ">" + s[1] + "</option>"; }).join("") + "</select></div>" +
        '<div class="active" id="activeChips"></div><div class="grid" id="bGrid"></div><div class="sentinel" id="sentinel"></div><div id="bEmpty"></div>' +
      "</section></div></div>");
    $("sortSel").onchange = function(){ F.sort = this.value; updateBrowse(true); };
    updateBrowse(false);
  }
  function setFilters(){ var h = href(R, F); if(location.hash !== h) history.replaceState(null, "", h); cur = location.hash || h; }
  function facetCounts(key){
    var counts = {};
    open.forEach(function(t){
      if(!inScope(t, R) || !passF(t, F, key)) return;
      if(key === "close"){ var d = daysLeft(t.closing_date); CLOSE_OPTS.forEach(function(o){ if(d !== null && d >= 0 && d <= +o[0]) counts[o[0]] = (counts[o[0]] || 0) + 1; }); }
      else if(key === "ai"){ var a = t._ai; if(!a) return; counts.rated = (counts.rated || 0) + 1; if(a.pc === "High") counts.high = (counts.high || 0) + 1; if(a.pc !== "Low") counts.good = (counts.good || 0) + 1; if(a.dl === "Easy" || a.dl === "Moderate") counts.easy = (counts.easy || 0) + 1; }
      else { var v = facetVal(t, key); if(v) counts[v] = (counts[v] || 0) + 1; }
    });
    return counts;
  }
  var facetOpenState = lsGet("facetOpen", {}) || {};
  function facetHtml(key, title, opts, type, searchable){
    var counts = facetCounts(key), isOpen = facetOpenState[key] !== false;
    var limit = 7, rows = opts.map(function(o, i){
      var val = o[0], n = counts[val] || 0, checked = type === "radio" ? F[key] === val : F[key].indexOf(val) >= 0;
      return '<label class="opt' + (n ? "" : " zero") + '"' + (i >= limit && !checked ? ' data-extra hidden' : "") + '><input type="' + type + '" name="f-' + key + '" value="' + esc(val) + '"' + (checked ? " checked" : "") + ' data-facet="' + key + '"><span>' + esc(o[1]) + "</span><em>" + num(n) + "</em></label>";
    }).join("");
    if(type === "radio" && F[key]) rows = '<label class="opt"><input type="radio" name="f-' + key + '" value="" data-facet="' + key + '"><span>Any</span><em></em></label>' + rows;
    return '<details class="facet" data-key="' + key + '"' + (isOpen ? " open" : "") + "><summary>" + esc(title) + icon("right") + "</summary>" +
      (searchable ? '<div class="fsearch">' + icon("search") + '<input type="search" placeholder="' + esc(searchable) + '" data-fsearch aria-label="' + esc(searchable) + '"></div>' : "") + rows +
      (opts.length > limit ? '<button class="more-opts" type="button" data-more>Show all ' + opts.length + "</button>" : "") + "</details>";
  }
  function renderFacets(){
    var scope = open.filter(function(t){ return inScope(t, R); });
    var uniq = function(fn){ var s = {}; scope.forEach(function(t){ var v = fn(t); if(v) s[v] = (s[v] || 0) + 1; }); return Object.keys(s).sort(function(a, b){ return s[b] - s[a]; }); };
    var districts = R.dist ? [] : uniq(function(t){ return t.district; });
    var bodiesT = R.pb ? [] : uniq(function(t){ return t.body_type; });
    var html = '<div class="fhead"><b>Filters</b><button class="linkbtn" type="button" data-clear>Clear all</button><button class="pillbtn primary done" type="button" data-done>Show results</button></div>';
    if(districts.length > 1) html += facetHtml("district", "District", districts.map(function(d){ return [d, d]; }), "checkbox");
    if(!R.pb){
      var pbs = uniq(function(t){ return t.body_name; });
      pbs.sort(function(a, b){ return (F.pbs.indexOf(b) >= 0) - (F.pbs.indexOf(a) >= 0); });
      if(pbs.length > 1) html += facetHtml("pbs", "Panchayat / local body", pbs.map(function(b){ return [b, b]; }), "checkbox", "Find a panchayat…");
    }
    if(bodiesT.length > 1) html += facetHtml("body", "Type of local body", bodiesT.map(function(b){ return [b, b]; }), "checkbox");
    html += facetHtml("job", "Type of job", ["Repair & maintenance", "New construction", "Supply & installation", "Other"].map(function(j){ return [j, j]; }), "checkbox");
    html += facetHtml("band", "Contract value", BANDS.map(function(b, i){ return [String(i), b[2]]; }).concat([["u", "Value not available yet"]]), "checkbox");
    html += facetHtml("close", "Closing date", CLOSE_OPTS, "radio");
    if(aiCount) html += facetHtml("ai", "AI rating", AI_OPTS, "radio");
    $("facets").innerHTML = html;
  }
  function activeChips(){
    var out = [];
    ["district", "body", "job"].forEach(function(k){ F[k].forEach(function(v){ out.push([k, v, v]); }); });
    F.band.forEach(function(v){ out.push(["band", v, v === "u" ? "Value not published" : BANDS[+v][2]]); });
    F.pbs.forEach(function(v){ out.push(["pbs", v, v]); });
    if(F.close !== "") out.push(["close", F.close, CLOSE_OPTS.filter(function(o){ return o[0] === F.close; })[0][1]]);
    if(F.ai) out.push(["ai", F.ai, "AI: " + AI_OPTS.filter(function(o){ return o[0] === F.ai; })[0][1]]);
    if(F.q && !R.search) out.push(["q", F.q, "“" + F.q + "”"]);
    return out;
  }
  function updateBrowse(keepFacets){
    NOW = Date.now();
    B.list = sortList(open.filter(function(t){ return inScope(t, R) && passF(t, F); }), F.sort);
    B.shown = 0;
    if(!keepFacets || !$("facets").innerHTML) renderFacets(); else refreshFacetCounts();
    var chips = activeChips();
    $("activeChips").innerHTML = chips.map(function(c){ return '<span class="achip">' + esc(c[2]) + '<button type="button" data-rm="' + c[0] + '" data-v="' + esc(c[1]) + '" aria-label="Remove ' + esc(c[2]) + '">×</button></span>'; }).join("") +
      (chips.length ? '<button class="linkbtn" type="button" data-clear>Clear all</button>' : "");
    $("fCount").textContent = chips.length ? "(" + chips.length + ")" : "";
    $("bCount").innerHTML = "<b>" + num(B.list.length) + "</b> tender" + (B.list.length === 1 ? "" : "s");
    $("bGrid").innerHTML = "";
    $("bEmpty").innerHTML = B.list.length ? "" : '<div class="empty"><div class="art">' + icon(R.saved ? "heart" : "search") + "</div><h3>" +
      (R.saved ? "No saved tenders yet" : R.following && !follows.size ? "You don’t follow any panchayat yet" : "No tenders match") + "</h3><p>" +
      (R.saved ? "Tap ♥ on any tender to keep it here." : R.following && !follows.size ? "Open a panchayat and tap Follow." : "Try removing a filter or searching for something else.") + "</p>" +
      (chips.length ? '<button class="pillbtn primary" type="button" data-clear>Clear filters</button>' : '<a class="pillbtn primary" href="#/">Back to home</a>') + "</div>";
    appendCards();
    setFilters();
    if(B.io) B.io.disconnect();
    B.io = new IntersectionObserver(function(es){ if(es[0].isIntersecting) appendCards(); }, {rootMargin: "600px"});
    B.io.observe($("sentinel"));
  }
  function refreshFacetCounts(){
    FACET_KEYS.forEach(function(key){
      var det = $("facets").querySelector('[data-key="' + key + '"]'); if(!det) return;
      var counts = facetCounts(key);
      det.querySelectorAll("input[data-facet]").forEach(function(inp){
        if(!inp.value) return;
        var n = counts[inp.value] || 0, lab = inp.closest(".opt");
        lab.querySelector("em").textContent = num(n);
        lab.classList.toggle("zero", !n);
        inp.checked = key === "close" || key === "ai" ? F[key] === inp.value : F[key].indexOf(inp.value) >= 0;
      });
    });
  }
  function appendCards(){
    var grid = $("bGrid"); if(!grid || B.shown >= B.list.length) return;
    var next = B.list.slice(B.shown, B.shown + PAGE);
    grid.insertAdjacentHTML("beforeend", next.map(function(t, i){ return card(t, i); }).join(""));
    B.shown += next.length;
  }
  function onFacetChange(input){
    var key = input.dataset.facet;
    if(input.type === "radio") F[key] = input.value;
    else { var set = F[key], i = set.indexOf(input.value); if(input.checked && i < 0) set.push(input.value); if(!input.checked && i >= 0) set.splice(i, 1); }
    updateBrowse(true);
  }

  // ---------- insights (map + charts) ----------
  var TILES = [["Kasaragod", 0, 0], ["Kannur", .25, 1], ["Wayanad", 1.6, 1.5], ["Kozhikode", .5, 2], ["Malappuram", .75, 3], ["Palakkad", 2.15, 3.5], ["Thrissur", 1, 4], ["Ernakulam", 1.25, 5], ["Idukki", 2.85, 5.5], ["Alappuzha", 1.5, 6], ["Kottayam", 2.85, 6.5], ["Kollam", 1.75, 7], ["Pathanamthitta", 2.95, 7.5], ["Thiruvananthapuram", 1.9, 8]];
  var SHORT = {"Thiruvananthapuram": ["Thiruvanan-", "thapuram"], "Pathanamthitta": ["Pathanam-", "thitta"]};
  var tip = $("tip");
  function showTip(ev, strong, label, extra){
    tip.innerHTML = "";
    var b = document.createElement("b"); b.textContent = strong; tip.appendChild(b);
    [label, extra].forEach(function(s){ if(s){ var sp = document.createElement("span"); sp.textContent = s; tip.appendChild(sp); } });
    var r = ev.currentTarget && ev.currentTarget.getBoundingClientRect ? ev.currentTarget.getBoundingClientRect() : null;
    var x = ev.clientX || (r ? r.left + r.width / 2 : 0), y = ev.clientY || (r ? r.top : 0);
    tip.style.opacity = 1;
    var w = tip.offsetWidth, h = tip.offsetHeight;
    tip.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, x - w / 2)) + "px";
    tip.style.top = (y - h - 14 < 8 ? y + 18 : y - h - 14) + "px";
  }
  function hideTip(){ tip.style.opacity = 0; }
  function el(name, attrs, parent){ var n = document.createElementNS(SVGNS, name); for(var k in attrs) n.setAttribute(k, attrs[k]); if(parent) parent.appendChild(n); return n; }
  function hbarPath(x, y, w, h){ var r = Math.min(4, w, h / 2); return "M" + x + "," + y + "h" + (w - r) + "a" + r + "," + r + " 0 0 1 " + r + "," + r + "v" + (h - 2 * r) + "a" + r + "," + r + " 0 0 1 -" + r + "," + r + "h-" + (w - r) + "z"; }
  function vbarPath(x, y, w, h){ var r = Math.min(4, h, w / 2); return "M" + x + "," + (y + h) + "v-" + (h - r) + "a" + r + "," + r + " 0 0 1 " + r + ",-" + r + "h" + (w - 2 * r) + "a" + r + "," + r + " 0 0 1 " + r + "," + r + "v" + (h - r) + "z"; }
  function makeHit(g, o){
    g.classList.add("hit"); g.setAttribute("tabindex", "0"); g.setAttribute("role", "link"); g.setAttribute("aria-label", o.aria);
    g.addEventListener("pointermove", function(e){ showTip(e, o.strong, o.label, o.extra); });
    g.addEventListener("pointerleave", hideTip);
    g.addEventListener("focus", function(e){ showTip(e, o.strong, o.label, o.extra); });
    g.addEventListener("blur", hideTip);
    g.addEventListener("click", function(){ hideTip(); go(o.href); });
    g.addEventListener("keydown", function(e){ if(e.key === "Enter"){ e.preventDefault(); hideTip(); go(o.href); } });
  }
  function niceStep(max){ if(max <= 5) return 1; var raw = max / 4, p = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p; }
  function drawMap(box){
    var counts = stats.districts, max = 0; TILES.forEach(function(d){ max = Math.max(max, counts[d[0]] || 0); });
    var U = 100, TW = 100, TH = 88, W = 4 * U, H = 8.9 * U;
    var svg = el("svg", {viewBox: "-4 -4 " + (W + 8) + " " + (H + 8), role: "group", "aria-label": "Map of Kerala districts"}, box);
    el("text", {x: 6, y: H - 10, class: "axis", "font-size": 13}, svg).textContent = "Arabian Sea";
    el("text", {x: W - 6, y: 14, class: "axis", "text-anchor": "end", "font-size": 13}, svg).textContent = "N ↑";
    TILES.forEach(function(d, i){
      var name = d[0], c = counts[name] || 0, x = d[1] * U, y = d[2] * U;
      var bin = c && max ? Math.min(6, Math.max(1, Math.ceil(c / max * 6))) : 0;
      var g = el("g", {class: "tile-d", style: reduceMotion ? "" : "opacity:0;animation:card-in .5s var(--ease) " + (i * 50) + "ms both"}, svg);
      el("rect", {class: "t", x: x, y: y, width: TW, height: TH, rx: 12, style: "fill:" + (bin ? "var(--seq-" + bin + ")" : "var(--surface-2)")}, g);
      var ink = bin ? "var(--ink-" + bin + ")" : "var(--muted)", lines = SHORT[name] || [name];
      lines.forEach(function(line, j){ el("text", {class: "tname", x: x + TW / 2, y: y + 26 + j * 15 - (lines.length - 1) * 7, "text-anchor": "middle", style: "fill:" + ink}, g).textContent = line; });
      el("text", {class: "tcount", x: x + TW / 2, y: y + TH - 18, "text-anchor": "middle", style: "fill:" + ink}, g).textContent = num(c);
      makeHit(g, {strong: num(c) + " open tenders", label: name, extra: "Click to browse", aria: name + ": " + c + " tenders", href: href({view: "browse", dist: name})});
    });
  }
  function drawHbars(box, rows, labelW){
    labelW = labelW || 150;
    var W = 380, valW = 50, rowH = 25, barH = 14, plotW = W - labelW - valW, maxChars = Math.floor((labelW - 10) / 6.2);
    var max = Math.max.apply(null, rows.map(function(r){ return r.n; })) || 1;
    var svg = el("svg", {viewBox: "0 0 " + W + " " + rows.length * rowH, role: "group"}, box);
    rows.forEach(function(r, i){
      var y = i * rowH, w = r.n ? Math.max(2, r.n / max * plotW) : 0, g = el("g", {}, svg);
      el("rect", {class: "hitbox", x: 0, y: y, width: W, height: rowH}, g);
      el("text", {class: "lbl", x: labelW - 8, y: y + rowH / 2 + 4, "text-anchor": "end"}, g).textContent = r.label.length > maxChars ? r.label.slice(0, maxChars - 1) + "…" : r.label;
      if(w){ var p = el("path", {class: "mark", d: hbarPath(labelW, y + (rowH - barH) / 2, w, barH)}, g); if(r.color) p.style.fill = r.color; if(!reduceMotion){ p.style.transformOrigin = labelW + "px 0"; p.style.animation = "grow .8s var(--ease) " + (i * 40) + "ms both"; } }
      el("text", {class: "val", x: labelW + w + 5, y: y + rowH / 2 + 4}, g).textContent = num(r.n);
      makeHit(g, {strong: num(r.n) + " tenders", label: r.label, extra: "Click to browse", aria: r.label + ": " + r.n, href: r.href});
    });
  }
  function drawClosing(box){
    var counts = {}; open.forEach(function(t){ if(t.closing_date) counts[t.closing_date] = (counts[t.closing_date] || 0) + 1; });
    var start = meta.today, last = start; Object.keys(counts).forEach(function(d){ if(d > last) last = d; });
    var nDays = Math.max(14, Math.min(45, Math.round((Date.parse(last) - Date.parse(start)) / 864e5) + 1)), days = [];
    for(var i = 0; i < nDays; i++) days.push(addDays(start, i));
    var W = 720, H = 220, top = 14, bottom = 22, left = 34, plotW = W - left - 4, plotH = H - top - bottom, band = plotW / nDays, bw = Math.min(24, Math.max(3, band - 2));
    var max = 0; days.forEach(function(d){ max = Math.max(max, counts[d] || 0); });
    var step = niceStep(max), yMax = Math.max(step, Math.ceil(max / step) * step);
    var svg = el("svg", {viewBox: "0 0 " + W + " " + H, role: "group"}, box);
    for(var v = 0; v <= yMax; v += step){ var y = top + plotH - v / yMax * plotH; el("line", {class: "gridline", x1: left, x2: W, y1: y, y2: y}, svg); el("text", {class: "axis", x: left - 6, y: y + 3.5, "text-anchor": "end"}, svg).textContent = v >= 1000 ? v / 1000 + "K" : v; }
    days.forEach(function(d, i){
      var c = counts[d] || 0, x = left + i * band, h = c / yMax * plotH, g = el("g", {}, svg);
      el("rect", {class: "hitbox", x: x, y: top, width: band, height: plotH + bottom}, g);
      if(h > 0){ var p = el("path", {class: "mark", d: vbarPath(x + (band - bw) / 2, top + plotH - Math.max(h, 2), bw, Math.max(h, 2))}, g); if(!reduceMotion){ p.style.transformOrigin = "0 " + (top + plotH) + "px"; p.style.animation = "grow-y .7s var(--ease) " + (i * 15) + "ms both"; } }
      var dt = new Date(d + "T00:00:00");
      if(i === 0 || dt.getDay() === 1) el("text", {class: "axis", x: x + band / 2, y: H - 6, "text-anchor": "middle"}, g).textContent = i === 0 ? "Today" : fmtDate(d, {day: "numeric", month: "short"});
      var dl = daysLeft(d);
      makeHit(g, {strong: num(c) + " closing", label: fmtDate(d, {weekday: "long", day: "numeric", month: "short"}), extra: dl === 0 ? "Today" : dl === 1 ? "Tomorrow" : "In " + dl + " days", aria: c + " tenders closing on " + fmtDate(d), href: "#/all?close=" + Math.max(0, dl)});
    });
  }
  function renderInsights(){
    setView('<div class="wrap"><nav class="crumbs"><a href="#/">Home</a>' + icon("right") + "<span>Insights</span></nav>" +
      '<div class="bhead" style="--c:#2a78d6"><span class="bubble" style="--c:#2a78d6">' + icon("chart") + "</span><div><h1>Insights</h1><p>Where the work is across Kerala. Click any bar or district to browse those tenders.</p></div></div>" +
      '<div class="ins"><div class="card-c mapcard"><h2>Kerala map</h2><p class="hint">Open tenders by district</p><div id="iMap"></div><div class="legend"><span>Fewer</span><span class="ramp"></span><span>More</span></div></div>' +
      '<div class="ins-right"><div class="card-c wide"><h2>Closing dates</h2><p class="hint">Tenders closing each day</p><div id="iClose"></div></div>' +
      '<div class="card-c"><h2>By category</h2><p class="hint">Open tenders per category</p><div id="iGroups"></div></div>' +
      '<div class="card-c"><h2>Contract value</h2><p class="hint">Where the value is published</p><div id="iBands"></div></div>' +
      '<div class="card-c wide"><h2>Most active panchayats</h2><p class="hint">Most open tenders right now</p><ol class="lb" id="iLeader"></ol></div></div></div></div>');
    drawMap($("iMap")); drawClosing($("iClose"));
    drawHbars($("iGroups"), GROUPS.filter(function(g){ return stats.groups[g.key]; }).map(function(g){ return {label: g.name, n: stats.groups[g.key], color: g.c, href: href({view: "browse", grp: g.key})}; }).sort(function(a, b){ return b.n - a.n; }), 150);
    var bc = {}; open.forEach(function(t){ var b = bandOf(t.value); if(b !== "u") bc[b] = (bc[b] || 0) + 1; });
    drawHbars($("iBands"), BANDS.map(function(b, i){ return {label: b[2], n: bc[String(i)] || 0, href: "#/all?band=" + i}; }), 100);
    var agg = {}; open.forEach(function(t){ if(PANCHAYAT[t.body_type]) agg[t.body_name] = (agg[t.body_name] || 0) + 1; });
    var top = Object.keys(agg).sort(function(a, b){ return agg[b] - agg[a]; }).slice(0, 10), mx = top.length ? agg[top[0]] : 1;
    $("iLeader").innerHTML = top.map(function(b, i){ return '<li><a href="' + href({view: "browse", pb: b}) + '"><span class="rk">' + (i + 1) + '</span><div><div class="nm">' + esc(b) + ' <span class="ds">' + esc((bodies[b] || {}).district || "") + '</span></div><div class="bar" style="width:' + (agg[b] / mx * 100).toFixed(0) + "%;animation-delay:" + i * 50 + 'ms"></div></div><span class="v">' + agg[b] + "</span></a></li>"; }).join("");
  }

  // ===================================================================
  // Tender detail (dialog) + AI + cost calculator
  // ===================================================================
  var dlg = $("dlg"), cdTimer = null, openedFromApp = false;
  function list(title, items, ic){ return items && items.length ? "<h4>" + icon(ic || "check") + title + "</h4><ul>" + items.map(function(i){ return "<li>" + esc(i) + "</li>"; }).join("") + "</ul>" : ""; }
  function openDetail(t){
    var g = G[grpOf(t)], isSaved = saved.has(t.id), isF = follows.has(t.body_name);
    var rows = [["Tender ID", "<code>" + esc(t.tender_id) + "</code>"], ["Reference", esc(t.tender_ref && t.tender_ref !== t.title ? t.tender_ref : "—")], ["Category", esc(g.name + " › " + (t.kind || ""))],
      ["Office", esc(t.organisation)], ["Portal category", esc(t.category || "—")], ["Tender type", esc(t.tender_type || "—")], ["Closes", esc(t.closing_time || fmtDate(t.closing_date))],
      ["Bids open", fmtDate(t.opening_date)], ["Published", fmtDate(t.published_date)], ["Tender fee", inrFull(t.tender_fee)], ["Work period", t.work_days ? esc(t.work_days) + " days" : "—"],
      ["Location", esc([t.location, t.pincode].filter(Boolean).join(" · ") || "—")], ["Department path", esc((t.org_chain || "").split("||").join(" › "))]];
    var related = open.filter(function(o){ return o.body_name === t.body_name && o.id !== t.id; }).sort(function(a, b){ return (a._close || 0) - (b._close || 0); }).slice(0, 6);
    dlg.style.setProperty("--c", g.c);
    $("dlgBody").innerHTML =
      '<div class="dhead"><button class="iconbtn close" type="button" data-act="close" aria-label="Close">' + icon("x") + "</button>" +
      '<span class="cat">' + icon(g.icon) + esc(t.kind || g.name) + "</span>" +
      '<h2 id="dTitle">' + esc(t.title) + "</h2>" +
      '<div class="org"><a href="' + href({view: "browse", pb: t.body_name}) + '" data-act="body">' + icon("landmark") + esc(t.body_name) + "</a>" + esc([t.district, t.body_type].filter(Boolean).join(" · ")) + "</div>" +
      '<div class="kpis"><div class="kpi"><b>' + (t.value != null ? inr(t.value) : t.details_fetched ? "Not disclosed" : "Coming soon") + "</b><span>Contract value</span></div><div class=\"kpi\"><b>" + (t.emd != null ? inr(t.emd) : "—") + '</b><span>EMD</span></div><div class="kpi"><b id="cd">' + esc(countdown(t)) + "</b><span>Time left to bid</span></div></div></div>" +
      '<div class="dbody">' + (badges(t) ? '<div class="pc-badges" style="margin-bottom:12px">' + badges(t) + "</div>" : "") +
      '<div class="tabs" role="tablist"><button type="button" role="tab" data-tab="ai" aria-selected="true">' + icon("sparkle") + 'AI analysis</button><button type="button" role="tab" data-tab="calc" aria-selected="false">' + icon("calc") + 'Cost calculator</button><button type="button" role="tab" data-tab="info" aria-selected="false">' + icon("doc") + "Details</button></div>" +
      '<section class="tabpane" data-pane="ai"><div id="aiBox" class="aibox"><div class="skel" style="min-height:140px"></div></div></section>' +
      '<section class="tabpane" data-pane="calc" hidden><div id="calcBox"></div></section>' +
      '<section class="tabpane" data-pane="info" hidden><dl>' + rows.map(function(r){ return "<dt>" + r[0] + "</dt><dd>" + r[1] + "</dd>"; }).join("") + "</dl></section>" +
      '<div class="acts"><button type="button" class="primary" data-act="copy">' + icon("copy") + "Copy Tender ID</button>" +
        '<a href="' + SEARCH_URL + '" target="_blank" rel="noopener">' + icon("ext") + "Open portal search</a>" +
        '<button type="button" data-act="save">' + icon("heart") + (isSaved ? "Saved" : "Save tender") + "</button>" +
        '<button type="button" data-act="follow">' + icon("star") + (isF ? "Following panchayat" : "Follow panchayat") + "</button>" +
        '<button type="button" data-act="cal">' + icon("cal") + "Add to calendar</button>" +
        '<a href="https://wa.me/?text=' + encodeURIComponent(summary(t)) + '" target="_blank" rel="noopener">' + icon("chat") + "Share on WhatsApp</a></div>" +
      "<h3>My notes</h3><textarea id=\"noteBox\" placeholder=\"Private notes (saved in this browser), e.g. site visit done, rates checked…\">" + esc(notes[t.id] || "") + "</textarea>" +
      (related.length ? "<h3>More from " + esc(t.body_name) + '</h3><ul class="related">' + related.map(function(o){ return '<li><a href="#/t/' + encodeURIComponent(o.tender_id) + '"><span class="rt">' + esc(o.title) + '</span><span class="rv">' + (inr(o.value) || "") + " · " + fmtDate(o.closing_date, {day: "numeric", month: "short"}) + "</span></a></li>"; }).join("") + "</ul>" : "") +
      '<p class="note">To open it on the portal: copy the Tender ID, open portal search, paste it into “Tender ID” and fill the captcha. Who won? After bids are opened, the result is on the portal’s <a href="' + RESULTS_URL + '" target="_blank" rel="noopener">Results of Tenders</a> page; search the same Tender ID there.</p></div>';
    dlg._t = t;
    $("noteBox").addEventListener("input", function(e){ if(e.target.value.trim()) notes[t.id] = e.target.value; else delete notes[t.id]; lsSet("notes", notes); });
    clearInterval(cdTimer);
    cdTimer = setInterval(function(){ var c = $("cd"); if(c) c.textContent = countdown(t); }, 30000);
    if(!dlg.open){ if(dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
    dlg.scrollTop = 0;
    loadAI(t);
  }
  function closeDetail(){
    if(!dlg.open) return;
    dlg.close();
  }
  dlg.addEventListener("close", function(){
    clearInterval(cdTimer);
    if(suppressClose){ suppressClose = false; return; }
    if(!inTender) return;
    inTender = false;
    if(openedFromApp){ openedFromApp = false; history.back(); } else go(cur || "#/", true);
  });
  dlg.addEventListener("click", function(e){
    if(e.target === dlg){ closeDetail(); return; }
    var rel = e.target.closest(".related a"); if(rel){ e.preventDefault(); history.replaceState(null, "", rel.getAttribute("href")); render(); return; }
    var tab = e.target.closest("[data-tab],[data-goto]"); if(tab){ showTab(tab.dataset.tab || tab.dataset.goto); return; }
    var b = e.target.closest("[data-act]"); if(!b) return;
    var t = dlg._t, act = b.dataset.act;
    if(act === "close") closeDetail();
    if(act === "copy") copy(t.tender_id, "Tender ID copied");
    if(act === "cal") downloadIcs(t);
    if(act === "body"){ e.preventDefault(); inTender = false; suppressClose = true; dlg.close(); go(b.getAttribute("href"), true); }
    if(act === "save"){ toggleSave(t.id); b.innerHTML = icon("heart") + (saved.has(t.id) ? "Saved" : "Save tender"); }
    if(act === "follow"){ toggleFollow(t.body_name); b.innerHTML = icon("star") + (follows.has(t.body_name) ? "Following panchayat" : "Follow panchayat"); }
  });
  function showTab(name){
    dlg.querySelectorAll("[data-tab]").forEach(function(b){ b.setAttribute("aria-selected", b.dataset.tab === name); });
    dlg.querySelectorAll("[data-pane]").forEach(function(p){ p.hidden = p.dataset.pane !== name; });
  }
  function summary(t){
    return t.title + "\n" + t.body_name + (t.district ? ", " + t.district : "") + (t.value != null ? "\nValue: " + inrFull(t.value) : "") + (t.emd != null ? " · EMD: " + inrFull(t.emd) : "") +
      "\nCloses: " + (t.closing_time || t.closing_date) + "\nTender ID: " + t.tender_id + "\nKerala e-Tenders: https://etenders.kerala.gov.in";
  }
  function download(name, text, type){
    var a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], {type: type + ";charset=utf-8"}));
    a.download = name; document.body.appendChild(a); a.click(); setTimeout(function(){ URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function downloadIcs(t){
    var ms = t._close; if(ms == null){ toast("No closing time available"); return; }
    var ist = new Date(ms + 5.5 * 36e5), p = function(n){ return String(n).padStart(2, "0"); };
    var start = ist.getUTCFullYear() + p(ist.getUTCMonth() + 1) + p(ist.getUTCDate()) + "T" + p(ist.getUTCHours()) + p(ist.getUTCMinutes()) + "00";
    var e = function(s){ return String(s || "").replace(/[\\,;]/g, "\\$&").replace(/\n/g, "\\n"); };
    download("tender-" + t.tender_id + ".ics", ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Kerala Panchayat Tenders//EN", "BEGIN:VEVENT", "UID:" + t.tender_id + "@kerala-panchayat-tenders",
      "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z", "DTSTART;TZID=Asia/Kolkata:" + start, "DURATION:PT30M", "SUMMARY:" + e("Tender closes: " + t.title.slice(0, 80)),
      "DESCRIPTION:" + e(summary(t)), "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY", "DESCRIPTION:Tender closes tomorrow", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n"), "text/calendar");
  }

  var aiCache = {};
  function getJson(p){ return fetch(p, {cache: "no-store"}).then(function(r){ if(!r.ok) throw new Error(r.status); return r.json(); }); }
  function loadAI(t){
    var done = function(a){ if(dlg._t !== t) return; renderAI(t, a); renderCalc(t, a); };
    if(aiCache[t.tender_id] !== undefined){ done(aiCache[t.tender_id]); return; }
    if(!t._ai){ aiCache[t.tender_id] = null; done(null); return; }
    getJson("data/ai/" + encodeURIComponent(t.tender_id) + ".json").then(function(a){ aiCache[t.tender_id] = a; done(a); }).catch(function(){ aiCache[t.tender_id] = null; done(null); });
  }
  function meter(label, score, level, invert){
    var tone = invert ? (score >= 7 ? "bad" : score >= 4 ? "mid" : "good") : (score >= 7 ? "good" : score >= 4 ? "mid" : "bad");
    return '<div class="meter"><div class="mtop"><span>' + label + "</span><b>" + esc(level) + " · " + score + '/10</b></div><div class="mbar"><div class="mfill ' + tone + '" style="width:' + Math.max(0, Math.min(10, score)) * 10 + '%"></div></div></div>';
  }
  function renderAI(t, a){
    var box = $("aiBox"); if(!box) return;
    if(!a){ box.innerHTML = '<div class="muted">' + icon("sparkle") + " AI analysis for this tender isn’t ready yet. New tenders are analysed every morning, panchayat works with a known value first. You can still estimate the cost yourself in the <button type=\"button\" class=\"linkbtn\" data-goto=\"calc\">cost calculator</button>.</div>"; return; }
    box.innerHTML = '<p class="aisum">' + esc(a.summary) + '</p><div class="meters">' + meter("Profit chance", a.profit.score, a.profit.chance, false) + meter("Difficulty", a.difficulty.score, a.difficulty.level, true) + "</div>" +
      '<div class="aikpis"><div><b>' + esc(a.profit.margin_pct_low) + "–" + esc(a.profit.margin_pct_high) + "%</b><span>Likely net margin</span></div><div><b>" + esc(a.competition.level) + "</b><span>Competition</span></div><div><b>" + esc(a.confidence) + "</b><span>AI confidence</span></div></div>" +
      '<p class="muted" style="margin-top:8px">' + esc(a.competition.reason) + "</p>" +
      list("Why this profit rating", a.profit.reasons, "trend") + list("What makes it easy or hard", a.difficulty.reasons, "sliders") + list("You will need", a.requirements, "briefcase") + list("Risks", a.risks, "flame") + list("Tips", a.tips, "sparkle") +
      '<p class="disclaimer">AI estimate from the public tender listing only (title, value, EMD, period, location). The tender documents and BOQ were not read. Check the official documents before bidding. ' + (a.model ? "Model: " + esc(a.model) + ". " : "") + "</p>" +
      '<button type="button" class="pillbtn primary" data-goto="calc">' + icon("calc") + "Open cost calculator</button>";
  }
  var CATS = ["Material", "Labour", "Machinery", "Transport", "Overheads"];
  function calcFromAI(a){
    var ce = a && a.cost_estimate;
    return {items: ce ? ce.items.map(function(i){ return {item: i.item, cat: i.category, qty: i.quantity, unit: i.unit, rate: i.rate_inr}; }) : [], cont: ce ? ce.contingency_pct : 5, quotePct: 0, quoteAmt: null};
  }
  function renderCalc(t, a){
    var box = $("calcBox"); if(!box) return;
    var key = "calc:" + t.tender_id, st = lsGet(key, null) || calcFromAI(a), save = function(){ lsSet(key, st); };
    function rowHtml(r, i){
      return '<tr data-i="' + i + '"><td><input data-f="item" value="' + esc(r.item) + '" aria-label="Item"><select data-f="cat" aria-label="Category">' + CATS.map(function(c){ return "<option" + (c === r.cat ? " selected" : "") + ">" + c + "</option>"; }).join("") + "</select></td>" +
        '<td><input data-f="qty" type="number" inputmode="decimal" step="any" value="' + esc(r.qty) + '" aria-label="Quantity"><input data-f="unit" value="' + esc(r.unit) + '" aria-label="Unit" class="unit"></td>' +
        '<td><input data-f="rate" type="number" inputmode="decimal" step="any" value="' + esc(r.rate) + '" aria-label="Rate in rupees"></td><td class="amt" data-amt="' + i + '"></td><td><button type="button" class="rm" data-rm="' + i + '" aria-label="Remove item">' + icon("x") + "</button></td></tr>";
    }
    box.innerHTML = (a && a.cost_estimate && a.cost_estimate.assumptions.length ? '<details class="assume"><summary>AI assumptions behind these quantities</summary><ul>' + a.cost_estimate.assumptions.map(function(x){ return "<li>" + esc(x) + "</li>"; }).join("") + "</ul></details>" : "") +
      (!st.items.length ? '<p class="muted">No AI estimate yet. Add your own items: materials, labour, machinery, transport, overheads.</p>' : "") +
      '<div class="calcwrap"><table class="calc"><thead><tr><th>Item</th><th>Qty / unit</th><th>Rate ₹</th><th class="r">Amount</th><th></th></tr></thead><tbody>' + st.items.map(rowHtml).join("") + "</tbody></table></div>" +
      '<div class="calcacts"><button type="button" class="pillbtn" data-calc="add">+ Add item</button>' + (a && a.cost_estimate ? '<button type="button" class="pillbtn" data-calc="reset">Reset to AI estimate</button>' : "") + "</div>" +
      '<div class="calcin"><label>Contingency %<input id="cCont" type="number" inputmode="decimal" step="any" value="' + esc(st.cont) + '"></label>' +
      (t.value != null ? '<label>Your quote vs estimate (%)<input id="cQuote" type="number" inputmode="decimal" step="any" value="' + esc(st.quotePct) + '" title="Negative = below estimate, e.g. -5"></label>' : '<label>Your quote amount ₹<input id="cQuoteAmt" type="number" inputmode="decimal" step="any" value="' + esc(st.quoteAmt == null ? "" : st.quoteAmt) + '"></label>') +
      '</div><div id="calcSum"></div>';
    function recalc(){
      var direct = 0, byCat = {};
      st.items.forEach(function(r, i){ var amt = (+r.qty || 0) * (+r.rate || 0); direct += amt; byCat[r.cat] = (byCat[r.cat] || 0) + amt; var c = box.querySelector('[data-amt="' + i + '"]'); if(c) c.textContent = inrFull(amt); });
      var cont = direct * (+st.cont || 0) / 100, cost = direct + cont, quote = t.value != null ? t.value * (1 + (+st.quotePct || 0) / 100) : (+st.quoteAmt || 0);
      var profit = quote - cost, margin = quote ? profit / quote * 100 : 0;
      $("calcSum").innerHTML = '<div class="ccats">' + CATS.filter(function(c){ return byCat[c]; }).map(function(c){ return "<span>" + c + " <b>" + inr(byCat[c]) + "</b></span>"; }).join("") + "</div>" +
        '<div class="sumgrid"><div><span>Direct cost</span><b>' + inrFull(direct) + "</b></div><div><span>Contingency</span><b>" + inrFull(cont) + "</b></div><div><span>Total cost</span><b>" + inrFull(cost) + "</b></div><div><span>Your quote</span><b>" + (quote ? inrFull(quote) : "—") + "</b></div></div>" +
        (quote ? '<div class="pbar" title="Cost vs quote"><div class="pcost" style="width:' + Math.min(100, cost / quote * 100).toFixed(1) + '%"></div></div><div class="profit ' + (profit >= 0 ? "pos" : "neg") + '"><span>' + (profit >= 0 ? "Estimated profit" : "Estimated loss") + "</span><b>" + inrFull(Math.abs(profit)) + " (" + margin.toFixed(1) + "%)</b></div>" : "") +
        '<p class="disclaimer">Edit any quantity or rate to match your own suppliers and site. Your changes are saved in this browser. GST, royalty and statutory deductions depend on the tender conditions and are not included unless you add them as items.</p>';
    }
    box.oninput = function(e){
      var tr = e.target.closest("tr[data-i]"), f = e.target.dataset.f;
      if(tr && f){ var r = st.items[+tr.dataset.i]; r[f] = (f === "qty" || f === "rate") ? (e.target.value === "" ? "" : +e.target.value) : e.target.value; }
      if(e.target.id === "cCont") st.cont = +e.target.value;
      if(e.target.id === "cQuote") st.quotePct = +e.target.value;
      if(e.target.id === "cQuoteAmt") st.quoteAmt = +e.target.value;
      save(); recalc();
    };
    box.onclick = function(e){
      var rm = e.target.closest("[data-rm]"), act = e.target.closest("[data-calc]");
      if(rm){ st.items.splice(+rm.dataset.rm, 1); save(); renderCalc(t, a); }
      else if(act && act.dataset.calc === "add"){ st.items.push({item: "", cat: "Material", qty: 1, unit: "nos", rate: 0}); save(); renderCalc(t, a); var ins = box.querySelectorAll('[data-f="item"]'); if(ins.length) ins[ins.length - 1].focus(); }
      else if(act && act.dataset.calc === "reset"){ try{ localStorage.removeItem(key); }catch(err){} renderCalc(t, a); toast("Reset to AI estimate"); }
    };
    recalc();
  }

  // ===================================================================
  // Save / follow / CSV / share
  // ===================================================================
  function toggleSave(id, btn){
    if(saved.has(id)) saved.delete(id); else saved.add(id);
    lsSet("saved", Array.from(saved));
    toast(saved.has(id) ? "Saved to your list ♥" : "Removed from saved");
    document.querySelectorAll('[data-fav="' + CSS.escape(id) + '"]').forEach(function(b){ b.setAttribute("aria-pressed", saved.has(id)); b.classList.remove("popping"); void b.offsetWidth; b.classList.add("popping"); });
    renderNav();
    if(R.saved && R.view === "browse") updateBrowse(true);
  }
  function toggleFollow(name){
    if(follows.has(name)) follows.delete(name); else follows.add(name);
    lsSet("follows", Array.from(follows));
    toast(follows.has(name) ? "Following " + name : "Unfollowed " + name);
    var f = follows.has(name);
    view.querySelectorAll('[data-follow="' + CSS.escape(name) + '"]').forEach(function(b){
      if(b.classList.contains("fav")){ b.setAttribute("aria-pressed", f); b.classList.remove("popping"); void b.offsetWidth; b.classList.add("popping"); }
      else { b.className = "pillbtn" + (f ? " primary" : ""); b.innerHTML = icon("heart") + (f ? "Following" : "Follow"); }
    });
  }
  function csv(){
    var cols = ["tender_id", "title", "grp", "kind", "body_name", "district", "body_type", "category", "value", "emd", "tender_fee", "published_date", "closing_time", "opening_date", "location", "pincode", "tender_ref", "organisation"];
    var q = function(v){ v = v == null ? "" : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    var lines = [cols.concat(["my_note"]).join(",")].concat(B.list.map(function(t){ return cols.map(function(c){ return q(c === "grp" ? G[grpOf(t)].name : t[c]); }).concat([q(notes[t.id])]).join(","); }));
    download("kerala-panchayat-tenders-" + (meta.today || "") + ".csv", "﻿" + lines.join("\n"), "text/csv");
    toast(num(B.list.length) + " tenders downloaded");
  }

  // ===================================================================
  // Global events
  // ===================================================================
  document.addEventListener("click", function(e){
    var fav = e.target.closest("[data-fav]"); if(fav){ e.preventDefault(); e.stopPropagation(); toggleSave(fav.dataset.fav); return; }
    var fol = e.target.closest("[data-follow]"); if(fol){ e.preventDefault(); e.stopPropagation(); toggleFollow(fol.dataset.follow); return; }
    var railBtn = e.target.closest("[data-rail]"); if(railBtn){ var r = $(railBtn.dataset.rail); r.scrollBy({left: +railBtn.dataset.dir * r.clientWidth * .85, behavior: "smooth"}); return; }
    var c = e.target.closest(".pcard[data-tid]"); if(c && !e.target.closest("a")){ openTender(c.dataset.tid); return; }
    if(e.target.closest("[data-share]")){ copy(location.href, "Link copied"); return; }
    if(e.target.closest("[data-csv]")){ csv(); return; }
    if(e.target.closest("[data-sheet]")){ document.body.classList.add("sheet-open"); return; }
    if(e.target.closest("[data-done]") || e.target.id === "sheetBack"){ document.body.classList.remove("sheet-open"); return; }
    if(e.target.closest("[data-clear]")){ var keepSort = F.sort, keepQ = R.search ? F.q : ""; F = emptyF(); F.sort = keepSort; F.q = keepQ; renderFacets(); updateBrowse(true); return; }
    var rm = e.target.closest("[data-rm]");
    if(rm && R.view === "browse" && !rm.closest("#calcBox")){
      var k = rm.dataset.rm, v = rm.dataset.v;
      if(Array.isArray(F[k])) F[k] = F[k].filter(function(x){ return x !== v; }); else F[k] = "";
      updateBrowse(true); return;
    }
    var more = e.target.closest("[data-more]"); if(more){ more.parentNode.dataset.all = "1"; more.parentNode.querySelectorAll("[data-extra]").forEach(function(x){ x.hidden = false; }); more.remove(); }
  });
  document.addEventListener("keydown", function(e){
    var c = e.target.closest && e.target.closest(".pcard[data-tid]");
    if(c && e.key === "Enter" && !e.target.closest("button")){ openTender(c.dataset.tid); return; }
    if(e.key === "Escape") document.body.classList.remove("sheet-open");
    if(e.key === "/" && !e.target.closest("input,textarea,select") && !dlg.open && !document.body.classList.contains("locked")){ e.preventDefault(); $("topSearch").focus(); }
  });
  document.addEventListener("change", function(e){ if(e.target.dataset && e.target.dataset.facet) onFacetChange(e.target); });
  document.addEventListener("input", function(e){
    if(!e.target.hasAttribute || !e.target.hasAttribute("data-fsearch")) return;
    var q = e.target.value.trim().toLowerCase(), det = e.target.closest(".facet"), shown = 0;
    det.querySelectorAll(".opt").forEach(function(o){
      var match = !q || o.textContent.toLowerCase().indexOf(q) >= 0, checked = o.querySelector("input").checked;
      o.hidden = q ? !(match && shown < 60) : (o.hasAttribute("data-extra") && !checked && !det.dataset.all);
      if(q && match) shown++;
    });
    var more = det.querySelector("[data-more]"); if(more) more.hidden = !!q;
  });
  document.addEventListener("toggle", function(e){ var d = e.target; if(d.classList && d.classList.contains("facet")){ facetOpenState[d.dataset.key] = d.open; lsSet("facetOpen", facetOpenState); } }, true);
  function openTender(tid){ location.hash = "#/t/" + encodeURIComponent(tid); }

  // ===================================================================
  // Navigation chrome
  // ===================================================================
  function renderNav(){
    var cur = R.view === "browse" ? (R.saved ? "saved" : R.following ? "following" : R.pb ? "panchayats" : "browse") : R.view;
    var items = [["#/", "home", "Home", "home"], ["#/categories", "grid", "Categories", "categories"], ["#/panchayats", "landmark", "Panchayats", "panchayats"], ["#/insights", "chart", "Insights", "insights"], ["#/saved", "heart", "Saved", "saved"]];
    $("nav").innerHTML = items.map(function(i){ return '<a href="' + i[0] + '"' + (cur === i[3] || (i[3] === "categories" && cur === "browse") ? ' class="on"' : "") + ">" + icon(i[1]) + i[2] + (i[3] === "saved" && saved.size ? ' <span class="badge">' + saved.size + "</span>" : "") + "</a>"; }).join("");
    var bitems = [["#/", "home", "Home", "home"], ["#/categories", "grid", "Categories", "categories"], ["#/panchayats", "landmark", "Panchayats", "panchayats"], ["#/search", "search", "Search", "search"], ["#/saved", "heart", "Saved", "saved"]];
    $("bnav").innerHTML = bitems.map(function(i){
      var on = cur === i[3] || (i[3] === "categories" && cur === "browse" && !R.search) || (i[3] === "search" && R.search);
      return '<a href="' + i[0] + '"' + (on ? ' class="on"' : "") + (i[3] === "search" ? " data-focus-search" : "") + ">" + icon(i[1]) + i[2] + (i[3] === "saved" && saved.size ? "<i>" + saved.size + "</i>" : "") + "</a>";
    }).join("");
  }
  $("bnav").addEventListener("click", function(e){
    var a = e.target.closest("[data-focus-search]"); if(!a) return;
    e.preventDefault(); window.scrollTo({top: 0, behavior: "smooth"}); setTimeout(function(){ $("topSearch").focus(); }, 200);
  });
  $("logoMark").innerHTML = icon("landmark");
  $("topSearchIcon").outerHTML = icon("search");
  function themeIcon(){ var cur = document.documentElement.getAttribute("data-theme"); var dark = cur ? cur === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; $("themeBtn").innerHTML = icon(dark ? "sun" : "moon"); }
  var theme = lsGet("theme", null); if(theme) document.documentElement.setAttribute("data-theme", theme); themeIcon();
  $("themeBtn").onclick = function(){
    var cur = document.documentElement.getAttribute("data-theme"), dark = cur ? cur === "dark" : matchMedia("(prefers-color-scheme: dark)").matches, next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next); lsSet("theme", next); themeIcon();
  };
  attachSuggest(document.querySelector(".topbar [data-suggest]"));
  $("wCall").insertAdjacentHTML("afterbegin", icon("phone")); $("wWa").insertAdjacentHTML("afterbegin", icon("chat")); $("wMail").insertAdjacentHTML("afterbegin", icon("mail"));
  $("premTitle").insertAdjacentHTML("afterbegin", icon("crown"));

  // ===================================================================
  // Render dispatcher
  // ===================================================================
  var cur = "", inTender = false, suppressClose = false;
  function render(){
    if(!loaded) return;
    NOW = Date.now();
    var parsed = parseHash();
    document.body.classList.remove("sheet-open");
    if(parsed.r.view === "tender"){
      openedFromApp = !!cur;
      if(!cur){ R = {view: "home"}; F = emptyF(); renderView(false); cur = "#/"; }
      var t = byId["t:" + parsed.r.tid];
      if(t){ inTender = true; openDetail(t); }
      else { toast("That tender has closed or was not found"); go(cur, true); }
      renderNav();
      return;
    }
    inTender = false;
    if(dlg.open){ suppressClose = true; dlg.close(); }
    var h = location.hash || "#/";
    if(h === cur){ renderNav(); return; }
    var sameView = !!cur && routePath(R) === routePath(parsed.r);
    R = parsed.r; F = parsed.f;
    cur = h;
    renderView(sameView);
    renderNav();
    if(!sameView) window.scrollTo(0, 0);
    var ts = $("topSearch"); if(document.activeElement !== ts) ts.value = R.search ? F.q : "";
  }
  function renderView(sameView){
    if(R.view === "browse"){ if(sameView && $("bGrid")) updateBrowse(false); else renderBrowse(); }
    else if(R.view === "categories") renderCategories();
    else if(R.view === "panchayats") renderPanchayats();
    else if(R.view === "insights") renderInsights();
    else renderHome();
    var titles = {home: "Kerala Panchayat Tenders", categories: "All categories", panchayats: "Panchayats", insights: "Insights", browse: browseTitle().t};
    document.title = (R.view === "home" ? "" : (titles[R.view] || "") + " · ") + "Kerala Panchayat Tenders";
  }
  window.addEventListener("hashchange", render);

  // ===================================================================
  // Install (PWA) + offline
  // ===================================================================
  var installEvt = null, standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var ib = $("installBtn"); ib.innerHTML = icon("phoneapp") + '<span class="install-txt">Install app</span>';
  window.addEventListener("beforeinstallprompt", function(e){ e.preventDefault(); installEvt = e; if(!standalone) ib.hidden = false; });
  if(isIOS && !standalone) ib.hidden = false;
  ib.onclick = function(){ if(installEvt){ installEvt.prompt(); installEvt.userChoice.then(function(){ installEvt = null; ib.hidden = true; }); } else toast("On iPhone: tap Share, then “Add to Home Screen”"); };
  window.addEventListener("appinstalled", function(){ ib.hidden = true; toast("App installed"); });
  if("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(function(){});

  // ===================================================================
  // Free trial + login
  // AUTH_API: URL of the Cloudflare Worker in worker/ (see README). When set,
  // the trial clock is kept per IP on the server and logins are checked there.
  // Until then a browser-only fallback is used (local timer + demo hash).
  // ===================================================================
  var AUTH_API = "";
  var TRIAL_SECONDS = 180;
  var AUTH_HASH = "135f33f7ae7639f880ec63e5741e7836def68a873a0d7fcec86f986f7c561027";
  var gate = $("gate"), acct = $("acct"), token = lsGet("token", "");
  var authed = AUTH_API ? false : lsGet("auth", "") === AUTH_HASH;
  var used = +lsGet("trialUsed", 0) || 0, serverLeft = null, serverAt = 0;
  function mmss(s){ s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0"); }
  function secondsLeft(){ var local = TRIAL_SECONDS - used; return serverLeft == null ? local : Math.min(local, serverLeft - (Date.now() - serverAt) / 1000); }
  function renderAcct(){
    acct.hidden = false;
    if(authed){
      acct.className = "trial";
      acct.innerHTML = "<span>" + icon("user") + ' <em class="who" style="font-style:normal;font-weight:700">' + esc(lsGet("authUser", "member")) + '</em></span><button type="button" id="logoutBtn">Log out</button>';
      $("logoutBtn").onclick = function(){ authed = false; token = ""; lsSet("token", ""); lsSet("auth", ""); toast("Logged out"); if(AUTH_API) checkServer(); else if(secondsLeft() <= 0) lock(); else renderAcct(); };
    } else {
      var left = secondsLeft();
      acct.className = "trial" + (left <= 60 ? " low" : "");
      acct.innerHTML = "<span>" + icon("clock") + " <b>" + mmss(left) + '</b></span><button type="button" id="loginBtn">Log in</button>';
      $("loginBtn").onclick = function(){ openGate(false); };
    }
  }
  function openGate(forced){
    gate.hidden = false; $("gateClose").hidden = forced;
    $("gateTitle").textContent = forced ? "Free trial ended" : "Log in";
    $("gateMsg").textContent = forced ? "Your 3-minute free trial has ended. Log in to keep using Kerala Panchayat Tenders." : "Log in for unlimited access.";
    $("lgErr").textContent = ""; setTimeout(function(){ $("lgUser").focus(); }, 50);
  }
  function lock(){ if(dlg.open){ dlg.close(); } document.body.classList.remove("sheet-open"); document.body.classList.add("locked"); openGate(true); renderAcct(); }
  function unlock(){ document.body.classList.remove("locked"); gate.hidden = true; renderAcct(); }
  function welcome(user){ authed = true; lsSet("authUser", user); $("lgPass").value = ""; unlock(); toast("Welcome, " + user + "!"); }
  function checkServer(){
    return fetch(AUTH_API + "/status", {headers: token ? {Authorization: "Bearer " + token} : {}, cache: "no-store"}).then(function(r){ return r.json(); }).then(function(d){
      if(d.authed){ authed = true; lsSet("authUser", d.user); unlock(); return; }
      authed = false; token = ""; lsSet("token", "");
      if(typeof d.limit === "number") TRIAL_SECONDS = d.limit;
      serverLeft = d.remaining; serverAt = Date.now();
      if(secondsLeft() <= 0) lock(); else renderAcct();
    }).catch(function(){ serverLeft = null; renderAcct(); });
  }
  $("gateClose").innerHTML = icon("x");
  $("gateClose").onclick = function(){ gate.hidden = true; };
  $("loginForm").addEventListener("submit", function(e){
    e.preventDefault();
    var user = $("lgUser").value.trim().toLowerCase(), pass = $("lgPass").value;
    $("lgErr").textContent = "";
    if(AUTH_API){
      fetch(AUTH_API + "/login", {method: "POST", headers: {"Content-Type": "application/json"}, body: JSON.stringify({username: user, password: pass})})
        .then(function(r){ return r.json().then(function(d){ return [r.ok, d]; }); })
        .then(function(res){ if(res[0] && res[1].token){ token = res[1].token; lsSet("token", token); welcome(res[1].user); } else { $("lgErr").textContent = res[1].error || "Wrong username or password."; $("lgPass").select(); } })
        .catch(function(){ $("lgErr").textContent = "Could not reach the login server. Check your internet and try again."; });
      return;
    }
    if(!(window.crypto && crypto.subtle)){ $("lgErr").textContent = "Login needs a secure (https) connection."; return; }
    crypto.subtle.digest("SHA-256", new TextEncoder().encode("kpt-v1|" + user + "|" + pass)).then(function(buf){
      var hex = Array.from(new Uint8Array(buf)).map(function(b){ return b.toString(16).padStart(2, "0"); }).join("");
      if(hex === AUTH_HASH){ lsSet("auth", hex); welcome(user); } else { $("lgErr").textContent = "Wrong username or password."; $("lgPass").select(); }
    });
  });
  setInterval(function(){
    if(authed || document.visibilityState !== "visible") return;
    used++;
    if(used % 5 === 0 || used >= TRIAL_SECONDS) lsSet("trialUsed", used);
    if(secondsLeft() <= 0){ if(!document.body.classList.contains("locked")) lock(); } else renderAcct();
  }, 1000);
  renderAcct();
  if(AUTH_API) checkServer(); else if(!authed && secondsLeft() <= 0) lock();

  // ===================================================================
  // Load data
  // ===================================================================
  view.innerHTML = '<div class="wrap" style="padding-top:28px"><div class="grid">' + skeletons(8) + "</div></div>";
  Promise.all([
    getJson("data/tenders.json").catch(function(){ return []; }),
    getJson("data/meta.json").catch(function(){ return {}; }),
    getJson("data/new_today.json").catch(function(){ return []; }),
    getJson("data/bodies.json").catch(function(){ return {}; }),
    getJson("data/ai_index.json").catch(function(){ return {}; })
  ]).then(function(res){
    all = res[0] || []; meta = res[1] || {}; newIds = new Set((res[2] || []).map(function(t){ return t.id; })); aiIdx = res[4] || {};
    if(!meta.today) meta.today = new Date().toISOString().slice(0, 10);
    all.forEach(function(t){
      t.body_name = t.body_name || t.organisation || "";
      t.kind = t.kind || "Other works";
      t._close = closingMs(t);
      t._ai = aiIdx[t.tender_id] || null; if(t._ai) aiCount++;
      t._hay = [t.title, t.body_name, t.organisation, t.tender_id, t.tender_ref, t.district, t.location, t.category, t.pincode, t.kind, (G[t.grp] || {}).name].join(" ").toLowerCase();
      byId["t:" + t.tender_id] = t;
      var b = bodies[t.body_name] || (bodies[t.body_name] = {count: 0, district: t.district, type: t.body_type});
      if(isOpen(t)) b.count++;
    });
    var reg = res[3] || {};
    Object.keys(reg).forEach(function(name){ var r = reg[name], b = bodies[name] || (bodies[name] = {count: 0, district: r.district, type: r.type}); b.firstSeen = r.first_seen; b.lastSeen = r.last_seen; b.seen = r.tenders_seen; if(!b.district) b.district = r.district; });
    open = all.filter(isOpen);
    var v = lsGet("visit", null);
    if(!v) lsSet("visit", {today: meta.today, base: null});
    else if(v.today !== meta.today){ visitBase = v.today; lsSet("visit", {today: meta.today, base: v.today}); }
    else visitBase = v.base;
    computeStats();
    loaded = true;
    render();
  });
})();
