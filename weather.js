/* Ambient weather overlay. Pure canvas vector ops, no images.
   Draws in SCREEN pixel space (0..w, 0..h) so it is not affected by the
   camera or world zoom. Attaches window.DINOWeather.

   API:
     DINOWeather.set(type, reduceMotion)   type: 'petals'|'leaves'|'rain'|'fireflies'|'none'
     DINOWeather.update(dt, w, h)          dt seconds; w,h = canvas CSS pixel size
     DINOWeather.render(ctx, w, h, t)      draws in screen coords; t = elapsed seconds
*/
(function () {
  "use strict";

  // Particle counts scale with screen area so phones stay light. A 960x540
  // reference screen gets the base count; bigger screens add a few more, but
  // everything is hard-capped so the loop never gets expensive.
  var REF_AREA = 960 * 540;
  var COUNT = {
    petals: 42,
    leaves: 38,
    rain: 55,
    fireflies: 30,
    snow: 46,
    none: 0
  };
  var MAX_PARTICLES = 60;

  var current = "none";
  var reduce = false;
  var particles = [];
  var lastW = 0, lastH = 0;

  var TAU = Math.PI * 2;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[(Math.random() * arr.length) | 0]; }

  // How many particles for this type at this screen size.
  function targetCount(type, w, h) {
    var base = COUNT[type] || 0;
    if (base === 0) return 0;
    var areaScale = Math.sqrt((w * h) / REF_AREA);
    var n = Math.round(base * Math.min(1.4, Math.max(0.5, areaScale)));
    if (reduce) n = Math.round(n * 0.5);
    return Math.max(0, Math.min(MAX_PARTICLES, n));
  }

  var PETAL_COLORS = ["#ffc7dd", "#ffb3d1", "#ffd9e8", "#f7a8c8"];
  var LEAF_COLORS = ["#e8843c", "#d4582a", "#f0b429", "#c0863a", "#e0a030"];

  // ---- spawners. Each builds one particle of the given type. ----
  function spawnPetal(w, h, fresh) {
    var slow = reduce ? 0.6 : 1;
    return {
      x: rand(0, w),
      y: fresh ? rand(-h, 0) : rand(-40, -8),
      r: rand(5, 9),
      vy: rand(28, 52) * slow,
      swayA: rand(14, 30),
      swayHz: rand(0.3, 0.7),
      rot: rand(0, TAU),
      vrot: rand(-0.7, 0.7) * slow,
      phase: rand(0, TAU),
      color: pick(PETAL_COLORS),
      alpha: rand(0.55, 0.85)
    };
  }

  function spawnLeaf(w, h, fresh) {
    var slow = reduce ? 0.6 : 1;
    return {
      x: rand(0, w),
      y: fresh ? rand(-h, 0) : rand(-46, -10),
      r: rand(6, 11),
      vy: rand(34, 60) * slow,
      swayA: rand(18, 36),
      swayHz: rand(0.25, 0.6),
      rot: rand(0, TAU),
      vrot: rand(-1.4, 1.4) * slow,
      phase: rand(0, TAU),
      color: pick(LEAF_COLORS),
      alpha: rand(0.55, 0.8)
    };
  }

  function spawnRain(w, h, fresh) {
    var slow = reduce ? 0.7 : 1;
    return {
      x: rand(-40, w),
      y: fresh ? rand(-h, h) : rand(-30, -6),
      len: rand(10, 18),
      vy: rand(620, 820) * slow,
      vx: rand(90, 150) * slow,
      alpha: rand(0.18, 0.34)
    };
  }

  function spawnFirefly(w, h, fresh) {
    var slow = reduce ? 0.55 : 1;
    return {
      x: rand(0, w),
      y: fresh ? rand(0, h) : rand(0, h),
      r: rand(1.8, 3.4),
      driftA: rand(10, 26),
      driftHz: rand(0.08, 0.22),
      bobA: rand(8, 20),
      bobHz: rand(0.15, 0.4),
      vx: rand(-12, 12) * slow,
      twHz: rand(0.4, 1.1),
      phase: rand(0, TAU),
      baseX: 0,
      baseY: 0
    };
  }

  function spawnSnow(w, h, fresh) {
    var slow = reduce ? 0.6 : 1;
    return {
      x: rand(0, w),
      y: fresh ? rand(-h, 0) : rand(-30, -6),
      r: rand(2, 5),
      vy: rand(22, 42) * slow,
      swayA: rand(10, 26),
      swayHz: rand(0.2, 0.5),
      phase: rand(0, TAU),
      alpha: rand(0.6, 0.95)
    };
  }

  function spawn(type, w, h, fresh) {
    if (type === "petals") return spawnPetal(w, h, fresh);
    if (type === "leaves") return spawnLeaf(w, h, fresh);
    if (type === "rain") return spawnRain(w, h, fresh);
    if (type === "fireflies") return spawnFirefly(w, h, fresh);
    if (type === "snow") return spawnSnow(w, h, fresh);
    return null;
  }

  // (Re)build the pool sized to the screen. Existing particles are scattered
  // across the screen (fresh=true) so weather is already present on level start.
  function rebuild(w, h) {
    particles = [];
    var n = targetCount(current, w, h);
    for (var i = 0; i < n; i++) {
      var p = spawn(current, w, h, true);
      if (p) {
        if (current === "fireflies") { p.baseX = p.x; p.baseY = p.y; }
        particles.push(p);
      }
    }
    lastW = w;
    lastH = h;
  }

  function set(type, reduceMotion) {
    if (type !== "petals" && type !== "leaves" && type !== "rain" &&
        type !== "fireflies" && type !== "snow" && type !== "none") {
      type = "none";
    }
    current = type;
    reduce = !!reduceMotion;
    if (type === "none") {
      particles = [];
      return;
    }
    rebuild(lastW || 960, lastH || 540);
  }

  // ---- update. Recycle anything that leaves the screen. ----
  function update(dt, w, h) {
    if (current === "none" || particles.length === 0) {
      lastW = w; lastH = h;
      return;
    }
    // Resize: rebuild the pool if the screen changed meaningfully.
    if (Math.abs(w - lastW) > 40 || Math.abs(h - lastH) > 40) {
      rebuild(w, h);
      return;
    }
    lastW = w; lastH = h;

    // Clamp dt so a stalled tab doesn't teleport particles off screen.
    if (dt > 0.05) dt = 0.05;

    var i, p;
    if (current === "fireflies") {
      for (i = 0; i < particles.length; i++) {
        p = particles[i];
        p.baseX += p.vx * dt;
        // wrap horizontally so they roam the whole screen
        if (p.baseX < -30) p.baseX = w + 30;
        else if (p.baseX > w + 30) p.baseX = -30;
        p.x = p.baseX;
        p.y = p.baseY;
      }
      return;
    }

    for (i = 0; i < particles.length; i++) {
      p = particles[i];
      p.y += p.vy * dt;
      if (current === "rain") {
        p.x += p.vx * dt;
        if (p.y > h + p.len || p.x > w + 40) {
          particles[i] = spawnRain(w, h, false);
        }
      } else if (current === "snow") {
        // flakes just drift down; sway is applied at draw time
        if (p.y - p.r > h) particles[i] = spawnSnow(w, h, false);
      } else {
        // petals / leaves
        p.rot += p.vrot * dt;
        if (p.y - p.r > h) {
          particles[i] = (current === "petals")
            ? spawnPetal(w, h, false)
            : spawnLeaf(w, h, false);
        }
      }
    }
  }

  // ---- render helpers. No per-particle gradient allocation. ----
  function drawPetals(ctx, t) {
    ctx.lineWidth = 0;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var sway = Math.sin(t * p.swayHz * TAU + p.phase) * p.swayA;
      var x = p.x + sway;
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(x, p.y);
      ctx.rotate(p.rot);
      // a soft petal: a squished ellipse with a little notch via scaling
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 0.62, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawLeaves(ctx, t) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var sway = Math.sin(t * p.swayHz * TAU + p.phase) * p.swayA;
      var x = p.x + sway;
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.save();
      ctx.translate(x, p.y);
      ctx.rotate(p.rot);
      // simple leaf: an ellipse with a center vein line
      ctx.beginPath();
      ctx.ellipse(0, 0, p.r, p.r * 0.5, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = "rgba(90,50,20,0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-p.r, 0);
      ctx.lineTo(p.r, 0);
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawRain(ctx) {
    // one shared style for every streak — angle from vx/vy ratio
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "rgba(150,180,210,0.55)";
    ctx.lineWidth = 1.4;
    ctx.lineCap = "round";
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      // direction of travel, scaled to streak length
      var inv = 1 / Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      var dx = p.vx * inv * p.len;
      var dy = p.vy * inv * p.len;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - dx * 0.4, p.y - dy);
      ctx.stroke();
    }
  }

  function drawFireflies(ctx, t) {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var dx = Math.sin(t * p.driftHz * TAU + p.phase) * p.driftA;
      var dy = Math.cos(t * p.bobHz * TAU + p.phase) * p.bobA;
      var x = p.x + dx;
      var y = p.y + dy;
      // twinkle: alpha pulses between a dim floor and full glow
      var tw = 0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * p.twHz * TAU + p.phase));
      // soft halo (flat fill, no gradient)
      ctx.globalAlpha = tw * 0.25;
      ctx.fillStyle = "#cfff8a";
      ctx.beginPath();
      ctx.arc(x, y, p.r * 2.6, 0, TAU);
      ctx.fill();
      // bright core
      ctx.globalAlpha = tw;
      ctx.fillStyle = "#f6ffb0";
      ctx.beginPath();
      ctx.arc(x, y, p.r, 0, TAU);
      ctx.fill();
    }
  }

  function drawSnow(ctx, t) {
    ctx.fillStyle = "#ffffff";
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var sway = Math.sin(t * p.swayHz * TAU + p.phase) * p.swayA;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x + sway, p.y, p.r, 0, TAU);
      ctx.fill();
    }
  }

  function render(ctx, w, h, t) {
    if (current === "none" || particles.length === 0) return;
    ctx.save();
    if (current === "petals") drawPetals(ctx, t);
    else if (current === "leaves") drawLeaves(ctx, t);
    else if (current === "rain") drawRain(ctx);
    else if (current === "fireflies") drawFireflies(ctx, t);
    else if (current === "snow") drawSnow(ctx, t);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  window.DINOWeather = {
    set: set,
    update: update,
    render: render
  };
})();
