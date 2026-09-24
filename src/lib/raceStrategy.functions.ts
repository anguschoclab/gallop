import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  horse: z.string().min(1).max(4000),
  race: z.string().min(1).max(4000),
  notes: z.string().max(2000).default(""),
});

export type RaceStrategyRecommendation = {
  summary: string;
  ridingStyle: "front_runner" | "stalker" | "closer" | "tactical";
  earlyPosition: "lead" | "press" | "midpack" | "drop_back";
  moveTiming: "early" | "mid" | "late";
  aggressiveness: number;
  keyFactors: string[];
  risks: string[];
  jockeyNotes: string;
};

export type RaceStrategyResult =
  | { ok: true; recommendation: RaceStrategyRecommendation }
  | { ok: false; error: string };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "ridingStyle",
    "earlyPosition",
    "moveTiming",
    "aggressiveness",
    "keyFactors",
    "risks",
    "jockeyNotes",
  ],
  properties: {
    summary: { type: "string" },
    ridingStyle: { type: "string", enum: ["front_runner", "stalker", "closer", "tactical"] },
    earlyPosition: { type: "string", enum: ["lead", "press", "midpack", "drop_back"] },
    moveTiming: { type: "string", enum: ["early", "mid", "late"] },
    aggressiveness: { type: "number" },
    keyFactors: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    jockeyNotes: { type: "string" },
  },
};

const INSTRUCTIONS = `You are a seasoned thoroughbred racing strategist advising a stable manager.
Given a horse profile and upcoming race details, recommend a personalized race strategy.
Base every call on the supplied data (stats, aptitudes, form, energy, weather preference, field, distance, surface, conditions).
aggressiveness is an integer 0-100. Give 3-5 keyFactors and 2-4 risks, each one short sentence.
summary: 2-3 sentences. jockeyNotes: concrete instructions the jockey can follow, max 3 sentences.`;

function errorMessage(status: number, body: string): string {
  if (status === 402) return "AI credits have run out for this workspace. Add credits to get strategy advice.";
  if (status === 429) return "The strategy advisor is busy right now. Please try again in a minute.";
  if (status === 403) return "The strategy advisor isn't available for this workspace.";
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
    return parsed.error?.message ?? parsed.message ?? `Advisor error (${status})`;
  } catch {
    return `Advisor error (${status})`;
  }
}

export const recommendRaceStrategy = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<RaceStrategyResult> => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "The strategy advisor is not configured." };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: INSTRUCTIONS,
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `HORSE PROFILE\n${data.horse}\n\nUPCOMING RACE\n${data.race}\n\nMANAGER NOTES\n${data.notes || "(none)"}`,
              },
            ],
          },
        ],
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        text: {
          format: { type: "json_schema", name: "race_strategy", strict: true, schema: SCHEMA },
        },
      }),
    });

    if (!res.ok || !res.body) {
      return { ok: false, error: errorMessage(res.status, await res.text().catch(() => "")) };
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let text = "";
    let failure: string | null = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const frame = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload) as {
              type?: string;
              delta?: string;
              response?: { error?: { message?: string } };
              message?: string;
            };
            if (evt.type === "response.output_text.delta" && evt.delta) text += evt.delta;
            if (evt.type === "response.failed" || evt.type === "error") {
              failure = evt.response?.error?.message ?? evt.message ?? "The advisor failed.";
            }
          } catch {
            /* ignore partial */
          }
        }
      }
    }

    if (failure) return { ok: false, error: failure };
    if (!text.trim()) return { ok: false, error: "The advisor returned no recommendation." };
    try {
      const rec = JSON.parse(text) as RaceStrategyRecommendation;
      rec.aggressiveness = Math.max(0, Math.min(100, Math.round(rec.aggressiveness)));
      return { ok: true, recommendation: rec };
    } catch {
      return { ok: false, error: "The advisor's answer couldn't be read. Please try again." };
    }
  });
