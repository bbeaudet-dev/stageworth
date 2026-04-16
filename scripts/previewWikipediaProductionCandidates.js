const { execSync } = require("node:child_process");

function sleep(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {} // simple busy-wait; fine for small previews
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

function toWikimediaUrl(filename) {
  if (!filename) return null;
  // Simple, non-hashed URL via Special:FilePath; fine for now.
  const clean = filename.trim().replace(/ /g, "_");
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(clean)}`;
}

function inferDistrictFromText(text) {
  const lower = text.toLowerCase();
  if (lower.includes("broadway")) return "broadway";
  if (lower.includes("off-broadway")) return "off_broadway";
  if (lower.includes("west end")) return "west_end";
  if (lower.includes("tour")) return "touring";
  if (lower.includes("regional")) return "regional";
  return "other";
}

function extractYears(text) {
  const years = Array.from(text.matchAll(/\b(19|20)\d{2}\b/g)).map((m) => Number(m[0]));
  if (years.length === 0) return { approxStartYear: null, approxEndYear: null };
  if (years.length === 1) return { approxStartYear: years[0], approxEndYear: null };
  return {
    approxStartYear: Math.min(...years),
    approxEndYear: Math.max(...years),
  };
}

function extractProductionCandidatesFromInfobox(fields) {
  const out = [];
  if (!fields || !fields.productions) return out;
  const raw = String(fields.productions);
  const parts = raw
    .split(/<br\s*\/?>/i)
    .map((p) => p.replace(/<!--.*?-->/g, "").trim())
    .filter(Boolean);

  for (const part of parts) {
    const district = inferDistrictFromText(part);
    const { approxStartYear, approxEndYear } = extractYears(part);
    out.push({
      district,
      approxStartYear,
      approxEndYear,
      theatreName: null,
      city: null,
      source: "wikipedia_infobox",
      raw: part,
    });
  }
  return out;
}

function previewForTitle(title) {
  const query = getJson(
    `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops|info&inprop=url&titles=${encodeURIComponent(
      title
    )}&format=json`
  );
  const pages = query?.query?.pages || {};
  const page = Object.values(pages)[0] || null;

  if (!page) {
    return {
      title,
      found: false,
      reason: "page-missing",
    };
  }

  const parse = getJson(
    `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
      title
    )}&prop=wikitext|sections|categories|templates&format=json`
  );
  const wikitext = parse?.parse?.wikitext?.["*"] || "";
  const sections = parse?.parse?.sections || [];
  const categories = parse?.parse?.categories || [];
  const templates = parse?.parse?.templates || [];

  const infoboxMatch = wikitext.match(/\{\{Infobox[^]*?\n\}\}/i);
  let infoboxTemplate = null;
  const infoboxFields = {};
  if (infoboxMatch) {
    const box = infoboxMatch[0];
    const firstLineMatch = box.match(/\{\{Infobox\s+([^\n|]+)/i);
    if (firstLineMatch) {
      infoboxTemplate = firstLineMatch[1].trim();
    }
    const lines = box.split("\n");
    for (const line of lines) {
      if (!line.startsWith("|")) continue;
      const [, keyRaw, valueRaw] = line.match(/^\|\s*([^=]+?)\s*=\s*(.*)$/) || [];
      if (!keyRaw) continue;
      const key = keyRaw.trim();
      const value = valueRaw.trim();
      if (!value) continue;
      infoboxFields[key] = value;
    }
  }

  const wikibaseId = page?.pageprops?.wikibase_item;
  let wikidataImageFile = null;
  if (wikibaseId) {
    try {
      const wd = getJson(
        `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(
          wikibaseId
        )}.json`
      );
      const entity = wd?.entities?.[wikibaseId];
      const claims = entity?.claims || {};
      const p18 = claims.P18 && Array.isArray(claims.P18) ? claims.P18[0] : null;
      const val = p18?.mainsnak?.datavalue?.value;
      if (typeof val === "string") {
        wikidataImageFile = val;
      }
    } catch (err) {
      // ignore wikidata errors in preview
    }
  }

  const infoboxImageFile = infoboxFields.image || null;
  const imageFileName = infoboxImageFile || wikidataImageFile || null;
  const imageSource = infoboxImageFile
    ? "wikipedia_infobox"
    : wikidataImageFile
    ? "wikidata_p18"
    : null;

  const productions = extractProductionCandidatesFromInfobox(infoboxFields);

  return {
    requestedTitle: title,
    found: true,
    wikipediaUrl: page.fullurl,
    wikidataId: wikibaseId || null,
    imageFileName,
    imageUrl: imageFileName ? toWikimediaUrl(imageFileName) : null,
    imageSource,
    categories: categories.map((c) => c["*"]),
    infoboxTemplate,
    productions,
    sectionHeadings: sections.map((s) => ({
      index: s.index,
      number: s.number,
      level: s.level,
      line: s.line,
    })),
    templates: templates.map((t) => t["*"]).slice(0, 30),
  };
}

function main() {
  const titles =
    process.argv.length > 2
      ? process.argv.slice(2)
      : [
          "Hadestown",
          "Hamilton (musical)",
          "The Outsiders (musical)",
          "Waitress (musical)",
          "Wicked (musical)",
          "Les Misérables (musical)",
        ];

  const previews = titles.map((t) => previewForTitle(t));
  console.log(JSON.stringify({ count: previews.length, previews }, null, 2));
}

if (require.main === module) {
  main();
}

module.exports = { previewForTitle };

