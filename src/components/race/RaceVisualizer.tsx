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

// Visualizer constants
const VISUALIZER_CONSTANTS = {
  // Canvas dimensions
  CANVAS_WIDTH: 1000,
  CANVAS_HEIGHT: 500,
  // Scale constants
  PIXELS_PER_METER: 20,
  LANE_HEIGHT: 40,
  HORSE_RADIUS: 12,
  // Layout constants
  MAX_LANES: 8,
  Y_OFFSET: 100,
  // Track colors
  TRACK_COLOR_TURF: "#2d5a27",
  TRACK_COLOR_DIRT: "#8b4513",
  LANE_COLOR: "rgba(255, 255, 255, 0.3)",
  LANE_WIDTH: 2,
  FINISH_LINE_WIDTH: 5,
  FINISH_LINE_DASH: [10, 10],
  MARKER_COLOR: "rgba(255, 255, 255, 0.5)",
  MARKER_INTERVAL: 200,
  MARKER_TEXT_OFFSET_X: 5,
  MARKER_TEXT_OFFSET_Y: 95,
  MARKER_LINE_START_Y: 90,
  // Animation constants
  DEFAULT_PLAYBACK_SPEED: 1,
  FAST_PLAYBACK_SPEED: 2,
  MS_PER_SECOND: 1000,
  SNAPSHOT_OFFSET: 0.1,
  DECIMAL_PRECISION_TIME: 2,
  DECIMAL_PRECISION_POSITION: 0,
  // Horse rendering
  HORSE_OUTLINE_WIDTH: 3,
  NAME_TEXT_OFFSET_Y: 5,
  // Progress bar
  PROGRESS_BAR_MIN: 0,
  PROGRESS_BAR_MAX: 100,
} as const;

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
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(VISUALIZER_CONSTANTS.DEFAULT_PLAYBACK_SPEED);
  const [cameraMode, setCameraMode] = useState<"leader" | "player" | "free">("leader");

  const duration = useMemo(() => getReplayDuration(snapshots), [snapshots]);
  const playerHorseId = useMemo(() => runners.find((r) => r.owned)?.horseId, [runners]);

  // Animation Frame
  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;

    const animate = (now: number) => {
      if (isPlaying) {
        const dt = (now - lastTime) / VISUALIZER_CONSTANTS.MS_PER_SECOND;
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
      focusX = Math.max(0, ...currentHorses.map((h) => h.position)) * VISUALIZER_CONSTANTS.PIXELS_PER_METER;
    } else if (cameraMode === "player" && playerHorseId) {
      const player = currentHorses.find((h) => h.horseId === playerHorseId);
      focusX = (player?.position ?? 0) * VISUALIZER_CONSTANTS.PIXELS_PER_METER;
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
    ctx.strokeStyle = VISUALIZER_CONSTANTS.LANE_COLOR;
    ctx.lineWidth = VISUALIZER_CONSTANTS.LANE_WIDTH;
    const numLanes = Math.max(...runners.map((_, i) => i)) + 2; // Approximate
    for (let i = 0; i <= VISUALIZER_CONSTANTS.MAX_LANES; i++) {
      const y = VISUALIZER_CONSTANTS.Y_OFFSET + i * VISUALIZER_CONSTANTS.LANE_HEIGHT;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw Finish Line
    const finishX = distance * VISUALIZER_CONSTANTS.PIXELS_PER_METER + offsetX;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = VISUALIZER_CONSTANTS.FINISH_LINE_WIDTH;
    ctx.setLineDash(VISUALIZER_CONSTANTS.FINISH_LINE_DASH);
    ctx.beginPath();
    ctx.moveTo(finishX, VISUALIZER_CONSTANTS.Y_OFFSET);
    ctx.lineTo(finishX, VISUALIZER_CONSTANTS.Y_OFFSET + VISUALIZER_CONSTANTS.MAX_LANES * VISUALIZER_CONSTANTS.LANE_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Furlong Markers
    ctx.fillStyle = VISUALIZER_CONSTANTS.MARKER_COLOR;
    ctx.font = "10px Inter";
    for (let m = 0; m <= distance; m += VISUALIZER_CONSTANTS.MARKER_INTERVAL) {
      const x = m * VISUALIZER_CONSTANTS.PIXELS_PER_METER + offsetX;
      ctx.fillText(`${m}m`, x + VISUALIZER_CONSTANTS.MARKER_TEXT_OFFSET_X, VISUALIZER_CONSTANTS.MARKER_TEXT_OFFSET_Y);
      ctx.beginPath();
      ctx.moveTo(x, VISUALIZER_CONSTANTS.MARKER_LINE_START_Y);
      ctx.lineTo(x, VISUALIZER_CONSTANTS.Y_OFFSET + VISUALIZER_CONSTANTS.MAX_LANES * VISUALIZER_CONSTANTS.LANE_HEIGHT);
      ctx.stroke();
    }

    // Draw Horses
    currentHorses.forEach((h) => {
      const runner = runners.find((r) => r.horseId === h.horseId);
      const x = h.position * VISUALIZER_CONSTANTS.PIXELS_PER_METER + offsetX;
      const y = VISUALIZER_CONSTANTS.Y_OFFSET + (h.lane + 0.5) * VISUALIZER_CONSTANTS.LANE_HEIGHT;

      // Body
      ctx.fillStyle = runner?.silk || "#666";
      ctx.beginPath();
      ctx.arc(x, y, VISUALIZER_CONSTANTS.HORSE_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      // Outline for player horse
      if (runner?.owned) {
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = VISUALIZER_CONSTANTS.HORSE_OUTLINE_WIDTH;
        ctx.stroke();
      }

      // Name Label
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Inter";
      ctx.textAlign = "center";
      ctx.fillText(runner?.name || "Unknown", x, y - VISUALIZER_CONSTANTS.HORSE_RADIUS - VISUALIZER_CONSTANTS.NAME_TEXT_OFFSET_Y);
    });
  };

  return (
    <div className="race-visualizer-container">
      <canvas
        ref={canvasRef}
        width={VISUALIZER_CONSTANTS.CANVAS_WIDTH}
        height={VISUALIZER_CONSTANTS.CANVAS_HEIGHT}
        className="race-visualizer-canvas"
        role="img"
        aria-label="Race track visualization"
      />

      <div className="race-overlay">
        <div className="race-stats tabular-nums">
          <span>Time: {currentTime.toFixed(VISUALIZER_CONSTANTS.DECIMAL_PRECISION_TIME)}s</span>
          <span>
            Leader:{" "}
            {Math.max(
              ...(snapshots
                .find((s) => s.t > currentTime - VISUALIZER_CONSTANTS.SNAPSHOT_OFFSET && s.t <= currentTime)
                ?.horses.map((h) => h.position) || [0]),
            ).toFixed(VISUALIZER_CONSTANTS.DECIMAL_PRECISION_POSITION)}
            m / {distance}m
          </span>
        </div>
      </div>

      <div
        className="race-progress-bar"
        role="progressbar"
        aria-valuemin={VISUALIZER_CONSTANTS.PROGRESS_BAR_MIN}
        aria-valuemax={VISUALIZER_CONSTANTS.PROGRESS_BAR_MAX}
        aria-valuenow={currentTime}
        style={{ width: `${duration > 0 ? (currentTime / duration) * VISUALIZER_CONSTANTS.PROGRESS_BAR_MAX : 0}%` }}
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
          onClick={() =>
            setPlaybackSpeed(
              playbackSpeed === VISUALIZER_CONSTANTS.DEFAULT_PLAYBACK_SPEED
                ? VISUALIZER_CONSTANTS.FAST_PLAYBACK_SPEED
                : VISUALIZER_CONSTANTS.DEFAULT_PLAYBACK_SPEED
            )
          }
          aria-label={`Toggle playback speed: currently ${playbackSpeed}x`}
          title={`Speed: ${playbackSpeed}x`}
        >
          <SkipForward size={20} color={playbackSpeed > 1 ? "#facc15" : "#fff"} />
        </button>
      </div>
    </div>
  );
};
