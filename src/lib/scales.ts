export interface Scale {
  id: string;
  name: string;
  semitones: number[]; // semitones from root that belong to this scale (within one octave + octave)
}

export const SCALES: Scale[] = [
  {
    id: "chromatic",
    name: "Kromaattinen",
    semitones: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  },
  {
    id: "major",
    name: "Duuri",
    semitones: [0, 2, 4, 5, 7, 9, 11, 12],
  },
  {
    id: "natural-minor",
    name: "Luonnollinen molli",
    semitones: [0, 2, 3, 5, 7, 8, 10, 12],
  },
  {
    id: "melodic-minor",
    name: "Melodinen molli",
    semitones: [0, 2, 3, 5, 7, 9, 11, 12],
  },
  {
    id: "major-pentatonic",
    name: "Duuri pentatoninen",
    semitones: [0, 2, 4, 7, 9, 12],
  },
  {
    id: "minor-pentatonic",
    name: "Molli pentatoninen",
    semitones: [0, 3, 5, 7, 10, 12],
  },
  {
    id: "blues",
    name: "Blues",
    semitones: [0, 3, 5, 6, 7, 10, 12],
  },
];

export const INTERVAL_NAMES: Record<number, string> = {
  0: "Priimi (P1)",
  1: "Pieni sekunti (m2)",
  2: "Suuri sekunti (M2)",
  3: "Pieni terssi (m3)",
  4: "Suuri terssi (M3)",
  5: "Puhdas kvartti (P4)",
  6: "Tritonus (TT)",
  7: "Puhdas kvintti (P5)",
  8: "Pieni seksti (m6)",
  9: "Suuri seksti (M6)",
  10: "Pieni septimi (m7)",
  11: "Suuri septimi (M7)",
  12: "Oktaavi (P8)",
};

export function getIntervalsForScale(scale: Scale): number[] {
  return scale.semitones.filter((s) => s >= 1 && s <= 12);
}
