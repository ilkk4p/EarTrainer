let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

export function playNote(frequency: number, startTime: number, duration: number) {
  const ctx = getAudioContext();
  
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.type = "sine";
  osc.frequency.value = frequency;
  
  // Add a slight overtone for warmth
  const osc2 = ctx.createOscillator();
  osc2.type = "triangle";
  osc2.frequency.value = frequency;
  
  const gain2 = ctx.createGain();
  gain2.gain.value = 0.15;
  
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(0.35, startTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
  
  osc.connect(gain);
  osc2.connect(gain2);
  gain2.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(startTime);
  osc.stop(startTime + duration);
  osc2.start(startTime);
  osc2.stop(startTime + duration);
}

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function playInterval(semitones: number, harmonic = false): number {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const root = 48 + Math.floor(Math.random() * 24);
  playNote(midiToFrequency(root), now, 0.8);
  playNote(midiToFrequency(root + semitones), harmonic ? now : now + 0.9, 0.8);
  return root;
}

export function replayInterval(root: number, semitones: number, harmonic = false): void {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  playNote(midiToFrequency(root), now, 0.8);
  playNote(midiToFrequency(root + semitones), harmonic ? now : now + 0.9, 0.8);
}

export function getCurrentTime(): number {
  return getAudioContext().currentTime;
}
