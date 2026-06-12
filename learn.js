/* Gentle-learning overlay (optional, quiet education).
   Labels each collectible with a number, a letter, or a tiny shape so a
   small child can practice counting / the alphabet / shape names while
   playing. It NEVER changes gameplay — purely a drawn label on top of an
   already-drawn collectible.

   IIFE attaches window.DINOLearn — classic <script>, no ES modules,
   file:// compatible. Matches the sprites.js / cosmetics.js house style:
   ES5 var, "use strict", 2-space indent, locally re-declared canvas
   helpers. Cheap on purpose: a tiny pill plus one number/letter/shape,
   redrawn each frame for ~20 collectibles. */
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

  /* ---------- modes ---------- */
  var MODES = ["off", "count", "letters", "shapes"];
  var ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  // Shape cycle, repeated for shapes mode. Names kid-friendly.
  var SHAPES = ["circle", "square", "triangle", "star", "heart"];

  function isMode(m) {
    return MODES.indexOf(m) >= 0;
  }

  /* ---------- label text / name lookup ----------
     index is the 0-based position of the collectible in the world list. */
  function label(index) {
    var i = index < 0 ? 0 : index | 0;
    var m = api.mode;
    if (m === "count") return String(i + 1);
    if (m === "letters") return ALPHA.charAt(i % ALPHA.length);
    if (m === "shapes") return SHAPES[i % SHAPES.length];
    return "";
  }

  /* ---------- pill behind the label (high contrast, kid-readable) ---------- */
  function drawPill(ctx, cx, cy, w, h) {
    ctx.save();
    // soft drop shadow so the pill reads on any sky/theme
    ctx.fillStyle = "rgba(0,0,0,0.22)";
    roundRect(ctx, cx - w / 2, cy - h / 2 + 2, w, h, h / 2);
    ctx.fill();
    // bright body
    ctx.fillStyle = "#fffbe9";
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2);
    ctx.fill();
    // dark outline for contrast against light collectibles
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#2a2a3a";
    roundRect(ctx, cx - w / 2, cy - h / 2, w, h, h / 2);
    ctx.stroke();
    ctx.restore();
  }

  /* ---------- glyph drawers ---------- */
  function drawText(ctx, cx, cy, txt) {
    ctx.save();
    ctx.fillStyle = "#2a2a3a";
    ctx.font = "bold 22px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(txt, cx, cy + 1);
    ctx.restore();
  }

  // Small shape outline drawn inside the pill. r is the glyph radius.
  function drawShape(ctx, cx, cy, name, r) {
    ctx.save();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#2a2a3a";
    ctx.lineJoin = "round";
    if (name === "circle") {
      circle(ctx, cx, cy, r);
      ctx.stroke();
    } else if (name === "square") {
      var s = r * 1.7;
      roundRect(ctx, cx - s / 2, cy - s / 2, s, s, 2);
      ctx.stroke();
    } else if (name === "triangle") {
      ctx.beginPath();
      ctx.moveTo(cx, cy - r);
      ctx.lineTo(cx + r * 0.92, cy + r * 0.72);
      ctx.lineTo(cx - r * 0.92, cy + r * 0.72);
      ctx.closePath();
      ctx.stroke();
    } else if (name === "star") {
      drawStarPath(ctx, cx, cy, r, r * 0.45, 5);
      ctx.stroke();
    } else {
      drawHeartPath(ctx, cx, cy, r);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawStarPath(ctx, cx, cy, ro, ri, pts) {
    ctx.beginPath();
    for (var i = 0; i < pts * 2; i++) {
      var rad = i % 2 === 0 ? ro : ri;
      var ang = (Math.PI / pts) * i - Math.PI / 2;
      var px = cx + Math.cos(ang) * rad;
      var py = cy + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  function drawHeartPath(ctx, cx, cy, r) {
    var top = cy - r * 0.55;
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.9);
    ctx.bezierCurveTo(cx - r * 1.5, cy - r * 0.2, cx - r * 0.55, top - r * 0.8, cx, cy - r * 0.05);
    ctx.bezierCurveTo(cx + r * 0.55, top - r * 0.8, cx + r * 1.5, cy - r * 0.2, cx, cy + r * 0.9);
    ctx.closePath();
  }

  /* ---------- public draw ----------
     Draws the label ON the collectible at (x, y) in world space. The label
     floats just above the collectible center so it never hides the art. A
     gentle bob keeps it lively without churning layout. Callers pass the
     active mode explicitly so the render loop stays simple. */
  function draw(ctx, x, y, mode, index, t) {
    if (!mode || mode === "off") return;
    var i = index < 0 ? 0 : index | 0;
    var bob = Math.sin((t || 0) * 4 + x) * 1.5;
    var cx = x;
    var cy = y - 30 + bob; // sit above the ~44px collectible

    if (mode === "count") {
      var num = String(i + 1);
      var w = 20 + num.length * 12;
      drawPill(ctx, cx, cy, w, 26);
      drawText(ctx, cx, cy, num);
    } else if (mode === "letters") {
      drawPill(ctx, cx, cy, 28, 26);
      drawText(ctx, cx, cy, ALPHA.charAt(i % ALPHA.length));
    } else if (mode === "shapes") {
      drawPill(ctx, cx, cy, 28, 26);
      drawShape(ctx, cx, cy, SHAPES[i % SHAPES.length], 7);
    }
  }

  /* ---------- mode get/set (no persistence here; caller owns storage) ---------- */
  function setMode(m) {
    api.mode = isMode(m) ? m : "off";
    return api.mode;
  }

  function getMode() {
    return api.mode;
  }

  var api = {
    modes: MODES,
    mode: "off",
    setMode: setMode,
    getMode: getMode,
    label: label,
    draw: draw
  };

  window.DINOLearn = api;
})();
