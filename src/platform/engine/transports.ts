/**
 * transports.ts - EngineTransport implementations.
 *
 * - LocalTransport: hosts SimulationEngine in-process. Used by unit tests and
 *   as the worker-unavailable fallback — the SAME executor and protocol, so
 *   there is no divergent "sync path" to drift.
 * - WorkerTransport: posts protocol messages to the engine worker.
 */

import { SimulationEngine } from "@/platform/engine/engine";
import type { EngineTransport } from "@/platform/engine/client";
import type { CommandId, EngineCommand, EngineEvent } from "@/platform/engine/protocol";
import { parseCancel } from "@/platform/engine/protocol";

type Message = EngineCommand | { kind: "cancel"; commandId: CommandId };

/** In-process transport: one SimulationEngine per transport instance. */
export class LocalTransport implements EngineTransport {
  private readonly engine: SimulationEngine;
  private handler: ((e: EngineEvent) => void) | null = null;

  constructor(engine?: SimulationEngine) {
    this.engine = engine ?? new SimulationEngine();
  }

  onEvent(handler: (e: EngineEvent) => void): void {
    this.handler = handler;
  }

  submit(message: Message): void {
    const cancel = parseCancel(message);
    if (cancel) {
      this.engine.cancel(cancel.commandId);
      return;
    }
    const emit = this.handler;
    // Yield so callers can attach handlers/cancel before execution begins —
    // mirrors worker async semantics.
    queueMicrotask(() => {
      if (emit) void this.engine.submit(message, emit);
    });
  }
}

interface WorkerLike {
  postMessage(msg: unknown): void;
  addEventListener(type: "message", cb: (e: { data: unknown }) => void): void;
  terminate(): void;
}

/** Worker-backed transport using raw postMessage (not Comlink) for the
 *  revisioned protocol — progress/cancel need ordered event semantics that
 *  don't map onto Comlink RPC. */
export class WorkerTransport implements EngineTransport {
  private handler: ((e: EngineEvent) => void) | null = null;

  constructor(private readonly worker: WorkerLike) {
    worker.addEventListener("message", (e) => {
      this.handler?.(e.data as EngineEvent);
    });
  }

  onEvent(handler: (e: EngineEvent) => void): void {
    this.handler = handler;
  }

  submit(message: Message): void {
    this.worker.postMessage(message);
  }

  dispose(): void {
    this.worker.terminate();
  }
}
