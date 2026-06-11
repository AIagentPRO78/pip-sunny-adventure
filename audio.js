/* Procedural sound effects via the Web Audio API.
   No audio files -> the game stays a self-contained, offline bundle. */
(function () {
  "use strict";

  var ctx = null;
  var master = null;
  var muted = false;

  function ensure() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
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
    g.connect(master);
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
    }
  };

  window.DINOAudio = SFX;
})();
