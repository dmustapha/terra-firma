// File: scripts/build-restricted.ts
// Builds web/data/restricted.json {source, fetchedAt, countries: ISO-3166 alpha-2} from the RHJ restricted-jurisdictions
// page. Falls back to a saved copy under ../research/raw/docs/ only if the live fetch fails. Any parse doubt -> exit 1;
// an empty or partial list is never written.
// Run: pnpm tsx scripts/build-restricted.ts
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { ROOT, WEB_DATA } from "./lib/env";
import { writeJson } from "./lib/files";

const SOURCE = "https://docs.robinhood.com/rhj/restricted-jurisdictions";
const SAVED_DIR = path.resolve(ROOT, "..", "research", "raw", "docs");

/** Names (and the spellings legal text uses) -> ISO-3166 alpha-2. Longest names are matched first. */
const ISO: Record<string, string> = {
  "united states": "US", "u.s.": "US", "usa": "US", canada: "CA", "united kingdom": "GB", "u.k.": "GB",
  switzerland: "CH", cuba: "CU", belarus: "BY", iran: "IR", "north korea": "KP", "democratic people's republic of korea": "KP",
  russia: "RU", "russian federation": "RU", syria: "SY", ukraine: "UA", "south sudan": "SS", sudan: "SD", myanmar: "MM",
  burma: "MM", venezuela: "VE", afghanistan: "AF", iraq: "IQ", libya: "LY", somalia: "SO", yemen: "YE", lebanon: "LB",
  "central african republic": "CF", "democratic republic of the congo": "CD", mali: "ML", nicaragua: "NI", haiti: "HT",
  zimbabwe: "ZW", eritrea: "ER", china: "CN", "hong kong": "HK", japan: "JP", "south korea": "KR",
  singapore: "SG", australia: "AU", "new zealand": "NZ", india: "IN", pakistan: "PK", bangladesh: "BD", nepal: "NP",
  algeria: "DZ", egypt: "EG", morocco: "MA", tunisia: "TN", nigeria: "NG", ghana: "GH", kenya: "KE", ethiopia: "ET",
  bolivia: "BO", ecuador: "EC", "united arab emirates": "AE", "saudi arabia": "SA", qatar: "QA", turkey: "TR", israel: "IL",
  brazil: "BR", mexico: "MX", argentina: "AR",
};

function pageText(html: string): string {
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ");
  const text = body.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;|&rsquo;/g, "'");
  return text.replace(/\s+/g, " ");
}

async function fetchLive(): Promise<string | null> {
  try {
    const res = await fetch(SOURCE, { headers: { "user-agent": "Mozilla/5.0 (terra-firma-scripts/1.0)" } });
    if (!res.ok) return console.error(`live fetch HTTP ${res.status}`), null;
    return await res.text();
  } catch (e) {
    console.error(`live fetch failed: ${(e as Error).message}`);
    return null;
  }
}

function savedCopy(): { html: string; file: string } | null {
  if (!existsSync(SAVED_DIR)) return null;
  const f = readdirSync(SAVED_DIR).find((n) => /restricted/i.test(n) && n.endsWith(".html"));
  return f ? { html: readFileSync(path.join(SAVED_DIR, f), "utf8"), file: f } : null;
}

/** The two operative sentences: the "including ... U.S., Canada ..." restriction and the Prohibited Investors list. */
function parse(text: string): string[] {
  const restricted = text.match(/restrictions in certain jurisdictions,? including,? without limitation,? (.+?), as set out/i);
  const prohibited = text.match(/Prohibited Investors currently include investors in the following jurisdictions[^:]*:\s*(.+?)\./i);
  if (!restricted || !prohibited) throw new Error("page layout changed: restriction sentences not found");
  const items = [restricted[1], prohibited[1]].flatMap((s) => s.split(/,\s*(?:and\s+)?|\s+and\s+/i));
  const names = Object.keys(ISO).sort((a, b) => b.length - a.length);
  const codes = items.map((raw) => {
    const item = raw.trim().replace(/^the\s+/i, "").toLowerCase();
    const hit = names.find((n) => item === n);
    if (!hit) throw new Error(`unmapped jurisdiction "${raw.trim()}" (add it to the ISO table)`);
    return ISO[hit];
  });
  return [...new Set(codes)];
}

async function main() {
  let html = await fetchLive();
  let source = SOURCE;
  if (!html) {
    const saved = savedCopy();
    if (!saved) throw new Error("live page unavailable and no saved copy in research/raw/docs");
    html = saved.html;
    source = `${SOURCE} (saved copy research/raw/docs/${saved.file})`;
  }
  const countries = parse(pageText(html));
  if (countries.length < 5 || !countries.includes("US")) throw new Error(`implausible list ${countries.join(",")}`);
  writeJson(path.join(WEB_DATA, "restricted.json"), { source, fetchedAt: new Date().toISOString(), countries });
  console.log(`wrote web/data/restricted.json: ${countries.length} countries: ${countries.join(" ")}`);
}

main().catch((e) => {
  console.error(`build-restricted FAILED: ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
