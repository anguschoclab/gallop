const ANALYTICS_KEY = "gallop_analytics_events";
const MAX_EVENTS = 100;

export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, unknown>;
  timestamp: number;
}

export function trackEvent(event: string, properties?: Record<string, unknown>): void {
  const entry: AnalyticsEvent = { event, properties, timestamp: Date.now() };
  const queue = loadQueue();
  queue.push(entry);
  if (queue.length > MAX_EVENTS) queue.shift();
  saveQueue(queue);
}

export function flushEvents(): AnalyticsEvent[] {
  const queue = loadQueue();
  saveQueue([]);
  return queue;
}

function loadQueue(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: AnalyticsEvent[]): void {
  try {
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(queue));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}
