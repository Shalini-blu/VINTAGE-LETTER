/* ─── Centralized Sound Library ───────────────────────────────
   All audio synthesis is procedural (Web Audio API).
   No external files required. Volumes are intentionally subtle.
───────────────────────────────────────────────────────────── */

let _ctx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!_ctx || _ctx.state === 'closed') {
    _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return _ctx;
}

export function resumeAudio() {
  try { ctx().resume(); } catch {}
}

/* helpers */
function noise(dur: number, freq: number, q: number, vol: number, t = 0) {
  try {
    const c = ctx(); const now = c.currentTime + t;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(); src.buffer = buf;
    const flt = c.createBiquadFilter(); flt.type = 'bandpass';
    flt.frequency.value = freq; flt.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(flt); flt.connect(g); g.connect(c.destination);
    src.start(now); src.stop(now + dur + 0.01);
  } catch {}
}

function tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, t = 0) {
  try {
    const c = ctx(); const now = c.currentTime + t;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, now);
    o.frequency.exponentialRampToValueAtTime(f1, now + dur);
    g.gain.setValueAtTime(vol, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g); g.connect(c.destination); o.start(now); o.stop(now + dur + 0.01);
  } catch {}
}

/* ── Typewriter key press — 4-layer mechanical feel ─────── */
export function playKey() {
  const pitch = 1100 + Math.random() * 1100;
  const vol   = 0.14 + Math.random() * 0.08;
  // Impact noise burst
  noise(0.038, pitch, 0.7 + Math.random() * 0.5, vol, 0);
  // Body thud
  tone('square', 75 + Math.random() * 45, 42, 0.032, 0.055 + Math.random() * 0.02, 0);
  // Typebar ping (high, brief)
  tone('sine', 3000 + Math.random() * 800, 1500, 0.022, 0.038, 0.004);
  // Paper friction (very subtle)
  noise(0.025, 900, 0.4, vol * 0.18, 0.008);
}

/* ── Carriage return — ratchet + bell + slide + thud ────── */
export function playReturn() {
  // Main bell note
  tone('sine', 880, 660, 0.26, 0.13, 0);
  tone('sine', 1100, 880, 0.18, 0.055, 0.01);
  // Ratchet slide
  noise(0.15, 350, 0.55, 0.09, 0.022);
  noise(0.09, 800, 1.1, 0.05, 0.065);
  // Mechanical clunk at end
  tone('triangle', 175, 65, 0.14, 0.06, 0.13);
  noise(0.04, 240, 0.6, 0.07, 0.14);
}

/* ── Paper feed on Enter ─────────────────────────────────── */
export function playPaperFeed() {
  noise(0.10, 720, 0.65, 0.09, 0);
  noise(0.07, 430, 0.45, 0.05, 0.04);
  noise(0.05, 1300, 1.6, 0.03, 0.07);
}

/* ── Lever drag click (call each ~100ms while dragging) ─── */
export function playLeverClick() {
  noise(0.025, 1900, 1.4, 0.065, 0);
  tone('square', 110, 75, 0.018, 0.035, 0);
}

/* ── Lever release snap ──────────────────────────────────── */
export function playLeverRelease() {
  tone('triangle', 600, 180, 0.12, 0.09, 0);
  noise(0.07, 1400, 1.8, 0.06, 0.01);
  tone('sine', 300, 120, 0.10, 0.04, 0.06);
}

/* ── Settings drawer open — brass slide + click ─────────── */
export function playDrawerOpen() {
  // Brass slide
  tone('triangle', 660, 240, 0.17, 0.095, 0);
  noise(0.13, 580, 0.9, 0.065, 0.02);
  // End click
  noise(0.055, 2100, 2.8, 0.04, 0.13);
  tone('sine', 400, 210, 0.08, 0.045, 0.14);
  // Subtle mechanical whirr
  noise(0.25, 180, 0.3, 0.025, 0.01);
}

/* ── Settings drawer close ───────────────────────────────── */
export function playDrawerClose() {
  noise(0.08, 580, 1.1, 0.06, 0);
  tone('triangle', 480, 190, 0.10, 0.07, 0.01);
  noise(0.04, 2500, 3.2, 0.03, 0.065);
}

/* ── Generic button / option click ──────────────────────── */
export function playButtonClick() {
  tone('triangle', 580, 230, 0.07, 0.065, 0);
  noise(0.035, 1900, 2.2, 0.038, 0.008);
}

/* ── Wax stamp — thud + drip + settle ───────────────────── */
export function playWaxStamp() {
  // Soft thud
  tone('sine', 88, 46, 0.22, 0.20, 0);
  noise(0.07, 195, 0.45, 0.13, 0.012);
  // Wax drip hiss
  tone('triangle', 310, 165, 0.28, 0.07, 0.045);
  noise(0.17, 1550, 2.6, 0.04, 0.06);
  // Settling tone
  tone('sine', 135, 58, 0.14, 0.04, 0.19);
  noise(0.06, 380, 0.7, 0.03, 0.22);
}

/* ── Envelope seal crack + paper unfold ─────────────────── */
export function playEnvelopeOpen() {
  // Wax crack
  tone('triangle', 520, 110, 0.13, 0.10, 0);
  noise(0.13, 950, 1.0, 0.11, 0.018);
  // Flap lift rustle
  noise(0.22, 370, 0.55, 0.07, 0.08);
  noise(0.16, 620, 0.75, 0.05, 0.14);
  // Paper slide
  tone('sine', 195, 138, 0.38, 0.04, 0.12);
  noise(0.20, 500, 0.6, 0.04, 0.20);
}

/* ── Envelope fold / close ───────────────────────────────── */
export function playEnvelopeFold() {
  noise(0.14, 600, 0.7, 0.07, 0);
  noise(0.10, 350, 0.5, 0.05, 0.06);
  tone('triangle', 280, 110, 0.12, 0.04, 0.08);
}

/* ── Ambient mechanical hum (start/stop via returned fn) ── */
let _ambientNode: AudioBufferSourceNode | null = null;
let _ambientGain: GainNode | null = null;

export function startAmbient() {
  if (_ambientNode) return;
  try {
    const c = ctx();
    const dur = 4.0;
    const sr = c.sampleRate;
    const buf = c.createBuffer(1, Math.ceil(sr * dur), sr);
    const d = buf.getChannelData(0);
    // Filtered noise for mechanical rumble
    for (let i = 0; i < d.length; i++) {
      d[i] = (Math.random() * 2 - 1) * 0.04;
    }
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const f1 = c.createBiquadFilter(); f1.type = 'lowpass'; f1.frequency.value = 90;
    const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 55; f2.Q.value = 0.5;
    const g = c.createGain(); g.gain.value = 0;
    g.gain.setTargetAtTime(0.045, c.currentTime, 1.5);
    src.connect(f1); f1.connect(f2); f2.connect(g); g.connect(c.destination);
    src.start();
    _ambientNode = src;
    _ambientGain = g;
  } catch {}
}

export function stopAmbient() {
  if (!_ambientNode || !_ambientGain) return;
  try {
    const c = ctx();
    _ambientGain.gain.setTargetAtTime(0, c.currentTime, 0.8);
    const n = _ambientNode;
    setTimeout(() => { try { n.stop(); } catch {} }, 2500);
    _ambientNode = null;
    _ambientGain = null;
  } catch {}
}
