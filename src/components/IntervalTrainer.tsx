import { useState, useCallback } from "react";
import { Play, RotateCcw, Volume2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SCALES, INTERVAL_NAMES, getIntervalsForScale, type Scale } from "@/lib/scales";
import { playInterval, replayInterval } from "@/lib/audio";

type GameState = "idle" | "playing" | "guessing" | "correct" | "wrong";

const IntervalTrainer = () => {
  const [selectedScale, setSelectedScale] = useState<Scale>(SCALES[0]);
  const [currentInterval, setCurrentInterval] = useState<number | null>(null);
  const [currentRoot, setCurrentRoot] = useState<number | null>(null);
  const [gameState, setGameState] = useState<GameState>("idle");
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [stats, setStats] = useState({ correct: 0, total: 0 });

  const availableIntervals = getIntervalsForScale(selectedScale);

  const handlePlay = useCallback(() => {
    const intervals = getIntervalsForScale(selectedScale);
    const randomInterval = intervals[Math.floor(Math.random() * intervals.length)];
    setCurrentInterval(randomInterval);
    setSelectedAnswer(null);
    setGameState("guessing");
    const root = playInterval(randomInterval);
    setCurrentRoot(root);
  }, [selectedScale]);

  const handleReplay = useCallback(() => {
    if (currentInterval !== null && currentRoot !== null) {
      replayInterval(currentRoot, currentInterval);
    }
  }, [currentInterval, currentRoot]);

  const handleGuess = useCallback(
    (semitones: number) => {
      if (gameState !== "guessing") return;
      setSelectedAnswer(semitones);
      const isCorrect = semitones === currentInterval;
      setGameState(isCorrect ? "correct" : "wrong");
      setStats((prev) => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
      }));
    },
    [gameState, currentInterval]
  );

  const handleScaleChange = (scale: Scale) => {
    setSelectedScale(scale);
    setGameState("idle");
    setCurrentInterval(null);
    setSelectedAnswer(null);
  };

  const handleReset = () => {
    setStats({ correct: 0, total: 0 });
    setGameState("idle");
    setCurrentInterval(null);
    setSelectedAnswer(null);
  };

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 md:py-16">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-3">
          <Volume2 className="w-8 h-8 text-primary" />
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Intervalliharjoitus
          </h1>
        </div>
        <p className="text-muted-foreground text-lg">
          Kuuntele intervalli ja tunnista se
        </p>
      </div>

      {/* Scale Selection */}
      <div className="w-full max-w-2xl mb-8">
        <label className="block text-sm font-medium text-muted-foreground mb-3 uppercase tracking-wider">
          Asteikko
        </label>
        <div className="flex flex-wrap gap-2">
          {SCALES.map((scale) => (
            <button
              key={scale.id}
              onClick={() => handleScaleChange(scale)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedScale.id === scale.id
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {scale.name}
            </button>
          ))}
        </div>
      </div>

      {/* Play Controls */}
      <div className="flex items-center gap-4 mb-10">
        <Button
          onClick={handlePlay}
          size="lg"
          className="h-16 w-16 rounded-full p-0 text-primary-foreground bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-105"
        >
          <Play className="w-7 h-7 ml-0.5" />
        </Button>
        {(gameState === "guessing" || gameState === "correct" || gameState === "wrong") && (
          <Button
            onClick={handleReplay}
            variant="outline"
            size="lg"
            className="h-12 rounded-full px-6 gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Toista
          </Button>
        )}
      </div>

      {/* Feedback */}
      {gameState === "correct" && (
        <div className="flex items-center gap-2 mb-6 text-success font-semibold text-lg animate-in fade-in duration-300">
          <Check className="w-6 h-6" />
          Oikein! {INTERVAL_NAMES[currentInterval!]}
        </div>
      )}
      {gameState === "wrong" && (
        <div className="mb-6 text-center animate-in fade-in duration-300">
          <div className="flex items-center justify-center gap-2 text-error font-semibold text-lg">
            <X className="w-6 h-6" />
            Väärin!
          </div>
          <p className="text-muted-foreground mt-1">
            Oikea vastaus: <span className="text-foreground font-medium">{INTERVAL_NAMES[currentInterval!]}</span>
          </p>
        </div>
      )}

      {/* Interval Buttons */}
      <div className="w-full max-w-2xl">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {availableIntervals.map((semitones) => {
            const isCorrectAnswer = gameState !== "idle" && gameState !== "guessing" && semitones === currentInterval;
            const isWrongAnswer = gameState === "wrong" && semitones === selectedAnswer;

            return (
              <button
                key={semitones}
                onClick={() => handleGuess(semitones)}
                disabled={gameState !== "guessing"}
                className={`relative p-4 rounded-xl text-left transition-all duration-200 border ${
                  isCorrectAnswer
                    ? "bg-success/15 border-success/40 text-success"
                    : isWrongAnswer
                    ? "bg-error/15 border-error/40 text-error"
                    : gameState === "guessing"
                    ? "bg-card border-border hover:border-primary/50 hover:bg-card/80 cursor-pointer"
                    : "bg-card border-border opacity-60"
                }`}
              >
                <div className="font-mono text-xs text-muted-foreground mb-1">
                  {semitones} st
                </div>
                <div className="font-semibold text-sm">
                  {INTERVAL_NAMES[semitones]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      {stats.total > 0 && (
        <div className="mt-10 flex items-center gap-6 text-sm">
          <div className="text-muted-foreground">
            <span className="text-foreground font-semibold">{stats.correct}</span> / {stats.total} oikein
          </div>
          <div className="text-muted-foreground">
            Tarkkuus: <span className="text-foreground font-semibold">{accuracy}%</span>
          </div>
          <button
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
          >
            Nollaa
          </button>
        </div>
      )}

      {/* Next button after answer */}
      {(gameState === "correct" || gameState === "wrong") && (
        <Button
          onClick={handlePlay}
          className="mt-6 gap-2"
          size="lg"
        >
          Seuraava
          <Play className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};

export default IntervalTrainer;
