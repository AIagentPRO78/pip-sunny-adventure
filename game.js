/* Pip's Sunny Adventure — engine, level, input and game loop.
   Stage is a virtual 960x540 world that is letterboxed to fit any screen. */
(function () {
  "use strict";

  var S = window.DINOSprites;
  var A = window.DINOAudio;
  var TH = window.DINOThemes;
  var W = window.DINOWeather;

  // ---- constants (stage units) ----
  var STAGE_W = 960, STAGE_H = 540;
  var GROUND_Y = 460;
  var WORLD_W = 6400;
  var FLAG_X = 6180;
  var GRAV = 2600, MOVE = 320, JUMP_V = -840, DJUMP_V = -760, MAX_FALL = 1500;
  var ROAR_CD = 0.7, ROAR_R = 220, POUND_V = 1300, DEATH_Y = 660;
  var BASE_W = 58, BASE_H = 68, GROW_STEP = 0.25, GROW_MAX = 3;
  var BOUNCE_V = -1240, DASH_MULT = 1.7, GLIDE_FALL = 130; // power-ups + pads
  var reduceMotion = false;   // real value set by applySettings() at boot
  var osReduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- canvas ----
  var stageEl = document.getElementById("stage");
  var canvas = document.getElementById("c");
  var ctx = canvas.getContext("2d");
  var cssW = 0, cssH = 0, scale = 1, viewW = STAGE_W;

  function resize() {
    cssW = stageEl.clientWidth;
    cssH = stageEl.clientHeight;
    // Cap DPR: a 3x backing store murders fill-rate on phones for no visible gain.
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Fill the screen vertically (fixed world height) and scroll horizontally —
    // no big letterbox bars, so the game looks full-size in any orientation.
    scale = cssH / STAGE_H;
    viewW = cssW / scale;            // world units visible horizontally
    updateRotateNudge();
  }

  // Encourage landscape on phones: show a nudge in portrait, hide on rotate.
  var rotateDismissed = false;
  function updateRotateNudge() {
    var el = document.getElementById("rotateNudge");
    if (!el) return;
    var show = isTouch && !rotateDismissed && cssH > cssW;
    el.classList.toggle("hidden", !show);
  }
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", function () { setTimeout(resize, 120); });
  if (window.visualViewport) window.visualViewport.addEventListener("resize", resize);

  // ---- game state ----
  var mode = "start";
  var t = 0;
  var camX = 0;
  var shakeT = 0;
  var world = null;
  var player = null;
  var counts = { apple: 0, egg: 0, star: 0 };
  var particles = [];
  var rings = [];
  var winTimer = 0;

  var input = { left: false, right: false };
  var jumpQueued = false, roarQueued = false, jumpHeld = false;
  var paused = false, settingsOpen = false, tutorialOpen = false, settingsReturn = "start";
  var stepTimer = 0;

  // ---- level (data-driven; content lives in levels.js) ----
  var LEVELS = window.DINOLevels || [];
  var currentLevel = 0;

  // shallow per-object copy so replaying a level fully resets state and never
  // mutates the LEVELS templates (every level object is flat).
  function cloneObjs(arr) {
    var out = [];
    for (var i = 0; i < arr.length; i++) {
      var src = arr[i], cp = {};
      for (var k in src) if (src.hasOwnProperty(k)) cp[k] = src[k];
      out.push(cp);
    }
    return out;
  }

  function buildDecor(cfg) {
    var w = cfg.worldW, d = cfg.decor || {};
    var bcols = ["#ff8fbf", "#8fd3ff", "#ffd86b", "#c08fff", "#86e08a"];
    var butterflies = [], clouds = [], trees = [], bushes = [], i;
    var nB = d.butterflies || 0, nC = d.clouds || 0, nT = d.trees || 0, nU = d.bushes || 0;
    var bGap = nB > 0 ? Math.max(360, Math.floor(w / nB)) : 640;
    for (i = 0; i < nB; i++) {
      var bx = 400 + i * bGap;
      butterflies.push({
        x: bx, y: 180 + (i % 3) * 40, baseX: bx, baseY: 180 + (i % 3) * 40,
        seed: i * 1.7, color: bcols[i % bcols.length], vx: 0, vy: 0, scatter: 0
      });
    }
    var cGap = nC > 0 ? Math.max(360, Math.floor(w / nC)) : 480;
    for (i = 0; i < nC; i++)
      clouds.push({ x: 120 + i * cGap, y: 60 + (i % 4) * 36, s: 0.7 + (i % 3) * 0.25 });
    var tGap = nT > 0 ? Math.max(220, Math.floor(w / nT)) : 300;
    for (i = 0; i < nT; i++) trees.push(220 + i * tGap + (i % 2) * 60);
    var uGap = nU > 0 ? Math.max(180, Math.floor(w / nU)) : 250;
    for (i = 0; i < nU; i++) bushes.push(120 + i * uGap + (i % 3) * 40);
    return { butterflies: butterflies, clouds: clouds, trees: trees, bushes: bushes };
  }

  function buildLevel(idx) {
    if (idx == null) idx = currentLevel;
    currentLevel = idx;
    var cfg = LEVELS[idx];

    counts = { apple: 0, egg: 0, star: 0 };
    particles = [];
    rings = [];
    camX = 0;
    WORLD_W = cfg.worldW;
    FLAG_X = cfg.flagX;

    var decor = buildDecor(cfg);
    var checkpoints = [];
    for (var ci = 0; ci < (cfg.checkpoints || []).length; ci++)
      checkpoints.push({ x: cfg.checkpoints[ci].x, raised: false, wave: 0 });

    var bs = cfg.baby;
    var baby = bs ? { x: bs.x, y: bs.y, w: bs.w, h: bs.h, freed: false, hop: 0, face: 1 } : null;

    world = {
      theme: cfg.theme || "meadow",
      platforms: cloneObjs(cfg.platforms),
      movers: cloneObjs(cfg.movers),
      pads: cloneObjs(cfg.pads),
      collectibles: cloneObjs(cfg.collectibles),
      critters: cloneObjs(cfg.critters),
      blocks: cloneObjs(cfg.blocks),
      foods: [],
      baby: baby, babySaved: false,
      checkpoints: checkpoints,
      butterflies: decor.butterflies, clouds: decor.clouds,
      trees: decor.trees, bushes: decor.bushes,
      decorProps: (window.DINODecor ? window.DINODecor.place(cfg.theme || "meadow", cfg.worldW) : [])
    };
    player = {
      x: cfg.startX, y: cfg.startY, w: BASE_W, h: BASE_H, vx: 0, vy: 0, face: 1,
      grounded: false, airJumps: 1, coyote: 0, run: 0, squash: 0,
      mouth: 0, pounding: false, blink: 0, blinkT: 2.4,
      safeX: cfg.startX, safeY: cfg.startY, roarCd: 0, grow: 0,
      speedT: 0, floatT: 0, sparkleT: 0, ride: null, trail: []
    };
    if (W && TH) W.set(TH.get(world.theme).weather, reduceMotion);
    updateHud();
  }

  // ---- input ----
  function keydown(e) {
    var k = e.key.toLowerCase();
    if (k === "escape") {
      if (tutorialOpen) { dismissTutorial(); e.preventDefault(); return; }
      if (settingsOpen) { closeSettings(); e.preventDefault(); return; }
      if (mode === "play") { togglePause(); e.preventDefault(); }
      return;
    }
    if (k === "p") { if (mode === "play") { togglePause(); e.preventDefault(); } return; }
    if (paused || settingsOpen || tutorialOpen) return;   // swallow gameplay keys while overlaid
    if (k === "arrowleft" || k === "a") { input.left = true; e.preventDefault(); }
    else if (k === "arrowright" || k === "d") { input.right = true; e.preventDefault(); }
    else if (k === " " || k === "arrowup" || k === "w" || k === "spacebar") {
      if (!e.repeat) jumpQueued = true;   // ignore key auto-repeat
      jumpHeld = true; e.preventDefault();
    } else if (k === "r" || k === "x" || k === "arrowdown" || k === "s") {
      roarQueued = true; e.preventDefault();
    }
  }
  function keyup(e) {
    var k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") input.left = false;
    else if (k === "arrowright" || k === "d") input.right = false;
    else if (k === " " || k === "arrowup" || k === "w" || k === "spacebar") jumpHeld = false;
  }
  window.addEventListener("keydown", keydown);
  window.addEventListener("keyup", keyup);

  function bindButton(el, key) {
    function down(e) {
      e.preventDefault();
      // Capture the pointer so a held button keeps firing even if the
      // finger drifts off the button edge (the usual "it stops moving" bug).
      if (el.setPointerCapture && e.pointerId != null) {
        try { el.setPointerCapture(e.pointerId); } catch (err) {}
      }
      el.classList.add("is-down");
      if (key === "left") input.left = true;
      else if (key === "right") input.right = true;
      else if (key === "jump") { jumpQueued = true; jumpHeld = true; }
      else if (key === "roar") roarQueued = true;
    }
    function up(e) {
      if (e && e.preventDefault) e.preventDefault();
      el.classList.remove("is-down");
      if (key === "left") input.left = false;
      else if (key === "right") input.right = false;
      else if (key === "jump") jumpHeld = false;
    }
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("lostpointercapture", up);
    el.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }
  var tbtns = document.querySelectorAll(".tbtn");
  for (var bi = 0; bi < tbtns.length; bi++) bindButton(tbtns[bi], tbtns[bi].dataset.key);

  // tap anywhere on the open playfield to jump (phones); button taps don't
  // reach here because the buttons are separate elements (target check is a guard)
  canvas.addEventListener("pointerdown", function (e) {
    if (mode === "play" && e.target === canvas) jumpQueued = true;
  });

  // ---- effects ----
  function burst(x, y, color, n, type) {
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 60 + Math.random() * 160;
      particles.push({
        x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
        life: 0.6, max: 0.6, r: 2 + Math.random() * 3,
        color: color, type: type || "spark", g: 520, rot: Math.random() * 6
      });
    }
  }

  function doRoar() {
    player.roarCd = ROAR_CD;
    player.mouth = 0.3;
    A.roar();
    var cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    rings.push({ x: cx, y: cy, r: 14, max: ROAR_R });
    if (!reduceMotion) shakeT = 0.22;
    var i;
    for (i = 0; i < world.blocks.length; i++) {
      var b = world.blocks[i];
      if (b.popped) continue;
      var bx = b.x + 22, by = b.y + 22;
      if (Math.hypot(bx - cx, by - cy) < ROAR_R + 24) popBlock(b);
    }
    for (i = 0; i < world.butterflies.length; i++) {
      var bf = world.butterflies[i];
      if (Math.hypot(bf.x - cx, bf.y - cy) < 300) {
        var ang = Math.atan2(bf.y - cy, bf.x - cx) + (Math.random() - 0.5);
        bf.vx = Math.cos(ang) * 220; bf.vy = Math.sin(ang) * 220 - 60;
        bf.scatter = 1.4;
      }
    }
    for (i = 0; i < world.critters.length; i++) {
      var cr = world.critters[i];
      if (Math.hypot(cr.x - cx, cr.y - cy) < ROAR_R) {
        cr.squish = 0.5; cr.squishT = 0.3;
        burst(cr.x, cr.y - 18, "#ff7aa8", 4, "heart");
      }
    }
    var bb = world.baby;
    if (bb && !bb.freed &&
      Math.hypot(bb.x + bb.w / 2 - cx, bb.y + bb.h / 2 - cy) < ROAR_R + 30) {
      freeBaby();
    }
  }

  function popBlock(b) {
    if (b.popped) return;
    b.popped = true;
    b.bump = 0.18;
    A.collect();
    burst(b.x + 22, b.y, "#e8a43c", 10, "spark");
    world.foods.push({
      x: b.x + 22, y: b.y - 4, vy: -240, restY: b.y - 34, settled: false, got: false,
      kind: b.food || "steak"
    });
  }

  function applySize() {
    var s = 1 + player.grow * GROW_STEP;
    var nw = BASE_W * s, nh = BASE_H * s;
    var midX = player.x + player.w / 2;
    var bottom = player.y + player.h;
    player.w = nw; player.h = nh;
    player.x = midX - nw / 2;
    player.y = bottom - nh;
  }

  function eatFood(kind) {
    var cx = player.x + player.w / 2, cy = player.y + player.h / 2;
    player.squash = -0.7;
    A.eat(kind);
    if (kind === "chili") {
      player.speedT = 5;
      burst(cx, cy, "#ff5b4d", 14, "spark");
      showToast("Speedy! 🌶️");
    } else if (kind === "balloon") {
      player.floatT = 7;
      burst(cx, cy, "#9fd4ff", 12, "spark");
      showToast("Floaty! 🎈");
    } else if (kind === "lolly") {
      player.sparkleT = 6;
      burst(cx, cy, "#ff5d8f", 16, "spark");
      showToast("Sparkly! ✨");
    } else { // steak
      if (player.grow < GROW_MAX) { player.grow++; applySize(); }
      burst(cx, cy, "#ffd07a", 16, "spark");
      burst(cx, player.y + 6, "#ff7aa8", 6, "heart");
    }
  }

  function freeBaby() {
    var bb = world.baby;
    if (!bb || bb.freed) return;
    bb.freed = true;
    world.babySaved = true;
    A.bounce();
    burst(bb.x + bb.w / 2, bb.y + 8, "#ff7aa8", 12, "heart");
    showToast("You saved the baby! 🦕");
  }

  var toastT1 = null, toastT2 = null;
  function showToast(text) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("hidden");
    requestAnimationFrame(function () { el.classList.add("show"); });
    if (toastT1) clearTimeout(toastT1);
    if (toastT2) clearTimeout(toastT2);
    toastT1 = setTimeout(function () { el.classList.remove("show"); }, 1600);
    toastT2 = setTimeout(function () { el.classList.add("hidden"); }, 2100);
  }

  // one-way landing test (land only when falling onto the top edge)
  function landsOn(p, prevB, newB) {
    return player.vy >= 0 && prevB <= p.y + 6 && newB >= p.y &&
      player.x + player.w > p.x + 4 && player.x < p.x + p.w - 4;
  }

  // ---- update ----
  function update(dt) {
    t += dt;
    // input -> velocity (chili gives a speed boost)
    var dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    player.vx = dir * MOVE * (player.speedT > 0 ? DASH_MULT : 1);
    if (dir !== 0) player.face = dir;

    // re-show the "how to move" hint if the player hasn't walked yet (touch)
    if (dir !== 0) movedYet = true;
    playClock += dt;
    if (isTouch && !movedYet && !hintReshown && playClock > 5) {
      hintReshown = true;
      showTouchHint();
    }

    // jump
    if (jumpQueued) {
      if (player.grounded || player.coyote > 0) {
        player.vy = JUMP_V; player.grounded = false; player.coyote = 0;
        player.squash = -0.5; A.jump();
      } else if (player.airJumps > 0) {
        player.airJumps--; player.vy = DJUMP_V; player.squash = -0.5;
        A.doubleJump();
        burst(player.x + player.w / 2, player.y + player.h, "#cfefff", 6, "spark");
      }
    }
    // roar / ground-pound
    if (roarQueued) {
      if (!player.grounded) {
        player.pounding = true;
        if (player.vy < POUND_V) player.vy = POUND_V;
      } else if (player.roarCd <= 0) {
        doRoar();
      }
    }
    jumpQueued = false; roarQueued = false;

    // move the moving platforms first; carry the player if riding one
    for (var mi = 0; mi < world.movers.length; mi++) {
      var mv = world.movers[mi];
      var nx = mv.x0 + mv.ax * Math.sin(t * mv.sp + mv.ph);
      var ny = mv.y0 + mv.ay * Math.sin(t * mv.sp + mv.ph);
      mv.dx = nx - mv.x; mv.dy = ny - mv.y;
      mv.x = nx; mv.y = ny;
    }
    if (player.ride) { player.x += player.ride.dx; player.y += player.ride.dy; }

    // physics
    player.vy += GRAV * dt;
    if (player.vy > MAX_FALL) player.vy = MAX_FALL;
    // balloon power-up: hold jump to glide gently down
    if (player.floatT > 0 && jumpHeld && player.vy > GLIDE_FALL) player.vy = GLIDE_FALL;
    player.x += player.vx * dt;
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > WORLD_W) player.x = WORLD_W - player.w;

    var prevBottom = player.y + player.h;
    player.y += player.vy * dt;
    var wasGrounded = player.grounded;
    player.grounded = false;
    player.ride = null;
    var newBottom = player.y + player.h;
    var i;
    for (i = 0; i < world.platforms.length; i++) {
      if (landsOn(world.platforms[i], prevBottom, newBottom)) {
        player.y = world.platforms[i].y - player.h; player.vy = 0; player.grounded = true;
      }
    }
    // moving platforms: land and remember which one to ride
    for (i = 0; i < world.movers.length; i++) {
      if (landsOn(world.movers[i], prevBottom, newBottom)) {
        player.y = world.movers[i].y - player.h; player.vy = 0;
        player.grounded = true; player.ride = world.movers[i];
      }
    }
    // bounce pads: fling Pip up instead of landing
    for (i = 0; i < world.pads.length; i++) {
      var pd = world.pads[i];
      if (landsOn(pd, prevBottom, newBottom)) {
        player.y = pd.y - player.h; player.vy = BOUNCE_V;
        player.airJumps = 1; player.grounded = false; player.ride = null;
        pd.squish = 1; A.bounce();
        burst(pd.x + pd.w / 2, pd.y, "#ff9ec8", 6, "spark");
      }
    }

    // head-bump a mystery box from below -> steak pops out
    if (player.vy < 0) {
      for (var bk = 0; bk < world.blocks.length; bk++) {
        var box = world.blocks[bk];
        if (box.popped) continue;
        if (player.y < box.y + 44 && player.y > box.y - 6 &&
          player.x + player.w > box.x + 6 && player.x < box.x + 44 - 6) {
          player.vy = 90;
          popBlock(box);
        }
      }
    }

    if (player.grounded) {
      player.airJumps = 1;
      player.coyote = 0.1;
      player.safeX = player.x; player.safeY = player.y;
      if (player.pounding) { player.pounding = false; if (player.roarCd <= 0) doRoar(); }
      if (!wasGrounded) player.squash = 0.7;
    } else {
      player.coyote -= dt;
    }

    // animation timers
    if (Math.abs(player.vx) > 5 && player.grounded) player.run += dt * 12;
    if (player.grounded && Math.abs(player.vx) > 5) {
      stepTimer -= dt;
      if (stepTimer <= 0) { A.step(); stepTimer = 0.28; }
    } else { stepTimer = 0; }
    player.squash *= Math.pow(0.0001, dt); // fast decay toward 0
    if (player.mouth > 0) player.mouth = Math.max(0, player.mouth - dt);
    if (player.roarCd > 0) player.roarCd -= dt;
    player.blinkT -= dt;
    if (player.blinkT <= 0) { player.blink = 0.12; player.blinkT = 2 + Math.random() * 2.5; }
    if (player.blink > 0) player.blink -= dt;

    // power-up timers + their sparkle/flame trails
    if (player.speedT > 0) {
      player.speedT -= dt;
      if (Math.abs(player.vx) > 5 && Math.random() < 0.5)
        particles.push({
          x: player.x + player.w / 2, y: player.y + player.h - 8,
          vx: -player.face * 120, vy: -20 - Math.random() * 40, life: 0.4, max: 0.4,
          color: "#ff7a4d", type: "spark", r: 3, g: 200, rot: 0
        });
    }
    if (player.floatT > 0) player.floatT -= dt;
    if (player.sparkleT > 0) {
      player.sparkleT -= dt;
      if (Math.random() < 0.6) {
        var rc = ["#ff5d8f", "#ffb14d", "#ffe14d", "#6fe06f", "#5ec8ff", "#c08fff"][Math.floor(Math.random() * 6)];
        particles.push({
          x: player.x + Math.random() * player.w, y: player.y + Math.random() * player.h,
          vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 40, life: 0.6, max: 0.6,
          color: rc, type: "spark", r: 2.5, g: 60, rot: 0
        });
      }
    }
    for (i = 0; i < world.pads.length; i++)
      if (world.pads[i].squish > 0) world.pads[i].squish = Math.max(0, world.pads[i].squish - dt * 3);

    // fall off the world -> gentle respawn
    if (player.y > DEATH_Y) {
      A.whoops();
      for (var d = 0; d < 6; d++)
        particles.push({
          x: player.safeX + 29, y: player.safeY + 10, vx: (Math.random() - 0.5) * 120,
          vy: -120 - Math.random() * 80, life: 0.8, max: 0.8, color: "#ffd86b",
          type: "dizzy", r: 6, g: 300, rot: 0
        });
      player.x = player.safeX; player.y = player.safeY;
      player.vx = 0; player.vy = 0; player.pounding = false;
    }

    // collectibles
    var pcx = player.x + player.w / 2, pcy = player.y + player.h / 2;
    for (i = 0; i < world.collectibles.length; i++) {
      var c = world.collectibles[i];
      if (c.got) continue;
      // lollipop sparkle magnet: pull nearby goodies toward Pip
      if (player.sparkleT > 0) {
        var dmag = Math.hypot(c.x - pcx, c.y - pcy);
        if (dmag < 170 && dmag > 1) {
          c.x += (pcx - c.x) * Math.min(1, dt * 6);
          c.y += (pcy - c.y) * Math.min(1, dt * 6);
        }
      }
      if (Math.hypot(c.x - pcx, c.y - pcy) < 34) {
        c.got = true; counts[c.kind]++; A.collect();
        var col = c.kind === "apple" ? "#ff5d5d" : c.kind === "egg" ? "#ffd07a" : "#ffce3a";
        burst(c.x, c.y, col, 10, "spark");
        updateHud();
      }
    }

    // foods: pop out of boxes, settle, then can be eaten for a power-up
    for (i = world.foods.length - 1; i >= 0; i--) {
      var st = world.foods[i];
      if (st.got) { world.foods.splice(i, 1); continue; }
      if (!st.settled) {
        st.vy += 900 * dt;
        st.y += st.vy * dt;
        if (st.vy > 0 && st.y >= st.restY) { st.y = st.restY; st.vy = 0; st.settled = true; }
      }
      if (Math.hypot(st.x - pcx, st.y - pcy) < 34 + player.grow * 6) {
        st.got = true;
        eatFood(st.kind);
      }
    }
    for (i = 0; i < world.blocks.length; i++)
      if (world.blocks[i].bump > 0) world.blocks[i].bump -= dt;

    // critters: patrol + bounce
    for (i = 0; i < world.critters.length; i++) {
      var cr = world.critters[i];
      if (cr.squishT > 0) { cr.squishT -= dt; if (cr.squishT <= 0) cr.squish = 0; }
      else {
        cr.x += cr.dir * 46 * dt;
        if (cr.x < cr.lo) { cr.x = cr.lo; cr.dir = 1; }
        if (cr.x > cr.hi) { cr.x = cr.hi; cr.dir = -1; }
      }
      var dx = Math.abs(pcx - cr.x), dyTop = (player.y + player.h) - (cr.y - 17);
      if (dx < 36 && player.x + player.w > cr.x - 19 && player.x < cr.x + 19) {
        if (player.vy > 0 && dyTop > -4 && dyTop < 26) {
          player.vy = -640; player.airJumps = 1; player.grounded = false;
          cr.squish = 0.6; cr.squishT = 0.25; A.bounce();
          burst(cr.x, cr.y - 16, "#ff7aa8", 5, "heart");
        } else if (Math.abs(player.y + player.h - (cr.y + 17)) < 40) {
          player.x += (pcx < cr.x ? -1 : 1) * 60 * dt * 6;
        }
      }
    }

    // butterflies
    for (i = 0; i < world.butterflies.length; i++) {
      var bf = world.butterflies[i];
      if (bf.scatter > 0) {
        bf.scatter -= dt;
        bf.x += bf.vx * dt; bf.y += bf.vy * dt;
        bf.vy += 120 * dt; bf.vx *= 0.96;
      } else {
        bf.x += (bf.baseX - bf.x) * 1.4 * dt;
        bf.y = bf.baseY + Math.sin(t * 2 + bf.seed) * 16;
      }
    }

    // baby dino: free by touch (roar frees it too), then trail Pip's path
    var baby = world.baby;
    if (baby) {
      if (!baby.freed) {
        if (Math.abs(pcx - (baby.x + baby.w / 2)) < 42 &&
          Math.abs(pcy - (baby.y + baby.h / 2)) < 66) freeBaby();
      } else {
        var tp = player.trail.length > 22 ? player.trail[player.trail.length - 22] : null;
        if (tp) {
          baby.face = tp.x > baby.x ? 1 : -1;
          baby.x += (tp.x - baby.x) * Math.min(1, dt * 6);
          baby.y += (tp.y - baby.y) * Math.min(1, dt * 6);
        }
        baby.hop += dt * 9;
      }
    }
    // record Pip's recent path so the baby can follow a few steps behind
    player.trail.push({ x: player.x + player.w / 2 - 21, y: player.y + player.h - 42 });
    if (player.trail.length > 44) player.trail.shift();

    // particles
    for (i = particles.length - 1; i >= 0; i--) {
      var p = particles[i];
      p.vy += (p.g || 0) * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.rot != null) p.rot += dt * 6;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }

    // rings
    for (i = rings.length - 1; i >= 0; i--) {
      rings[i].r += (ROAR_R) * dt / 0.4;
      if (rings[i].r >= rings[i].max) rings.splice(i, 1);
    }

    if (shakeT > 0) shakeT -= dt;

    // checkpoints: passing one (while grounded) raises its flag + moves respawn
    var pmid = player.x + player.w / 2;
    for (i = 0; i < world.checkpoints.length; i++) {
      var cp = world.checkpoints[i];
      if (!cp.raised && player.grounded && pmid > cp.x) {
        cp.raised = true;
        A.checkpoint();
        player.safeX = cp.x - 30; player.safeY = player.y;
        burst(cp.x, GROUND_Y - 96, "#9be8ff", 8, "spark");
        showToast("Checkpoint! 🚩");
      }
      if (cp.raised && cp.wave < 1) cp.wave = Math.min(1, cp.wave + dt * 3);
    }

    // camera
    var target = player.x + player.w / 2 - viewW * 0.34;
    var maxCam = Math.max(0, WORLD_W - viewW);
    if (target < 0) target = 0;
    if (target > maxCam) target = maxCam;
    camX += (target - camX) * Math.min(1, dt * 8);

    // reach the flag
    if (player.x + player.w > FLAG_X + 6) winGame();
  }

  // is world-x within the visible horizontal band (plus padding)?
  function vis(x, pad) {
    var p = pad || 120;
    return x > camX - p && x < camX + viewW + p;
  }

  // ---- render ----
  function render() {
    var themeId = world ? world.theme : "meadow";
    if (TH) TH.drawSky(ctx, cssW, cssH, themeId, t);
    else S.sky(ctx, cssW, cssH);
    ctx.save();
    var sx = (shakeT > 0 && !reduceMotion) ? Math.sin(t * 60) * 6 * shakeT : 0;
    ctx.translate(sx, 0);
    ctx.scale(scale, scale);
    if (!world) { ctx.restore(); return; }
    var i, pad = 140;
    var theme = TH ? TH.get(themeId) : null;
    var hillFar = theme ? theme.hillFar : "#c7ecaf";
    var hillMid = theme ? theme.hillMid : "#a6e38c";

    // far parallax: clouds + hills (the sky painter already drew the sun/moon)
    ctx.save();
    ctx.translate(-camX * 0.25, 0);
    var far0 = camX * 0.25;
    var cloudA = themeId === "night" ? 0.4 : 1;
    for (i = 0; i < world.clouds.length; i++) {
      var cl = world.clouds[i];
      if (cl.x > far0 - 90 && cl.x < far0 + viewW + 90) {
        if (cloudA < 1) ctx.globalAlpha = cloudA;
        S.cloud(ctx, cl.x, cl.y, cl.s);
        if (cloudA < 1) ctx.globalAlpha = 1;
      }
    }
    for (var fx = Math.floor((far0 - 520) / 520) * 520; fx < far0 + viewW + 520; fx += 520)
      S.hill(ctx, fx, GROUND_Y + 50, 520, 120, hillFar);
    ctx.restore();

    // mid parallax hills
    ctx.save();
    ctx.translate(-camX * 0.5, 0);
    var mid0 = camX * 0.5;
    for (var mx = Math.floor((mid0 - 440) / 420) * 420; mx < mid0 + viewW + 440; mx += 420)
      S.hill(ctx, mx, GROUND_Y + 26, 440, 160, hillMid);
    ctx.restore();

    // world layer (only what's on screen)
    ctx.save();
    ctx.translate(-camX, 0);
    for (i = 0; i < world.trees.length; i++)
      if (vis(world.trees[i], 70)) S.tree(ctx, world.trees[i], GROUND_Y, 1);
    if (window.DINODecor && world.decorProps)
      for (i = 0; i < world.decorProps.length; i++)
        if (vis(world.decorProps[i].x, 90))
          window.DINODecor.draw(ctx, world.decorProps[i].kind, world.decorProps[i].x, GROUND_Y, t);
    for (i = 0; i < world.platforms.length; i++) {
      var pl = world.platforms[i];
      if (pl.x + pl.w < camX - pad || pl.x > camX + viewW + pad) continue;
      if (pl.h > 100) S.ground(ctx, pl.x, pl.y, pl.w, pl.h);
      else S.platform(ctx, pl.x, pl.y, pl.w, pl.h);
    }
    for (i = 0; i < world.movers.length; i++) {
      var mvp = world.movers[i];
      if (mvp.x + mvp.w > camX - pad && mvp.x < camX + viewW + pad)
        S.platform(ctx, mvp.x, mvp.y, mvp.w, mvp.h);
    }
    for (i = 0; i < world.pads.length; i++) {
      var pdp = world.pads[i];
      if (vis(pdp.x, pad)) S.bouncePad(ctx, pdp.x, pdp.y, pdp.w, pdp.squish);
    }
    for (i = 0; i < world.blocks.length; i++) {
      var b = world.blocks[i];
      if (!vis(b.x, pad)) continue;
      var bumpOff = b.bump > 0 ? Math.sin((b.bump / 0.18) * Math.PI) * 9 : 0;
      S.block(ctx, b.x, b.y - bumpOff, 1, b.popped, t);
    }
    for (i = 0; i < world.checkpoints.length; i++) {
      var cpf = world.checkpoints[i];
      if (vis(cpf.x, 90))
        S.checkFlag(ctx, cpf.x, GROUND_Y, cpf.raised ? cpf.wave : 0, Math.sin(t * 5 + cpf.x) * 1.2);
    }
    if (vis(FLAG_X, 120)) S.flag(ctx, FLAG_X, GROUND_Y, Math.sin(t * 4) * 8);
    for (i = 0; i < world.collectibles.length; i++) {
      var c = world.collectibles[i];
      if (c.got || !vis(c.x, pad)) continue;
      if (c.kind === "apple") S.apple(ctx, c.x, c.y, t);
      else if (c.kind === "egg") S.egg(ctx, c.x, c.y, t);
      else S.star(ctx, c.x, c.y, t);
    }
    for (i = 0; i < world.foods.length; i++) {
      var fd = world.foods[i];
      if (fd.got || !vis(fd.x, pad)) continue;
      if (fd.kind === "chili") S.chili(ctx, fd.x, fd.y, t);
      else if (fd.kind === "balloon") S.balloon(ctx, fd.x, fd.y, t);
      else if (fd.kind === "lolly") S.lolly(ctx, fd.x, fd.y, t);
      else S.steak(ctx, fd.x, fd.y, t);
    }
    for (i = 0; i < world.critters.length; i++)
      if (vis(world.critters[i].x, pad)) S.critter(ctx, world.critters[i], t);
    // the baby dino (and its cage until freed)
    var bby = world.baby;
    if (bby && vis(bby.x, 130)) {
      if (!bby.freed) S.cage(ctx, bby.x - 6, bby.y - 8, bby.w + 12, bby.h + 10, t);
      var hopY = bby.freed ? -Math.abs(Math.sin(bby.hop)) * 6 : 0;
      S.babyDino(ctx, { x: bby.x, y: bby.y + hopY, w: bby.w, h: bby.h }, { face: bby.face });
    }
    for (i = 0; i < world.butterflies.length; i++)
      if (vis(world.butterflies[i].x, pad)) S.butterfly(ctx, world.butterflies[i], t);
    for (i = 0; i < particles.length; i++) S.particle(ctx, particles[i]);
    drawPlayer();
    if (player.floatT > 0) S.balloon(ctx, player.x + player.w / 2, player.y - 4, t);
    for (i = 0; i < rings.length; i++) {
      var rg = rings[i];
      S.ring(ctx, rg.x, rg.y, rg.r, Math.max(0, 1 - rg.r / rg.max));
    }
    for (i = 0; i < world.bushes.length; i++)
      if (vis(world.bushes[i], pad)) S.bush(ctx, world.bushes[i], GROUND_Y + 6, 1);
    ctx.restore();

    ctx.restore();

    // weather overlay in screen space (not affected by camera/zoom)
    if (W) W.render(ctx, cssW, cssH, t);
  }

  function drawPlayer() {
    S.dino(ctx, player, {
      face: player.face,
      squash: player.squash,
      mouth: player.mouth > 0 ? Math.min(1, player.mouth / 0.3) : 0,
      run: player.run,
      moving: Math.abs(player.vx) > 5 && player.grounded,
      blink: player.blink > 0
    });
    if (window.DINOCosmetics) window.DINOCosmetics.drawOn(ctx, player, { face: player.face });
  }

  // ---- HUD / screens ----
  function updateHud() {
    document.getElementById("nApple").textContent = counts.apple;
    document.getElementById("nEgg").textContent = counts.egg;
    document.getElementById("nStar").textContent = counts.star;
  }

  function show(id, on) { document.getElementById(id).classList.toggle("hidden", !on); }

  var hintReshown = false, movedYet = false, playClock = 0;
  function showTouchHint() {
    var h = document.getElementById("touchHint");
    if (!h) return;
    h.classList.remove("hidden");
    requestAnimationFrame(function () { h.classList.add("show"); });
    setTimeout(function () { h.classList.remove("show"); }, 3800);
    setTimeout(function () { h.classList.add("hidden"); }, 4500);
  }

  // release any held on-screen buttons (prevents stuck movement)
  function clearHeld() {
    input.left = false; input.right = false;
    var held = document.querySelectorAll(".tbtn.is-down");
    for (var q = 0; q < held.length; q++) held[q].classList.remove("is-down");
  }

  // ---- progress (localStorage; degrades gracefully if unavailable) ----
  var PROGRESS_KEY = "pip_progress";
  function loadProgress() {
    try {
      var raw = localStorage.getItem(PROGRESS_KEY);
      var p = raw ? JSON.parse(raw) : null;
      if (!p || !Array.isArray(p.done)) return { done: [] };
      return p;
    } catch (e) { return { done: [] }; }
  }
  function saveProgress(p) {
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); } catch (e) {}
  }
  function isComplete(idx) { return loadProgress().done.indexOf(idx) !== -1; }
  function markComplete(idx) {
    var p = loadProgress();
    if (p.done.indexOf(idx) === -1) { p.done.push(idx); saveProgress(p); }
  }
  function isUnlocked(idx) { return idx === 0 || isComplete(idx - 1); }

  // ---- settings (localStorage; graceful degrade) ----
  var SETTINGS_KEY = "pip_settings";
  var settings = { music: true, sound: true, reduceMotion: false };
  function loadSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      var s = raw ? JSON.parse(raw) : null;
      if (!s || typeof s !== "object") return { music: true, sound: true, reduceMotion: false };
      return { music: s.music !== false, sound: s.sound !== false, reduceMotion: s.reduceMotion === true };
    } catch (e) { return { music: true, sound: true, reduceMotion: false }; }
  }
  function saveSettings() { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) {} }
  function applySettings() {
    if (A.setMusicMuted) A.setMusicMuted(!settings.music);
    if (A.setSfxMuted) A.setSfxMuted(!settings.sound);
    reduceMotion = osReduceMotion || settings.reduceMotion;
    document.body.classList.toggle("reduce-motion", reduceMotion);
  }
  function setSwitch(id, on) { var el = document.getElementById(id); if (el) el.setAttribute("aria-checked", on ? "true" : "false"); }
  function syncToggleUI() {
    setSwitch("optMusic", settings.music);
    setSwitch("optSound", settings.sound);
    setSwitch("optMotion", settings.reduceMotion);
  }
  function openSettings(from) { settingsReturn = from || "start"; settingsOpen = true; syncToggleUI(); show("settings", true); }
  function closeSettings() {
    settingsOpen = false;
    show("settings", false);
    if (settingsReturn === "pause") show("pauseOverlay", true);
  }
  function toggleSetting(key) {
    settings[key] = !settings[key];
    saveSettings();
    applySettings();
    syncToggleUI();
    if (key === "reduceMotion" && W && TH && world) W.set(TH.get(world.theme).weather, reduceMotion);
  }

  // ---- stars (best-per-level) ----
  var STARS_KEY = "pip_stars";
  function loadStars() {
    try { var s = JSON.parse(localStorage.getItem(STARS_KEY)); return (s && typeof s === "object") ? s : {}; }
    catch (e) { return {}; }
  }
  function saveStars(o) { try { localStorage.setItem(STARS_KEY, JSON.stringify(o)); } catch (e) {} }
  function bestStars(idx) { var v = loadStars()[idx]; return (typeof v === "number" && v >= 0) ? v : 0; }
  function recordStars(idx, n) { var s = loadStars(); if (!(s[idx] >= n)) { s[idx] = n; saveStars(s); } return s[idx]; }
  function totalStars() {
    var s = loadStars(), sum = 0;
    for (var k in s) if (s.hasOwnProperty(k) && typeof s[k] === "number") sum += s[k];
    return sum;
  }
  function computeStars() {
    var cfg = LEVELS[currentLevel];
    var total = (cfg && cfg.collectibles) ? cfg.collectibles.length : 0;
    var got = counts.apple + counts.egg + counts.star;
    var frac = total > 0 ? got / total : 1;   // no collectibles -> reaching the flag is a clear
    var saved = world && world.babySaved;
    if (frac >= 1) return 3;
    if (frac >= 0.75 && saved) return 3;
    if (frac >= 0.75) return 2;
    if (frac >= 0.45) return 1;
    return 0;
  }
  function starHTML(n) {
    n = Math.max(0, Math.min(3, n | 0));
    return new Array(n + 1).join("★") + "<span class=\"dim\">" + new Array(3 - n + 1).join("☆") + "</span>";
  }

  // ---- pause ----
  function setPaused(on) {
    if (mode !== "play" || tutorialOpen) return;
    if (on === paused) return;
    paused = on;
    if (paused) { clearHeld(); show("pauseOverlay", true); }
    else { show("pauseOverlay", false); last = 0; }
  }
  function togglePause() { setPaused(!paused); }

  // ---- first-run tutorial ----
  var TUTORIAL_KEY = "pip_seen_tutorial";
  function seenTutorial() { try { return localStorage.getItem(TUTORIAL_KEY) === "1"; } catch (e) { return false; } }
  function maybeShowTutorial() {
    if (!seenTutorial()) { tutorialOpen = true; paused = true; show("tutorial", true); }
    else if (isTouch) showTouchHint();
  }
  function dismissTutorial() {
    if (!tutorialOpen) return;
    tutorialOpen = false; paused = false;
    try { localStorage.setItem(TUTORIAL_KEY, "1"); } catch (e) {}
    show("tutorial", false);
    last = 0;
    if (isTouch) showTouchHint();
  }

  // ---- transition fade (visual flourish; state changes stay synchronous) ----
  var fadeEl = document.getElementById("fade");
  function fadeFlash() {
    if (!fadeEl) return;
    fadeEl.classList.add("show");
    setTimeout(function () { fadeEl.classList.remove("show"); }, reduceMotion ? 90 : 240);
  }

  // ---- cosmetics closet (on the level-select screen) ----
  function renderCloset() {
    if (!window.DINOCosmetics) return;
    var row = document.getElementById("closetRow");
    if (!row) return;
    var stars = totalStars();
    var sl = document.getElementById("closetStars");
    if (sl) sl.textContent = stars + " ★";
    var equipped = window.DINOCosmetics.getEquipped();
    row.innerHTML = "";
    var items = window.DINOCosmetics.items;
    for (var i = 0; i < items.length; i++) {
      (function (item) {
        var unlocked = window.DINOCosmetics.isUnlocked(item.id, stars);
        var b = document.createElement("button");
        b.type = "button";
        b.className = "swatch" + (item.id === equipped ? " is-equipped" : "") + (unlocked ? "" : " is-locked");
        b.setAttribute("role", "listitem");
        b.setAttribute("aria-label", item.name + (unlocked ? (item.id === equipped ? " (equipped)" : "") : " (locked: " + item.cost + " stars)"));
        b.disabled = !unlocked;
        var cv = document.createElement("canvas");
        cv.width = 56; cv.height = 56;
        var cx2 = cv.getContext("2d");
        var pv = { x: 6, y: -4, w: 44, h: 52 };
        S.dino(cx2, pv, { face: 1 });
        var prev = window.DINOCosmetics.getEquipped();
        try {
          window.DINOCosmetics.setEquipped(item.id);
          window.DINOCosmetics.drawOn(cx2, pv, { face: 1 });
        } finally {
          window.DINOCosmetics.setEquipped(prev);
        }
        b.appendChild(cv);
        var nm = document.createElement("span");
        nm.textContent = item.name; b.appendChild(nm);
        if (!unlocked) {
          var cost = document.createElement("span"); cost.className = "cost"; cost.textContent = item.cost + "★"; b.appendChild(cost);
          var lk = document.createElement("span"); lk.className = "lock"; lk.textContent = "🔒"; b.appendChild(lk);
        }
        b.addEventListener("click", function () {
          if (!window.DINOCosmetics.isUnlocked(item.id, totalStars())) return;
          window.DINOCosmetics.setEquipped(item.id);
          renderCloset();
        });
        row.appendChild(b);
      })(items[i]);
    }
  }

  // ---- level select ----
  function refreshLevelNodes() {
    var nodes = document.querySelectorAll("#levelSelect .node");
    for (var n = 0; n < nodes.length; n++) {
      var idx = parseInt(nodes[n].getAttribute("data-level"), 10);
      var done = isComplete(idx), unlocked = isUnlocked(idx);
      nodes[n].classList.toggle("is-done", done);
      nodes[n].classList.toggle("is-locked", !unlocked);
      nodes[n].disabled = !unlocked;
      var sr = nodes[n].querySelector(".node-stars");
      if (!sr) {
        sr = document.createElement("span");
        sr.className = "node-stars";
        sr.setAttribute("aria-hidden", "true");
        nodes[n].appendChild(sr);
      }
      sr.innerHTML = starHTML(bestStars(idx));
    }
  }
  function showLevelSelect() {
    mode = "select";
    paused = false;
    clearHeld();
    A.stopMusic();
    show("startScreen", false);
    show("winScreen", false);
    show("hud", false);
    show("touch", false);
    show("muteBtn", false);
    show("pauseBtn", false);
    show("pauseOverlay", false);
    refreshLevelNodes();
    renderCloset();
    show("levelSelect", true);
  }
  function startLevel(idx) {
    if (!isUnlocked(idx)) return;
    A.init();
    clearHeld();
    jumpQueued = false; roarQueued = false; jumpHeld = false;
    movedYet = false; playClock = 0;
    paused = false;
    fadeFlash();
    buildLevel(idx);
    A.startMusic(world.theme);
    mode = "play";
    show("levelSelect", false);
    show("startScreen", false);
    show("winScreen", false);
    show("pauseOverlay", false);
    show("hud", true);
    show("muteBtn", true);
    show("pauseBtn", true);
    if (isTouch) show("touch", true);
    maybeShowTutorial();
  }

  function winGame() {
    if (mode === "win") return;
    mode = "win";
    paused = false;
    clearHeld();
    A.win();
    winTimer = 1.6;
    markComplete(currentLevel);
    var earned = computeStars();
    recordStars(currentLevel, earned);
    var winStars = document.getElementById("winStars");
    if (winStars) {
      winStars.innerHTML = starHTML(earned);
      winStars.setAttribute("aria-label", earned + " of 3 stars");
    }
    document.getElementById("wApple").textContent = counts.apple;
    document.getElementById("wEgg").textContent = counts.egg;
    document.getElementById("wStar").textContent = counts.star;
    var wb = document.getElementById("wBaby");
    if (wb) {
      wb.textContent = world.babySaved
        ? "🦕 You saved the baby dino!"
        : "🦕 The baby is still caged — find it next time!";
    }
    var hasNext = currentLevel + 1 < LEVELS.length;
    var nextBtn = document.getElementById("nextBtn");
    if (nextBtn) {
      nextBtn.classList.toggle("hidden", !hasNext);
      if (hasNext) nextBtn.textContent = "▶ NEXT: " + LEVELS[currentLevel + 1].name.toUpperCase();
    }
    fadeFlash();
    show("hud", false);
    show("touch", false);
    show("pauseBtn", false);
    show("muteBtn", false);
    show("winScreen", true);
  }

  // start card PLAY -> the level map (also unlocks audio on this gesture)
  document.getElementById("playBtn").addEventListener("click", function () {
    A.init();
    showLevelSelect();
  });
  var selNodes = document.querySelectorAll("#levelSelect .node");
  for (var sn = 0; sn < selNodes.length; sn++) {
    selNodes[sn].addEventListener("click", function () {
      startLevel(parseInt(this.getAttribute("data-level"), 10));
    });
  }
  document.getElementById("mapBackBtn").addEventListener("click", function () {
    mode = "start";
    show("levelSelect", false);
    show("startScreen", true);
  });
  document.getElementById("nextBtn").addEventListener("click", function () {
    var nxt = currentLevel + 1;
    if (nxt < LEVELS.length) startLevel(nxt);
    else showLevelSelect();
  });
  document.getElementById("mapBtn").addEventListener("click", showLevelSelect);

  var muteBtn = document.getElementById("muteBtn");
  muteBtn.addEventListener("click", function () {
    var m = !A.isMuted();
    A.setMuted(m);
    muteBtn.textContent = m ? "🔇" : "🔊";
    muteBtn.setAttribute("aria-pressed", m ? "true" : "false");
    muteBtn.setAttribute("aria-label", m ? "Turn sound on" : "Turn sound off");
  });

  document.getElementById("pauseBtn").addEventListener("click", togglePause);
  document.getElementById("resumeBtn").addEventListener("click", function () { setPaused(false); });
  document.getElementById("pauseMapBtn").addEventListener("click", function () { setPaused(false); showLevelSelect(); });
  document.getElementById("pauseSettingsBtn").addEventListener("click", function () { show("pauseOverlay", false); openSettings("pause"); });
  document.getElementById("startSettingsBtn").addEventListener("click", function () { openSettings("start"); });
  document.getElementById("settingsBackBtn").addEventListener("click", closeSettings);
  document.getElementById("optMusic").addEventListener("click", function () { toggleSetting("music"); });
  document.getElementById("optSound").addEventListener("click", function () { toggleSetting("sound"); });
  document.getElementById("optMotion").addEventListener("click", function () { toggleSetting("reduceMotion"); });
  document.getElementById("tutorialOkBtn").addEventListener("click", dismissTutorial);

  document.getElementById("rotateDismiss").addEventListener("click", function () {
    rotateDismissed = true;
    updateRotateNudge();
  });

  var isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0) ||
    (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
    /[?&]touch=1/.test(location.search);   // ?touch=1 forces touch controls
  if (isTouch) document.body.classList.add("is-touch");

  // ---- loop ----
  var last = 0;
  function frame(now) {
    if (!last) last = now;
    var dt = (now - last) / 1000;
    last = now;
    if (dt > 0.033) dt = 0.033;

    if (mode === "play" && !paused) update(dt);
    else t += dt;
    if (W) W.update(dt, cssW, cssH);   // weather animates on every screen

    if (mode === "win" && winTimer > 0) {
      winTimer -= dt;
      for (var k = 0; k < (reduceMotion ? 2 : 5); k++) {
        particles.push({
          x: camX + Math.random() * STAGE_W, y: -10,
          vx: (Math.random() - 0.5) * 60, vy: 80 + Math.random() * 120,
          life: 2.2, max: 2.2, g: 60, rot: Math.random() * 6,
          color: ["#ff5d8f", "#4cc9f0", "#ffce3a", "#86e08a", "#c08fff"][k % 5],
          type: "confetti"
        });
      }
      for (var pi = particles.length - 1; pi >= 0; pi--) {
        var p = particles[pi];
        p.vy += (p.g || 0) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.rot != null) p.rot += dt * 4;
        p.life -= dt;
        if (p.life <= 0) particles.splice(pi, 1);
      }
    }

    render();
    requestAnimationFrame(frame);
  }

  // lightweight read-only hook for automated tests / tinkering
  window.PipGame = {
    get player() { return player; },
    get world() { return world; },
    get mode() { return mode; },
    get level() { return currentLevel; },
    levels: LEVELS,
    start: showLevelSelect,
    startLevel: startLevel,
    showSelect: showLevelSelect,
    markComplete: markComplete,
    isComplete: isComplete,
    totalStars: totalStars,
    bestStars: bestStars,
    resetProgress: function () { saveProgress({ done: [] }); saveStars({}); },
    warp: function (x, y) { if (player) { player.x = x; if (y != null) player.y = y; player.vx = 0; player.vy = 0; } }
  };

  // ---- boot ----
  settings = loadSettings();
  applySettings();   // mute state + reduceMotion applied before first frame
  resize();
  buildLevel(0);     // so the meadow scene shows behind the start card
  mode = "start";
  requestAnimationFrame(frame);
})();
