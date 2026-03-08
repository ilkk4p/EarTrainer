let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

export type Instrument = "piano" | "guitar" | "trumpet";

function playNoteWithInstrument(
  frequency: number,
  startTime: number,
  duration: number,
  instrument: Instrument
) {
  const ctx = getAudioContext();
  switch (instrument) {
    case "piano":
      playPiano(ctx, frequency, startTime, duration);
      break;
    case "guitar":
      playGuitar(ctx, frequency, startTime, duration);
      break;
    case "trumpet":
      playTrumpet(ctx, frequency, startTime, duration);
      break;
  }
}

// ─── Piano: layered harmonics with per-partial decay + soft hammer noise ───
function playPiano(ctx: AudioContext, freq: number, start: number, dur: number) {
  const master = ctx.createGain();
  
  // Soundboard resonance simulation
  const soundboard = ctx.createBiquadFilter();
  soundboard.type = "peaking";
  soundboard.frequency.value = 220;
  soundboard.Q.value = 0.6;
  soundboard.gain.value = 3;

  const soundboard2 = ctx.createBiquadFilter();
  soundboard2.type = "peaking";
  soundboard2.frequency.value = 440;
  soundboard2.Q.value = 0.5;
  soundboard2.gain.value = 2;

  // Warmth: gentle high-frequency rolloff (grand piano has mellow top end)
  const warmth = ctx.createBiquadFilter();
  warmth.type = "lowpass";
  warmth.frequency.value = Math.min(freq * 8, 12000);
  warmth.Q.value = 0.4;

  // Presence peak around 2-4kHz (grand piano clarity)
  const presence = ctx.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = 2800;
  presence.Q.value = 0.8;
  presence.gain.value = 2.5;

  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.ratio.value = 3;
  compressor.knee.value = 8;

  master.connect(soundboard);
  soundboard.connect(soundboard2);
  soundboard2.connect(presence);
  presence.connect(warmth);
  warmth.connect(compressor);
  compressor.connect(ctx.destination);

  // Hammer felt noise — softer, more realistic thud
  const noiseLen = Math.floor(ctx.sampleRate * 0.025);
  const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) {
    // Shaped noise that decays within the buffer
    const env = Math.exp(-i / (ctx.sampleRate * 0.005));
    noiseData[i] = (Math.random() * 2 - 1) * 0.3 * env;
  }
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuf;
  const noiseGain = ctx.createGain();
  // Hammer is louder in upper register, softer in bass
  const hammerVol = 0.04 + (freq / 4000) * 0.08;
  noiseGain.gain.setValueAtTime(hammerVol, start);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, start + 0.035);
  const noiseFilt = ctx.createBiquadFilter();
  noiseFilt.type = "bandpass";
  noiseFilt.frequency.value = Math.min(freq * 4, 6000);
  noiseFilt.Q.value = 0.8;
  noiseSrc.connect(noiseFilt);
  noiseFilt.connect(noiseGain);
  noiseGain.connect(master);
  noiseSrc.start(start);
  noiseSrc.stop(start + 0.05);

  // Grand piano partials — more harmonics, realistic amplitudes & decay
  // Based on spectral analysis of Steinway grand
  const partials = [
    { ratio: 1,  amp: 1.0,   decayMul: 1.0 },
    { ratio: 2,  amp: 0.65,  decayMul: 0.92 },
    { ratio: 3,  amp: 0.35,  decayMul: 0.78 },
    { ratio: 4,  amp: 0.20,  decayMul: 0.65 },
    { ratio: 5,  amp: 0.12,  decayMul: 0.55 },
    { ratio: 6,  amp: 0.07,  decayMul: 0.45 },
    { ratio: 7,  amp: 0.04,  decayMul: 0.38 },
    { ratio: 8,  amp: 0.025, decayMul: 0.32 },
    { ratio: 9,  amp: 0.015, decayMul: 0.28 },
    { ratio: 10, amp: 0.008, decayMul: 0.24 },
  ];

  // Inharmonicity coefficient — higher for shorter (higher) strings
  const B = 0.00012 * Math.pow(freq / 261.6, 0.5);

  const baseVol = 0.13;
  partials.forEach(({ ratio, amp, decayMul }) => {
    // Real piano inharmonicity: f_n = n * f0 * sqrt(1 + B * n^2)
    const pFreq = freq * ratio * Math.sqrt(1 + B * ratio * ratio);
    if (pFreq > 16000) return;

    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = pFreq;

    const g = ctx.createGain();
    const partDur = Math.max(dur * decayMul, 0.3);

    // Attack: very fast but not instant (felt hammer)
    const attackTime = 0.003 + ratio * 0.0005;
    const peakAmp = baseVol * amp;

    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(peakAmp, start + attackTime);
    // Two-stage decay: fast initial drop then slow sustain (like real piano)
    g.gain.exponentialRampToValueAtTime(peakAmp * 0.5, start + partDur * 0.08);
    g.gain.exponentialRampToValueAtTime(peakAmp * 0.2, start + partDur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.001, start + partDur);

    osc.connect(g);
    g.connect(master);
    osc.start(start);
    osc.stop(start + partDur + 0.05);
  });

  // Sympathetic string resonance — very quiet octave and fifth
  [2.0, 1.5].forEach((mult, i) => {
    const sFreq = freq * mult;
    if (sFreq > 10000) return;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = sFreq;
    const g = ctx.createGain();
    const sympAmp = (i === 0 ? 0.008 : 0.005) * baseVol;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(sympAmp, start + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur * 0.8);
    osc.connect(g);
    g.connect(master);
    osc.start(start);
    osc.stop(start + dur * 0.8 + 0.05);
  });
}

// ─── Guitar: Karplus-Strong inspired pluck synthesis ───
function playGuitar(ctx: AudioContext, freq: number, start: number, dur: number) {
  const master = ctx.createGain();
  master.gain.value = 0.7;

  // Body resonance filter
  const body = ctx.createBiquadFilter();
  body.type = "peaking";
  body.frequency.value = 250;
  body.Q.value = 1.2;
  body.gain.value = 4;

  const body2 = ctx.createBiquadFilter();
  body2.type = "peaking";
  body2.frequency.value = 120;
  body2.Q.value = 0.8;
  body2.gain.value = 3;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = "lowpass";
  lowpass.frequency.value = Math.min(freq * 6, 10000);
  lowpass.Q.value = 0.7;
  // Frequency drops over time (string dampening)
  lowpass.frequency.setValueAtTime(Math.min(freq * 6, 10000), start);
  lowpass.frequency.exponentialRampToValueAtTime(Math.min(freq * 2, 3000), start + dur);

  master.connect(body);
  body.connect(body2);
  body2.connect(lowpass);
  lowpass.connect(ctx.destination);

  // Pluck noise burst
  const noiseLen = Math.floor(ctx.sampleRate * 0.04);
  const noiseBuf = ctx.createBuffer(1, noiseLen, ctx.sampleRate);
  const noiseData = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseLen; i++) {
    noiseData[i] = (Math.random() * 2 - 1);
  }
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuf;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.25, start);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, start + 0.06);
  const noiseFilt = ctx.createBiquadFilter();
  noiseFilt.type = "bandpass";
  noiseFilt.frequency.value = freq * 2.5;
  noiseFilt.Q.value = 1.5;
  noiseSrc.connect(noiseFilt);
  noiseFilt.connect(noiseGain);
  noiseGain.connect(master);
  noiseSrc.start(start);
  noiseSrc.stop(start + 0.07);

  // Harmonic partials with fast decay (simulates plucked string)
  const partials = [
    { ratio: 1, amp: 1.0 },
    { ratio: 2, amp: 0.5 },
    { ratio: 3, amp: 0.33 },
    { ratio: 4, amp: 0.12 },
    { ratio: 5, amp: 0.06 },
    { ratio: 6, amp: 0.03 },
  ];

  partials.forEach(({ ratio, amp }) => {
    const pFreq = freq * ratio;
    if (pFreq > 12000) return;

    const osc = ctx.createOscillator();
    // Mix of waveforms for organic character
    osc.type = ratio <= 2 ? "triangle" : "sine";
    osc.frequency.value = pFreq;

    const g = ctx.createGain();
    // Higher partials decay faster
    const partDecay = dur * Math.max(0.2, 1 - ratio * 0.12);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.1 * amp, start + 0.002);
    g.gain.exponentialRampToValueAtTime(0.1 * amp * 0.4, start + partDecay * 0.2);
    g.gain.exponentialRampToValueAtTime(0.001, start + partDecay);

    osc.connect(g);
    g.connect(master);
    osc.start(start);
    osc.stop(start + partDecay + 0.05);
  });
}

// ─── Trumpet: filtered sawtooth + formants + vibrato + breath noise ───
function playTrumpet(ctx: AudioContext, freq: number, start: number, dur: number) {
  const master = ctx.createGain();

  // Brass formant filters
  const formant1 = ctx.createBiquadFilter();
  formant1.type = "peaking";
  formant1.frequency.value = 1200;
  formant1.Q.value = 2;
  formant1.gain.value = 6;

  const formant2 = ctx.createBiquadFilter();
  formant2.type = "peaking";
  formant2.frequency.value = 2400;
  formant2.Q.value = 3;
  formant2.gain.value = 4;

  const brightness = ctx.createBiquadFilter();
  brightness.type = "lowpass";
  // Brightness increases with attack (simulates lip tension)
  brightness.frequency.setValueAtTime(freq * 2, start);
  brightness.frequency.linearRampToValueAtTime(freq * 5, start + 0.12);
  brightness.frequency.setValueAtTime(freq * 5, start + dur - 0.15);
  brightness.frequency.linearRampToValueAtTime(freq * 3, start + dur);
  brightness.Q.value = 0.8;

  master.connect(formant1);
  formant1.connect(formant2);
  formant2.connect(brightness);
  brightness.connect(ctx.destination);

  // Slow brassy attack, sustained, tapered release
  master.gain.setValueAtTime(0, start);
  master.gain.linearRampToValueAtTime(0.08, start + 0.04);
  master.gain.linearRampToValueAtTime(0.2, start + 0.12);
  master.gain.setValueAtTime(0.18, start + dur - 0.12);
  master.gain.linearRampToValueAtTime(0.001, start + dur);

  // Vibrato (delayed onset, like a real player)
  const vibrato = ctx.createOscillator();
  const vibratoGain = ctx.createGain();
  vibrato.frequency.value = 5.2;
  vibratoGain.gain.setValueAtTime(0, start);
  vibratoGain.gain.linearRampToValueAtTime(0, start + 0.2);
  vibratoGain.gain.linearRampToValueAtTime(freq * 0.012, start + 0.4);
  vibrato.connect(vibratoGain);
  vibrato.start(start);
  vibrato.stop(start + dur);

  // Core oscillator: sawtooth for brassy harmonics
  const osc = ctx.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.value = freq;
  vibratoGain.connect(osc.frequency);

  // Softer second oscillator (square, one octave down, quiet — adds warmth)
  const osc2 = ctx.createOscillator();
  osc2.type = "square";
  osc2.frequency.value = freq;
  vibratoGain.connect(osc2.frequency);
  const g2 = ctx.createGain();
  g2.gain.value = 0.06;
  osc2.connect(g2);

  osc.connect(master);
  g2.connect(master);
  osc.start(start);
  osc.stop(start + dur + 0.05);
  osc2.start(start);
  osc2.stop(start + dur + 0.05);

  // Breath noise layered in
  const breathLen = Math.floor(ctx.sampleRate * dur);
  const breathBuf = ctx.createBuffer(1, breathLen, ctx.sampleRate);
  const breathData = breathBuf.getChannelData(0);
  for (let i = 0; i < breathLen; i++) {
    breathData[i] = (Math.random() * 2 - 1);
  }
  const breathSrc = ctx.createBufferSource();
  breathSrc.buffer = breathBuf;
  const breathGain = ctx.createGain();
  breathGain.gain.setValueAtTime(0, start);
  breathGain.gain.linearRampToValueAtTime(0.015, start + 0.05);
  breathGain.gain.setValueAtTime(0.012, start + dur - 0.1);
  breathGain.gain.linearRampToValueAtTime(0.001, start + dur);
  const breathFilt = ctx.createBiquadFilter();
  breathFilt.type = "bandpass";
  breathFilt.frequency.value = 3000;
  breathFilt.Q.value = 0.5;
  breathSrc.connect(breathFilt);
  breathFilt.connect(breathGain);
  breathGain.connect(master);
  breathSrc.start(start);
  breathSrc.stop(start + dur + 0.05);
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function playInterval(semitones: number, harmonic = false, instrument: Instrument = "piano"): number {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const root = 48 + Math.floor(Math.random() * 24);
  const noteDur = instrument === "guitar" ? 1.2 : instrument === "trumpet" ? 1.0 : 1.0;
  const gap = instrument === "guitar" ? 1.0 : 0.9;
  playNoteWithInstrument(midiToFrequency(root), now, noteDur, instrument);
  playNoteWithInstrument(midiToFrequency(root + semitones), harmonic ? now : now + gap, noteDur, instrument);
  return root;
}

export function replayInterval(root: number, semitones: number, harmonic = false, instrument: Instrument = "piano"): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const noteDur = instrument === "guitar" ? 1.2 : instrument === "trumpet" ? 1.0 : 1.0;
  const gap = instrument === "guitar" ? 1.0 : 0.9;
  playNoteWithInstrument(midiToFrequency(root), now, noteDur, instrument);
  playNoteWithInstrument(midiToFrequency(root + semitones), harmonic ? now : now + gap, noteDur, instrument);
}

export function getCurrentTime(): number {
  return getAudioContext().currentTime;
}
