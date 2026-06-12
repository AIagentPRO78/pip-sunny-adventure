/* Kid-friendly achievement badges for Pip's Sunny Adventure.
   All art is vector canvas ops, matching the sprites.js house style.
   IIFE attaches window.DINOAchievements — classic <script>, no ES modules,
   file:// compatible. Earned badges persist in localStorage; checkAll()
   records newly-earned ones itself so callers stay simple.

   Every badge .check(stats) reads the SHARED stats object:
     { done:[idx], stars:{idx:n}, totalStars, babies:{idx:true},
       coins:number, found:{idx:count}, levelsCount }
   See game.js winGame() for how that object is assembled. */
(function () {
  "use strict";

  function roundRect(ctx, x, y, w, h, r) {
    var rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.closePath();
  }

  /* ---------- small stats helpers (every field is optional / defensive) ----------
     stats may be partial or missing keys, so each reader fails soft to a
     sensible empty default. Never trust the shape we were handed. */
  function doneList(stats) {
    return (stats && Array.isArray(stats.done)) ? stats.done : [];
  }
  function hasDone(stats, idx) {
    return doneList(stats).indexOf(idx) !== -1;
  }
  function doneCount(stats) {
    return doneList(stats).length;
  }
  function totalStars(stats) {
    var v = stats && stats.totalStars;
    return (typeof v === "number" && v >= 0) ? v : 0;
  }
  function coins(stats) {
    var v = stats && stats.coins;
    return (typeof v === "number" && v >= 0) ? v : 0;
  }
  function levelsCount(stats) {
    var v = stats && stats.levelsCount;
    return (typeof v === "number" && v > 0) ? v : 3; // 3 levels ship today
  }
  // how many baby dinos have been rescued (babies = { idx: true })
  function babiesSaved(stats) {
    var b = stats && stats.babies, n = 0;
    if (b && typeof b === "object") {
      for (var k in b) if (b.hasOwnProperty(k) && b[k]) n++;
    }
    return n;
  }
  // did any single level get fully collected? found[idx] vs that level's total
  function anyFullCollect(stats) {
    var f = stats && stats.found;
    if (!f || typeof f !== "object") return false;
    var lvls = (window.DINOLevels && window.DINOLevels.length) ? window.DINOLevels : null;
    for (var k in f) {
      if (!f.hasOwnProperty(k)) continue;
      var got = f[k];
      if (typeof got !== "number" || got <= 0) continue;
      var idx = parseInt(k, 10);
      var cfg = lvls ? lvls[idx] : null;
      var total = (cfg && cfg.collectibles) ? cfg.collectibles.length : 0;
      if (total > 0 && got >= total) return true;
    }
    return false;
  }

  /* ---------- badge table ----------
     Each badge: { id, name, emoji, desc, check(stats) -> bool }.
     Thresholds fit the attainable budget: 3 levels x 3 stars = 9 total. */
  var MAX_STARS = 9;
  var TREASURE_GOAL = 20;

  var BADGES = [
    {
      id: "first_roar",
      name: "Big Roar",
      emoji: "🦖",
      desc: "Clear any level.",
      check: function (s) { return doneCount(s) >= 1; }
    },
    {
      id: "first_steps",
      name: "First Steps",
      emoji: "🐾",
      desc: "Clear the Sunny Meadow.",
      check: function (s) { return hasDone(s, 0); }
    },
    {
      id: "sun_and_moon",
      name: "Sun and Moon",
      emoji: "🌗",
      desc: "Clear the Meadow and the Night.",
      check: function (s) { return hasDone(s, 0) && hasDone(s, 2); }
    },
    {
      id: "explorer",
      name: "Explorer",
      emoji: "🗺️",
      desc: "Clear all three levels.",
      check: function (s) { return doneCount(s) >= levelsCount(s); }
    },
    {
      id: "star_collector",
      name: "Star Collector",
      emoji: "⭐",
      desc: "Earn all nine stars.",
      check: function (s) { return totalStars(s) >= MAX_STARS; }
    },
    {
      id: "dino_rescuer",
      name: "Dino Rescuer",
      emoji: "🥚",
      desc: "Rescue every baby dino.",
      check: function (s) { return babiesSaved(s) >= levelsCount(s); }
    },
    {
      id: "treasure_hunter",
      name: "Treasure Hunter",
      emoji: "💰",
      desc: "Collect " + TREASURE_GOAL + " coins.",
      check: function (s) { return coins(s) >= TREASURE_GOAL; }
    },
    {
      id: "completionist",
      name: "Completionist",
      emoji: "🏆",
      desc: "Collect everything in one level.",
      check: function (s) { return anyFullCollect(s); }
    }
  ];

  var BY_ID = {};
  for (var bi = 0; bi < BADGES.length; bi++) BY_ID[BADGES[bi].id] = BADGES[bi];

  /* ---------- earned persistence (degrades gracefully) ----------
     pip_badges = { id: true }. Wrapped in try/catch for private mode
     and file:// where localStorage can throw or be absent. */
  var BADGES_KEY = "pip_badges";

  function unlocked() {
    try {
      var raw = localStorage.getItem(BADGES_KEY);
      var o = raw ? JSON.parse(raw) : null;
      return (o && typeof o === "object") ? o : {};
    } catch (e) {
      return {};
    }
  }

  function saveUnlocked(o) {
    try { localStorage.setItem(BADGES_KEY, JSON.stringify(o)); } catch (e) {}
  }

  function isEarned(id) {
    return unlocked()[id] === true;
  }

  /* Run every badge against stats, persist any newly-earned ones, and
     return the array of badge objects that flipped from locked to earned
     on THIS call (so the caller can toast only the fresh ones). */
  function checkAll(stats) {
    var earned = unlocked();
    var fresh = [];
    var changed = false;
    for (var i = 0; i < BADGES.length; i++) {
      var badge = BADGES[i];
      if (earned[badge.id] === true) continue;
      var ok = false;
      try { ok = !!badge.check(stats); } catch (e) { ok = false; }
      if (ok) {
        earned[badge.id] = true;
        fresh.push(badge);
        changed = true;
      }
    }
    if (changed) saveUnlocked(earned);
    return fresh;
  }

  /* ---------- medal art ----------
     A cute round medal: ribbon tails behind, a coined disc with a
     fluted gold rim, and the badge emoji at the center. When not earned
     the whole thing is drawn in muted greys so the grid reads at a glance.
     (x, y) is the medal CENTER; size is its outer diameter. */
  function palette(earned) {
    if (earned) {
      return {
        ribbonA: "#ff5d8f", ribbonB: "#d83f6e",
        rim: "#f4b400", rimHi: "#ffe14d",
        disc: "#ffd86b", discHi: "#ffe89a",
        shine: "rgba(255,255,255,0.7)",
        emojiAlpha: 1
      };
    }
    return {
      ribbonA: "#b9bfc9", ribbonB: "#9aa1ad",
      rim: "#aeb4bf", rimHi: "#cdd2db",
      disc: "#d6dae1", discHi: "#e7eaef",
      shine: "rgba(255,255,255,0.4)",
      emojiAlpha: 0.45
    };
  }

  function drawBadge(ctx, x, y, size, badge, earned) {
    var r = size / 2;
    var pal = palette(earned);

    ctx.save();
    ctx.translate(x, y);

    // ribbon tails fan out below the disc, slightly behind it
    var rw = r * 0.42, rh = r * 0.9, ry = r * 0.35;
    ctx.fillStyle = pal.ribbonB;
    ctx.beginPath();
    ctx.moveTo(-r * 0.28, ry);
    ctx.lineTo(-r * 0.28 - rw, ry + rh);
    ctx.lineTo(-r * 0.28 - rw * 0.36, ry + rh);
    ctx.lineTo(-r * 0.04, ry + rh * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pal.ribbonA;
    ctx.beginPath();
    ctx.moveTo(r * 0.28, ry);
    ctx.lineTo(r * 0.28 + rw, ry + rh);
    ctx.lineTo(r * 0.28 + rw * 0.36, ry + rh);
    ctx.lineTo(r * 0.04, ry + rh * 0.55);
    ctx.closePath();
    ctx.fill();

    // fluted rim: a ring of little bumps around the disc edge
    var rim = r * 0.92;
    ctx.fillStyle = pal.rim;
    var flutes = 16;
    for (var i = 0; i < flutes; i++) {
      var a = (Math.PI * 2 / flutes) * i;
      circle(ctx, Math.cos(a) * rim, Math.sin(a) * rim, r * 0.16);
      ctx.fill();
    }
    circle(ctx, 0, 0, rim);
    ctx.fill();
    ctx.fillStyle = pal.rimHi;
    circle(ctx, 0, 0, rim - r * 0.06);
    ctx.fill();

    // inner disc with a soft highlight
    var disc = r * 0.74;
    circle(ctx, 0, 0, disc);
    ctx.fillStyle = pal.disc;
    ctx.fill();
    circle(ctx, 0, 0, disc - r * 0.1);
    ctx.fillStyle = pal.discHi;
    ctx.fill();
    // glossy top-left catch
    ctx.fillStyle = pal.shine;
    circle(ctx, -disc * 0.32, -disc * 0.34, disc * 0.18);
    ctx.fill();

    // center emoji (falls back to nothing if the platform can't draw it)
    ctx.globalAlpha = pal.emojiAlpha;
    ctx.fillStyle = "#5a4a2a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = Math.round(disc * 1.05) + "px serif";
    var glyph = (badge && badge.emoji) ? badge.emoji : "★";
    ctx.fillText(glyph, 0, disc * 0.06);
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  function get(id) {
    return BY_ID[id] || null;
  }

  window.DINOAchievements = {
    badges: BADGES,
    get: get,
    unlocked: unlocked,
    isEarned: isEarned,
    checkAll: checkAll,
    drawBadge: drawBadge
  };
})();
