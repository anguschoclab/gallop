import { useRef, useState, useEffect, useCallback } from "react";

const DEFAULT_SPEED = 1;
const FAST_SPEED = 2;
const STATS_UPDATE_MS = 100;

export function useRaceReplay(
  duration: number,
  onComplete?: () => void,
) {
  const timeRef = useRef(0);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const timeLabelRef = useRef<HTMLSpanElement>(null);
  const leaderLabelRef = useRef<HTMLSpanElement>(null);

  const [isPlaying, setIsPlaying] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(DEFAULT_SPEED);
  const [cameraMode, setCameraMode] = useState<"leader" | "player" | "free">("leader");

  const restart = useCallback(() => {
    timeRef.current = 0;
    if (progressBarRef.current) progressBarRef.current.style.width = "0%";
    if (timeLabelRef.current) timeLabelRef.current.textContent = "0.00";
    setIsPlaying(true);
  }, []);

  const toggleSpeed = useCallback(() => {
    setPlaybackSpeed((s) => (s === DEFAULT_SPEED ? FAST_SPEED : DEFAULT_SPEED));
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraMode((m) => (m === "leader" ? "player" : "leader"));
  }, []);

  useEffect(() => {
    let lastTime = performance.now();
    let lastStatsAt = 0;
    let frameId = 0;
    let stopped = false;

    const tick = (now: number) => {
      if (stopped) return;
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      if (isPlaying) {
        const next = timeRef.current + dt * playbackSpeed;
        if (next >= duration) {
          timeRef.current = duration;
          setIsPlaying(false);
          onComplete?.();
          return;
        }
        timeRef.current = next;
      }

      if (now - lastStatsAt >= STATS_UPDATE_MS) {
        lastStatsAt = now;
        updateStats();
      }
      frameId = requestAnimationFrame(tick);
    };

    const updateStats = () => {
      const t = timeRef.current;
      if (timeLabelRef.current) timeLabelRef.current.textContent = t.toFixed(2);
      if (progressBarRef.current && duration > 0) {
        progressBarRef.current.style.width = `${(t / duration) * 100}%`;
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(frameId);
    };
  }, [isPlaying, playbackSpeed, duration, onComplete]);

  return {
    timeRef,
    progressBarRef,
    timeLabelRef,
    leaderLabelRef,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    cameraMode,
    setCameraMode,
    restart,
    toggleSpeed,
    toggleCamera,
  };
}
