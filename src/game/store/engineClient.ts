/**
 * engineClient.ts - EngineClient lifecycle for the store.
 *
 * The store never talks to a raw worker: it submits revisioned commands to a
 * singleton EngineClient. The client runs over a WorkerTransport in browsers
 * and a LocalTransport (same SimulationEngine + executor in-process) when the
 * Worker API is unavailable — one production execution path, two carriers.
 */

import { EngineClient } from "@/core/engine/client";
import { LocalTransport, WorkerTransport } from "@/core/engine/transports";
import { SimulationEngine } from "@/core/engine/engine";
import { resetCommittedWorld } from "./engineSync";

let client: EngineClient | null = null;
let workerStarted = false;

function createLocalClient(): EngineClient {
  return new EngineClient(new LocalTransport(new SimulationEngine()));
}

/**
 * Get the active engine client. Lazily falls back to an in-process engine so
 * callers never have to handle "worker not initialized".
 */
export function getEngineClient(): EngineClient {
  if (!client) client = createLocalClient();
  return client;
}

/**
 * Attempt to (re)start the worker-backed engine. Safe to call repeatedly and
 * in non-browser contexts — degrades to the in-process engine.
 */
export async function initEngineClient(): Promise<void> {
  if (typeof Worker === "undefined") return;
  if (workerStarted && client) return;

  const worker = new Worker(new URL("../../workers/engine.worker.ts", import.meta.url), {
    type: "module",
  });
  const transport = new WorkerTransport(worker);
  const workerClient = new EngineClient(transport);
  client = workerClient;
  workerStarted = true;

  worker.addEventListener("error", () => {
    // Crash/restart: reject in-flight commands, drop back to in-process
    // engine so subsequent submits still work. The replacement engine has
    // no retained world — the next command resyncs a full snapshot.
    workerClient.failAll(new Error("engine worker crashed"));
    workerStarted = false;
    resetCommittedWorld();
    if (client === workerClient) client = createLocalClient();
  });
}

/**
 * Reset the engine authority (new game / save load): drop the current client,
 * terminating its worker, so revisions restart cleanly.
 */
export function resetEngineClient(): void {
  client?.dispose();
  client = null;
  workerStarted = false;
  resetCommittedWorld();
}

/**
 * Test hook: force a specific client.
 * @param c
 */
export function _setEngineClientForTests(c: EngineClient | null): void {
  client = c;
  workerStarted = false;
  resetCommittedWorld();
}
