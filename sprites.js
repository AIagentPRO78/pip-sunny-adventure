/* Vector cartoon art. Everything is drawn with canvas shapes so the
   game needs zero image assets. All coordinates are in stage units. */
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

  /* ---------- background ---------- */
  var skyGrad = null, skyGradH = -1;
  function sky(ctx, w, h) {
    if (!skyGrad || skyGradH !== h) {
      skyGrad = ctx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, "#bdeaff");
      skyGrad.addColorStop(0.6, "#dff3ff");
      skyGrad.addColorStop(1, "#fef6d8");
      skyGradH = h;
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, h);
  }

  function sun(ctx, x, y, r, t) {
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

  function cloud(ctx, x, y, s) {
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    circle(ctx, x, y, 26 * s); ctx.fill();
    circle(ctx, x + 28 * s, y + 6 * s, 20 * s); ctx.fill();
    circle(ctx, x - 28 * s, y + 8 * s, 18 * s); ctx.fill();
    roundRect(ctx, x - 44 * s, y + 4 * s, 90 * s, 22 * s, 11 * s); ctx.fill();
  }

  function hill(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.quadraticCurveTo(x + w / 2, y - h, x + w, y + h);
    ctx.closePath();
    ctx.fill();
  }

  function tree(ctx, x, groundY, s) {
    ctx.fillStyle = "#b9783f";
    roundRect(ctx, x - 7 * s, groundY - 60 * s, 14 * s, 60 * s, 6 * s);
    ctx.fill();
    ctx.fillStyle = "#57b54a";
    circle(ctx, x, groundY - 78 * s, 34 * s); ctx.fill();
    circle(ctx, x - 26 * s, groundY - 60 * s, 24 * s); ctx.fill();
    circle(ctx, x + 26 * s, groundY - 60 * s, 24 * s); ctx.fill();
    ctx.fillStyle = "#6fcf57";
    circle(ctx, x - 8 * s, groundY - 86 * s, 20 * s); ctx.fill();
  }

  function bush(ctx, x, groundY, s) {
    ctx.fillStyle = "#4fb84a";
    circle(ctx, x, groundY - 14 * s, 20 * s); ctx.fill();
    circle(ctx, x - 20 * s, groundY - 8 * s, 16 * s); ctx.fill();
    circle(ctx, x + 20 * s, groundY - 8 * s, 16 * s); ctx.fill();
  }

  /* ---------- ground / platforms ---------- */
  function ground(ctx, x, y, w, h) {
    ctx.fillStyle = "#8b5a2b";
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = "#6fcf57";
    roundRect(ctx, x, y, w, 18, 8);
    ctx.fill();
    ctx.fillStyle = "#5bbd46";
    for (var gx = x + 10; gx < x + w - 6; gx += 26) {
      ctx.beginPath();
      ctx.moveTo(gx, y + 4);
      ctx.lineTo(gx + 5, y - 8);
      ctx.lineTo(gx + 10, y + 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  function platform(ctx, x, y, w, h) {
    ctx.fillStyle = "#c08552";
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.fillStyle = "#7ed268";
    roundRect(ctx, x, y, w, 14, 10);
    ctx.fill();
  }

  /* ---------- collectibles ---------- */
  function apple(ctx, x, y, t) {
    var bob = Math.sin(t * 3 + x) * 3;
    y += bob;
    ctx.fillStyle = "#3a7d2c";
    roundRect(ctx, x - 1, y - 16, 4, 9, 2); ctx.fill();
    ctx.fillStyle = "#79d36a";
    ctx.beginPath();
    ctx.ellipse(x + 7, y - 13, 7, 4, -0.6, 0, Math.PI * 2);
    ctx.fill();
    var g = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, 14);
    g.addColorStop(0, "#ff9a9a");
    g.addColorStop(1, "#ed4d4d");
    ctx.fillStyle = g;
    circle(ctx, x, y, 12); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    circle(ctx, x - 4, y - 4, 3); ctx.fill();
  }

  function egg(ctx, x, y, t) {
    var bob = Math.sin(t * 3 + x) * 3;
    y += bob;
    ctx.fillStyle = "#fff3d4";
    ctx.beginPath();
    ctx.ellipse(x, y, 11, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffd07a";
    circle(ctx, x - 3, y + 2, 2.2); ctx.fill();
    circle(ctx, x + 4, y - 3, 1.8); ctx.fill();
    circle(ctx, x + 2, y + 6, 1.6); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.beginPath();
    ctx.ellipse(x - 4, y - 5, 2.5, 4, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function star(ctx, x, y, t) {
    var bob = Math.sin(t * 3 + x) * 4;
    var spin = Math.sin(t * 2 + x) * 0.3;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(spin);
    var spikes = 5, outer = 13, inner = 5.5;
    ctx.beginPath();
    for (var i = 0; i < spikes * 2; i++) {
      var rad = i % 2 === 0 ? outer : inner;
      var a = (Math.PI / spikes) * i - Math.PI / 2;
      ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
    }
    ctx.closePath();
    ctx.fillStyle = "#ffce3a";
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    circle(ctx, -3, -3, 2.5); ctx.fill();
    ctx.restore();
  }

  /* ---------- steak power-up ---------- */
  function steak(ctx, x, y, t) {
    var bob = Math.sin(t * 3 + x) * 3;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(-0.12);
    // bone
    ctx.fillStyle = "#fff7e6";
    roundRect(ctx, 8, -4, 15, 8, 4); ctx.fill();
    circle(ctx, 23, -5, 4.5); ctx.fill();
    circle(ctx, 23, 4, 4.5); ctx.fill();
    // meat
    var g = ctx.createRadialGradient(-4, -4, 3, 0, 0, 20);
    g.addColorStop(0, "#d06a34");
    g.addColorStop(1, "#8f3f1e");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(-2, 0, 17, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    // fat rim
    ctx.lineWidth = 3.5; ctx.strokeStyle = "#f3cf96";
    ctx.beginPath();
    ctx.ellipse(-2, 0, 15, 11, 0, 0, Math.PI * 2);
    ctx.stroke();
    // shine
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath();
    ctx.ellipse(-6, -5, 5, 3, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  /* ---------- crate block ---------- */
  function block(ctx, x, y, s, popped, t) {
    var w = 44, h = 44;
    ctx.fillStyle = popped ? "#b9a98f" : "#e8a43c";
    roundRect(ctx, x, y, w, h, 7); ctx.fill();
    ctx.fillStyle = popped ? "#a2916f" : "#cf8a26";
    ctx.lineWidth = 0;
    roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 5);
    ctx.strokeStyle = popped ? "#a2916f" : "#cf8a26";
    ctx.lineWidth = 3;
    ctx.stroke();
    if (!popped) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 28px " + "Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      var pulse = 1 + Math.sin(t * 5 + x) * 0.06;
      ctx.save();
      ctx.translate(x + w / 2, y + h / 2 + 1);
      ctx.scale(pulse, pulse);
      ctx.fillText("?", 0, 0);
      ctx.restore();
    }
  }

  /* ---------- butterfly ---------- */
  function butterfly(ctx, b, t) {
    var flap = Math.sin(t * 12 + b.seed) * 0.6;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = b.color;
    ctx.save(); ctx.rotate(-flap);
    ctx.beginPath(); ctx.ellipse(-6, 0, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.save(); ctx.rotate(flap);
    ctx.beginPath(); ctx.ellipse(6, 0, 7, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = "#3b2f4d";
    roundRect(ctx, -1.5, -6, 3, 12, 1.5); ctx.fill();
    ctx.restore();
  }

  /* ---------- friendly critter (bouncy blob) ---------- */
  function critter(ctx, cr, t) {
    var x = cr.x, y = cr.y;
    var squish = cr.squish || 0;
    var bw = 38 * (1 + squish * 0.4);
    var bh = 34 * (1 - squish * 0.5);
    var bob = Math.sin(t * 4 + x) * 2 * (1 - squish);
    ctx.save();
    ctx.translate(x, y + bob);
    // feet
    ctx.fillStyle = "#c98bd6";
    circle(ctx, -9, bh / 2 - 2, 6); ctx.fill();
    circle(ctx, 9, bh / 2 - 2, 6); ctx.fill();
    // body
    var g = ctx.createRadialGradient(-6, -8, 4, 0, 0, bw / 2 + 6);
    g.addColorStop(0, "#e7a6f0");
    g.addColorStop(1, "#c46fd6");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, bw / 2, bh / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // cheeks
    ctx.fillStyle = "rgba(255,150,190,0.6)";
    circle(ctx, -10, 4, 4); ctx.fill();
    circle(ctx, 10, 4, 4); ctx.fill();
    // eyes
    var ey = -4 - (squish ? 0 : 0);
    ctx.fillStyle = "#fff";
    circle(ctx, -8, ey, 6); ctx.fill();
    circle(ctx, 8, ey, 6); ctx.fill();
    ctx.fillStyle = "#3b2f4d";
    var blink = cr.squish > 0.1;
    if (blink) {
      ctx.lineWidth = 2; ctx.strokeStyle = "#3b2f4d";
      ctx.beginPath(); ctx.moveTo(-11, ey); ctx.lineTo(-5, ey);
      ctx.moveTo(5, ey); ctx.lineTo(11, ey); ctx.stroke();
    } else {
      circle(ctx, -7, ey, 2.6); ctx.fill();
      circle(ctx, 9, ey, 2.6); ctx.fill();
    }
    // smile
    ctx.strokeStyle = "#3b2f4d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 4, 5, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  /* ---------- flag ---------- */
  function flag(ctx, x, groundY, wave) {
    var poleTop = groundY - 150;
    ctx.fillStyle = "#cdd6df";
    roundRect(ctx, x - 4, poleTop, 8, 150, 4); ctx.fill();
    circle(ctx, x, poleTop, 7); ctx.fillStyle = "#ffce3a"; ctx.fill();
    ctx.fillStyle = "#ff5d8f";
    ctx.beginPath();
    ctx.moveTo(x + 4, poleTop + 6);
    ctx.quadraticCurveTo(x + 50 + wave, poleTop + 18, x + 92, poleTop + 6);
    ctx.quadraticCurveTo(x + 50 - wave, poleTop + 30, x + 92, poleTop + 44);
    ctx.quadraticCurveTo(x + 50 + wave, poleTop + 34, x + 4, poleTop + 46);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 20px Trebuchet MS, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("GOAL", x + 46, poleTop + 25);
  }

  /* ---------- a clawed T-rex foot ---------- */
  function trexFoot(ctx, x, y, color) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y - 9, 26, 10, 4); ctx.fill();
    ctx.fillStyle = "#fffdf2";
    for (var i = 0; i < 3; i++) {
      var tx = x + 4 + i * 8;
      ctx.beginPath();
      ctx.moveTo(tx, y + 1);
      ctx.lineTo(tx + 3, y + 6);
      ctx.lineTo(tx + 6, y + 1);
      ctx.closePath();
      ctx.fill();
    }
  }

  /* ---------- Pip the T-rex ----------
     p = { x, y, w, h } top-left box. opts: face, run (phase),
     squash, mouth (0..1 roar), blink */
  function dino(ctx, p, opts) {
    var cx = p.x + p.w / 2;
    var feet = p.y + p.h;
    var face = opts.face || 1;
    var sq = opts.squash || 0;            // -1 stretch .. 1 squash
    var mouth = opts.mouth || 0;
    var run = opts.run || 0;
    var moving = opts.moving;
    var idle = (!moving && !opts.blink) ? (opts.idle || 0) : 0;   // breathing phase when standing
    var cheer = opts.cheer || 0;                                  // 0..1 happy reaction
    var breath = idle ? Math.sin(idle * 2.2) * 0.02 : 0;
    var cheerPop = cheer > 0 ? Math.sin(cheer * Math.PI) * 0.12 : 0;

    var bodyW = p.w * (1 + sq * 0.16 + cheerPop * 0.6);
    var bodyH = p.h * (1 - sq * 0.14 + breath + cheerPop);
    var by = feet - bodyH;

    var green = "#7fd06f", greenD = "#4ea744", greenM = "#69c259", belly = "#eaf8d0";

    ctx.save();
    ctx.translate(cx, feet);
    ctx.scale(face, 1);
    ctx.translate(-cx, -feet);

    var sw = moving ? Math.sin(run) * 6 : (idle ? Math.sin(idle * 1.6) * 3 : 0);

    // ---- tail (thick, tapering, behind) ----
    ctx.fillStyle = greenD;
    ctx.beginPath();
    ctx.moveTo(cx - bodyW * 0.12, by + bodyH * 0.4);
    ctx.quadraticCurveTo(cx - bodyW * 1.02, feet - bodyH * 0.5, cx - bodyW * 0.98, feet - 8);
    ctx.quadraticCurveTo(cx - bodyW * 0.5, feet - 3, cx - bodyW * 0.04, by + bodyH * 0.72);
    ctx.closePath();
    ctx.fill();

    // ---- back leg (behind body) ----
    ctx.fillStyle = greenD;
    roundRect(ctx, cx - 24, feet - 28, 16, 28, 7); ctx.fill();
    trexFoot(ctx, cx - 30 - sw, feet, greenD);

    // ---- body (big rounded torso leaning forward) ----
    var bg = ctx.createLinearGradient(0, by, 0, feet);
    bg.addColorStop(0, green);
    bg.addColorStop(1, "#54b14a");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(cx, by + bodyH * 0.56, bodyW * 0.52, bodyH * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    // belly patch
    ctx.fillStyle = belly;
    ctx.beginPath();
    ctx.ellipse(cx + bodyW * 0.08, by + bodyH * 0.64, bodyW * 0.3, bodyH * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    // ---- back ridges (little bumps) ----
    ctx.fillStyle = greenD;
    for (var i = 0; i < 4; i++) {
      var rx = cx - bodyW * 0.36 + i * bodyW * 0.2;
      var ry = by + bodyH * 0.22 + i * 1.5;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.quadraticCurveTo(rx + 5, ry - 9, rx + 11, ry);
      ctx.closePath();
      ctx.fill();
    }

    // ---- front leg (big thigh + shin) ----
    ctx.fillStyle = greenM;
    ctx.beginPath();
    ctx.ellipse(cx + bodyW * 0.16, feet - 24, 17, 21, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = greenD;
    roundRect(ctx, cx + bodyW * 0.08, feet - 24, 16, 24, 7); ctx.fill();
    trexFoot(ctx, cx + bodyW * 0.02 + sw, feet, green);

    // ---- tiny arm (signature T-rex) ----
    ctx.fillStyle = greenM;
    roundRect(ctx, cx + bodyW * 0.2, by + bodyH * 0.46, 13, 7, 3.5); ctx.fill();
    ctx.fillStyle = "#fffdf2";
    var ax = cx + bodyW * 0.2 + 13, ay = by + bodyH * 0.49;
    ctx.beginPath();
    ctx.moveTo(ax, ay - 2); ctx.lineTo(ax + 4, ay); ctx.lineTo(ax, ay + 2);
    ctx.closePath(); ctx.fill();

    // ---- head (large, jaw forward) ----
    var hr = p.w * 0.5;
    var hx = cx + bodyW * 0.2;
    var hy = by + bodyH * 0.05;
    ctx.fillStyle = green;
    roundRect(ctx, hx - hr * 0.6, hy - hr * 0.72, hr * 1.3, hr * 1.28, hr * 0.5);
    ctx.fill();
    // upper jaw / snout extending forward
    ctx.fillStyle = greenM;
    roundRect(ctx, hx + hr * 0.1, hy - hr * 0.45, hr * 1.2, hr * 0.82, hr * 0.3);
    ctx.fill();

    var mouthY = hy + hr * 0.38;
    var jaw = mouth * hr * 0.55;
    // lower jaw
    ctx.fillStyle = greenM;
    roundRect(ctx, hx + hr * 0.15, mouthY + jaw * 0.5, hr * 1.05, hr * 0.38, hr * 0.18);
    ctx.fill();
    // open mouth interior + tongue on roar
    if (mouth > 0.05) {
      ctx.fillStyle = "#b3324a";
      roundRect(ctx, hx + hr * 0.2, mouthY - 1, hr * 0.95, jaw + 4, 4); ctx.fill();
      ctx.fillStyle = "#ff7a93";
      roundRect(ctx, hx + hr * 0.42, mouthY + jaw * 0.5, hr * 0.5, jaw * 0.4 + 2, 3); ctx.fill();
    }
    // upper teeth
    ctx.fillStyle = "#fffdf2";
    for (var ti = 0; ti < 5; ti++) {
      var tx2 = hx + hr * 0.22 + ti * hr * 0.2;
      ctx.beginPath();
      ctx.moveTo(tx2, mouthY);
      ctx.lineTo(tx2 + hr * 0.07, mouthY + hr * 0.17);
      ctx.lineTo(tx2 + hr * 0.14, mouthY);
      ctx.closePath();
      ctx.fill();
    }
    // mouth line
    ctx.strokeStyle = greenD; ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.15, mouthY);
    ctx.lineTo(hx + hr * 1.25, mouthY);
    ctx.stroke();
    // nostril
    ctx.fillStyle = greenD;
    circle(ctx, hx + hr * 1.12, hy - hr * 0.12, 2.4); ctx.fill();

    // eye (big friendly)
    ctx.fillStyle = "#fff";
    circle(ctx, hx + hr * 0.36, hy - hr * 0.24, hr * 0.34); ctx.fill();
    ctx.fillStyle = "#2b2440";
    if (opts.blink) {
      ctx.lineWidth = 3; ctx.strokeStyle = "#2b2440";
      ctx.beginPath();
      ctx.moveTo(hx + hr * 0.16, hy - hr * 0.24);
      ctx.lineTo(hx + hr * 0.56, hy - hr * 0.24);
      ctx.stroke();
    } else {
      circle(ctx, hx + hr * 0.45, hy - hr * 0.26, hr * 0.16); ctx.fill();
      ctx.fillStyle = "#fff";
      circle(ctx, hx + hr * 0.5, hy - hr * 0.3, hr * 0.055); ctx.fill();
    }
    // brow ridge (cute-fierce)
    ctx.strokeStyle = greenD; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.06, hy - hr * 0.62);
    ctx.lineTo(hx + hr * 0.62, hy - hr * 0.5);
    ctx.stroke();

    // ---- happy cheer sparkles (power-up / rescue reaction) ----
    if (cheer > 0) {
      var ce = Math.sin(cheer * Math.PI);
      ctx.globalAlpha = ce;
      var ex = hx + hr * 0.3, ey = hy - hr * 0.95 - (1 - cheer) * 10;
      star(ctx, ex, ey, idle || run);
      ctx.fillStyle = "#ff7aa8";
      circle(ctx, ex + 11, ey + 5, 2.4 * ce); ctx.fill();
      circle(ctx, ex - 12, ey + 7, 2 * ce); ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  /* ---------- particles ---------- */
  function particle(ctx, p) {
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / p.max));
    if (p.type === "heart") {
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.beginPath();
      ctx.moveTo(0, 3);
      ctx.bezierCurveTo(-5, -3, -9, 2, 0, 8);
      ctx.bezierCurveTo(9, 2, 5, -3, 0, 3);
      ctx.fill();
      ctx.restore();
    } else if (p.type === "confetti") {
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot || 0);
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    } else if (p.type === "dizzy") {
      ctx.fillStyle = p.color;
      star(ctx, p.x, p.y, 0);
    } else {
      ctx.fillStyle = p.color;
      circle(ctx, p.x, p.y, p.r || 3);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function ring(ctx, x, y, r, alpha) {
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = "#ff5d8f";
    ctx.lineWidth = 6;
    circle(ctx, x, y, r);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  /* ---------- power-up foods ---------- */
  function chili(ctx, x, y, t) {
    var bob = Math.sin(t * 3 + x) * 3;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.rotate(0.2);
    ctx.strokeStyle = "#5aa84a"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, -12); ctx.lineTo(4, -19); ctx.stroke();
    ctx.fillStyle = "#5aa84a"; circle(ctx, 4, -19, 3); ctx.fill();
    var g = ctx.createLinearGradient(-8, -12, 8, 18);
    g.addColorStop(0, "#ff5b4d"); g.addColorStop(1, "#d62f23");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-6, -10);
    ctx.quadraticCurveTo(11, -10, 8, 6);
    ctx.quadraticCurveTo(5, 20, -2, 20);
    ctx.quadraticCurveTo(-10, 10, -6, -10);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.beginPath(); ctx.ellipse(-2, -1, 2, 6, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function balloon(ctx, x, y, t) {
    var sway = Math.sin(t * 2 + x) * 4;
    ctx.save();
    ctx.translate(x + sway, y);
    ctx.strokeStyle = "#b9c2cc"; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, 13); ctx.quadraticCurveTo(4, 22, 0, 30); ctx.stroke();
    var g = ctx.createRadialGradient(-4, -5, 2, 0, 2, 17);
    g.addColorStop(0, "#9fd4ff"); g.addColorStop(1, "#4cc0f0");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, 13, 16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#4cc0f0";
    ctx.beginPath(); ctx.moveTo(-3, 14); ctx.lineTo(3, 14); ctx.lineTo(0, 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    ctx.beginPath(); ctx.ellipse(-5, -6, 3, 5, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function lolly(ctx, x, y, t) {
    var bob = Math.sin(t * 3 + x) * 3;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, 22); ctx.stroke();
    ctx.save();
    ctx.rotate(t * 2);
    var cols = ["#ff5d8f", "#ffb14d", "#ffe14d", "#6fe06f", "#5ec8ff", "#c08fff"];
    for (var i = 0; i < 6; i++) {
      ctx.fillStyle = cols[i];
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, 13, i * Math.PI / 3, (i + 1) * Math.PI / 3);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,0.85)"; circle(ctx, -3, -4, 3); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,0.5)";
    circle(ctx, 0, 0, 13); ctx.stroke();
    ctx.restore();
  }

  /* ---------- bounce pad (trampoline) ---------- */
  function bouncePad(ctx, x, y, w, squish) {
    var top = 16 * (1 - (squish || 0) * 0.55);
    ctx.fillStyle = "#7a4bd0";
    roundRect(ctx, x + 5, y + 8, w - 10, 10, 4); ctx.fill();
    var g = ctx.createLinearGradient(0, y + (16 - top), 0, y + 16);
    g.addColorStop(0, "#ff9ec8"); g.addColorStop(1, "#ff5d8f");
    ctx.fillStyle = g;
    roundRect(ctx, x, y + (16 - top), w, top + 4, 9); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    roundRect(ctx, x + 8, y + (16 - top) + 3, w - 16, 4, 2); ctx.fill();
  }

  /* ---------- cage (around the trapped baby) ---------- */
  function cage(ctx, x, y, w, h, t) {
    ctx.strokeStyle = "#aab4be"; ctx.lineWidth = 4;
    for (var bx = x + 7; bx <= x + w - 5; bx += 14) {
      ctx.beginPath(); ctx.moveTo(bx, y + 3); ctx.lineTo(bx, y + h); ctx.stroke();
    }
    ctx.lineWidth = 5; ctx.strokeStyle = "#7e8b98";
    ctx.beginPath();
    ctx.moveTo(x, y + 3); ctx.lineTo(x + w, y + 3);
    ctx.moveTo(x, y + h); ctx.lineTo(x + w, y + h);
    ctx.stroke();
    ctx.fillStyle = "#7e8b98";
    roundRect(ctx, x + w / 2 - 7, y - 6, 14, 10, 3); ctx.fill();
  }

  /* ---------- baby dino (the one you rescue) ---------- */
  function babyDino(ctx, p, opts) {
    var cx = p.x + p.w / 2, feet = p.y + p.h, face = opts.face || 1;
    var by = feet - p.h, bw = p.w;
    ctx.save();
    ctx.translate(cx, feet); ctx.scale(face, 1); ctx.translate(-cx, -feet);
    // tail
    ctx.fillStyle = "#8ad77a";
    ctx.beginPath();
    ctx.moveTo(cx - bw * 0.18, by + p.h * 0.5);
    ctx.quadraticCurveTo(cx - bw * 0.7, feet - 6, cx - bw * 0.52, feet - 2);
    ctx.quadraticCurveTo(cx - bw * 0.2, feet - 2, cx - bw * 0.04, by + p.h * 0.72);
    ctx.closePath(); ctx.fill();
    // legs
    ctx.fillStyle = "#6fc25e";
    roundRect(ctx, cx - 9, feet - 11, 8, 11, 4); ctx.fill();
    roundRect(ctx, cx + 2, feet - 11, 8, 11, 4); ctx.fill();
    // body
    ctx.fillStyle = "#8ad77a";
    ctx.beginPath(); ctx.ellipse(cx, by + p.h * 0.55, bw * 0.5, p.h * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#eaf8d0";
    ctx.beginPath(); ctx.ellipse(cx + 2, by + p.h * 0.62, bw * 0.27, p.h * 0.33, 0, 0, Math.PI * 2); ctx.fill();
    // head
    var hr = p.w * 0.43, hx = cx + bw * 0.15, hy = by + p.h * 0.14;
    ctx.fillStyle = "#8ad77a"; circle(ctx, hx, hy, hr); ctx.fill();
    ctx.fillStyle = "#7fce6e";
    roundRect(ctx, hx + hr * 0.15, hy - 2, hr * 0.9, hr * 0.7, hr * 0.3); ctx.fill();
    // eye
    ctx.fillStyle = "#fff"; circle(ctx, hx + hr * 0.28, hy - hr * 0.22, hr * 0.34); ctx.fill();
    ctx.fillStyle = "#2b2440"; circle(ctx, hx + hr * 0.36, hy - hr * 0.22, hr * 0.17); ctx.fill();
    ctx.restore();
  }

  /* ---------- checkpoint flag (smaller; raises when reached) ---------- */
  function checkFlag(ctx, x, groundY, raised, wave) {
    var poleH = 96, poleTop = groundY - poleH;
    ctx.fillStyle = "#cdd6df";
    roundRect(ctx, x - 3, poleTop, 6, poleH, 3); ctx.fill();
    circle(ctx, x, poleTop, 5); ctx.fillStyle = "#9be8ff"; ctx.fill();
    var rise = Math.max(0, Math.min(1, raised));
    var fy = poleTop + (1 - rise) * (poleH - 30) + 4;
    var w = wave || 0;
    ctx.fillStyle = rise > 0.5 ? "#ff5d8f" : "#9bb7a0";
    ctx.beginPath();
    ctx.moveTo(x + 3, fy);
    ctx.quadraticCurveTo(x + 26 + w * 6, fy + 6, x + 44, fy);
    ctx.lineTo(x + 44, fy + 26);
    ctx.quadraticCurveTo(x + 26 - w * 6, fy + 20, x + 3, fy + 26);
    ctx.closePath();
    ctx.fill();
  }

  /* ---------- gold coin (spins via t) ---------- */
  function coin(ctx, x, y, t) {
    var bob = Math.sin(t * 3 + x) * 3;
    var spin = Math.cos(t * 4 + x * 0.05);
    var rx = Math.max(2.5, Math.abs(spin) * 12);
    var edge = spin < 0;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = "#b8860b";
    ctx.beginPath(); ctx.ellipse(0, 1.5, rx + 1.5, 13.5, 0, 0, Math.PI * 2); ctx.fill();
    var g = ctx.createLinearGradient(-rx, -12, rx, 12);
    g.addColorStop(0, edge ? "#d9a521" : "#ffe27a");
    g.addColorStop(1, edge ? "#a9781a" : "#f4b400");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, rx, 12, 0, 0, Math.PI * 2); ctx.fill();
    if (rx > 6) {
      ctx.lineWidth = 1.5; ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath(); ctx.ellipse(0, 0, rx - 2.5, 9, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.save();
      ctx.scale(rx / 12, 1);
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      var sp = 5, o = 5, inr = 2.1;
      ctx.beginPath();
      for (var i = 0; i < sp * 2; i++) {
        var rad = i % 2 === 0 ? o : inr;
        var a = (Math.PI / sp) * i - Math.PI / 2;
        ctx.lineTo(Math.cos(a) * rad, Math.sin(a) * rad);
      }
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    circle(ctx, -rx * 0.4, -5, 1.8); ctx.fill();
    ctx.restore();
  }

  window.DINOSprites = {
    sky: sky, sun: sun, cloud: cloud, hill: hill, tree: tree, bush: bush,
    ground: ground, platform: platform, apple: apple, egg: egg, star: star,
    steak: steak, block: block, butterfly: butterfly, critter: critter, flag: flag,
    dino: dino, particle: particle, ring: ring,
    chili: chili, balloon: balloon, lolly: lolly, bouncePad: bouncePad,
    cage: cage, babyDino: babyDino, checkFlag: checkFlag, coin: coin
  };
})();
