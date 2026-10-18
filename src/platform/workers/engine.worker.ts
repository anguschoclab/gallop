/**
 * Engine Worker
 * Hosts SimulationEngine in a Web Worker so CPU-intensive day advancement
 * stays off the main thread. Speaks the revisioned command protocol over
 * postMessage: `AdvanceCommand` in, ordered `EngineEvent`s out.
 *
 * All execution flows through SimulationExecutor + the compiled descriptor
 * schedule — the worker contains no pipeline semantics of its own.
 */

import { SimulationEngine } from "@/platform/engine/engine";
import { parseCancel, type EngineEvent } from "@/platform/engine/protocol";

const engine = new SimulationEngine();

const emit = (event: EngineEvent) => {
  (self as unknown as Worker).postMessage(event);
};

self.onmessage = (e: MessageEvent) => {
  const cancel = parseCancel(e.data);
  if (cancel) {
    engine.cancel(cancel.commandId);
    return;
  }
  void engine.submit(e.data, emit);
};
