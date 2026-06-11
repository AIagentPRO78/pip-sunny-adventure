/* Pip's Sunny Adventure — engine, level, input and game loop.
   Stage is a virtual 960x540 world that is letterboxed to fit any screen. */
(function () {
  "use strict";

  var S = window.DINOSprites;
  var A = window.DINOAudio;

  // ---- constants (stage units) ----
  var STAGE_W = 960, STAGE_H = 540;
  var GROUND_Y = 460;
  var WORLD_W = 6400;
  var FLAG_X = 6180;
  var GRAV = 2600, MOVE = 320, JUMP_V = -840, DJUMP_V = -760, MAX_FALL = 1500;
  var ROAR_CD = 0.7, ROAR_R = 220, POUND_V = 1300, DEATH_Y = 660;
  var BASE_W = 58, BASE_H = 68, GROW_STEP = 0.25, GROW_MAX = 3;
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- canvas ----
  var stageEl = document.getElementById("stage");
  var canvas = document.getElementById("c");
  var ctx = canvas.getContext("2d");
  var cssW = 0, cssH = 0, scale = 1, offX = 0, offY = 0;

  function resize() {
    cssW = stageEl.clientWidth;
    cssH = stageEl.clientHeight;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    scale = Math.min(cssW / STAGE_W, cssH / STAGE_H);
    offX = (cssW - STAGE_W * scale) / 2;
    offY = (cssH - STAGE_H * scale) / 2;
  }
  window.addEventListener("resize", resize);

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
  var jumpQueued = false, roarQueued = false;

  // ---- level ----
  function plat(x, y, w) { return { x: x, y: y, w: w, h: 26, one: true }; }
  function grnd(x, w) { return { x: x, y: GROUND_Y, w: w, h: 200, one: true }; }
  function coll(x, y, k) { return { x: x, y: y, kind: k, got: false }; }
  function critterAt(x, lo, hi, y) {
    return { x: x, y: y, lo: lo, hi: hi, dir: 1, squish: 0, squishT: 0, baseY: y };
  }

  function buildLevel() {
    counts = { apple: 0, egg: 0, star: 0 };
    particles = [];
    rings = [];
    camX = 0;
    var platforms = [
      grnd(0, 1180),
      grnd(1360, 1240),
      grnd(2800, 1360),
      grnd(4360, 2040),
      plat(700, 360, 150), plat(960, 270, 150), plat(1180, 210, 150),
      plat(1500, 330, 160), plat(1800, 250, 150), plat(2300, 330, 150),
      plat(2620, 330, 170), plat(3050, 320, 150), plat(3380, 250, 160),
      plat(3700, 330, 150), plat(4180, 330, 170), plat(4600, 300, 150),
      plat(5050, 250, 150), plat(5180, 210, 150), plat(5450, 330, 150)
    ];
    var collectibles = [
      coll(360, 415, "apple"), coll(560, 415, "apple"), coll(770, 320, "apple"),
      coll(1035, 170, "apple"), coll(1500, 290, "apple"), coll(1875, 210, "apple"),
      coll(2375, 290, "apple"), coll(2700, 290, "apple"), coll(3120, 280, "apple"),
      coll(3770, 290, "apple"), coll(4660, 260, "apple"), coll(5510, 290, "apple"),
      coll(940, 415, "egg"), coll(2050, 415, "egg"), coll(3300, 415, "egg"),
      coll(4980, 415, "egg"), coll(5850, 415, "egg"),
      coll(1255, 165, "star"), coll(3460, 205, "star"), coll(5255, 165, "star")
    ];
    var critters = [
      critterAt(900, 820, 1120, 443), critterAt(1750, 1500, 2300, 443),
      critterAt(3050, 2850, 3500, 443), critterAt(4650, 4450, 5000, 443),
      critterAt(1560, 1470, 1630, 313)
    ];
    var blocks = [
      { x: 1610, y: 300, popped: false, bump: 0 },
      { x: 3150, y: 300, popped: false, bump: 0 },
      { x: 5300, y: 300, popped: false, bump: 0 }
    ];
    var steaks = [];
    var butterflies = [];
    var bcols = ["#ff8fbf", "#8fd3ff", "#ffd86b", "#c08fff", "#86e08a"];
    for (var i = 0; i < 9; i++) {
      var bx = 400 + i * 640;
      butterflies.push({
        x: bx, y: 180 + (i % 3) * 40, baseX: bx, baseY: 180 + (i % 3) * 40,
        seed: i * 1.7, color: bcols[i % bcols.length], vx: 0, vy: 0, scatter: 0
      });
    }
    var clouds = [];
    for (var c = 0; c < 14; c++) {
      clouds.push({ x: 120 + c * 480, y: 60 + (c % 4) * 36, s: 0.7 + (c % 3) * 0.25 });
    }
    var trees = [];
    for (var tr = 0; tr < 22; tr++) trees.push(220 + tr * 300 + (tr % 2) * 60);
    var bushes = [];
    for (var bu = 0; bu < 26; bu++) bushes.push(120 + bu * 250 + (bu % 3) * 40);

    world = {
      platforms: platforms, collectibles: collectibles, critters: critters,
      blocks: blocks, steaks: steaks, butterflies: butterflies, clouds: clouds,
      trees: trees, bushes: bushes
    };
    player = {
      x: 120, y: 340, w: BASE_W, h: BASE_H, vx: 0, vy: 0, face: 1,
      grounded: false, airJumps: 1, coyote: 0, run: 0, squash: 0,
      mouth: 0, pounding: false, blink: 0, blinkT: 2.4,
      safeX: 120, safeY: 340, roarCd: 0, grow: 0
    };
    updateHud();
  }

  // ---- input ----
  function keydown(e) {
    var k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") { input.left = true; e.preventDefault(); }
    else if (k === "arrowright" || k === "d") { input.right = true; e.preventDefault(); }
    else if (k === " " || k === "arrowup" || k === "w" || k === "spacebar") {
      jumpQueued = true; e.preventDefault();
    } else if (k === "r" || k === "x" || k === "arrowdown" || k === "s") {
      roarQueued = true; e.preventDefault();
    }
  }
  function keyup(e) {
    var k = e.key.toLowerCase();
    if (k === "arrowleft" || k === "a") input.left = false;
    else if (k === "arrowright" || k === "d") input.right = false;
  }
  window.addEventListener("keydown", keydown);
  window.addEventListener("keyup", keyup);

  function bindButton(el, key) {
    function down(e) {
      e.preventDefault();
      el.classList.add("is-down");
      if (key === "left") input.left = true;
      else if (key === "right") input.right = true;
      else if (key === "jump") jumpQueued = true;
      else if (key === "roar") roarQueued = true;
    }
    function up(e) {
      e.preventDefault();
      el.classList.remove("is-down");
      if (key === "left") input.left = false;
      else if (key === "right") input.right = false;
    }
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("pointerleave", up);
    el.addEventListener("contextmenu", function (e) { e.preventDefault(); });
  }
  var tbtns = document.querySelectorAll(".tbtn");
  for (var bi = 0; bi < tbtns.length; bi++) bindButton(tbtns[bi], tbtns[bi].dataset.key);

  // tap anywhere on the playfield to jump (phones)
  canvas.addEventListener("pointerdown", function (e) {
    if (mode === "play") { jumpQueued = true; }
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
  }

  function popBlock(b) {
    if (b.popped) return;
    b.popped = true;
    b.bump = 0.18;
    A.collect();
    burst(b.x + 22, b.y, "#e8a43c", 10, "spark");
    world.steaks.push({
      x: b.x + 22, y: b.y - 4, vy: -240, restY: b.y - 34, settled: false, got: false
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

  function eatSteak() {
    A.bounce();
    if (player.grow < GROW_MAX) { player.grow++; applySize(); }
    player.squash = -0.7;
    burst(player.x + player.w / 2, player.y + player.h / 2, "#ffd07a", 16, "spark");
    burst(player.x + player.w / 2, player.y + 6, "#ff7aa8", 6, "heart");
  }

  // ---- update ----
  function update(dt) {
    t += dt;
    // input -> velocity
    var dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    player.vx = dir * MOVE;
    if (dir !== 0) player.face = dir;

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

    // physics
    player.vy += GRAV * dt;
    if (player.vy > MAX_FALL) player.vy = MAX_FALL;
    player.x += player.vx * dt;
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > WORLD_W) player.x = WORLD_W - player.w;

    var prevBottom = player.y + player.h;
    player.y += player.vy * dt;
    var wasGrounded = player.grounded;
    player.grounded = false;
    var newBottom = player.y + player.h;
    for (var i = 0; i < world.platforms.length; i++) {
      var pl = world.platforms[i];
      if (player.vy < 0) continue;
      if (prevBottom <= pl.y + 4 && newBottom >= pl.y &&
        player.x + player.w > pl.x + 4 && player.x < pl.x + pl.w - 4) {
        player.y = pl.y - player.h;
        player.vy = 0;
        player.grounded = true;
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
    player.squash *= Math.pow(0.0001, dt); // fast decay toward 0
    if (player.mouth > 0) player.mouth = Math.max(0, player.mouth - dt);
    if (player.roarCd > 0) player.roarCd -= dt;
    player.blinkT -= dt;
    if (player.blinkT <= 0) { player.blink = 0.12; player.blinkT = 2 + Math.random() * 2.5; }
    if (player.blink > 0) player.blink -= dt;

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
      if (Math.hypot(c.x - pcx, c.y - pcy) < 34) {
        c.got = true; counts[c.kind]++; A.collect();
        var col = c.kind === "apple" ? "#ff5d5d" : c.kind === "egg" ? "#ffd07a" : "#ffce3a";
        burst(c.x, c.y, col, 10, "spark");
        updateHud();
      }
    }

    // steaks: pop out of boxes, settle, then can be eaten to grow bigger
    for (i = world.steaks.length - 1; i >= 0; i--) {
      var st = world.steaks[i];
      if (st.got) { world.steaks.splice(i, 1); continue; }
      if (!st.settled) {
        st.vy += 900 * dt;
        st.y += st.vy * dt;
        if (st.vy > 0 && st.y >= st.restY) { st.y = st.restY; st.vy = 0; st.settled = true; }
      }
      if (Math.hypot(st.x - pcx, st.y - pcy) < 34 + player.grow * 6) {
        st.got = true;
        eatSteak();
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

    // camera
    var target = player.x + player.w / 2 - 360;
    if (target < 0) target = 0;
    if (target > WORLD_W - STAGE_W) target = WORLD_W - STAGE_W;
    camX += (target - camX) * Math.min(1, dt * 8);

    // reach the flag
    if (player.x + player.w > FLAG_X + 6) winGame();
  }

  // ---- render ----
  function render() {
    S.sky(ctx, cssW, cssH);
    ctx.save();
    var sx = (shakeT > 0 && !reduceMotion) ? Math.sin(t * 60) * 6 * shakeT : 0;
    ctx.translate(offX + sx, offY);
    ctx.scale(scale, scale);
    ctx.beginPath();
    ctx.rect(0, 0, STAGE_W, STAGE_H);
    ctx.clip();
    if (!world) { ctx.restore(); return; }

    // far parallax: sun + clouds
    ctx.save();
    ctx.translate(-camX * 0.25, 0);
    S.sun(ctx, 200, 120, 46, t);
    for (var i = 0; i < world.clouds.length; i++) {
      var cl = world.clouds[i];
      S.cloud(ctx, cl.x, cl.y, cl.s);
    }
    for (var fx = -200; fx < WORLD_W; fx += 520)
      S.hill(ctx, fx, GROUND_Y + 50, 520, 120, "#c7ecaf");
    ctx.restore();

    // mid parallax hills
    ctx.save();
    ctx.translate(-camX * 0.5, 0);
    for (var mx = -200; mx < WORLD_W; mx += 420)
      S.hill(ctx, mx, GROUND_Y + 26, 440, 160, "#a6e38c");
    ctx.restore();

    // world layer
    ctx.save();
    ctx.translate(-camX, 0);
    for (i = 0; i < world.trees.length; i++) S.tree(ctx, world.trees[i], GROUND_Y, 1);
    for (i = 0; i < world.platforms.length; i++) {
      var pl = world.platforms[i];
      if (pl.h > 100) S.ground(ctx, pl.x, pl.y, pl.w, pl.h);
      else S.platform(ctx, pl.x, pl.y, pl.w, pl.h);
    }
    for (i = 0; i < world.blocks.length; i++) {
      var b = world.blocks[i];
      var bumpOff = b.bump > 0 ? Math.sin((b.bump / 0.18) * Math.PI) * 9 : 0;
      S.block(ctx, b.x, b.y - bumpOff, 1, b.popped, t);
    }
    S.flag(ctx, FLAG_X, GROUND_Y, Math.sin(t * 4) * 8);
    for (i = 0; i < world.collectibles.length; i++) {
      var c = world.collectibles[i];
      if (c.got) continue;
      if (c.kind === "apple") S.apple(ctx, c.x, c.y, t);
      else if (c.kind === "egg") S.egg(ctx, c.x, c.y, t);
      else S.star(ctx, c.x, c.y, t);
    }
    for (i = 0; i < world.steaks.length; i++) {
      var stk = world.steaks[i];
      if (!stk.got) S.steak(ctx, stk.x, stk.y, t);
    }
    for (i = 0; i < world.critters.length; i++) S.critter(ctx, world.critters[i], t);
    for (i = 0; i < world.butterflies.length; i++) S.butterfly(ctx, world.butterflies[i], t);
    for (i = 0; i < particles.length; i++) S.particle(ctx, particles[i]);
    drawPlayer();
    for (i = 0; i < rings.length; i++) {
      var rg = rings[i];
      S.ring(ctx, rg.x, rg.y, rg.r, Math.max(0, 1 - rg.r / rg.max));
    }
    for (i = 0; i < world.bushes.length; i++) S.bush(ctx, world.bushes[i], GROUND_Y + 6, 1);
    ctx.restore();

    ctx.restore();
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
  }

  // ---- HUD / screens ----
  function updateHud() {
    document.getElementById("nApple").textContent = counts.apple;
    document.getElementById("nEgg").textContent = counts.egg;
    document.getElementById("nStar").textContent = counts.star;
  }

  function show(id, on) { document.getElementById(id).classList.toggle("hidden", !on); }

  function startGame() {
    A.init();
    buildLevel();
    mode = "play";
    show("startScreen", false);
    show("winScreen", false);
    show("hud", true);
    show("muteBtn", true);
    if (isTouch) show("touch", true);
  }

  function winGame() {
    if (mode === "win") return;
    mode = "win";
    A.win();
    winTimer = 1.6;
    document.getElementById("wApple").textContent = counts.apple;
    document.getElementById("wEgg").textContent = counts.egg;
    document.getElementById("wStar").textContent = counts.star;
    show("hud", false);
    show("touch", false);
    show("winScreen", true);
  }

  document.getElementById("playBtn").addEventListener("click", startGame);
  document.getElementById("againBtn").addEventListener("click", startGame);

  var muteBtn = document.getElementById("muteBtn");
  muteBtn.addEventListener("click", function () {
    var m = !A.isMuted();
    A.setMuted(m);
    muteBtn.textContent = m ? "🔇" : "🔊";
  });

  var isTouch = ("ontouchstart" in window) || (navigator.maxTouchPoints > 0);

  // ---- loop ----
  var last = 0;
  function frame(now) {
    if (!last) last = now;
    var dt = (now - last) / 1000;
    last = now;
    if (dt > 0.033) dt = 0.033;

    if (mode === "play") update(dt);
    else t += dt;

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
    start: startGame,
    warp: function (x, y) { if (player) { player.x = x; if (y != null) player.y = y; player.vx = 0; player.vy = 0; } }
  };

  // ---- boot ----
  resize();
  buildLevel();      // so the scene shows behind the start card
  mode = "start";
  requestAnimationFrame(frame);
})();
