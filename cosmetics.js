/* Unlockable Pip cosmetics (kids reward loop).
   All art is vector canvas ops, matching the sprites.js house style.
   IIFE attaches window.DINOCosmetics — classic <script>, no ES modules,
   file:// compatible. Equipped choice persists in localStorage; drawOn()
   reads the equipped id itself so callers stay simple. */
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

  /* ---------- item table ----------
     cost = TOTAL stars required to unlock (cost <= totalStars => unlocked).
     type 'hat' draws on Pip's head; type 'tint' overlays a colored
     silhouette; 'none' draws nothing. */
  // Costs fit the attainable budget (3 levels x 3 stars = 9 total).
  var ITEMS = [
    { id: "none", name: "None", type: "none", cost: 0 },
    { id: "party", name: "Party Hat", type: "hat", cost: 2 },
    { id: "berry", name: "Berry Pip", type: "tint", cost: 4, color: "#d24f9b" },
    { id: "crown", name: "Crown", type: "hat", cost: 6 },
    { id: "sky", name: "Sky Pip", type: "tint", cost: 8, color: "#4cc0f0" },
    { id: "explorer", name: "Explorer Cap", type: "hat", cost: 9 }
  ];

  var BY_ID = {};
  for (var ii = 0; ii < ITEMS.length; ii++) BY_ID[ITEMS[ii].id] = ITEMS[ii];

  function get(id) {
    return BY_ID[id] || BY_ID.none;
  }

  function isUnlocked(id, totalStars) {
    var item = get(id);
    return item.cost <= (totalStars || 0);
  }

  /* ---------- equipped persistence (degrades gracefully) ---------- */
  var EQUIP_KEY = "pip_cosmetic";

  function getEquipped() {
    try {
      var id = localStorage.getItem(EQUIP_KEY);
      return BY_ID[id] ? id : "none";
    } catch (e) {
      return "none";
    }
  }

  function setEquipped(id) {
    var safe = BY_ID[id] ? id : "none";
    try {
      localStorage.setItem(EQUIP_KEY, safe);
    } catch (e) {}
    return safe;
  }

  /* ---------- head anchor ----------
     For a green dino facing right the head center sits near the
     upper-front of the box. We work in the un-mirrored box and apply
     Pip's own facing flip so hats track which way he looks. */
  function headAnchor(p) {
    return {
      hx: p.x + p.w * 0.70,
      hy: p.y + p.h * 0.18,
      hr: p.w * 0.5          // matches sprites.js dino() head radius
    };
  }

  /* ---------- hats ---------- */
  function drawParty(ctx, hx, hy, hr) {
    var w = hr * 0.92, h = hr * 1.15;
    var baseY = hy - hr * 0.34;
    // cone
    var g = ctx.createLinearGradient(hx - w / 2, baseY - h, hx + w / 2, baseY);
    g.addColorStop(0, "#ff8fc4");
    g.addColorStop(1, "#ff5d8f");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(hx, baseY - h);
    ctx.lineTo(hx - w / 2, baseY);
    ctx.lineTo(hx + w / 2, baseY);
    ctx.closePath();
    ctx.fill();
    // zigzag trim
    ctx.fillStyle = "#fff3a0";
    for (var i = 0; i < 3; i++) {
      var zx = hx - w / 2 + (i + 0.5) * (w / 3);
      circle(ctx, zx, baseY - h * 0.16 * (i + 1) * 0.5 - 2, 3);
      ctx.fill();
    }
    // pom-pom
    ctx.fillStyle = "#ffe14d";
    circle(ctx, hx, baseY - h, 5);
    ctx.fill();
    // brim
    ctx.fillStyle = "#ff7eb6";
    roundRect(ctx, hx - w / 2 - 2, baseY - 4, w + 4, 7, 3);
    ctx.fill();
  }

  function drawCrown(ctx, hx, hy, hr) {
    var w = hr * 1.0, h = hr * 0.5;
    var baseY = hy - hr * 0.28;
    var topY = baseY - h;
    var left = hx - w / 2;
    var g = ctx.createLinearGradient(left, topY, left, baseY);
    g.addColorStop(0, "#ffe14d");
    g.addColorStop(1, "#f4b400");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(left, baseY);
    ctx.lineTo(left, topY + h * 0.4);
    ctx.lineTo(left + w * 0.25, topY);
    ctx.lineTo(hx, topY + h * 0.45);
    ctx.lineTo(left + w * 0.75, topY);
    ctx.lineTo(left + w, topY + h * 0.4);
    ctx.lineTo(left + w, baseY);
    ctx.closePath();
    ctx.fill();
    // band
    ctx.fillStyle = "#f4b400";
    roundRect(ctx, left, baseY - 5, w, 6, 2);
    ctx.fill();
    // jewels
    ctx.fillStyle = "#ff5d8f";
    circle(ctx, hx, baseY - 1, 3); ctx.fill();
    ctx.fillStyle = "#4cc0f0";
    circle(ctx, left + w * 0.22, baseY - 1, 2.4); ctx.fill();
    circle(ctx, left + w * 0.78, baseY - 1, 2.4); ctx.fill();
    // point tips
    ctx.fillStyle = "#fff3a0";
    circle(ctx, left + w * 0.25, topY, 2.6); ctx.fill();
    circle(ctx, hx, topY + h * 0.45, 2.6); ctx.fill();
    circle(ctx, left + w * 0.75, topY, 2.6); ctx.fill();
  }

  function drawExplorer(ctx, hx, hy, hr) {
    var w = hr * 1.18, h = hr * 0.5;
    var capY = hy - hr * 0.3;
    var left = hx - w / 2;
    // dome
    ctx.fillStyle = "#caa46a";
    ctx.beginPath();
    ctx.moveTo(left + w * 0.12, capY);
    ctx.quadraticCurveTo(hx, capY - h, left + w * 0.88, capY);
    ctx.closePath();
    ctx.fill();
    // band
    ctx.fillStyle = "#8a6b3a";
    roundRect(ctx, left + w * 0.1, capY - 5, w * 0.8, 6, 3);
    ctx.fill();
    // front brim (pokes forward, toward Pip's snout = +x)
    ctx.fillStyle = "#b8945c";
    ctx.beginPath();
    ctx.moveTo(left + w * 0.5, capY);
    ctx.quadraticCurveTo(left + w * 1.15, capY + 2, left + w * 1.18, capY + 7);
    ctx.quadraticCurveTo(left + w * 0.7, capY + 6, left + w * 0.5, capY + 2);
    ctx.closePath();
    ctx.fill();
    // back brim
    ctx.fillStyle = "#a8854c";
    ctx.beginPath();
    ctx.moveTo(left + w * 0.5, capY);
    ctx.quadraticCurveTo(left - w * 0.14, capY + 2, left - w * 0.16, capY + 6);
    ctx.quadraticCurveTo(left + w * 0.3, capY + 5, left + w * 0.5, capY + 2);
    ctx.closePath();
    ctx.fill();
  }

  function drawHat(ctx, id, hx, hy, hr) {
    if (id === "party") drawParty(ctx, hx, hy, hr);
    else if (id === "crown") drawCrown(ctx, hx, hy, hr);
    else if (id === "explorer") drawExplorer(ctx, hx, hy, hr);
  }

  /* ---------- tint overlay ----------
     A translucent colored silhouette roughly matching Pip's shape:
     rounded body ellipse + head circle. Cheap, no gradients. */
  function drawTint(ctx, p, color) {
    var cx = p.x + p.w / 2;
    var feet = p.y + p.h;
    var by = feet - p.h;
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = color;
    // body
    ctx.beginPath();
    ctx.ellipse(cx, by + p.h * 0.56, p.w * 0.52, p.h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // head (upper-front)
    var a = headAnchor(p);
    circle(ctx, a.hx, a.hy + p.h * 0.04, a.hr * 0.62);
    ctx.fill();
    ctx.restore();
  }

  /* ---------- public draw ----------
     Draws the EQUIPPED cosmetic on top of an already-drawn Pip.
     p = { x, y, w, h }; opts = { face } (Pip's facing, ±1). */
  function drawOn(ctx, p, opts) {
    var id = getEquipped();
    var item = get(id);
    if (item.type === "none") return;

    if (item.type === "tint") {
      drawTint(ctx, p, item.color);
      return;
    }

    // hat: mirror around Pip's center so it tracks facing, like dino()
    var face = (opts && opts.face) || 1;
    var cx = p.x + p.w / 2;
    var feet = p.y + p.h;
    var a = headAnchor(p);
    ctx.save();
    ctx.translate(cx, feet);
    ctx.scale(face, 1);
    ctx.translate(-cx, -feet);
    drawHat(ctx, id, a.hx, a.hy, a.hr);
    ctx.restore();
  }

  window.DINOCosmetics = {
    items: ITEMS,
    get: get,
    isUnlocked: isUnlocked,
    getEquipped: getEquipped,
    setEquipped: setEquipped,
    drawOn: drawOn
  };
})();
