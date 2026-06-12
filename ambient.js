/* Parallax ambient creatures for life + atmosphere. Pure decoration,
   no gameplay. All art is vector canvas ops, matching the sprites.js
   house style. IIFE attaches window.DINOAmbient — classic <script>, no
   ES modules, file:// compatible.

   Creatures live in SCREEN pixel space (0..w, 0..h), high in the sky,
   semi-transparent, drawn BEHIND the world so they read as distant
   background life. Counts are tiny (2-4), cheap, and recycled off-edge.

   API:
     DINOAmbient.update(dt, w, h, theme)   dt seconds; w,h = canvas CSS px
                                           theme = 'meadow'|'beach'|'night'
     DINOAmbient.render(ctx, w, h, t, theme)  draws in screen coords;
                                              t = elapsed seconds
*/
(function () {
  "use strict";

  var TAU = Math.PI * 2;

  function rand(a, b) { return a + Math.random() * (b - a); }

  // ---- per-biome creature sets ----------------------------------------
  // Each entry names which kinds populate the sky and how many. Counts are
  // kept tiny so the loop stays trivially cheap on phones.
  var SETS = {
    meadow: { kinds: ["bird"], count: 3 },
    beach:  { kinds: ["bird", "gull"], count: 3 },
    night:  { kinds: ["owl", "bat", "bat"], count: 3 },
    none:   { kinds: [], count: 0 }
  };

  function setFor(theme) {
    return SETS[theme] || SETS.meadow;
  }

  var current = "none";
  var creatures = [];
  var lastW = 0, lastH = 0;

  // ---- spawners. Each builds one creature drifting across the sky. -----
  // y is anchored to the upper band of the screen (0.08..0.42 of height) so
  // creatures sit clearly above the hills and gameplay. dir is +1 / -1 so
  // the flock isn't all moving the same way.
  function skyBand(h) { return rand(h * 0.08, h * 0.42); }

  function spawnBird(w, h, fresh) {
    var dir = Math.random() < 0.5 ? 1 : -1;
    return {
      kind: "bird",
      dir: dir,
      x: fresh ? rand(0, w) : (dir > 0 ? rand(-80, -30) : rand(w + 30, w + 80)),
      y: skyBand(h),
      scale: rand(0.7, 1.05),
      vx: rand(26, 44) * dir,
      flapHz: rand(1.6, 2.6),
      bobA: rand(3, 7),
      bobHz: rand(0.4, 0.8),
      phase: rand(0, TAU),
      alpha: rand(0.32, 0.5)
    };
  }

  // Seagull: bigger, slower, soars higher with a lazy wing beat.
  function spawnGull(w, h, fresh) {
    var dir = Math.random() < 0.5 ? 1 : -1;
    return {
      kind: "gull",
      dir: dir,
      x: fresh ? rand(0, w) : (dir > 0 ? rand(-110, -50) : rand(w + 50, w + 110)),
      y: rand(h * 0.06, h * 0.26),
      scale: rand(1.0, 1.4),
      vx: rand(18, 30) * dir,
      flapHz: rand(0.8, 1.4),
      bobA: rand(4, 9),
      bobHz: rand(0.25, 0.5),
      phase: rand(0, TAU),
      alpha: rand(0.3, 0.46)
    };
  }

  // Owl: slow, steady glide with very small wing motion.
  function spawnOwl(w, h, fresh) {
    var dir = Math.random() < 0.5 ? 1 : -1;
    return {
      kind: "owl",
      dir: dir,
      x: fresh ? rand(0, w) : (dir > 0 ? rand(-90, -40) : rand(w + 40, w + 90)),
      y: rand(h * 0.1, h * 0.34),
      scale: rand(0.9, 1.2),
      vx: rand(14, 24) * dir,
      flapHz: rand(0.7, 1.1),
      bobA: rand(2, 5),
      bobHz: rand(0.3, 0.5),
      phase: rand(0, TAU),
      alpha: rand(0.34, 0.5)
    };
  }

  // Bat: small, erratic, quick flutter.
  function spawnBat(w, h, fresh) {
    var dir = Math.random() < 0.5 ? 1 : -1;
    return {
      kind: "bat",
      dir: dir,
      x: fresh ? rand(0, w) : (dir > 0 ? rand(-70, -25) : rand(w + 25, w + 70)),
      y: rand(h * 0.08, h * 0.4),
      scale: rand(0.55, 0.85),
      vx: rand(34, 56) * dir,
      flapHz: rand(3.4, 5.2),
      bobA: rand(6, 13),
      bobHz: rand(0.8, 1.6),
      phase: rand(0, TAU),
      alpha: rand(0.34, 0.52)
    };
  }

  function spawnKind(kind, w, h, fresh) {
    if (kind === "bird") return spawnBird(w, h, fresh);
    if (kind === "gull") return spawnGull(w, h, fresh);
    if (kind === "owl") return spawnOwl(w, h, fresh);
    if (kind === "bat") return spawnBat(w, h, fresh);
    return null;
  }

  // (Re)build the flock for the current theme. fresh=true scatters them
  // across the screen so the sky already has life on level start.
  function rebuild(w, h) {
    creatures = [];
    var set = setFor(current);
    for (var i = 0; i < set.count; i++) {
      var kind = set.kinds[i % set.kinds.length];
      var c = spawnKind(kind, w, h, true);
      if (c) creatures.push(c);
    }
    lastW = w;
    lastH = h;
  }

  // ---- update. Move across the sky, recycle when fully off-edge. -------
  function update(dt, w, h, theme) {
    if (!theme) theme = "meadow";

    // Theme switch: swap the creature set and reseed.
    if (theme !== current) {
      current = theme;
      rebuild(w, h);
      return;
    }

    // Resize: rebuild so y-bands track the new canvas height.
    if (Math.abs(w - lastW) > 40 || Math.abs(h - lastH) > 40) {
      rebuild(w, h);
      return;
    }
    lastW = w; lastH = h;

    if (creatures.length === 0) return;

    // Clamp dt so a stalled tab doesn't teleport creatures across the sky.
    if (dt > 0.05) dt = 0.05;

    var margin = 90;
    for (var i = 0; i < creatures.length; i++) {
      var c = creatures[i];
      c.x += c.vx * dt;
      // Recycle once fully past the opposite edge, respawning the same kind.
      if (c.dir > 0 && c.x > w + margin) {
        creatures[i] = spawnKind(c.kind, w, h, false);
      } else if (c.dir < 0 && c.x < -margin) {
        creatures[i] = spawnKind(c.kind, w, h, false);
      }
    }
  }

  // ---- render helpers. Flap = sine-driven wing angle. ------------------
  // A bird/gull is two simple wing strokes that hinge at a central body.
  // flap in [-1,1] raises/lowers the wing tips. Drawn at origin; caller
  // has already translated + scaled + flipped for direction.
  function drawWingBird(ctx, flap, span, color) {
    var tip = span;
    var lift = flap * span * 0.55;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    // left wing
    ctx.moveTo(-tip, lift);
    ctx.quadraticCurveTo(-tip * 0.4, -lift * 0.6, 0, 0);
    // right wing
    ctx.quadraticCurveTo(tip * 0.4, -lift * 0.6, tip, lift);
    ctx.stroke();
  }

  // Gull: a fuller "M" silhouette with a small body dot.
  function drawWingGull(ctx, flap, span, color) {
    var tip = span;
    var lift = flap * span * 0.45;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(-tip, lift);
    ctx.quadraticCurveTo(-tip * 0.5, -lift, -tip * 0.18, lift * 0.25);
    ctx.quadraticCurveTo(0, -lift * 0.5, tip * 0.18, lift * 0.25);
    ctx.quadraticCurveTo(tip * 0.5, -lift, tip, lift);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, lift * 0.2, span * 0.1, 0, TAU);
    ctx.fill();
  }

  // Owl: a rounded body with two short, slowly-beating wings.
  function drawOwl(ctx, flap, span, body, wing) {
    var lift = flap * span * 0.4;
    // body
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, 0, span * 0.42, span * 0.55, 0, 0, TAU);
    ctx.fill();
    // wings
    ctx.strokeStyle = wing;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-span * 0.32, -span * 0.1);
    ctx.quadraticCurveTo(-span * 0.85, lift, -span * 0.5, span * 0.4);
    ctx.moveTo(span * 0.32, -span * 0.1);
    ctx.quadraticCurveTo(span * 0.85, lift, span * 0.5, span * 0.4);
    ctx.stroke();
  }

  // Bat: a small dark body with two jagged membrane wings.
  function drawBat(ctx, flap, span, color) {
    var tip = span;
    var lift = flap * span * 0.6;
    ctx.fillStyle = color;
    ctx.beginPath();
    // left wing membrane
    ctx.moveTo(0, 0);
    ctx.lineTo(-tip, lift);
    ctx.lineTo(-tip * 0.55, span * 0.18 - lift * 0.3);
    ctx.lineTo(-tip * 0.25, lift * 0.4);
    // body bridge
    ctx.lineTo(0, span * 0.12);
    // right wing membrane
    ctx.lineTo(tip * 0.25, lift * 0.4);
    ctx.lineTo(tip * 0.55, span * 0.18 - lift * 0.3);
    ctx.lineTo(tip, lift);
    ctx.closePath();
    ctx.fill();
  }

  function flapValue(c, t) {
    return Math.sin(t * c.flapHz * TAU + c.phase);
  }

  function render(ctx, w, h, t, theme) {
    if (!theme) theme = "meadow";
    // If render is called before the first update (or after a swap), make
    // sure the flock matches the requested theme without mutating motion.
    if (theme !== current) {
      current = theme;
      rebuild(w || lastW || 960, h || lastH || 540);
    }
    if (creatures.length === 0) return;

    var nightBird = (theme === "night");
    ctx.save();
    for (var i = 0; i < creatures.length; i++) {
      var c = creatures[i];
      var flap = flapValue(c, t);
      var bob = Math.cos(t * c.bobHz * TAU + c.phase) * c.bobA;
      ctx.globalAlpha = c.alpha;
      ctx.save();
      ctx.translate(c.x, c.y + bob);
      ctx.scale(c.scale * (c.dir < 0 ? -1 : 1), c.scale);

      if (c.kind === "bird") {
        drawWingBird(ctx, flap, 9, nightBird ? "#9aa6d6" : "#3a3f52");
      } else if (c.kind === "gull") {
        drawWingGull(ctx, flap, 13, "#f3f3f6");
      } else if (c.kind === "owl") {
        drawOwl(ctx, flap, 11, "#2a2f47", "#1a1e30");
      } else if (c.kind === "bat") {
        drawBat(ctx, flap, 8, "#1c1830");
      }
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  window.DINOAmbient = {
    update: update,
    render: render
  };
})();
