// Base impact type
export interface Impact {
  id: string;
  intentId: string;
  day: number;
  phase: string;
  logLevel: "always" | "conditional" | "never";
}
