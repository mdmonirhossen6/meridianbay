let ctx: AudioContext | null = null;
let master: GainNode | null = null;

let engineOsc: OscillatorNode | null = null;
let engineOsc2: OscillatorNode | null = null;
let engineGain: GainNode | null = null;
let engineFilter: BiquadFilterNode | null = null;

let skidSource: AudioBufferSourceNode | null = null;
let skidFilter: BiquadFilterNode | null = null;
let skidGain: GainNode | null = null;

let windSource: AudioBufferSourceNode | null = null;
let windFilter: BiquadFilterNode | null = null;
let windGain: GainNode | null = null;

let ambienceSource: AudioBufferSourceNode | null = null;
let ambienceGain: GainNode | null = null;

let radioTimer: number | null = null;
let radioStep = 0;
let radioNextTime = 0;
let currentStation = -1;

let muted = false;
let initialized = false;

const ENGINE_PARAMS: Record<string, { base: number; top: number; filter: number }> = {
  sedan: { base: 62, top: 150, filter: 900 },
  sports: { base: 88, top: 230, filter: 1300 },
  suv: { base: 46, top: 105, filter: 700 },
  motorcycle: { base: 120, top: 320, filter: 1700 },
};

export function ensureAudio() {
  if (initialized) return;
  initialized = true;
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    ctx = new AC();
  } catch {
    ctx = null;
  }
  if (!ctx) return;
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.85;
  master.connect(ctx.destination);
}

export function resumeAudio() {
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();
}

export function setMuted(m: boolean) {
  muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.85, ctx.currentTime, 0.05);
}

function makeNoiseBuffer(): AudioBuffer | null {
  if (!ctx) return null;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

export function startAmbience() {
  if (!ctx || !master) return;
  // city hum
  const buf = makeNoiseBuffer();
  if (!buf) return;
  ambienceSource = ctx.createBufferSource();
  ambienceSource.buffer = buf;
  ambienceSource.loop = true;
  ambienceGain = ctx.createGain();
  ambienceGain.gain.value = 0.045;
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 340;
  ambienceSource.connect(filter);
  filter.connect(ambienceGain);
  ambienceGain.connect(master);
  ambienceSource.start();
}

export function startEngine(carClass: string) {
  if (!ctx || !master) return;
  const p = ENGINE_PARAMS[carClass] ?? ENGINE_PARAMS.sedan;
  engineFilter = ctx.createBiquadFilter();
  engineFilter.type = "lowpass";
  engineFilter.frequency.value = p.filter;
  engineGain = ctx.createGain();
  engineGain.gain.value = 0;
  engineOsc = ctx.createOscillator();
  engineOsc.type = "sawtooth";
  engineOsc.frequency.value = p.base;
  engineOsc2 = ctx.createOscillator();
  engineOsc2.type = "square";
  engineOsc2.frequency.value = p.base / 2;
  engineOsc.connect(engineFilter);
  engineOsc2.connect(engineFilter);
  engineFilter.connect(engineGain);
  engineGain.connect(master);
  engineOsc.start();
  engineOsc2.start();
}

export function stopEngine() {
  try {
    engineOsc?.stop();
    engineOsc2?.stop();
  } catch {
    /* already stopped */
  }
  engineOsc = null;
  engineOsc2 = null;
}

export function setEngineSound(carClass: string, speedRatio: number, throttle: number) {
  if (!ctx || !engineOsc || !engineOsc2 || !engineGain || !engineFilter) return;
  const p = ENGINE_PARAMS[carClass] ?? ENGINE_PARAMS.sedan;
  const t = Math.min(1, Math.abs(speedRatio) + throttle * 0.3);
  const freq = p.base + (p.top - p.base) * t;
  engineOsc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.06);
  engineOsc2.frequency.setTargetAtTime(freq * 0.5, ctx.currentTime, 0.06);
  engineFilter.frequency.setTargetAtTime(p.filter * (0.6 + t), ctx.currentTime, 0.08);
  engineGain.gain.setTargetAtTime(throttle > 0 ? 0.05 + 0.055 * t : 0.02, ctx.currentTime, 0.07);
}

export function startSkid() {
  if (!ctx || !master || skidSource) return;
  const buf = makeNoiseBuffer();
  if (!buf) return;
  skidSource = ctx.createBufferSource();
  skidSource.buffer = buf;
  skidSource.loop = true;
  skidFilter = ctx.createBiquadFilter();
  skidFilter.type = "bandpass";
  skidFilter.frequency.value = 950;
  skidFilter.Q.value = 1.4;
  skidGain = ctx.createGain();
  skidGain.gain.value = 0;
  skidSource.connect(skidFilter);
  skidFilter.connect(skidGain);
  skidGain.connect(master);
  skidSource.start();
}

export function setSkid(level: number) {
  if (!ctx || !skidGain) return;
  skidGain.gain.setTargetAtTime(level * 0.14, ctx.currentTime, 0.05);
}

export function stopSkid() {
  try {
    skidSource?.stop();
  } catch {
    /* already stopped */
  }
  skidSource = null;
  skidGain = null;
  skidFilter = null;
}

export function startWind() {
  if (!ctx || !master || windSource) return;
  const buf = makeNoiseBuffer();
  if (!buf) return;
  windSource = ctx.createBufferSource();
  windSource.buffer = buf;
  windSource.loop = true;
  windFilter = ctx.createBiquadFilter();
  windFilter.type = "lowpass";
  windFilter.frequency.value = 500;
  windGain = ctx.createGain();
  windGain.gain.value = 0;
  windSource.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(master);
  windSource.start();
}

export function setWind(speedRatio: number) {
  if (!ctx || !windGain) return;
  windGain.gain.setTargetAtTime(0.02 + speedRatio * 0.06, ctx.currentTime, 0.1);
}

export function stopWind() {
  try {
    windSource?.stop();
  } catch {
    /* already stopped */
  }
  windSource = null;
  windGain = null;
  windFilter = null;
}

function blip(freq: number, dur: number, vol: number, type: OscillatorType = "sine", when = 0) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

export function playHorn() {
  blip(311, 0.45, 0.12, "square");
  blip(277, 0.45, 0.1, "square", 0.05);
}

export function playPickup() {
  blip(660, 0.12, 0.16);
  blip(990, 0.16, 0.16, "sine", 0.09);
}

export function playComplete() {
  blip(523, 0.15, 0.16);
  blip(659, 0.15, 0.16, "sine", 0.12);
  blip(784, 0.3, 0.18, "sine", 0.24);
}

export function playStarUp() {
  blip(180, 0.2, 0.14, "sawtooth");
  blip(240, 0.2, 0.14, "sawtooth", 0.12);
}

export function playBust() {
  blip(330, 0.3, 0.16, "square");
  blip(165, 0.5, 0.16, "square", 0.2);
}

const SCALES: number[][] = [
  [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3], // C major-ish
  [220, 261.6, 329.6, 392, 440, 523.3], // A minor-ish
];

function scheduleRadio() {
  if (!ctx || currentStation < 0) return;
  const station = currentStation;
  const scale = SCALES[station % SCALES.length];
  const bpm = station === 0 ? 110 : 96;
  const beat = 60 / bpm;

  while (radioNextTime < ctx.currentTime + 1.2) {
    const step = radioStep;
    const noteIdx = step % 8;
    const pattern = station === 0
      ? [0, 2, 4, 2, 5, 4, 2, 4]
      : [1, 3, 5, 3, 6, 5, 3, 5];
    const freq = scale[pattern[noteIdx]] / (step % 4 === 3 ? 2 : 1);
    blip(freq, beat * 0.9, 0.055, step % 2 === 0 ? "triangle" : "sine", radioNextTime - ctx.currentTime);
    if (step % 2 === 0) {
      blip(freq / 2, beat * 1.9, 0.045, "sine", radioNextTime - ctx.currentTime);
    }
    if (step % 16 === 0) {
      blip(scale[0] / 2, beat * 4, 0.05, "triangle", radioNextTime - ctx.currentTime);
    }
    radioNextTime += beat;
    radioStep++;
  }
}

export function setRadio(station: number) {
  if (!ctx || !master) return;
  currentStation = station;
  if (radioTimer !== null) {
    window.clearInterval(radioTimer);
    radioTimer = null;
  }
  if (station >= 0) {
    radioStep = 0;
    radioNextTime = ctx.currentTime + 0.1;
    scheduleRadio();
    radioTimer = window.setInterval(scheduleRadio, 400);
  }
}

export function stopRadio() {
  currentStation = -1;
  if (radioTimer !== null) {
    window.clearInterval(radioTimer);
    radioTimer = null;
  }
}

export function isAudioInitialized() {
  return initialized;
}