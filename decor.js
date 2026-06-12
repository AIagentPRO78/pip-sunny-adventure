/* Biome-specific background props for the canvas game.
   All art is vector canvas ops, matching the sprites.js house style.
   IIFE attaches window.DINODecor — classic <script>, no ES modules,
   file:// compatible. Props sit on the ground (groundY baseline) and
   are cheap + cullable so render() can skip off-screen ones. */
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

  /* ---------- beach: palm tree ----------
     Curved trunk rooted at groundY with a fan of fronds and a couple
     of coconuts. Fronds sway gently with t. */
  function palm(ctx, x, groundY, t) {
    var sway = Math.sin(t * 1.4 + x) * 4;
    var topX = x + 14 + sway;
    var topY = groundY - 118;

    // trunk (curved, tapering bands)
    ctx.strokeStyle = "#b07a44";
    ctx.lineWidth = 13;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, groundY);
    ctx.quadraticCurveTo(x - 6, groundY - 64, topX, topY + 6);
    ctx.stroke();
    ctx.strokeStyle = "#c98f55";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(x, groundY - 4);
    ctx.quadraticCurveTo(x - 4, groundY - 64, topX, topY + 6);
    ctx.stroke();
    ctx.lineCap = "butt";

    // coconuts at the crown
    ctx.fillStyle = "#7a4a26";
    circle(ctx, topX - 6, topY + 8, 5); ctx.fill();
    circle(ctx, topX + 4, topY + 9, 5); ctx.fill();
    circle(ctx, topX - 1, topY + 12, 5); ctx.fill();

    // fronds (a radial fan of leaf blades)
    var fronds = [-2.5, -1.7, -0.9, -0.2, 0.5, 1.2];
    for (var f = 0; f < fronds.length; f++) {
      var a = fronds[f] + Math.sin(t * 1.6 + f) * 0.06;
      var ex = topX + Math.cos(a) * 56;
      var ey = topY + Math.sin(a) * 40 - 4;
      var mx = topX + Math.cos(a) * 30;
      var my = topY + Math.sin(a) * 18 - 14;
      ctx.fillStyle = f % 2 === 0 ? "#4fb84a" : "#5fcc56";
      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.quadraticCurveTo(mx, my, ex, ey);
      ctx.quadraticCurveTo(mx, my + 9, topX, topY + 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* ---------- beach: sandcastle ----------
     A little sand mound with two towers, a gate, and a flag on top. */
  function sandcastle(ctx, x, groundY, t) {
    var baseW = 58, baseH = 30;
    var bx = x - baseW / 2, by = groundY - baseH;

    // sandy base block
    ctx.fillStyle = "#f0d28a";
    roundRect(ctx, bx, by, baseW, baseH + 6, 6); ctx.fill();
    // shaded face
    ctx.fillStyle = "#e3bd6b";
    roundRect(ctx, bx, by + baseH * 0.6, baseW, baseH * 0.6, 5); ctx.fill();

    // towers
    ctx.fillStyle = "#f4d896";
    roundRect(ctx, bx - 2, by - 22, 16, 28, 3); ctx.fill();
    roundRect(ctx, bx + baseW - 14, by - 22, 16, 28, 3); ctx.fill();
    // crenellations
    ctx.fillStyle = "#e3bd6b";
    var t1 = bx - 2, t2 = bx + baseW - 14;
    for (var c = 0; c < 2; c++) {
      ctx.fillRect(t1 + c * 9, by - 26, 5, 6);
      ctx.fillRect(t2 + c * 9, by - 26, 5, 6);
    }

    // arched gate
    ctx.fillStyle = "#9c7233";
    roundRect(ctx, x - 7, by + 6, 14, baseH, 7); ctx.fill();

    // little flag on the central keep
    ctx.fillStyle = "#f4d896";
    roundRect(ctx, x - 7, by - 16, 14, 22, 3); ctx.fill();
    ctx.strokeStyle = "#cdd6df";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, by - 16); ctx.lineTo(x, by - 34);
    ctx.stroke();
    var wave = Math.sin(t * 4 + x) * 2;
    ctx.fillStyle = "#ff5d8f";
    ctx.beginPath();
    ctx.moveTo(x, by - 34);
    ctx.quadraticCurveTo(x + 9, by - 31 + wave, x + 16, by - 33);
    ctx.lineTo(x + 16, by - 26);
    ctx.quadraticCurveTo(x + 9, by - 25 + wave, x, by - 26);
    ctx.closePath();
    ctx.fill();
  }

  /* ---------- beach: umbrella ----------
     Bright striped parasol on a thin pole, tilted toward the sun. */
  function umbrella(ctx, x, groundY, t) {
    var poleTop = groundY - 96;
    var tilt = 0.16;

    ctx.save();
    ctx.translate(x, poleTop);
    ctx.rotate(tilt);

    // pole
    ctx.fillStyle = "#cdd6df";
    roundRect(ctx, -2.5, 0, 5, 96, 2); ctx.fill();
    ctx.fillStyle = "#ffd86b";
    circle(ctx, 0, 0, 4); ctx.fill();

    // canopy: alternating colored wedges over a half-dome
    var cols = ["#ff5d8f", "#ffe14d"];
    var R = 52, segs = 6;
    for (var s = 0; s < segs; s++) {
      var a0 = Math.PI + (Math.PI / segs) * s;
      var a1 = Math.PI + (Math.PI / segs) * (s + 1);
      ctx.fillStyle = cols[s % 2];
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, R, a0, a1);
      ctx.closePath();
      ctx.fill();
    }
    // scalloped rim
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (var k = 0; k <= segs; k++) {
      var ka = Math.PI + (Math.PI / segs) * k;
      circle(ctx, Math.cos(ka) * R, Math.sin(ka) * R, 3); ctx.fill();
    }
    ctx.restore();
  }

  /* ---------- night: glowing crystal cluster ----------
     A few faceted shards rising from the ground with a soft halo. */
  function crystal(ctx, x, groundY, t) {
    var pulse = 0.5 + 0.5 * Math.sin(t * 2 + x);

    // soft halo glow (semi-transparent radial)
    var cy = groundY - 34;
    var glow = ctx.createRadialGradient(x, cy, 6, x, cy, 60);
    glow.addColorStop(0, "rgba(140,220,255," + (0.30 + pulse * 0.18) + ")");
    glow.addColorStop(1, "rgba(140,220,255,0)");
    ctx.fillStyle = glow;
    circle(ctx, x, cy, 60); ctx.fill();

    // shards: [offsetX, height, halfWidth]
    var shards = [[-16, 40, 9], [14, 52, 10], [-2, 70, 12], [22, 34, 8]];
    for (var s = 0; s < shards.length; s++) {
      var ox = x + shards[s][0];
      var hgt = shards[s][1];
      var hw = shards[s][2];
      var tipY = groundY - hgt;
      // body
      var g = ctx.createLinearGradient(ox, tipY, ox, groundY);
      g.addColorStop(0, "#bdf0ff");
      g.addColorStop(1, "#5aa0e8");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ox, tipY);
      ctx.lineTo(ox + hw, tipY + hgt * 0.42);
      ctx.lineTo(ox + hw * 0.5, groundY);
      ctx.lineTo(ox - hw * 0.5, groundY);
      ctx.lineTo(ox - hw, tipY + hgt * 0.42);
      ctx.closePath();
      ctx.fill();
      // bright facet
      ctx.fillStyle = "rgba(255,255,255," + (0.35 + pulse * 0.25) + ")";
      ctx.beginPath();
      ctx.moveTo(ox, tipY);
      ctx.lineTo(ox + hw * 0.5, tipY + hgt * 0.42);
      ctx.lineTo(ox, groundY);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* ---------- night: glowing mushroom ----------
     Plump speckled cap on a pale stalk with a soft semi-transparent
     halo that breathes with t. */
  function mushroom(ctx, x, groundY, t) {
    var pulse = 0.5 + 0.5 * Math.sin(t * 1.8 + x * 0.5);
    var capY = groundY - 40;

    // halo glow
    var glow = ctx.createRadialGradient(x, capY, 4, x, capY, 46);
    glow.addColorStop(0, "rgba(170,140,255," + (0.28 + pulse * 0.16) + ")");
    glow.addColorStop(1, "rgba(170,140,255,0)");
    ctx.fillStyle = glow;
    circle(ctx, x, capY, 46); ctx.fill();

    // stalk
    ctx.fillStyle = "#e7ddf6";
    roundRect(ctx, x - 6, groundY - 32, 12, 32, 5); ctx.fill();
    ctx.fillStyle = "#cfc1ea";
    roundRect(ctx, x + 1, groundY - 32, 5, 32, 2.5); ctx.fill();

    // cap (dome)
    var g = ctx.createLinearGradient(x, capY - 18, x, capY + 12);
    g.addColorStop(0, "#c79bff");
    g.addColorStop(1, "#8a5fe0");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, capY + 2, 24, 18, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    roundRect(ctx, x - 24, capY, 48, 7, 3.5); ctx.fill();

    // glowing speckles
    ctx.fillStyle = "rgba(235,255,255," + (0.6 + pulse * 0.35) + ")";
    circle(ctx, x - 9, capY - 4, 3); ctx.fill();
    circle(ctx, x + 7, capY - 7, 2.4); ctx.fill();
    circle(ctx, x + 13, capY + 1, 2); ctx.fill();
    circle(ctx, x - 2, capY - 9, 1.8); ctx.fill();
  }

  /* ---------- placement ----------
     Spread props across the world for the biome. Returns
     [{kind, x}, ...]; meadow keeps the existing trees/bushes so it
     returns []. Props are spaced every ~700-1000 world units and kept
     within [200, worldW-200]. */
  var KINDS = {
    beach: ["palm", "sandcastle", "umbrella"],
    night: ["crystal", "mushroom"]
  };

  function place(theme, worldW) {
    var set = KINDS[theme];
    if (!set || !worldW) return [];
    var out = [];
    var minX = 200, maxX = worldW - 200;
    if (maxX <= minX) return out;
    var i = 0;
    var x = minX + 120;
    while (x <= maxX) {
      out.push({ kind: set[i % set.length], x: x });
      // 700-1000 unit gap, deterministic-ish jitter from index
      x += 700 + ((i * 137) % 300);
      i++;
    }
    return out;
  }

  /* ---------- dispatch ----------
     Draw one prop by kind at world x, sitting on groundY. Unknown
     kinds draw nothing. */
  function draw(ctx, kind, x, groundY, t) {
    if (kind === "palm") palm(ctx, x, groundY, t);
    else if (kind === "sandcastle") sandcastle(ctx, x, groundY, t);
    else if (kind === "umbrella") umbrella(ctx, x, groundY, t);
    else if (kind === "crystal") crystal(ctx, x, groundY, t);
    else if (kind === "mushroom") mushroom(ctx, x, groundY, t);
  }

  window.DINODecor = {
    place: place,
    draw: draw
  };
})();
