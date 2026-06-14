import React, { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Play, Pause, RotateCcw, Camera, SkipForward } from "lucide-react";
import { interpolateSnapshots, getReplayDuration } from "@/services/race/racePlaybackService";
import type { RaceSnapshot } from "@/core/race/engine/raceSnapshotTypes";
import { useRaceReplay } from "@/hooks/race/useRaceReplay";
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

const C = {
  CANVAS_WIDTH: 1000,
  CANVAS_HEIGHT: 500,
  PIXELS_PER_METER: 20,
  LANE_HEIGHT: 40,
  HORSE_RADIUS: 12,
  MAX_LANES: 8,
  Y_OFFSET: 100,
  TRACK_COLOR_TURF: "#2d5a27",
  TRACK_COLOR_DIRT: "#8b4513",
  LANE_COLOR: "rgba(255, 255, 255, 0.3)",
  LANE_WIDTH: 2,
  FINISH_LINE_WIDTH: 5,
  MARKER_COLOR: "rgba(255, 255, 255, 0.5)",
  MARKER_INTERVAL: 200,
  DEFAULT_PLAYBACK_SPEED: 1,
  FAST_PLAYBACK_SPEED: 2,
  HORSE_OUTLINE_WIDTH: 3,
  NAME_TEXT_OFFSET_Y: 5,
  STATS_UPDATE_MS: 100, // throttle React state updates for stats overlay (~10Hz)
} as const;

export const RaceVisualizer: React.FC<RaceVisualizerProps> = ({
  snapshots,
  distance,
  runners,
  onComplete,
  trackType = "Turf",
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null); // static lane/track background

  const duration = useMemo(() => getReplayDuration(snapshots), [snapshots]);

  const {
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
  } = useRaceReplay(duration, onComplete);
  // ⚡ Bolt: Iterate array once to conditionally assign player horse and build map
  // Reduces two O(N) operations (.find and .map for Map) into a single O(N) traversal.
  const { playerHorseId, runnerMap } = useMemo(() => {
    let playerId: string | undefined;
    const map = new Map<string, RunnerInfo>();
    for (let i = 0; i < runners.length; i++) {
      const r = runners[i];
      if (r.owned && playerId === undefined) playerId = r.horseId;
      map.set(r.horseId, r);
    }
    return { playerHorseId: playerId, runnerMap: map };
  }, [runners]);

  // Build the static background (track, lanes, furlong markers without offset) once per
  // size/track/distance change. The dynamic offset is only applied to the finish line and
  // marker labels in the main render — cheap operations.
  const ensureBackground = useCallback(() => {
    if (bgCanvasRef.current) return bgCanvasRef.current;
    const bg = document.createElement("canvas");
    bg.width = C.CANVAS_WIDTH;
    bg.height = C.CANVAS_HEIGHT;
    const ctx = bg.getContext("2d");
    if (!ctx) return bg;
    // Track
    ctx.fillStyle = trackType === "Turf" ? C.TRACK_COLOR_TURF : C.TRACK_COLOR_DIRT;
    ctx.fillRect(0, 0, bg.width, bg.height);
    // Lane stripes (stationary on screen, so safe to bake)
    ctx.strokeStyle = C.LANE_COLOR;
    ctx.lineWidth = C.LANE_WIDTH;
    for (let i = 0; i <= C.MAX_LANES; i++) {
      const y = C.Y_OFFSET + i * C.LANE_HEIGHT;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(bg.width, y);
      ctx.stroke();
    }
    bgCanvasRef.current = bg;
    return bg;
  }, [trackType]);

  // Invalidate baked background when track type changes.
  useEffect(() => {
    bgCanvasRef.current = null;
  }, [trackType]);

  // Stable render fn (reads timeRef + state captured via closures rebuilt in effect)
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const currentTime = timeRef.current;
    const currentHorses = interpolateSnapshots(snapshots, currentTime);

    // Single-pass max position (avoid Math.max(...arr.map(...)) allocations)
    let maxPos = 0;
    for (let i = 0; i < currentHorses.length; i++) {
      const p = currentHorses[i].position;
      if (p > maxPos) maxPos = p;
    }

    // Camera focus
    let focusX = 0;
    if (cameraMode === "leader") {
      focusX = maxPos * C.PIXELS_PER_METER;
    } else if (cameraMode === "player" && playerHorseId) {
      // Linear scan (small N) — avoids Map miss / allocation
      for (let i = 0; i < currentHorses.length; i++) {
        if (currentHorses[i].horseId === playerHorseId) {
          focusX = currentHorses[i].position * C.PIXELS_PER_METER;
          break;
        }
      }
    }

    const viewportWidth = canvas.width;
    const offsetX = viewportWidth / 2 - focusX;

    // Blit the baked background (clears canvas in one op)
    const bg = ensureBackground();
    ctx.drawImage(bg, 0, 0);

    // Dynamic finish line (moves with camera)
    const finishX = distance * C.PIXELS_PER_METER + offsetX;
    if (finishX > -10 && finishX < viewportWidth + 10) {
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = C.FINISH_LINE_WIDTH;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(finishX, C.Y_OFFSET);
      ctx.lineTo(finishX, C.Y_OFFSET + C.MAX_LANES * C.LANE_HEIGHT);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Furlong markers — only those visible on screen
    ctx.fillStyle = C.MARKER_COLOR;
    ctx.font = "10px Inter";
    ctx.strokeStyle = C.MARKER_COLOR;
    ctx.lineWidth = 1;
    const firstM = Math.max(
      0,
      Math.floor(-offsetX / C.PIXELS_PER_METER / C.MARKER_INTERVAL) * C.MARKER_INTERVAL,
    );
    const lastM = Math.min(distance, Math.ceil((viewportWidth - offsetX) / C.PIXELS_PER_METER));
    for (let m = firstM; m <= lastM; m += C.MARKER_INTERVAL) {
      const x = m * C.PIXELS_PER_METER + offsetX;
      ctx.fillText(`${m}m`, x + 5, 95);
      ctx.beginPath();
      ctx.moveTo(x, 90);
      ctx.lineTo(x, C.Y_OFFSET + C.MAX_LANES * C.LANE_HEIGHT);
      ctx.stroke();
    }

    // Horses
    ctx.textAlign = "center";
    for (let i = 0; i < currentHorses.length; i++) {
      const h = currentHorses[i];
      const x = h.position * C.PIXELS_PER_METER + offsetX;
      // Cull off-screen horses
      if (x < -C.HORSE_RADIUS * 2 || x > viewportWidth + C.HORSE_RADIUS * 2) continue;
      const y = C.Y_OFFSET + (h.lane + 0.5) * C.LANE_HEIGHT;
      const runner = runnerMap.get(h.horseId);
      ctx.fillStyle = runner?.silk || "#666";
      ctx.beginPath();
      ctx.arc(x, y, C.HORSE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      if (runner?.owned) {
        ctx.strokeStyle = "#facc15";
        ctx.lineWidth = C.HORSE_OUTLINE_WIDTH;
        ctx.stroke();
      }
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Inter";
      ctx.fillText(runner?.name || "Unknown", x, y - C.HORSE_RADIUS - C.NAME_TEXT_OFFSET_Y);
    }

    return maxPos;
  }, [snapshots, distance, cameraMode, playerHorseId, runnerMap, ensureBackground]);

  // Animation loop. We intentionally do NOT setState every frame; React rerenders are
  // expensive and were dominating CPU. Stats/progress are updated via refs at ~10Hz.
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
          // Render final frame, fire onComplete once, stop playing.
          const maxPos = renderFrame();
          updateStats(maxPos);
          setIsPlaying(false);
          onComplete?.();
          return;
        }
        timeRef.current = next;
      }

      const maxPos = renderFrame();
      if (now - lastStatsAt >= C.STATS_UPDATE_MS) {
        lastStatsAt = now;
        updateStats(maxPos);
      }
      frameId = requestAnimationFrame(tick);
    };

    const updateStats = (maxPos: number | undefined) => {
      const t = timeRef.current;
      if (timeLabelRef.current) timeLabelRef.current.textContent = t.toFixed(2);
      if (leaderLabelRef.current && maxPos !== undefined) {
        leaderLabelRef.current.textContent = maxPos.toFixed(0);
      }
      if (progressBarRef.current && duration > 0) {
        progressBarRef.current.style.width = `${(t / duration) * 100}%`;
      }
    };

    // Initial paint so static frame is correct even when paused.
    renderFrame();
    frameId = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(frameId);
    };
  }, [isPlaying, playbackSpeed, duration, renderFrame, onComplete]);

  return (
    <div className="race-visualizer-container">
      <canvas
        ref={canvasRef}
        width={C.CANVAS_WIDTH}
        height={C.CANVAS_HEIGHT}
        className="race-visualizer-canvas"
        role="img"
        aria-label="Race track visualization"
      />

      <div className="race-overlay">
        <div className="race-stats tabular-nums">
          <span>
            Time: <span ref={timeLabelRef}>0.00</span>s
          </span>
          <span>
            Leader: <span ref={leaderLabelRef}>0</span>m / {distance}m
          </span>
        </div>
      </div>

      <div
        ref={progressBarRef}
        className="race-progress-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        style={{ width: "0%" }}
      />

      <div className="race-controls">
        <button
          className="race-control-btn"
          onClick={() => setIsPlaying((p) => !p)}
          aria-label={isPlaying ? "Pause race" : "Play race"}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          className="race-control-btn"
          onClick={restart}
          aria-label="Restart race"
          title="Restart"
        >
          <RotateCcw size={20} />
        </button>
        <button
          className="race-control-btn"
          onClick={toggleCamera}
          aria-label={`Toggle camera focus: currently following ${cameraMode}`}
          title="Toggle Camera Focus"
        >
          <Camera size={20} color={cameraMode === "player" ? "#facc15" : "#fff"} />
        </button>
        <button
          className="race-control-btn"
          onClick={toggleSpeed}
          aria-label={`Toggle playback speed: currently ${playbackSpeed}x`}
          title={`Speed: ${playbackSpeed}x`}
        >
          <SkipForward size={20} color={playbackSpeed > 1 ? "#facc15" : "#fff"} />
        </button>
      </div>
    </div>
  );
};
