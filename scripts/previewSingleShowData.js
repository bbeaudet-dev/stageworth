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
          maxBuffer: 20 * 1024 * 1024,
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

  const lines = box.split("\n");
  for (const line of lines) {
    if (!line.startsWith("|")) continue;
    const [, keyRaw, valueRaw] = line.match(/^\|\s*([^=]+?)\s*=\s*(.*)$/) || [];
    if (!keyRaw) continue;
    const key = keyRaw.trim();
    const value = valueRaw.trim();
    if (!value) continue;
    result.fields[key] = value;
  }

  return result;
}

function summarizeWikidataEntity(entity) {
  if (!entity) return null;
  const { id, type, labels, descriptions, aliases, sitelinks, claims } = entity;
  const languageKeys = (obj) => (obj ? Object.keys(obj) : []);
  const propertyIds = claims ? Object.keys(claims) : [];

  const sampleClaims = {};
  if (claims) {
    for (const [pid, snaks] of Object.entries(claims)) {
      if (!Array.isArray(snaks) || snaks.length === 0) continue;
      const first = snaks[0];
      sampleClaims[pid] = {
        mainsnak: {
          snaktype: first.mainsnak?.snaktype,
          datatype: first.mainsnak?.datatype,
          datavalue: first.mainsnak?.datavalue
            ? {
                type: first.mainsnak.datavalue.type,
                value: first.mainsnak.datavalue.value,
              }
            : null,
        },
        rank: first.rank,
      };
    }
  }

  return {
    id,
    type,
    labelLanguages: languageKeys(labels),
    descriptionLanguages: languageKeys(descriptions),
    aliasLanguages: languageKeys(aliases),
    sitelinkSites: languageKeys(sitelinks),
    propertyIds,
    sampleClaims,
  };
}

function main() {
  const title = process.argv[2] || "Hadestown";

  // 1) Wikipedia pageprops + basic info, including wikibase_item
  const query = getJson(
    `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops|info&inprop=url&titles=${encodeURIComponent(
      title
    )}&format=json`
  );

  const pages = query?.query?.pages || {};
  const page = Object.values(pages)[0] || null;

  // 2) Full parse with wikitext + sections + templates
  const parse = getJson(
    `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(
      title
    )}&prop=wikitext|sections|categories|links|templates&format=json`
  );

  const wikitext = parse?.parse?.wikitext?.["*"] || "";
  const sections = parse?.parse?.sections || [];
  const categories = parse?.parse?.categories || [];
  const templates = parse?.parse?.templates || [];

  const infobox = extractInfoboxFields(wikitext);

  // 3) Wikidata entity, if present
  const wikibaseId = page?.pageprops?.wikibase_item;
  let wikidataSummary = null;
  if (wikibaseId) {
    const wd = getJson(
      `https://www.wikidata.org/wiki/Special:EntityData/${encodeURIComponent(
        wikibaseId
      )}.json`
    );
    const entity = wd?.entities?.[wikibaseId] || null;
    wikidataSummary = summarizeWikidataEntity(entity);
  }

  const result = {
    requestedTitle: title,
    wikipedia: {
      page: {
        pageid: page?.pageid,
        title: page?.title,
        fullurl: page?.fullurl,
        pageprops: page?.pageprops || {},
      },
      parseMeta: {
        title: parse?.parse?.title,
        pageid: parse?.parse?.pageid,
      },
      sectionsCount: sections.length,
      sectionHeadings: sections.map((s) => ({
        index: s.index,
        number: s.number,
        level: s.level,
        line: s.line,
      })),
      categories: categories.map((c) => c["*"]),
      templates: templates.map((t) => t["*"]).slice(0, 50),
      infoboxTemplate: infobox.template,
      infoboxFields: infobox.fields,
      wikitextLength: wikitext.length,
    },
    wikidata: wikidataSummary,
  };

  console.log(JSON.stringify(result, null, 2));
}

main();

