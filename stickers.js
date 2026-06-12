/* Sticker album (kids reward collection).
   Each sticker is cute vector art drawn with canvas ops, matching the
   sprites.js house style. IIFE attaches window.DINOStickers — classic
   <script>, no ES modules, file:// compatible.

   API
     window.DINOStickers.stickers            -> array of {id,name,draw}
     window.DINOStickers.earnedSet(stats)    -> { id:true } earned map
     window.DINOStickers.drawSticker(ctx,x,y,size,sticker,earned)
                                             -> full colour if earned,
                                                faint silhouette if not

   draw(ctx, x, y, size): x,y is the CENTER of a size-by-size box. Each
   sticker draws in that box at full colour. drawSticker() handles the
   earned/locked presentation (silhouette + lock) around it.

   stats is the shared object the v4 features pass around:
     { done:[idx], stars:{idx:n}, totalStars, babies:{idx:true},
       coins:number, found:{idx:count}, levelsCount } */
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

  /* A 5-point star polygon centred at (cx,cy). Shared by several drawers. */
  function starPath(ctx, cx, cy, outer, inner, rot) {
    var spikes = 5;
    ctx.beginPath();
    for (var i = 0; i < spikes * 2; i++) {
      var rad = i % 2 === 0 ? outer : inner;
      var a = (Math.PI / spikes) * i - Math.PI / 2 + (rot || 0);
      ctx.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad);
    }
    ctx.closePath();
  }

  /* ---------- individual sticker art ----------
     Every drawer works in a box roughly [-s,-s] .. [s,s] around (x,y),
     with s = size * 0.5, so the silhouette path in drawSticker can reuse
     the same proportions. */

  function drawStar(ctx, x, y, size) {
    var s = size * 0.42;
    var g = ctx.createRadialGradient(x - s * 0.3, y - s * 0.3, 2, x, y, s);
    g.addColorStop(0, "#fff2a8");
    g.addColorStop(1, "#ffce3a");
    ctx.fillStyle = g;
    starPath(ctx, x, y, s, s * 0.42, 0);
    ctx.fill();
    ctx.strokeStyle = "#f0a91e";
    ctx.lineWidth = Math.max(1.5, size * 0.04);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    circle(ctx, x - s * 0.22, y - s * 0.24, size * 0.06);
    ctx.fill();
  }

  function drawBabyDino(ctx, x, y, size) {
    var s = size * 0.5;
    var hr = s * 0.62;
    // body
    ctx.fillStyle = "#8ad77a";
    ctx.beginPath();
    ctx.ellipse(x - s * 0.08, y + s * 0.22, s * 0.5, s * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    // tail
    ctx.beginPath();
    ctx.moveTo(x - s * 0.4, y + s * 0.12);
    ctx.quadraticCurveTo(x - s * 0.9, y + s * 0.5, x - s * 0.6, y + s * 0.58);
    ctx.quadraticCurveTo(x - s * 0.4, y + s * 0.6, x - s * 0.18, y + s * 0.42);
    ctx.closePath();
    ctx.fill();
    // belly
    ctx.fillStyle = "#eaf8d0";
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.32, s * 0.28, s * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    // legs
    ctx.fillStyle = "#6fc25e";
    roundRect(ctx, x - s * 0.18, y + s * 0.5, s * 0.16, s * 0.24, s * 0.07);
    ctx.fill();
    roundRect(ctx, x + s * 0.04, y + s * 0.5, s * 0.16, s * 0.24, s * 0.07);
    ctx.fill();
    // head
    ctx.fillStyle = "#8ad77a";
    circle(ctx, x + s * 0.2, y - s * 0.34, hr);
    ctx.fill();
    // snout
    ctx.fillStyle = "#7fce6e";
    roundRect(ctx, x + s * 0.32, y - s * 0.4, hr * 0.95, hr * 0.62, hr * 0.3);
    ctx.fill();
    // eye
    ctx.fillStyle = "#fff";
    circle(ctx, x + s * 0.28, y - s * 0.46, hr * 0.36);
    ctx.fill();
    ctx.fillStyle = "#2b2440";
    circle(ctx, x + s * 0.33, y - s * 0.46, hr * 0.18);
    ctx.fill();
  }

  function drawApple(ctx, x, y, size) {
    var s = size * 0.4;
    // stalk
    ctx.fillStyle = "#3a7d2c";
    roundRect(ctx, x - size * 0.02, y - s * 1.2, size * 0.06, s * 0.55, size * 0.02);
    ctx.fill();
    // leaf
    ctx.fillStyle = "#79d36a";
    ctx.beginPath();
    ctx.ellipse(x + s * 0.45, y - s * 0.95, s * 0.4, s * 0.22, -0.6, 0, Math.PI * 2);
    ctx.fill();
    // body
    var g = ctx.createRadialGradient(x - s * 0.3, y - s * 0.3, 2, x, y, s);
    g.addColorStop(0, "#ff9a9a");
    g.addColorStop(1, "#ed4d4d");
    ctx.fillStyle = g;
    circle(ctx, x, y, s);
    ctx.fill();
    // shine
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    circle(ctx, x - s * 0.3, y - s * 0.3, s * 0.18);
    ctx.fill();
  }

  function drawFlag(ctx, x, y, size) {
    var s = size * 0.5;
    var px = x - s * 0.5;
    // pole
    ctx.fillStyle = "#cdd6df";
    roundRect(ctx, px - s * 0.07, y - s * 0.85, s * 0.14, s * 1.7, s * 0.06);
    ctx.fill();
    // finial
    ctx.fillStyle = "#ffce3a";
    circle(ctx, px, y - s * 0.85, s * 0.12);
    ctx.fill();
    // banner
    ctx.fillStyle = "#ff5d8f";
    ctx.beginPath();
    ctx.moveTo(px + s * 0.06, y - s * 0.78);
    ctx.quadraticCurveTo(x + s * 0.55, y - s * 0.6, x + s * 0.95, y - s * 0.78);
    ctx.quadraticCurveTo(x + s * 0.55, y - s * 0.4, x + s * 0.95, y - s * 0.18);
    ctx.quadraticCurveTo(x + s * 0.55, y - s * 0.36, px + s * 0.06, y - s * 0.18);
    ctx.closePath();
    ctx.fill();
    // little dot motif
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    circle(ctx, x + s * 0.3, y - s * 0.48, s * 0.1);
    ctx.fill();
  }

  function drawCrown(ctx, x, y, size) {
    var s = size * 0.46;
    var topY = y - s * 0.55, baseY = y + s * 0.5;
    var left = x - s, right = x + s;
    var g = ctx.createLinearGradient(0, topY, 0, baseY);
    g.addColorStop(0, "#ffe14d");
    g.addColorStop(1, "#f4b400");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(left, baseY);
    ctx.lineTo(left, topY + s * 0.35);
    ctx.lineTo(left + s * 0.5, topY);
    ctx.lineTo(x, topY + s * 0.45);
    ctx.lineTo(right - s * 0.5, topY);
    ctx.lineTo(right, topY + s * 0.35);
    ctx.lineTo(right, baseY);
    ctx.closePath();
    ctx.fill();
    // band
    ctx.fillStyle = "#f4b400";
    roundRect(ctx, left, baseY - s * 0.22, s * 2, s * 0.28, s * 0.08);
    ctx.fill();
    // jewels
    ctx.fillStyle = "#ff5d8f";
    circle(ctx, x, baseY - s * 0.08, s * 0.14); ctx.fill();
    ctx.fillStyle = "#4cc0f0";
    circle(ctx, left + s * 0.45, baseY - s * 0.08, s * 0.11); ctx.fill();
    circle(ctx, right - s * 0.45, baseY - s * 0.08, s * 0.11); ctx.fill();
    // tip sparkles
    ctx.fillStyle = "#fff3a0";
    circle(ctx, left + s * 0.5, topY, s * 0.12); ctx.fill();
    circle(ctx, x, topY + s * 0.45, s * 0.12); ctx.fill();
    circle(ctx, right - s * 0.5, topY, s * 0.12); ctx.fill();
  }

  function drawSun(ctx, x, y, size) {
    var r = size * 0.3;
    ctx.save();
    ctx.translate(x, y);
    // rays
    ctx.fillStyle = "#ffd86b";
    for (var i = 0; i < 12; i++) {
      ctx.rotate((Math.PI * 2) / 12);
      roundRect(ctx, r + size * 0.04, -size * 0.03, size * 0.13, size * 0.06, size * 0.03);
      ctx.fill();
    }
    ctx.restore();
    // disc
    circle(ctx, x, y, r);
    ctx.fillStyle = "#ffd86b"; ctx.fill();
    circle(ctx, x, y, r * 0.78);
    ctx.fillStyle = "#ffe89a"; ctx.fill();
    // happy face
    ctx.fillStyle = "#e8a33c";
    circle(ctx, x - r * 0.35, y - r * 0.18, r * 0.1); ctx.fill();
    circle(ctx, x + r * 0.35, y - r * 0.18, r * 0.1); ctx.fill();
    ctx.strokeStyle = "#e8a33c";
    ctx.lineWidth = Math.max(1.5, size * 0.04);
    ctx.beginPath();
    ctx.arc(x, y + r * 0.1, r * 0.4, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  function drawMoon(ctx, x, y, size) {
    var r = size * 0.4;
    ctx.save();
    // crescent: big disc minus an offset disc (even-odd not needed, draw shadow)
    var g = ctx.createRadialGradient(x - r * 0.2, y - r * 0.2, 2, x, y, r);
    g.addColorStop(0, "#fdf3c0");
    g.addColorStop(1, "#f3d873");
    ctx.fillStyle = g;
    circle(ctx, x, y, r);
    ctx.fill();
    // bite out of upper-right to make crescent
    ctx.globalCompositeOperation = "destination-out";
    circle(ctx, x + r * 0.5, y - r * 0.4, r * 0.85);
    ctx.fill();
    ctx.restore();
    // sparkle stars beside it
    ctx.fillStyle = "#fff7c4";
    starPath(ctx, x + r * 0.7, y - r * 0.1, size * 0.08, size * 0.03, 0);
    ctx.fill();
    starPath(ctx, x + r * 0.45, y + r * 0.55, size * 0.05, size * 0.02, 0.3);
    ctx.fill();
  }

  function drawPalm(ctx, x, y, size) {
    var s = size * 0.5;
    // sand mound
    ctx.fillStyle = "#f1dca0";
    ctx.beginPath();
    ctx.ellipse(x, y + s * 0.78, s * 0.7, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    // trunk
    ctx.strokeStyle = "#b9783f";
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x - s * 0.05, y + s * 0.7);
    ctx.quadraticCurveTo(x + s * 0.2, y, x + s * 0.05, y - s * 0.55);
    ctx.stroke();
    // fronds
    ctx.strokeStyle = "#57b54a";
    ctx.lineWidth = Math.max(2, size * 0.055);
    var top = { x: x + s * 0.05, y: y - s * 0.55 };
    var fronds = [[-0.9, -0.2], [-0.5, -0.7], [0.5, -0.7], [0.9, -0.2], [0, -0.85]];
    for (var i = 0; i < fronds.length; i++) {
      ctx.beginPath();
      ctx.moveTo(top.x, top.y);
      ctx.quadraticCurveTo(
        top.x + fronds[i][0] * s * 0.45, top.y + fronds[i][1] * s * 0.2,
        top.x + fronds[i][0] * s * 0.85, top.y + (fronds[i][1] < -0.6 ? -s * 0.25 : s * 0.18)
      );
      ctx.stroke();
    }
    // coconuts
    ctx.fillStyle = "#6b4a2a";
    circle(ctx, top.x - s * 0.08, top.y + s * 0.12, s * 0.1); ctx.fill();
    circle(ctx, top.x + s * 0.12, top.y + s * 0.14, s * 0.1); ctx.fill();
  }

  function drawCrystal(ctx, x, y, size) {
    var s = size * 0.42;
    var g = ctx.createLinearGradient(x, y - s, x, y + s);
    g.addColorStop(0, "#c6f3ff");
    g.addColorStop(1, "#5ec8ff");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.62, y - s * 0.2);
    ctx.lineTo(x + s * 0.4, y + s);
    ctx.lineTo(x - s * 0.4, y + s);
    ctx.lineTo(x - s * 0.62, y - s * 0.2);
    ctx.closePath();
    ctx.fill();
    // facet highlight
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s * 0.62, y - s * 0.2);
    ctx.lineTo(x, y - s * 0.2);
    ctx.closePath();
    ctx.fill();
    // facet shade
    ctx.fillStyle = "rgba(40,120,180,0.3)";
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.2);
    ctx.lineTo(x + s * 0.62, y - s * 0.2);
    ctx.lineTo(x + s * 0.4, y + s);
    ctx.closePath();
    ctx.fill();
    // sparkle
    ctx.fillStyle = "#fff";
    starPath(ctx, x - s * 0.1, y - s * 0.35, size * 0.07, size * 0.025, 0);
    ctx.fill();
  }

  function drawPartyHat(ctx, x, y, size) {
    var s = size * 0.5;
    var apex = { x: x, y: y - s * 0.85 };
    var baseY = y + s * 0.7;
    var halfW = s * 0.55;
    var g = ctx.createLinearGradient(x - halfW, baseY, x + halfW, apex.y);
    g.addColorStop(0, "#ff8fc4");
    g.addColorStop(1, "#ff5d8f");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(apex.x, apex.y);
    ctx.lineTo(x - halfW, baseY);
    ctx.lineTo(x + halfW, baseY);
    ctx.closePath();
    ctx.fill();
    // dots
    ctx.fillStyle = "#fff3a0";
    circle(ctx, x, y - s * 0.3, s * 0.1); ctx.fill();
    circle(ctx, x - s * 0.18, y + s * 0.2, s * 0.09); ctx.fill();
    circle(ctx, x + s * 0.2, y + s * 0.25, s * 0.09); ctx.fill();
    // pom-pom
    ctx.fillStyle = "#ffe14d";
    circle(ctx, apex.x, apex.y, s * 0.16); ctx.fill();
    // brim
    ctx.fillStyle = "#ff7eb6";
    roundRect(ctx, x - halfW - s * 0.06, baseY - s * 0.08, halfW * 2 + s * 0.12, s * 0.16, s * 0.07);
    ctx.fill();
  }

  function heartPath(ctx, x, y, s) {
    ctx.beginPath();
    ctx.moveTo(x, y + s * 0.85);
    ctx.bezierCurveTo(x - s * 1.3, y - s * 0.3, x - s * 0.45, y - s * 0.95, x, y - s * 0.35);
    ctx.bezierCurveTo(x + s * 0.45, y - s * 0.95, x + s * 1.3, y - s * 0.3, x, y + s * 0.85);
    ctx.closePath();
  }

  function drawHeart(ctx, x, y, size) {
    var s = size * 0.4;
    var g = ctx.createRadialGradient(x - s * 0.3, y - s * 0.3, 2, x, y, s * 1.3);
    g.addColorStop(0, "#ff9ec8");
    g.addColorStop(1, "#ff5d8f");
    ctx.fillStyle = g;
    heartPath(ctx, x, y, s);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    circle(ctx, x - s * 0.35, y - s * 0.25, s * 0.18);
    ctx.fill();
  }

  function drawRainbow(ctx, x, y, size) {
    var s = size * 0.46;
    var bands = ["#ff5d8f", "#ffb14d", "#ffe14d", "#6fe06f", "#5ec8ff", "#c08fff"];
    var cy = y + s * 0.55;
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.lineCap = "round";
    for (var i = 0; i < bands.length; i++) {
      ctx.strokeStyle = bands[i];
      ctx.beginPath();
      ctx.arc(x, cy, s - i * (size * 0.075), Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    // little clouds at the ends
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    var endR = s - 2.5 * (size * 0.075);
    circle(ctx, x - s + size * 0.04, cy, size * 0.1); ctx.fill();
    circle(ctx, x + s - size * 0.04, cy, size * 0.1); ctx.fill();
    circle(ctx, x - endR - size * 0.02, cy, size * 0.08); ctx.fill();
    circle(ctx, x + endR + size * 0.02, cy, size * 0.08); ctx.fill();
  }

  /* ---------- sticker table ----------
     Each entry: { id, name, draw }. need() is an internal helper used
     by earnedSet to decide unlock from the shared stats object. */
  var STICKERS = [
    { id: "sun",       name: "Sunny Day",  draw: drawSun },
    { id: "moon",      name: "Night Owl",  draw: drawMoon },
    { id: "palm",      name: "Beach Buddy", draw: drawPalm },
    { id: "baby-dino", name: "Lil' Dino",  draw: drawBabyDino },
    { id: "star",      name: "Superstar",  draw: drawStar },
    { id: "crown",     name: "Champion",   draw: drawCrown },
    { id: "apple",     name: "Snack Time", draw: drawApple },
    { id: "flag",      name: "Finisher",   draw: drawFlag },
    { id: "crystal",   name: "Treasure",   draw: drawCrystal },
    { id: "party-hat", name: "Party Time", draw: drawPartyHat },
    { id: "heart",     name: "Best Pals",  draw: drawHeart },
    { id: "rainbow",   name: "Coin Hoard", draw: drawRainbow }
  ];

  var BY_ID = {};
  for (var si = 0; si < STICKERS.length; si++) BY_ID[STICKERS[si].id] = STICKERS[si];

  /* Level index convention from window.DINOLevels.ids: meadow=0, beach=1,
     night=2. We read by index so this stays decoupled from labels. */
  var MEADOW = 0, BEACH = 1, NIGHT = 2;

  function num(v) { return (typeof v === "number" && v >= 0) ? v : 0; }

  function isDone(stats, idx) {
    var done = stats && stats.done;
    if (!done || !done.length) return false;
    for (var i = 0; i < done.length; i++) if (done[i] === idx) return true;
    return false;
  }

  function levelStars(stats, idx) {
    var s = stats && stats.stars;
    if (!s) return 0;
    return num(s[idx]);
  }

  function anyThreeStar(stats) {
    var s = stats && stats.stars;
    if (!s) return false;
    for (var k in s) if (s.hasOwnProperty(k) && num(s[k]) >= 3) return true;
    return false;
  }

  function savedAnyBaby(stats) {
    var b = stats && stats.babies;
    if (!b) return false;
    for (var k in b) if (b.hasOwnProperty(k) && b[k]) return true;
    return false;
  }

  function savedAllBabies(stats) {
    var b = stats && stats.babies;
    if (!b) return false;
    var count = num(stats && stats.levelsCount) || STICKERS_LEVELS;
    for (var i = 0; i < count; i++) if (!b[i]) return false;
    return count > 0;
  }

  /* Default level count if stats omits levelsCount (3 in this build). */
  var STICKERS_LEVELS = 3;

  /* ---------- unlock rules ----------
     Maps each sticker id to a predicate over the shared stats object.
     Sensible, achievable, kid-legible milestones. */
  var RULES = {
    sun: function (s) { return isDone(s, MEADOW); },           // clear meadow
    moon: function (s) { return isDone(s, NIGHT); },           // clear night
    palm: function (s) { return isDone(s, BEACH); },           // clear beach
    "baby-dino": function (s) { return savedAnyBaby(s); },     // rescue a baby
    star: function (s) { return anyThreeStar(s); },            // 3-star any level
    crown: function (s) { return num(s && s.totalStars) >= 9; }, // perfect run
    apple: function (s) {                                       // collect 30 items
      var f = s && s.found, sum = 0;
      if (f) for (var k in f) if (f.hasOwnProperty(k)) sum += num(f[k]);
      return sum >= 30;
    },
    flag: function (s) {                                        // finish first level
      return (s && s.done && s.done.length > 0) || false;
    },
    crystal: function (s) { return num(s && s.coins) >= 25; },  // 25 coins
    "party-hat": function (s) {                                 // beat all levels
      var count = num(s && s.levelsCount) || STICKERS_LEVELS;
      if (!s || !s.done) return false;
      return s.done.length >= count && count > 0;
    },
    heart: function (s) { return savedAllBabies(s); },          // rescue every baby
    rainbow: function (s) { return num(s && s.coins) >= 60; }   // big coin hoard
  };

  /* earnedSet(stats) -> { id:true } for every earned sticker. Missing or
     malformed stats degrade to an empty map (nothing earned). */
  function earnedSet(stats) {
    var out = {};
    var s = stats || {};
    for (var i = 0; i < STICKERS.length; i++) {
      var id = STICKERS[i].id;
      var rule = RULES[id];
      var ok = false;
      try { ok = !!(rule && rule(s)); } catch (e) { ok = false; }
      if (ok) out[id] = true;
    }
    return out;
  }

  /* ---------- presentation ----------
     drawSticker centres a rounded "card" cell, then either the full-colour
     art (earned) or a faint grey silhouette with a small lock (locked).
     x,y is the cell CENTER; size is the cell edge length. */
  function drawSticker(ctx, x, y, size, sticker, earned) {
    if (!sticker) return;
    var half = size / 2;

    ctx.save();
    // card backing
    ctx.fillStyle = earned ? "rgba(255,255,255,0.92)" : "rgba(232,236,240,0.6)";
    roundRect(ctx, x - half, y - half, size, size, size * 0.16);
    ctx.fill();
    ctx.strokeStyle = earned ? "#ffce3a" : "rgba(150,160,170,0.5)";
    ctx.lineWidth = Math.max(2, size * 0.035);
    roundRect(ctx, x - half + 1, y - half + 1, size - 2, size - 2, size * 0.16);
    ctx.stroke();

    // art occupies the inner ~74% of the cell
    var art = size * 0.74;
    if (earned) {
      sticker.draw(ctx, x, y, art);
    } else {
      // faint silhouette: draw the real art onto a low alpha + desaturated
      // tint by clipping a grey fill behind a stamped shape is overkill, so
      // we just render the art dimmed and greyed via a translucent overlay.
      ctx.save();
      ctx.globalAlpha = 0.18;
      sticker.draw(ctx, x, y, art);
      ctx.restore();
      // grey wash to flatten colour into a silhouette feel
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.globalCompositeOperation = "saturation";
      ctx.fillStyle = "#888";
      roundRect(ctx, x - half, y - half, size, size, size * 0.16);
      ctx.fill();
      ctx.restore();
      // little lock badge
      drawLock(ctx, x, y + art * 0.34, size * 0.18);
    }
    ctx.restore();
  }

  function drawLock(ctx, x, y, s) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "#9aa4ae";
    roundRect(ctx, x - s * 0.6, y - s * 0.1, s * 1.2, s, s * 0.2);
    ctx.fill();
    ctx.strokeStyle = "#9aa4ae";
    ctx.lineWidth = Math.max(1.5, s * 0.28);
    ctx.beginPath();
    ctx.arc(x, y - s * 0.1, s * 0.42, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = "#5e676f";
    circle(ctx, x, y + s * 0.35, s * 0.14);
    ctx.fill();
    ctx.restore();
  }

  window.DINOStickers = {
    stickers: STICKERS,
    get: function (id) { return BY_ID[id] || null; },
    earnedSet: earnedSet,
    drawSticker: drawSticker
  };
})();
