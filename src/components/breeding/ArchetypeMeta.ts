export const ARCHETYPE_META: Record<string, { color: string; emoji: string }> = {
  "elite-turf-stayer": { color: "border-emerald-600 bg-emerald-900/20", emoji: "🌿" },
  "dirt-sprinter": { color: "border-amber-600 bg-amber-900/20", emoji: "⚡" },
  "classic-miler": { color: "border-blue-500 bg-blue-900/20", emoji: "⚖️" },
  "turf-specialist": { color: "border-green-500 bg-green-900/20", emoji: "🍃" },
  "iron-horse": { color: "border-slate-400 bg-slate-800/30", emoji: "🛡️" },
  "early-developer": { color: "border-yellow-500 bg-yellow-900/20", emoji: "🌟" },
  "late-bloomer": { color: "border-purple-500 bg-purple-900/20", emoji: "🌸" },
  "all-weather": { color: "border-cyan-500 bg-cyan-900/20", emoji: "🌐" },
  "triple-crown-usa": { color: "border-red-500 bg-red-900/20", emoji: "🏆" },
  "triple-crown-canada": { color: "border-red-400 bg-red-900/20", emoji: "🍁" },
  "triple-crown-uk-classics": { color: "border-rose-500 bg-rose-900/20", emoji: "👑" },
  "triple-crown-specialist": { color: "border-gold-400 bg-amber-900/30", emoji: "🥇" },
};

export function archetypeMeta(id: string) {
  return ARCHETYPE_META[id] ?? { color: "border-gold-muted", emoji: "🐎" };
}
