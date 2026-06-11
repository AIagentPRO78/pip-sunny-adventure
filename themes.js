/* Biome + time-of-day theming for the canvas game.
   All art is vector canvas ops, matching the sprites.js house style.
   IIFE attaches window.DINOThemes — classic <script>, no ES modules,
   file:// compatible. */
(function () {
  "use strict";

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.closePath();
  }

  /* ---------- theme table ----------
     get(id) returns the palette + weather + label for render() to use.
     hillFar / hillMid replace the hardcoded '#c7ecaf' / '#a6e38c'. */
  var THEMES = {
    meadow: {
      skyTop: "#bdeaff",
      skyMid: "#dff3ff",
      skyBot: "#fef6d8",
      hillFar: "#c7ecaf",
      hillMid: "#a6e38c",
      weather: "petals",
      label: "Sunny Meadow"
    },
    beach: {
      skyTop: "#ffd29b",
      skyMid: "#ffb38a",
      skyBot: "#ff9eae",
      hillFar: "#ffe2a8",
      hillMid: "#f7c479",
      weather: "leaves",
      label: "Sunset Beach"
    },
    night: {
      skyTop: "#1b2a52",
      skyMid: "#2d3a66",
      skyBot: "#4a4a86",
      hillFar: "#26415a",
      hillMid: "#1c3247",
      weather: "fireflies",
      label: "Starry Night"
    }
  };

  var IDS = ["meadow", "beach", "night"];

  function get(id) {
    return THEMES[id] || THEMES.meadow;
  }

  /* ---------- gradient cache (keyed by height + theme id) ----------
     Sky gradients are screen-space and only change when the canvas
     resizes or the theme switches, so caching avoids per-frame allocs. */
  var gradCache = null, gradKey = "";

  function skyGradient(ctx, h, id, theme) {
    var key = h + "|" + id;
    if (!gradCache || gradKey !== key) {
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, theme.skyTop);
      g.addColorStop(0.6, theme.skyMid);
      g.addColorStop(1, theme.skyBot);
      gradCache = g;
      gradKey = key;
    }
    return gradCache;
  }

  /* ---------- celestial bodies ---------- */

  // Cheerful day sun with slowly rotating rays (reuses the sprites.js look).
  function sunBody(ctx, x, y, r, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "rgba(255,221,120,0.55)";
    ctx.rotate(t * 0.15);
    for (var i = 0; i < 12; i++) {
      ctx.rotate((Math.PI * 2) / 12);
      ctx.fillRect(r + 6, -4, 22, 8);
    }
    ctx.restore();
    circle(ctx, x, y, r);
    ctx.fillStyle = "#ffd86b";
    ctx.fill();
    circle(ctx, x, y, r - 7);
    ctx.fillStyle = "#ffe89a";
    ctx.fill();
  }

  // Big low golden sunset sun with a soft radial glow, gently bobbing.
  function sunsetSun(ctx, x, y, r, t) {
    var glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.6);
    glow.addColorStop(0, "rgba(255,214,140,0.55)");
    glow.addColorStop(1, "rgba(255,214,140,0)");
    ctx.fillStyle = glow;
    circle(ctx, x, y, r * 2.6);
    ctx.fill();
    var bob = Math.sin(t * 0.4) * 2;
    var g = ctx.createRadialGradient(x, y - r * 0.3 + bob, r * 0.3, x, y + bob, r);
    g.addColorStop(0, "#ffe7a0");
    g.addColorStop(1, "#ff9d52");
    ctx.fillStyle = g;
    circle(ctx, x, y + bob, r);
    ctx.fill();
  }

  // Soft moon with a couple of craters, very slow drift.
  function moon(ctx, x, y, r, t) {
    var halo = ctx.createRadialGradient(x, y, r * 0.7, x, y, r * 2.2);
    halo.addColorStop(0, "rgba(220,228,255,0.30)");
    halo.addColorStop(1, "rgba(220,228,255,0)");
    ctx.fillStyle = halo;
    circle(ctx, x, y, r * 2.2);
    ctx.fill();
    circle(ctx, x, y, r);
    ctx.fillStyle = "#eef1ff";
    ctx.fill();
    ctx.fillStyle = "rgba(180,190,225,0.5)";
    circle(ctx, x - r * 0.3, y - r * 0.25, r * 0.22);
    ctx.fill();
    circle(ctx, x + r * 0.35, y + r * 0.1, r * 0.16);
    ctx.fill();
    circle(ctx, x - r * 0.05, y + r * 0.4, r * 0.12);
    ctx.fill();
  }

  /* ---------- stable twinkling stars ----------
     Positions derive from a small deterministic hash of the index so
     they stay put frame to frame; only alpha pulses via t. Count is
     capped so there's no per-frame allocation churn. */
  var STAR_COUNT = 40;

  function frac(n) {
    return n - Math.floor(n);
  }

  function drawStars(ctx, w, h, t) {
    var band = h * 0.62; // keep stars in the upper sky
    for (var i = 0; i < STAR_COUNT; i++) {
      var sx = frac(Math.sin(i * 12.9898) * 43758.5453) * w;
      var sy = frac(Math.sin(i * 78.233) * 12543.123) * band;
      var r = 0.7 + frac(Math.sin(i * 3.17) * 9871.7) * 1.1;
      var twinkle = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 2 + i * 1.7));
      ctx.globalAlpha = twinkle;
      ctx.fillStyle = "#fdfdff";
      circle(ctx, sx, sy, r);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- public sky painter ----------
     Screen space (0..w, 0..h): themed gradient + celestial body,
     subtly animated by t. Drop-in replacement for S.sky. */
  function drawSky(ctx, w, h, id, t) {
    var theme = get(id);
    ctx.fillStyle = skyGradient(ctx, h, id, theme);
    ctx.fillRect(0, 0, w, h);

    if (id === "night") {
      drawStars(ctx, w, h, t);
      moon(ctx, w * 0.78, h * 0.22, 38, t);
    } else if (id === "beach") {
      // big low sun near the horizon, anchored to canvas height
      sunsetSun(ctx, w * 0.7, h * 0.66, 60, t);
    } else {
      sunBody(ctx, w * 0.2, h * 0.22, 46, t);
    }
  }

  window.DINOThemes = {
    ids: IDS,
    get: get,
    drawSky: drawSky
  };
})();
