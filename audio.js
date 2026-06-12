/* Procedural sound effects via the Web Audio API.
   No audio files -> the game stays a self-contained, offline bundle. */
(function () {
  "use strict";

  var ctx = null;
  var master = null;
  var sfxGain = null;
  var muted = false;       // master mute (legacy: zeroes everything)
  var musicMuted = false;  // music-only mute
  var sfxMuted = false;    // sfx-only mute

  function ensure() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = sfxMuted ? 0 : 1;
    sfxGain.connect(master);
    return true;
  }

  // A single shaped tone, optionally sliding from f0 to f1.
  function tone(f0, f1, t0, dur, type, peak) {
    var osc = ctx.createOscillator();
    var g = ctx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 && f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.02, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  var SFX = {
    init: function () {
      if (ensure() && ctx.state === "suspended") ctx.resume();
    },
    setMuted: function (m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    isMuted: function () { return muted; },
    setMusicMuted: function (m) {
      musicMuted = m;
      if (musicGain) musicGain.gain.value = m ? 0 : 0.8;
    },
    isMusicMuted: function () { return musicMuted; },
    setSfxMuted: function (m) {
      sfxMuted = m;
      if (sfxGain) sfxGain.gain.value = m ? 0 : 1;
    },
    isSfxMuted: function () { return sfxMuted; },

    jump: function () {
      if (muted || !ensure()) return;
      var t = ctx.currentTime;
      tone(380, 720, t, 0.18, "sine", 0.28);
    },
    doubleJump: function () {
      if (muted || !ensure()) return;
      var t = ctx.currentTime;
      tone(560, 940, t, 0.16, "triangle", 0.26);
    },
    collect: function () {
      if (muted || !ensure()) return;
      var t = ctx.currentTime;
      tone(880, 880, t, 0.09, "triangle", 0.24);
      tone(1320, 1320, t + 0.07, 0.12, "triangle", 0.22);
    },
    bounce: function () {
      if (muted || !ensure()) return;
      var t = ctx.currentTime;
      tone(300, 700, t, 0.1, "sine", 0.3);
      tone(700, 300, t + 0.1, 0.12, "sine", 0.22);
    },
    roar: function () {
      if (muted || !ensure()) return;
      var t = ctx.currentTime;
      tone(220, 90, t, 0.45, "sawtooth", 0.34);
      tone(140, 70, t, 0.5, "square", 0.12);
    },
    whoops: function () {
      if (muted || !ensure()) return;
      var t = ctx.currentTime;
      tone(620, 300, t, 0.16, "triangle", 0.22);
      tone(300, 180, t + 0.14, 0.22, "sine", 0.2);
    },
    win: function () {
      if (muted || !ensure()) return;
      var t = ctx.currentTime;
      var notes = [523, 659, 784, 1047];
      for (var i = 0; i < notes.length; i++) {
        tone(notes[i], notes[i], t + i * 0.13, 0.22, "triangle", 0.26);
      }
    },
    checkpoint: function () {
      if (muted || !ensure()) return;
      var t = ctx.currentTime;
      tone(660, 660, t, 0.1, "triangle", 0.24);
      tone(990, 990, t + 0.08, 0.14, "triangle", 0.22);
      tone(1320, 1320, t + 0.18, 0.16, "sine", 0.18);
    },
    // cheerful "yum"/chime, a touch different per food kind
    eat: function (kind) {
      if (muted || sfxMuted || !ensure()) return;
      var t = ctx.currentTime;
      if (kind === "chili") {
        tone(720, 1040, t, 0.08, "triangle", 0.24);
        tone(1180, 1180, t + 0.07, 0.1, "sine", 0.2);
      } else if (kind === "balloon") {
        tone(980, 1320, t, 0.07, "sine", 0.2);
        tone(1568, 1568, t + 0.06, 0.11, "triangle", 0.18);
      } else if (kind === "lolly") {
        tone(1047, 1047, t, 0.07, "triangle", 0.22);
        tone(1319, 1319, t + 0.06, 0.09, "triangle", 0.2);
        tone(1760, 1760, t + 0.13, 0.12, "sine", 0.16);
      } else {
        tone(523, 392, t, 0.06, "sine", 0.22);
        tone(784, 988, t + 0.05, 0.12, "triangle", 0.24);
      }
    },
    // very soft, short footstep tick
    step: function () {
      if (muted || sfxMuted || !ensure()) return;
      var t = ctx.currentTime;
      tone(180, 120, t, 0.04, "sine", 0.05);
    }
  };

  // ---- gentle looping background music (procedural; per-biome variants) ----
  var musicGain = null, musicTimer = null, step = 0, playing = false;
  var curTheme = "meadow", curVariant = null;

  var VARIANTS = {
    meadow: {
      STEP: 0.19,
      melWave: "triangle", melPeak: 0.16, melDurMul: 1.7,
      bassWave: "sine", bassPeak: 0.22, bassDurMul: 2.1,
      MELODY: [
        523, 0, 659, 0, 784, 0, 659, 0, 587, 0, 698, 0, 880, 0, 784, 0,
        523, 0, 659, 0, 784, 0, 1047, 0, 988, 0, 784, 0, 659, 0, 587, 0
      ],
      BASS: [
        131, 0, 0, 0, 165, 0, 0, 0, 147, 0, 0, 0, 196, 0, 0, 0,
        131, 0, 0, 0, 165, 0, 0, 0, 147, 0, 0, 0, 98, 0, 196, 0
      ]
    },
    beach: {
      STEP: 0.23,
      melWave: "sine", melPeak: 0.15, melDurMul: 2.1,
      bassWave: "sine", bassPeak: 0.2, bassDurMul: 2.4,
      MELODY: [
        440, 0, 0, 523, 0, 587, 0, 0, 659, 0, 587, 0, 523, 0, 0, 0,
        392, 0, 0, 440, 0, 523, 0, 0, 587, 0, 523, 0, 440, 0, 0, 0
      ],
      BASS: [
        110, 0, 0, 0, 0, 0, 0, 0, 147, 0, 0, 0, 0, 0, 0, 0,
        98, 0, 0, 0, 0, 0, 0, 0, 131, 0, 0, 0, 0, 0, 0, 0
      ]
    },
    night: {
      STEP: 0.27,
      melWave: "triangle", melPeak: 0.11, melDurMul: 2.4,
      bassWave: "sine", bassPeak: 0.16, bassDurMul: 3.0,
      MELODY: [
        330, 0, 0, 0, 392, 0, 0, 0, 330, 0, 0, 0, 294, 0, 0, 0,
        262, 0, 0, 0, 294, 0, 0, 0, 330, 0, 0, 0, 0, 0, 0, 0
      ],
      BASS: [
        82, 0, 0, 0, 0, 0, 0, 0, 98, 0, 0, 0, 0, 0, 0, 0,
        65, 0, 0, 0, 0, 0, 0, 0, 73, 0, 0, 0, 0, 0, 0, 0
      ]
    },
    snow: {
      STEP: 0.21,
      melWave: "triangle", melPeak: 0.14, melDurMul: 1.5,
      bassWave: "sine", bassPeak: 0.18, bassDurMul: 2.3,
      MELODY: [
        784, 0, 988, 0, 1175, 0, 988, 0, 880, 0, 1047, 0, 1319, 0, 1047, 0,
        784, 0, 988, 0, 1175, 0, 1397, 0, 1319, 0, 1047, 0, 988, 0, 880, 0
      ],
      BASS: [
        196, 0, 0, 0, 247, 0, 0, 0, 220, 0, 0, 0, 262, 0, 0, 0,
        196, 0, 0, 0, 247, 0, 0, 0, 220, 0, 0, 0, 147, 0, 196, 0
      ]
    }
  };

  function pickVariant(theme) { return VARIANTS[theme] || VARIANTS.meadow; }

  function mnote(freq, dur, type, peak) {
    var t0 = ctx.currentTime;
    var osc = ctx.createOscillator(), g = ctx.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(musicGain);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  function mtick() {
    var v = curVariant;
    if (!ctx || muted || musicMuted || !v) { step++; return; }
    var m = v.MELODY[step % v.MELODY.length];
    if (m) mnote(m, v.STEP * v.melDurMul, v.melWave, v.melPeak);
    var b = v.BASS[step % v.BASS.length];
    if (b) mnote(b, v.STEP * v.bassDurMul, v.bassWave, v.bassPeak);
    step++;
  }
  function scheduleTick() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    if (curVariant) musicTimer = setInterval(mtick, curVariant.STEP * 1000);
  }

  // startMusic() defaults to 'meadow'; if already playing and theme differs, swap.
  SFX.startMusic = function (theme) {
    if (!ensure()) return;
    theme = theme || "meadow";
    if (!musicGain) {
      musicGain = ctx.createGain();
      musicGain.gain.value = musicMuted ? 0 : 0.8;
      musicGain.connect(master);
    }
    if (playing) {
      if (theme !== curTheme) {
        curTheme = theme; curVariant = pickVariant(theme); step = 0; scheduleTick();
      }
      return;
    }
    curTheme = theme; curVariant = pickVariant(theme);
    playing = true;
    mtick();
    scheduleTick();
  };
  SFX.stopMusic = function () {
    playing = false;
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  };

  window.DINOAudio = SFX;
})();
