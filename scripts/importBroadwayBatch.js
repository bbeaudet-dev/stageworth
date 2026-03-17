const { execSync, spawnSync } = require("node:child_process");

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
        `curl -sS --connect-timeout 8 --max-time 20 -H 'User-Agent: theatre-diary-import/1.0 (benbeau dev tooling)' "${full}"`,
        {
          encoding: "utf8",
          maxBuffer: 30 * 1024 * 1024,
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
  throw new Error(`Request failed for ${full.slice(0, 160)}... :: ${message}`);
}

function getCategoryMembersSlice(category, skipCount, takeCount) {
  const members = [];
  let cmcontinue = null;
  let seen = 0;
  let requests = 0;

  while (members.length < takeCount) {
    let url = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=${encodeURIComponent(
      category
    )}&cmlimit=50&format=json`;
    if (cmcontinue) url += `&cmcontinue=${encodeURIComponent(cmcontinue)}`;
    requests += 1;
    console.log(
      `[${category}] request=${requests} seen=${seen} collected=${members.length}/${takeCount}`
    );
    const j = getJson(url);
    const rows = (j?.query?.categorymembers || []).filter((m) => m.ns === 0);
    for (const m of rows) {
      if (seen < skipCount) {
        seen += 1;
        continue;
      }
      members.push({ pageid: m.pageid, title: m.title });
      if (members.length >= takeCount) break;
    }
    cmcontinue = j?.continue?.cmcontinue;
    if (!cmcontinue) break;
  }

  return members;
}

function getWikidataFromPageIds(members) {
  const out = [];
  const chunk = 50;
  for (let i = 0; i < members.length; i += chunk) {
    console.log(
      `[wikidata ids] resolving ${Math.min(i + chunk, members.length)}/${members.length}`
    );
    const ids = members
      .slice(i, i + chunk)
      .map((m) => m.pageid)
      .join("|");
    const url = `https://en.wikipedia.org/w/api.php?action=query&prop=pageprops&ppprop=wikibase_item&pageids=${ids}&format=json`;
    const j = getJson(url);
    const pages = j?.query?.pages || {};
    for (const p of Object.values(pages)) {
      if (p && p.title && p.pageprops && p.pageprops.wikibase_item) {
        out.push({ name: p.title, wikidataId: p.pageprops.wikibase_item });
      }
    }
  }
  return out;
}

function isLikelyNoiseTitle(name) {
  return /^List of /i.test(name) || /^Category:/i.test(name);
}

function getScopeCategories(scope) {
  if (scope === "off-broadway") {
    return {
      musicals: "Category:Off-Broadway_musicals",
      plays: "Category:Off-Broadway_plays",
    };
  }
  return {
    musicals: "Category:Broadway_musicals",
    plays: "Category:Broadway_plays",
  };
}

function runBatch(skipPerCategory, takePerCategory = 80, mode = "both", scope = "broadway") {
  const categories = getScopeCategories(scope);
  console.log(
    `\n=== Batch start scope=${scope} skip=${skipPerCategory} take=${takePerCategory} mode=${mode} ===`
  );
  const includeMusicals = mode === "both" || mode === "musicals";
  const includePlays = mode === "both" || mode === "plays";

  const musicalMembers = includeMusicals
    ? getCategoryMembersSlice(
        categories.musicals,
        skipPerCategory,
        takePerCategory
      )
    : [];
  const playMembers = includePlays
    ? getCategoryMembersSlice(
        categories.plays,
        skipPerCategory,
        takePerCategory
      )
    : [];

  const musicals = includeMusicals
    ? getWikidataFromPageIds(musicalMembers).map((x) => ({
        ...x,
        type: "musical",
        rawType: "Broadway musical",
      }))
    : [];
  const plays = includePlays
    ? getWikidataFromPageIds(playMembers).map((x) => ({
        ...x,
        type: "play",
        rawType: "Broadway play",
      }))
    : [];
  console.log(
    `[batch ${skipPerCategory}] candidates musicals=${musicalMembers.length}, plays=${playMembers.length}`
  );

  const seenIds = new Set();
  const entries = [];
  for (const e of [...musicals, ...plays]) {
    if (!e.wikidataId || !e.name || seenIds.has(e.wikidataId)) continue;
    if (isLikelyNoiseTitle(e.name)) continue;
    seenIds.add(e.wikidataId);
    entries.push(e);
  }

  const payload = JSON.stringify({ entries, dryRun: false });
  console.log(`[batch ${skipPerCategory}] importing ${entries.length} entries...`);
  const run = spawnSync("npx", ["convex", "run", "seed:importWikidataShows", payload], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    timeout: 120000,
  });
  if (run.error) {
    throw run.error;
  }
  if (run.status !== 0) {
    throw new Error(run.stderr || run.stdout || "convex run failed");
  }
  const text = run.stdout || "";
  const idx = text.indexOf("{");
  const result = JSON.parse(text.slice(idx));

  return {
    skipPerCategory,
    takePerCategory,
    musicalCandidates: musicalMembers.length,
    playCandidates: playMembers.length,
    uniqueEntriesAttempted: entries.length,
    result,
    first5: entries.slice(0, 5).map((e) => e.name),
  };
}

let takePerCategory = 80;
let mode = "both";
let scope = "broadway";
const skips = [];
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--take=")) {
    const parsed = Number(arg.slice("--take=".length));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      console.error(`Invalid --take value: ${arg}`);
      process.exit(1);
    }
    takePerCategory = parsed;
    continue;
  }
  if (arg.startsWith("--mode=")) {
    const parsed = arg.slice("--mode=".length).toLowerCase();
    if (!["both", "musicals", "plays"].includes(parsed)) {
      console.error(`Invalid --mode value: ${arg}`);
      process.exit(1);
    }
    mode = parsed;
    continue;
  }
  if (arg.startsWith("--scope=")) {
    const parsed = arg.slice("--scope=".length).toLowerCase();
    if (!["broadway", "off-broadway"].includes(parsed)) {
      console.error(`Invalid --scope value: ${arg}`);
      process.exit(1);
    }
    scope = parsed;
    continue;
  }
  const parsed = Number(arg);
  if (Number.isFinite(parsed)) skips.push(parsed);
}

if (skips.length === 0) {
  console.error(
    "Usage: node scripts/importBroadwayBatch.js <skip1> [skip2] ... [--take=40] [--mode=both|musicals|plays] [--scope=broadway|off-broadway]"
  );
  process.exit(1);
}

const runs = [];
for (const skip of skips) {
  runs.push(runBatch(skip, takePerCategory, mode, scope));
}
console.log(JSON.stringify({ runs }, null, 2));
