/**
 * buildRealHorses.ts - Build the real-horse snapshot from free public data.
 *
 * Pulls every horse on Wikidata that sits in a pedigree (has, or is, a sire or
 * dam), keeps those with an English Wikipedia article plus all their known
 * ancestors, then reads each article's racehorse infobox for the real race
 * record, earnings, big-race wins, awards and Timeform rating.
 *
 * Output: src/shared/data/realHorses.json (committed; the game never fetches at
 * runtime, so worlds stay deterministic and work offline).
 *
 * Usage:
 *   bun run scripts/buildRealHorses.ts            # fetch fresh
 *   bun run scripts/buildRealHorses.ts --cache /tmp/wd   # reuse horses.json / wiki.json
 *
 * Data: Wikidata (CC0) and Wikipedia (CC BY-SA 4.0).
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const UA = "GallopGameDataBuild/1.0 (offline game data snapshot)";
const OUT = join(import.meta.dir, "..", "src/shared/data/realHorses.json");
const cacheIdx = process.argv.indexOf("--cache");
const CACHE = cacheIdx > 0 ? process.argv[cacheIdx + 1] : undefined;

const SPARQL = `SELECT ?h ?hLabel ?sex ?birth ?death ?countryLabel ?s ?d ?article WHERE {
  ?h wdt:P31 wd:Q726 .
  { ?h wdt:P22 [] } UNION { ?h wdt:P25 [] } UNION { [] wdt:P22 ?h } UNION { [] wdt:P25 ?h }
  OPTIONAL { ?h wdt:P21 ?sex } OPTIONAL { ?h wdt:P569 ?birth } OPTIONAL { ?h wdt:P570 ?death }
  OPTIONAL { ?h wdt:P495 ?country } OPTIONAL { ?h wdt:P22 ?s } OPTIONAL { ?h wdt:P25 ?d }
  OPTIONAL { ?article schema:about ?h ; schema:isPartOf <https://en.wikipedia.org/> }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}`;

type Binding = Record<string, { value: string } | undefined>;
type Raw = {
  name: string;
  sex?: string;
  birth?: string;
  death?: string;
  country?: string;
  s?: string;
  d?: string;
  article?: string;
};

const qid = (u?: string) => (u ? u.slice(u.lastIndexOf("/") + 1) : undefined);

async function loadWikidata(): Promise<Binding[]> {
  if (CACHE && existsSync(join(CACHE, "horses.json"))) {
    return JSON.parse(readFileSync(join(CACHE, "horses.json"), "utf8")).results.bindings;
  }
  const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(SPARQL)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/sparql-results+json", "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`Wikidata ${res.status}: ${await res.text()}`);
  return ((await res.json()) as { results: { bindings: Binding[] } }).results.bindings;
}

async function loadWikipedia(titles: Map<string, string>): Promise<Record<string, string>> {
  if (CACHE && existsSync(join(CACHE, "wiki.json"))) {
    return JSON.parse(readFileSync(join(CACHE, "wiki.json"), "utf8"));
  }
  const out: Record<string, string> = {};
  const items = [...titles.entries()];
  for (let i = 0; i < items.length; i += 50) {
    const chunk = items.slice(i, i + 50);
    const params = new URLSearchParams({
      action: "query",
      prop: "revisions",
      rvprop: "content",
      rvslots: "main",
      format: "json",
      formatversion: "2",
      redirects: "1",
      titles: chunk.map(([t]) => t).join("|"),
    });
    const res = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
      headers: { "User-Agent": UA },
    });
    const data = (await res.json()) as any;
    const back = new Map<string, string>();
    for (const n of [...(data.query.normalized ?? []), ...(data.query.redirects ?? [])])
      back.set(n.to, n.from);
    for (const p of data.query.pages) {
      let src = p.title;
      while (back.has(src)) src = back.get(src)!;
      const q = titles.get(src) ?? titles.get(p.title);
      if (q && p.revisions) out[q] = p.revisions[0].slots.main.content;
    }
    console.log(`wikipedia ${i + chunk.length}/${items.length}`);
    await new Promise((r) => setTimeout(r, 400));
  }
  return out;
}

// ---------- infobox parsing ----------

function infobox(text: string): Record<string, string> | undefined {
  const start = text.search(/\{\{\s*Infobox[ _](race ?horse|horse)/i);
  if (start < 0) return undefined;
  let depth = 0;
  let end = start;
  for (let i = start; i < text.length - 1; i++) {
    if (text[i] === "{" && text[i + 1] === "{") {
      depth++;
      i++;
    } else if (text[i] === "}" && text[i + 1] === "}") {
      depth--;
      i++;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }
  const body = text.slice(start + 2, end - 2);
  // split on top-level pipes
  const fields: Record<string, string> = {};
  let d = 0;
  let sq = 0;
  let cur = "";
  const parts: string[] = [];
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    const n = body[i + 1];
    if (c === "{" && n === "{") d++;
    if (c === "}" && n === "}") d--;
    if (c === "[" && n === "[") sq++;
    if (c === "]" && n === "]") sq--;
    if (c === "|" && d === 0 && sq === 0) {
      parts.push(cur);
      cur = "";
    } else cur += c;
  }
  parts.push(cur);
  for (const p of parts.slice(1)) {
    const eq = p.indexOf("=");
    if (eq < 0) continue;
    fields[p.slice(0, eq).trim().toLowerCase()] = p.slice(eq + 1).trim();
  }
  return fields;
}

/** Strip wiki markup to plain text. */
function plain(s: string): string {
  return s
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/<ref[\s\S]*?<\/ref>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\{\{(?:nowrap|small|nobr)\|([^{}]*)\}\}/gi, "$1")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1")
    .replace(/'''?/g, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;|&mdash;/g, "–")
    .trim();
}

function listItems(s?: string): string[] {
  if (!s) return [];
  const text = plain(s.replace(/\{\{(?:plainlist|ubl|unbulleted list|flatlist)\s*\|/gi, "").replace(/\}\}\s*$/, ""));
  return text
    .split(/\n|\*|•|\|/)
    .map((x) => x.replace(/\s+/g, " ").trim())
    .filter((x) => x.length > 2 && x.length < 120)
    .slice(0, 25);
}

/** Approximate USD rates (snapshot-time), keyed by normalised currency. */
const FX: Record<string, number> = {
  GBP: 1.27, EUR: 1.08, JPY: 0.0067, AUD: 0.66, NZD: 0.6, HKD: 0.128, USD: 1, CAD: 0.73,
  SGD: 0.74, ZAR: 0.055, AED: 0.27, FRF: 0.165, IEP: 1.37, DEM: 0.55, ITL: 0.00056, ARS: 0.001,
};
const CURRENCY: [RegExp, string][] = [
  [/US\s?\$|USD/i, "USD"], [/IR£|IEP/i, "IEP"], [/HK\s?\$|HKD/i, "HKD"], [/A\s?\$|AUD/i, "AUD"], [/NZ\s?\$|NZD/i, "NZD"], [/C\s?\$|CAD/i, "CAD"],
  [/S\s?\$|SGD/i, "SGD"], [/£|GBP|guineas/i, "GBP"], [/€|EUR/i, "EUR"], [/¥|JPY|yen/i, "JPY"],
  [/ZAR|\bR\s?\d/, "ZAR"], [/AED|Dhs/i, "AED"], [/FRF|francs?/i, "FRF"], [/IR£|IEP/i, "IEP"],
  [/DEM|\bDM\b/i, "DEM"], [/ITL|lire/i, "ITL"], [/US\s?\$|USD|\$/i, "USD"],
];

/** Convert an earnings string to approximate USD. */
function earningsUsd(s?: string): number | undefined {
  if (!s) return undefined;
  // Currency templates like {{GBP|2,998,302}} -> "GBP 2998302".
  const raw = s.replace(/\{\{\s*([A-Za-z]{3})\s*\|\s*([^|}]+)[^}]*\}\}/g, "$1 $2");
  // First line only; "A + B" sums earnings won in several currencies;
  // anything in brackets is a conversion and is ignored.
  const line = plain(raw).replace(/\{\{[^}]*\}\}/g, "").split("\n")[0].replace(/(\d),(\d)/g, "$1$2");
  let total = 0;
  for (const part of line.split("+")) {
    const seg = part.split("(")[0];
    if (/Cr\$|cruzeiro|R\$|real/i.test(seg)) continue; // obsolete / unknown rate
    const num = seg.match(/(\d+(?:\.\d+)?)\s*(million|m\b|billion)?/i);
    const cur = CURRENCY.find(([re]) => re.test(seg))?.[1];
    if (!num || !cur) continue;
    let v = Number(num[1]);
    if (/million|^m$/i.test(num[2] ?? "")) v *= 1_000_000;
    if (/billion/i.test(num[2] ?? "")) v *= 1_000_000_000;
    if (Number.isFinite(v) && v > 0) total += v * FX[cur];
  }
  return total > 0 ? Math.round(total) : undefined;
}

function record(s?: string) {
  if (!s) return undefined;
  const m = plain(s).match(/(\d+)\s*:\s*(\d+)\s*[-–—]\s*(\d+)\s*[-–—]\s*(\d+)/);
  if (!m) return undefined;
  const [starts, wins, seconds, thirds] = m.slice(1).map(Number);
  if (wins > starts) return undefined;
  return { starts, wins, seconds, thirds };
}

function year(s?: string): number | undefined {
  if (!s) return undefined;
  const m = s.match(/(1[5-9]\d\d|20\d\d)/);
  return m ? Number(m[1]) : undefined;
}

function sexOf(raw?: string, box?: string): "M" | "F" | undefined {
  const b = (box ? plain(box) : "").toLowerCase();
  if (/mare|filly/.test(b)) return "F";
  if (/stallion|colt|gelding|horse/.test(b)) return "M";
  if (raw?.endsWith("Q6581072") || raw?.endsWith("Q43445")) return "F";
  if (raw?.endsWith("Q6581097") || raw?.endsWith("Q44148")) return "M";
  return undefined;
}

export type RealHorseRow = {
  id: string;
  name: string;
  sex?: "M" | "F";
  gelding?: boolean;
  foaled?: number;
  died?: number;
  country?: string;
  colour?: string;
  breed?: string;
  sire?: string;
  dam?: string;
  starts?: number;
  wins?: number;
  seconds?: number;
  thirds?: number;
  earningsUsd?: number;
  timeform?: number;
  majorWins?: string[];
  awards?: string[];
  trainer?: string;
  breeder?: string;
  wiki?: string;
};

async function main() {
  const bindings = await loadWikidata();
  const raw = new Map<string, Raw>();
  for (const b of bindings) {
    const id = qid(b.h?.value)!;
    const r = raw.get(id) ?? { name: b.hLabel?.value ?? id };
    r.sex ??= b.sex?.value;
    r.birth ??= b.birth?.value;
    r.death ??= b.death?.value;
    r.country ??= b.countryLabel?.value;
    r.s ??= qid(b.s?.value);
    r.d ??= qid(b.d?.value);
    r.article ??= b.article?.value;
    raw.set(id, r);
  }
  // keep article horses + every ancestor
  const keep = new Set<string>();
  const stack = [...raw.entries()].filter(([, r]) => r.article).map(([id]) => id);
  while (stack.length) {
    const id = stack.pop()!;
    if (keep.has(id) || !raw.has(id)) continue;
    keep.add(id);
    const r = raw.get(id)!;
    if (r.s) stack.push(r.s);
    if (r.d) stack.push(r.d);
  }
  const titles = new Map<string, string>();
  for (const id of keep) {
    const a = raw.get(id)!.article;
    if (a) titles.set(decodeURIComponent(a.slice(a.indexOf("/wiki/") + 6)).replace(/_/g, " "), id);
  }
  const wiki = await loadWikipedia(titles);

  const rows: RealHorseRow[] = [];
  for (const id of keep) {
    const r = raw.get(id)!;
    if (/^Q\d+$/.test(r.name)) continue; // no English name
    const box = wiki[id] ? infobox(wiki[id]) : undefined;
    const rec = record(box?.record);
    const tf = box?.awards?.match(/Timeform rating\]*\s*:?\s*(\d{2,3})/i) ?? wiki[id]?.match(/Timeform rating[^\d]{0,30}(\d{3})/i);
    const sexBox = box?.sex ?? box?.gender;
    const row: RealHorseRow = {
      id,
      name: r.name.replace(/\s*\(horse\)$/i, ""),
      sex: sexOf(r.sex, sexBox),
      gelding: sexBox ? /gelding/i.test(sexBox) || undefined : undefined,
      foaled: year(box?.foaled) ?? year(r.birth),
      died: year(box?.died) ?? year(r.death),
      country: box?.country ? plain(box.country).split("\n")[0] || r.country : r.country,
      colour: box?.colour ? plain(box.colour).split("\n")[0] : undefined,
      breed: box?.breed ? plain(box.breed).split("\n")[0] : undefined,
      sire: r.s,
      dam: r.d,
      ...(rec ?? {}),
      earningsUsd: earningsUsd(box?.earnings),
      timeform: tf ? Number(tf[1]) : undefined,
      majorWins: listItems(box?.race ?? box?.["major wins"]),
      awards: listItems(box?.awards).filter((a) => !/timeform rating/i.test(a)),
      trainer: box?.trainer ? plain(box.trainer).split("\n")[0] : undefined,
      breeder: box?.breeder ? plain(box.breeder).split("\n")[0] : undefined,
      wiki: r.article ? r.article.slice(r.article.indexOf("/wiki/") + 6) : undefined,
    };
    for (const k of Object.keys(row) as (keyof RealHorseRow)[]) {
      const v = row[k];
      if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) delete row[k];
    }
    rows.push(row);
  }
  // Wikipedia's infobox wins when it names a different sire/dam than Wikidata
  // (Wikidata links are occasionally wrong, e.g. Kind's sire). Match by name,
  // preferring horses with their own article.
  const nameIndex = new Map<string, string>();
  for (const r of rows) {
    const k = r.name.toLowerCase();
    if (!nameIndex.has(k) || r.wiki) nameIndex.set(k, r.id);
  }
  let corrected = 0;
  for (const r of rows) {
    const box = wiki[r.id] ? infobox(wiki[r.id]) : undefined;
    for (const [field, key] of [["sire", "sire"], ["dam", "dam"]] as const) {
      const named = box?.[field] ? plain(box[field]).split("\n")[0].replace(/\s*\(.*\)$/, "").trim() : "";
      const id = named ? nameIndex.get(named.toLowerCase()) : undefined;
      if (id && id !== r.id && id !== r[key]) {
        r[key] = id;
        corrected++;
      }
    }
  }
  console.log(`infobox corrected ${corrected} parent links`);

  // Racing thoroughbreds only: drop other breeds (trotters, show jumpers,
  // Arabians, ponies…), then keep racers plus the ancestors behind them.
  const NON_TB = /standardbred|trott|arab|warmblood|pony|quarter horse|draft|draught|hanoverian|holsteiner|selle|lipizzan|andalusian|appaloosa|morgan|percheron|clydesdale|shire|connemara|haflinger|fjord|icelandic|akhal|kladruber|trakehner|oldenburg|friesian|paint|mustang|tennessee|saddlebred|hackney|cob/i;
  const byId = new Map(rows.map((r) => [r.id, r]));
  const racer = (r: RealHorseRow) =>
    !(r.breed && NON_TB.test(r.breed)) &&
    (Boolean(r.starts) || Boolean(r.majorWins?.length) || /thoroughbred/i.test(r.breed ?? ""));
  const tb = new Set<string>();
  const tbStack = rows.filter(racer).map((r) => r.id);
  while (tbStack.length) {
    const id = tbStack.pop()!;
    if (tb.has(id)) continue;
    const r = byId.get(id);
    if (!r || (r.breed && NON_TB.test(r.breed))) continue;
    tb.add(id);
    if (r.sire) tbStack.push(r.sire);
    if (r.dam) tbStack.push(r.dam);
  }
  for (let i = rows.length - 1; i >= 0; i--) if (!tb.has(rows[i].id)) rows.splice(i, 1);

  // resolve sire/dam ids to kept rows only
  const ids = new Set(rows.map((r) => r.id));
  for (const r of rows) {
    if (r.sire && !ids.has(r.sire)) delete r.sire;
    if (r.dam && !ids.has(r.dam)) delete r.dam;
  }
  rows.sort((a, b) => a.id.localeCompare(b.id, "en", { numeric: true }));
  writeFileSync(
    OUT,
    JSON.stringify({
      source: "Wikidata (CC0) + English Wikipedia infoboxes (CC BY-SA 4.0)",
      builtAt: new Date().toISOString().slice(0, 10),
      horses: rows,
    }),
  );
  const withRec = rows.filter((r) => r.starts).length;
  console.log(`wrote ${rows.length} horses (${withRec} with race records) to ${OUT}`);
}

await main();
