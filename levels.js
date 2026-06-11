/* Level data for Pip's Sunny Adventure.
   Plain data objects consumed by game.js buildLevel(idx). Classic <script>,
   attaches window.DINOLevels (an array of level configs). No ES modules. */
(function () {
  "use strict";

  var GROUND_Y = 460;

  // factory helpers (kept flat so a shallow per-object copy fully resets state)
  function plat(x, y, w) { return { x: x, y: y, w: w, h: 26 }; }
  function grnd(x, w) { return { x: x, y: GROUND_Y, w: w, h: 200 }; }
  function coll(x, y, k) { return { x: x, y: y, kind: k, got: false }; }
  function critterAt(x, lo, hi, y) {
    return { x: x, y: y, lo: lo, hi: hi, dir: 1, squish: 0, squishT: 0, baseY: y };
  }
  function box(x, y, food) { return { x: x, y: y, popped: false, bump: 0, food: food }; }
  function pad(x, y) { return { x: x, y: y, w: 92, squish: 0 }; }
  function moverH(x, y, w, ax, sp, ph) {
    return { x: x, y: y, w: w, h: 24, x0: x, y0: y, ax: ax, ay: 0, sp: sp, ph: ph || 0, dx: 0, dy: 0 };
  }
  function moverV(x, y, w, ay, sp, ph) {
    return { x: x, y: y, w: w, h: 24, x0: x, y0: y, ax: 0, ay: ay, sp: sp, ph: ph || 0, dx: 0, dy: 0 };
  }
  function cage(x) { return { x: x, y: GROUND_Y - 42, w: 42, h: 42, freed: false, hop: 0, face: 1 }; }

  var LEVELS = [
    // ===== LEVEL 1 — Sunny Meadow (day) =====
    {
      name: "Sunny Meadow", theme: "meadow",
      worldW: 6400, flagX: 6180, startX: 120, startY: 340,
      platforms: [
        grnd(0, 1180), grnd(1360, 1240), grnd(2800, 1360), grnd(4360, 2040),
        plat(700, 360, 150), plat(960, 270, 150), plat(1180, 210, 150),
        plat(1500, 330, 160), plat(1800, 250, 150), plat(2300, 330, 150),
        plat(3050, 320, 150), plat(3380, 250, 160),
        plat(3700, 330, 150), plat(4180, 330, 170), plat(4600, 300, 150),
        plat(5050, 250, 150), plat(5180, 210, 150), plat(5450, 330, 150)
      ],
      collectibles: [
        coll(360, 415, "apple"), coll(560, 415, "apple"), coll(770, 320, "apple"),
        coll(1035, 170, "apple"), coll(1500, 290, "apple"), coll(1875, 210, "apple"),
        coll(2375, 290, "apple"), coll(2700, 290, "apple"), coll(3120, 280, "apple"),
        coll(3770, 290, "apple"), coll(4660, 260, "apple"), coll(5510, 290, "apple"),
        coll(940, 415, "egg"), coll(2050, 415, "egg"), coll(3300, 415, "egg"),
        coll(4980, 415, "egg"), coll(5850, 415, "egg"),
        coll(1255, 165, "star"), coll(3460, 205, "star"), coll(5255, 165, "star")
      ],
      critters: [
        critterAt(900, 820, 1120, 443), critterAt(1750, 1500, 2300, 443),
        critterAt(3050, 2850, 3500, 443), critterAt(4650, 4450, 5000, 443),
        critterAt(1560, 1470, 1630, 313)
      ],
      blocks: [
        box(1610, 300, "steak"), box(2350, 300, "chili"), box(3150, 300, "balloon"),
        box(4250, 300, "lolly"), box(5300, 300, "steak")
      ],
      pads: [pad(1030, 444), pad(3700, 314)],
      movers: [moverH(2630, 330, 150, 150, 1.0, 0), moverV(4900, 360, 130, 72, 1.1, 1.5)],
      baby: cage(3980),
      checkpoints: [{ x: 1400 }, { x: 2840 }, { x: 4400 }],
      decor: { trees: 22, bushes: 26, clouds: 14, butterflies: 9 }
    },

    // ===== LEVEL 2 — Sunset Beach =====
    {
      name: "Sunset Beach", theme: "beach",
      worldW: 5200, flagX: 5000, startX: 120, startY: 340,
      platforms: [
        grnd(0, 900), grnd(1080, 760), grnd(2020, 980), grnd(3180, 820), grnd(4180, 1020),
        plat(640, 360, 150), plat(880, 280, 140), plat(1500, 330, 150),
        plat(1720, 250, 140), plat(2280, 320, 150), plat(2560, 250, 150),
        plat(3380, 330, 150), plat(3620, 250, 150), plat(3880, 320, 150),
        plat(4380, 300, 150), plat(4640, 240, 150)
      ],
      collectibles: [
        coll(320, 415, "apple"), coll(520, 415, "apple"), coll(700, 320, "apple"),
        coll(945, 240, "apple"), coll(1560, 290, "apple"), coll(1780, 210, "apple"),
        coll(2340, 280, "apple"), coll(2620, 210, "apple"), coll(3440, 290, "apple"),
        coll(3940, 280, "apple"), coll(4440, 260, "apple"),
        coll(820, 415, "egg"), coll(1320, 415, "egg"), coll(2500, 415, "egg"),
        coll(3700, 415, "egg"), coll(4700, 415, "egg"),
        coll(905, 235, "star"), coll(2615, 205, "star"), coll(4695, 195, "star")
      ],
      critters: [
        critterAt(700, 620, 860, 443), critterAt(1400, 1120, 1780, 443),
        critterAt(2400, 2080, 2920, 443), critterAt(3500, 3220, 3960, 443),
        critterAt(4500, 4240, 5000, 443)
      ],
      blocks: [
        box(1180, 300, "chili"), box(2080, 300, "steak"),
        box(3220, 300, "balloon"), box(4220, 300, "lolly")
      ],
      pads: [pad(960, 444), pad(2900, 444)],
      movers: [moverH(1900, 320, 140, 110, 0.95, 0.4), moverV(3120, 350, 130, 64, 1.0, 0.8)],
      baby: cage(2700),
      checkpoints: [{ x: 1180 }, { x: 2820 }, { x: 3960 }],
      decor: { trees: 14, bushes: 18, clouds: 10, butterflies: 6 }
    },

    // ===== LEVEL 3 — Starry Night =====
    {
      name: "Starry Night", theme: "night",
      worldW: 5600, flagX: 5400, startX: 120, startY: 340,
      platforms: [
        grnd(0, 820), grnd(1000, 720), grnd(1900, 900), grnd(2980, 760), grnd(3920, 1680),
        plat(560, 350, 150), plat(800, 270, 140), plat(1060, 210, 140),
        plat(1420, 330, 150), plat(1660, 250, 140), plat(2220, 320, 150),
        plat(2480, 250, 150), plat(2760, 320, 150), plat(3260, 320, 150),
        plat(3520, 250, 160), plat(4120, 320, 150), plat(4380, 250, 150),
        plat(4900, 300, 150), plat(5120, 230, 150)
      ],
      collectibles: [
        coll(300, 415, "apple"), coll(500, 415, "apple"), coll(620, 310, "apple"),
        coll(865, 230, "apple"), coll(1480, 290, "apple"), coll(1720, 210, "apple"),
        coll(2280, 280, "apple"), coll(2540, 210, "apple"), coll(3320, 280, "apple"),
        coll(4180, 280, "apple"), coll(4960, 260, "apple"),
        coll(720, 415, "egg"), coll(1240, 415, "egg"), coll(2400, 415, "egg"),
        coll(3500, 415, "egg"), coll(5180, 415, "egg"),
        coll(1125, 165, "star"), coll(3580, 205, "star"), coll(5185, 185, "star")
      ],
      critters: [
        critterAt(640, 560, 780, 443), critterAt(1300, 1020, 1660, 443),
        critterAt(2200, 1960, 2860, 443), critterAt(3300, 3020, 3820, 443),
        critterAt(4600, 4080, 5300, 443), critterAt(2480, 2400, 2560, 313)
      ],
      blocks: [
        box(1080, 300, "steak"), box(1980, 300, "lolly"), box(2860, 300, "chili"),
        box(3760, 300, "balloon"), box(4720, 300, "steak")
      ],
      pads: [pad(900, 444), pad(3580, 314)],
      movers: [moverH(1740, 320, 140, 130, 1.05, 0.2), moverV(4200, 360, 130, 76, 1.0, 1.2)],
      baby: cage(3000),
      checkpoints: [{ x: 1000 }, { x: 2980 }, { x: 4400 }],
      decor: { trees: 16, bushes: 20, clouds: 12, butterflies: 7 }
    }
  ];

  window.DINOLevels = LEVELS;
})();
