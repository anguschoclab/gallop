import React, { useRef, useEffect, useState, useMemo } from "react";
import { Play, Pause, RotateCcw, Camera, SkipForward } from "lucide-react";
import { interpolateSnapshots, getReplayDuration } from "@/services/racePlaybackService";
import type { RaceSnapshot, HorseSnapshot } from "@/core/race/engine/raceSnapshotTypes";
import "./RaceVisualizer.css";

interface RunnerInfo {
  horseId: string;
  name: string;
  silk: string;
  owned: boolean;
}

interface RaceVisualizerProps {
  snapshots: RaceSnapshot[];
  distance: number;
  runners: RunnerInfo[];
  onComplete?: () => void;
  trackType?: "Turf" | "Dirt" | "Synthetic";
}

const PIXELS_PER_METER = 20;
const LANE_HEIGHT = 40;
const HORSE_RADIUS = 12;

export const RaceVisualizer: React.FC<RaceVisualizerProps> = ({
  snapshots,
  distance,
  runners,
  onComplete,
  trackType = "Turf",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [cameraMode, setCameraMode] = useState<"leader" | "player" | "free">("leader");

  const duration = useMemo(() => getReplayDuration(snapshots), [snapshots]);
  const playerHorseId = useMemo(() => runners.find((r) => r.owned)?.horseId, [runners]);

  // Animation Frame
  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;

    const animate = (now: number) => {
      if (isPlaying) {
        const dt = (now - lastTime) / 1000;
        setCurrentTime((t) => {
          const nextT = t + dt * playbackSpeed;
          if (nextT >= duration) {
            setIsPlaying(false);
            if (onComplete) onComplete();
            return duration;
          }
          return nextT;
        });
      }
      lastTime = now;
      render();
      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, playbackSpeed, duration, snapshots, cameraMode]);

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentHorses = interpolateSnapshots(snapshots, currentTime);

    // Determine Camera X
    let focusX = 0;
    if (cameraMode === "leader") {
      focusX = Math.max(0, ...currentHorses.map((h) => h.position)) * PIXELS_PER_METER;
    } else if (cameraMode === "player" && playerHorseId) {
      const player = currentHorses.find((h) => h.horseId === playerHorseId);
      focusX = (player?.position ?? 0) * PIXELS_PER_METER;
    }

    const viewportWidth = canvas.width;
    const offsetX = viewportWidth / 2 - focusX;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Track Background
    const trackColor = trackType === "Turf" ? "#2d5a27" : "#8b4513";
    ctx.fillStyle = trackColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Lanes & Rails
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 2;
    const numLanes = Math.max(...runners.map((_, i) => i)) + 2; // Approximate
    for (let i = 0; i <= 8; i++) {
      const y = 100 + i * LANE_HEIGHT;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw Finish Line
    const finishX = distance * PIXELS_PER_METER + offsetX;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 5;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(finishX, 100);
    ctx.lineTo(finishX, 100 + 8 * LANE_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Furlong Markers
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
    ctx.font = "10px Inter";
    for (let m = 0; m <= distance; m += 200) {
      const x = m * PIXELS_PER_METER + offsetX;
      ctx.fillText(`${m}m`, x + 5, 95);
      ctx.beginPath();
      ctx.moveTo(x, 90);
      ctx.lineTo(x, 100 + 8 * LANE_HEIGHT);
      ctx.stroke();
    }

    // Draw Horses
    currentHorses.forEach((h) => {
      const runner = runners.find((r) => r.horseId === h.horseId);
      const x = h.position * PIXELS_PER_METER + offsetX;
      const y = 100 + (h.lane + 0.5) * LANE_HEIGHT;

      // Body
      ctx.fillStyle = runner?.silk || "#666";
      ctx.beginPath();
      ctx.arc(x, y, HORSE_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Outline for player horse
      if (runner?.owned) {
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Name Label
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Inter";
      ctx.textAlign = "center";
      ctx.fillText(runner?.name || "Unknown", x, y - HORSE_RADIUS - 5);
    });
  };

  return (
    <div className="race-visualizer-container">
      <canvas
        ref={canvasRef}
        width={1000}
        height={500}
        className="race-visualizer-canvas"
        role="img"
        aria-label="Race track visualization"
      />

      <div className="race-overlay">
        <div className="race-stats tabular-nums">
          <span>Time: {currentTime.toFixed(2)}s</span>
          <span>
            Leader:{" "}
            {Math.max(
              ...(snapshots
                .find((s) => s.t > currentTime - 0.1 && s.t <= currentTime)
                ?.horses.map((h) => h.position) || [0]),
            ).toFixed(0)}
            m / {distance}m
          </span>
        </div>
      </div>

      <div
        className="race-progress-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={currentTime}
        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
      />

      <div className="race-controls">
        <button
          className="race-control-btn"
          onClick={() => setIsPlaying(!isPlaying)}
          aria-label={isPlaying ? "Pause race" : "Play race"}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          className="race-control-btn"
          onClick={() => setCurrentTime(0)}
          aria-label="Restart race"
          title="Restart"
        >
          <RotateCcw size={20} />
        </button>
        <button
          className="race-control-btn"
          onClick={() => setCameraMode(cameraMode === "leader" ? "player" : "leader")}
          aria-label={`Toggle camera focus: currently following ${cameraMode}`}
          title="Toggle Camera Focus"
        >
          <Camera size={20} color={cameraMode === "player" ? "#facc15" : "#fff"} />
        </button>
        <button
          className="race-control-btn"
          onClick={() => setPlaybackSpeed(playbackSpeed === 1 ? 2 : 1)}
          aria-label={`Toggle playback speed: currently ${playbackSpeed}x`}
          title={`Speed: ${playbackSpeed}x`}
        >
          <SkipForward size={20} color={playbackSpeed > 1 ? "#facc15" : "#fff"} />
        </button>
      </div>
    </div>
  );
};
