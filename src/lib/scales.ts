export interface Scale {
  id: string;
  name: string;
  semitones: number[]; // semitones from root that belong to this scale (within one octave + octave)
}

export const SCALES: Scale[] = [
  { id: "chromatic", name: "Chromatic", semitones: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
  { id: "major", name: "Major", semitones: [0, 2, 4, 5, 7, 9, 11, 12] },
  { id: "dorian", name: "Dorian", semitones: [0, 2, 3, 5, 7, 9, 10, 12] },
  { id: "mixolydian", name: "Mixolydian", semitones: [0, 2, 4, 5, 7, 9, 10, 12] },
  { id: "lydian", name: "Lydian", semitones: [0, 2, 4, 6, 7, 9, 11, 12] },
  { id: "natural-minor", name: "Natural Minor", semitones: [0, 2, 3, 5, 7, 8, 10, 12] },
  { id: "melodic-minor", name: "Melodic Minor", semitones: [0, 2, 3, 5, 7, 9, 11, 12] },
  { id: "major-pentatonic", name: "Major Pentatonic", semitones: [0, 2, 4, 7, 9, 12] },
  { id: "minor-pentatonic", name: "Minor Pentatonic", semitones: [0, 3, 5, 7, 10, 12] },
  { id: "blues", name: "Blues", semitones: [0, 3, 5, 6, 7, 10, 12] },
];

export const INTERVAL_NAMES: Record<number, string> = {
  0: "Unison (P1)",
  1: "Minor 2nd (m2)",
  2: "Major 2nd (M2)",
  3: "Minor 3rd (m3)",
  4: "Major 3rd (M3)",
  5: "Perfect 4th (P4)",
  6: "Tritone (TT)",
  7: "Perfect 5th (P5)",
  8: "Minor 6th (m6)",
  9: "Major 6th (M6)",
  10: "Minor 7th (m7)",
  11: "Major 7th (M7)",
  12: "Octave (P8)",
};

export function getIntervalsForScale(scale: Scale): number[] {
  return scale.semitones.filter((s) => s >= 1 && s <= 12);
}
