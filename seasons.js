/* Seasonal skins for the level-select MAP screen (the hub).
   All art is vector canvas ops, matching the sprites.js house style.
   IIFE attaches window.DINOSeasons — classic <script>, no ES modules,
   file:// compatible.

   This is normal browser code, so new Date() is fine; current(now)
   accepts an optional ms timestamp so callers/tests can pin the date.

   API:
     DINOSeasons.current(now)  -> 'spring'|'summer'|'autumn'|'winter'|'holiday'
     DINOSeasons.get(id)       -> { id, name, cssClass, accent, overlay }
                                   overlay: 'petals'|'leaves'|'snow'|'sun'|'none'
     DINOSeasons.drawOverlay(ctx, w, h, id, t)
                                  light SCREEN-space ambient effect for the map.

   --- Suggested CSS for the accent classes (add to style.css) ---
   #levelSelect picks up one of these via game.js showLevelSelect():
       el.className = DINOSeasons.get(DINOSeasons.current()).cssClass;
   They tint the hub accent (button glow, node ring) without theming the
   per-level biomes. Keep it subtle.

     .season-spring  { --season-accent: #f7a8c8; }
     .season-summer  { --season-accent: #ffce4d; }
     .season-autumn  { --season-accent: #e0792c; }
     .season-winter  { --season-accent: #8fc7e8; }
     .season-holiday { --season-accent: #e8534d; }

     #levelSelect .big-btn,
     #levelSelect .node.unlocked {
       box-shadow: 0 0 0 3px var(--season-accent, transparent);
       transition: box-shadow var(--duration-normal, 300ms) ease;
     }
   --------------------------------------------------------------- */
(function () {
  "use strict";

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.closePath();
  }

  var TAU = Math.PI * 2;

  /* ---------- season table ----------
     get(id) returns the hub accent + which ambient overlay to draw.
     accent doubles as the --season-accent CSS hex (see comment above). */
  var SEASONS = {
    spring: {
      id: "spring",
      name: "Spring",
      cssClass: "season-spring",
      accent: "#f7a8c8",
      overlay: "petals"
    },
    summer: {
      id: "summer",
      name: "Summer",
      cssClass: "season-summer",
      accent: "#ffce4d",
      overlay: "sun"
    },
    autumn: {
      id: "autumn",
      name: "Autumn",
      cssClass: "season-autumn",
      accent: "#e0792c",
      overlay: "leaves"
    },
    winter: {
      id: "winter",
      name: "Winter",
      cssClass: "season-winter",
      accent: "#8fc7e8",
      overlay: "snow"
    },
    holiday: {
      id: "holiday",
      name: "Holiday",
      cssClass: "season-holiday",
      accent: "#e8534d",
      overlay: "snow"
    }
  };

  var IDS = ["spring", "summer", "autumn", "winter", "holiday"];

  function get(id) {
    return SEASONS[id] || SEASONS.spring;
  }

  /* ---------- which season is it ----------
     Northern-hemisphere month buckets; late December (>=20th) flips to
     a festive holiday skin. now is optional ms, defaulting to Date.now(). */
  function current(now) {
    var d = new Date(typeof now === "number" ? now : Date.now());
    var m = d.getMonth();   // 0..11
    var day = d.getDate();  // 1..31
    if (m === 11 && day >= 20) return "holiday";
    if (m <= 1 || m === 11) return "winter"; // Dec, Jan, Feb
    if (m <= 4) return "spring";             // Mar, Apr, May
    if (m <= 7) return "summer";             // Jun, Jul, Aug
    return "autumn";                         // Sep, Oct, Nov
  }

  /* ---------- deterministic placement ----------
     Like themes.js star hashing: positions derive from the particle
     index so they stay stable frame to frame; only the drift/fall is
     driven by t. No per-frame allocation, hard particle cap. */
  function frac(n) {
    return n - Math.floor(n);
  }

  function hashX(i, w) {
    return frac(Math.sin(i * 12.9898) * 43758.5453) * w;
  }

  function hashSeed(i) {
    return frac(Math.sin(i * 78.233) * 12543.123);
  }

  // Kept small and subtle — this is ambient hub dressing, not weather.
  var PARTICLE_COUNT = 16;

  var PETAL_COLORS = ["#ffc7dd", "#ffb3d1", "#ffd9e8", "#f7a8c8"];
  var LEAF_COLORS = ["#e8843c", "#d4582a", "#f0b429", "#c0863a", "#e0a030"];

  // Drifting petals: slow vertical fall with a horizontal sway, soft ellipses.
  function drawPetals(ctx, w, h, t) {
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var seed = hashSeed(i);
      var speed = 14 + seed * 18;
      var y = frac((t * speed) / h + seed) * (h + 40) - 20;
      var sway = Math.sin(t * (0.4 + seed * 0.4) + i) * (14 + seed * 16);
      var x = hashX(i, w) + sway;
      var r = 4 + seed * 4;
      ctx.globalAlpha = 0.5 + seed * 0.25;
      ctx.fillStyle = PETAL_COLORS[i % PETAL_COLORS.length];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * (0.3 + seed * 0.5) + i);
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.62, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  // Tumbling leaves: a little faster, with a center vein, warmer palette.
  function drawLeaves(ctx, w, h, t) {
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var seed = hashSeed(i);
      var speed = 18 + seed * 22;
      var y = frac((t * speed) / h + seed) * (h + 50) - 25;
      var sway = Math.sin(t * (0.35 + seed * 0.35) + i) * (18 + seed * 18);
      var x = hashX(i, w) + sway;
      var r = 5 + seed * 5;
      ctx.globalAlpha = 0.5 + seed * 0.25;
      ctx.fillStyle = LEAF_COLORS[i % LEAF_COLORS.length];
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(t * (0.6 + seed * 0.9) + i);
      ctx.beginPath();
      ctx.ellipse(0, 0, r, r * 0.5, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(90,50,20,0.35)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(r, 0);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Drifting snow: small soft flakes, gentle sway, slow fall.
  function drawSnow(ctx, w, h, t) {
    ctx.fillStyle = "#ffffff";
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var seed = hashSeed(i);
      var speed = 12 + seed * 16;
      var y = frac((t * speed) / h + seed) * (h + 30) - 15;
      var sway = Math.sin(t * (0.5 + seed * 0.5) + i) * (10 + seed * 14);
      var x = hashX(i, w) + sway;
      var r = 1.6 + seed * 2.4;
      ctx.globalAlpha = 0.55 + seed * 0.3;
      circle(ctx, x, y, r);
      ctx.fill();
    }
  }

  // Summer sun: a single soft corner glow with a few slow drifting motes.
  // No falling particles — just a warm shimmer so the hub feels bright.
  function drawSun(ctx, w, h, t) {
    var cx = w * 0.82, cy = h * 0.16, r = Math.min(w, h) * 0.5;
    var glow = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
    glow.addColorStop(0, "rgba(255,221,120,0.28)");
    glow.addColorStop(1, "rgba(255,221,120,0)");
    ctx.globalAlpha = 0.8 + Math.sin(t * 0.6) * 0.1;
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#fff3c4";
    var motes = Math.min(8, PARTICLE_COUNT);
    for (var i = 0; i < motes; i++) {
      var seed = hashSeed(i);
      var mx = hashX(i, w) + Math.sin(t * (0.2 + seed * 0.3) + i) * 24;
      var my = frac(seed + i * 0.13) * h + Math.cos(t * (0.18 + seed * 0.25) + i) * 18;
      ctx.globalAlpha = 0.2 + 0.2 * (0.5 + 0.5 * Math.sin(t * (0.7 + seed) + i));
      circle(ctx, mx, my, 1.4 + seed * 1.8);
      ctx.fill();
    }
  }

  /* ---------- public overlay painter ----------
     Screen space (0..w, 0..h). Cheap, subtle ambient dressing for the
     level-select map. Safe to call every frame; restores ctx state. */
  function drawOverlay(ctx, w, h, id, t) {
    var s = get(id);
    if (s.overlay === "none") return;
    ctx.save();
    if (s.overlay === "petals") drawPetals(ctx, w, h, t);
    else if (s.overlay === "leaves") drawLeaves(ctx, w, h, t);
    else if (s.overlay === "snow") drawSnow(ctx, w, h, t);
    else if (s.overlay === "sun") drawSun(ctx, w, h, t);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  window.DINOSeasons = {
    ids: IDS,
    current: current,
    get: get,
    drawOverlay: drawOverlay
  };
})();
