const { execSync } = require("node:child_process");

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {}
}

function getJson(url) {
  const full = url.includes("?") ? `${url}&origin=*` : `${url}?origin=*`;
  let lastErr = null;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const raw = execSync(
        `curl -sS --connect-timeout 8 --max-time 20 -H 'User-Agent: stageworth-preview/1.0 (benbeau dev tooling)' "${full}"`,
        {
          encoding: "utf8",
          maxBuffer: 10 * 1024 * 1024,
          timeout: 25000,
        }
      );
      const trimmed = raw.trim();
      if (trimmed.startsWith("You are making too many requests")) {
        const waitMs = 8000 * attempt;
        console.log(`[rate-limit] attempt=${attempt}/5 waiting=${waitMs}ms`);
        sleep(waitMs);
        continue;
      }
      if (trimmed.startsWith("<")) {
        throw new Error("Non-JSON HTML response body");
      }
      return JSON.parse(raw);
    } catch (err) {
      lastErr = err;
      const message = err instanceof Error ? err.message : String(err);
      const waitMs = 3000 * attempt;
      console.log(`[request-retry] attempt=${attempt}/5 waiting=${waitMs}ms :: ${message}`);
      sleep(waitMs);
    }
  }

  const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(`Request failed for ${full.slice(0, 200)}... :: ${message}`);
}

function extractInfoboxFields(wikitext) {
  const result = {
    template: null,
    fields: {},
  };
  if (!wikitext) return result;

  const infoboxMatch = wikitext.match(/\{\{Infobox[^]*?\n\}\}/i);
  if (!infoboxMatch) return result;
  const box = infoboxMatch[0];

  const firstLineMatch = box.match(/\{\{Infobox\s+([^\n|]+)/i);
  if (firstLineMatch) {
    result.template = firstLineMatch[1].trim();
  }

  const interestingKeys = new Set([
    "name",
    "subtitle",
    "image",
    "caption",
    "music",
    "lyrics",
    "book",
    "composer",
    "lyricist",
    "writer",
    "basis",
    "based on",
    "premiere date",
    "premiere",
    "premiere place",
    "place",
    "original language",
    "setting",
    "subject",
    "genre",
    "awards",
  ]);

  const lines = box.split("\n");
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    const [, keyRaw, valueRaw] = line.match(/^\|\s*([^=]+?)\s*=\s*(.*)$/) || [];
    if (!keyRaw) continue;
    const key = keyRaw.trim().toLowerCase();
    if (!interestingKeys.has(key)) continue;
    const value = valueRaw.trim();
    if (!value) continue;
    result.fields[key] = value;
  }

  return result;
}

function extractProductionSections(sections) {
  if (!Array.isArray(sections)) return [];
  return sections
    .filter((s) => {
      const line = (s.line || "").toLowerCase();
      return (
        line.includes("production") ||
        line.includes("productions") ||
        line.includes("run") ||
        line.includes("engagement") ||
        line.includes("performance")
      );
    })
    .map((s) => ({
      index: s.index,
      line: s.line,
      level: s.level,
      number: s.number,
    }));
}

function previewForTitle(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
    title
  )}&prop=wikitext|sections&format=json`;
  try {
    const j = getJson(url);
    if (!j.parse) {
      return {
        title,
        found: false,
        reason: "parse-missing",
      };
    }
    const wikitext = j.parse.wikitext?.["*"] || "";
    const sections = j.parse.sections || [];
    const infobox = extractInfoboxFields(wikitext);
    const productionSections = extractProductionSections(sections);

    return {
      title,
      found: true,
      pageTitle: j.parse.title,
      infoboxTemplate: infobox.template,
      infoboxFields: infobox.fields,
      productionSections,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      title,
      found: false,
      reason: "error",
      error: message,
    };
  }
}

function main() {
  const titles =
    process.argv.length > 2
      ? process.argv.slice(2)
      : [
          "Hamilton (musical)",
          "Hadestown",
          "The Outsiders (musical)",
          "Operation Mincemeat (musical)",
          "Titanique",
          "Little Shop of Horrors (musical)",
          "A Strange Loop (musical)",
        ];

  const previews = titles.map((t) => previewForTitle(t));
  console.log(JSON.stringify({ count: previews.length, previews }, null, 2));
}

main();

