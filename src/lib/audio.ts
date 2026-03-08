let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
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

function playPiano(ctx: AudioContext, freq: number, start: number, dur: number) {
  const osc = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const osc3 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = freq;

  osc2.type = "triangle";
  osc2.frequency.value = freq;

  // Soft overtone for body
  osc3.type = "sine";
  osc3.frequency.value = freq * 2;

  const g2 = ctx.createGain();
  g2.gain.value = 0.12;
  const g3 = ctx.createGain();
  g3.gain.value = 0.06;

  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(0.35, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.15, start + 0.15);
  gain.gain.exponentialRampToValueAtTime(0.01, start + dur);

  osc.connect(gain);
  osc2.connect(g2);
  g2.connect(gain);
  osc3.connect(g3);
  g3.connect(gain);
  gain.connect(ctx.destination);

  [osc, osc2, osc3].forEach((o) => {
    o.start(start);
    o.stop(start + dur);
  });
}

function playGuitar(ctx: AudioContext, freq: number, start: number, dur: number) {
  const harmonics = [1, 2, 3, 4, 5, 6];
  const amplitudes = [1, 0.5, 0.33, 0.15, 0.08, 0.04];
  const masterGain = ctx.createGain();
  masterGain.connect(ctx.destination);

  masterGain.gain.setValueAtTime(0, start);
  masterGain.gain.linearRampToValueAtTime(0.3, start + 0.005);
  masterGain.gain.exponentialRampToValueAtTime(0.12, start + 0.1);
  masterGain.gain.exponentialRampToValueAtTime(0.01, start + dur);

  harmonics.forEach((h, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq * h;
    g.gain.value = amplitudes[i] * 0.08;
    osc.connect(g);
    g.connect(masterGain);
    osc.start(start);
    osc.stop(start + dur);
  });

  // Pluck noise burst
  const bufferSize = ctx.sampleRate * 0.03;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.15, start);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, start + 0.04);
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = freq * 2;
  filter.Q.value = 2;
  noise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(masterGain);
  noise.start(start);
  noise.stop(start + 0.05);
}

function playTrumpet(ctx: AudioContext, freq: number, start: number, dur: number) {
  const harmonics = [1, 2, 3, 4, 5];
  const amplitudes = [1, 0.8, 0.6, 0.3, 0.15];
  const masterGain = ctx.createGain();

  // Brass-like slow attack, sustain, quick release
  masterGain.gain.setValueAtTime(0, start);
  masterGain.gain.linearRampToValueAtTime(0.3, start + 0.08);
  masterGain.gain.setValueAtTime(0.28, start + dur - 0.1);
  masterGain.gain.linearRampToValueAtTime(0.01, start + dur);

  // Slight vibrato
  const vibrato = ctx.createOscillator();
  const vibratoGain = ctx.createGain();
  vibrato.frequency.value = 5.5;
  vibratoGain.gain.value = freq * 0.008;
  vibrato.connect(vibratoGain);

  harmonics.forEach((h, i) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.value = freq * h;
    vibratoGain.connect(osc.frequency);
    g.gain.value = amplitudes[i] * 0.07;
    osc.connect(g);
    g.connect(masterGain);
    osc.start(start);
    osc.stop(start + dur);
  });

  vibrato.start(start);
  vibrato.stop(start + dur);

  // Bright filter for brassy tone
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = freq * 4;
  filter.Q.value = 1.5;
  masterGain.connect(filter);
  filter.connect(ctx.destination);
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function playInterval(semitones: number, harmonic = false, instrument: Instrument = "piano"): number {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const root = 48 + Math.floor(Math.random() * 24);
  playNoteWithInstrument(midiToFrequency(root), now, 0.8, instrument);
  playNoteWithInstrument(midiToFrequency(root + semitones), harmonic ? now : now + 0.9, 0.8, instrument);
  return root;
}

export function replayInterval(root: number, semitones: number, harmonic = false, instrument: Instrument = "piano"): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  playNoteWithInstrument(midiToFrequency(root), now, 0.8, instrument);
  playNoteWithInstrument(midiToFrequency(root + semitones), harmonic ? now : now + 0.9, 0.8, instrument);
}

export function getCurrentTime(): number {
  return getAudioContext().currentTime;
}
