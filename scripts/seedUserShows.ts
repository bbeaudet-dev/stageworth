/**
 * Seeds a user's rankings, userShows, and visits from the pre-defined show lists.
 *
 * Usage:
 *   npx tsx scripts/seedUserShows.ts --userId <convex_user_id> --dataset ben
 *   npx tsx scripts/seedUserShows.ts --userId <convex_user_id> --dataset sophia
 *   npx tsx scripts/seedUserShows.ts --userId <convex_user_id> --dataset eric
 *
 * Options:
 *   --userId <id>           Required. The Convex user ID (e.g. "jx7abc123...")
 *   --dataset ben|sophia|eric  Required. Which dataset to seed.
 *   --loved-through <n>     Last rank that counts as "loved"  (default: 21 for ben, 13 for sophia, 32 for eric)
 *   --liked-through <n>     Last rank that counts as "liked"  (default: 46 for ben, 30 for sophia, 52 for eric)
 *   --okay-through <n>      Last rank that counts as "okay"   (default: 65 for ben, 45 for sophia, 66 for eric)
 *                           Ranks beyond okayThrough are "disliked".
 *   --skip-if-exists        Skip seeding if the user already has ranked shows (default: true)
 *   --no-skip-if-exists     Force-overwrite even if ranked shows already exist
 *   --dry-run               Preview what would be seeded without writing any data
 *   --prod                  Target the production Convex deployment (default: dev)
 *
 * Requires tsx (available via npx): npx tsx scripts/seedUserShows.ts ...
 * Requires CONVEX_DEPLOYMENT env var (set automatically by `convex dev`).
 */

import { spawnSync } from "child_process";
import { createRequire } from "module";

type VisitInfo = {
  date: string;
  theatre: string;
  district: string;
  notes?: string;
};

type TheatreShow = {
  name: string;
  rank: number;
  form?: string;
  visits: VisitInfo[];
};

const requireFromHere = createRequire(import.meta.url);

function loadDatasetExport<T>(modulePath: string, exportName: string): T {
  try {
    const mod = requireFromHere(modulePath) as Record<string, T>;
    const value = mod[exportName];
    if (!value) {
      throw new Error(`Missing export "${exportName}" from ${modulePath}`);
    }
    return value;
  } catch (error) {
    throw new Error(
      `Could not load ${modulePath}. Make sure local seed data files exist before running this script.`
    );
  }
}

const theatreShowList = loadDatasetExport<TheatreShow[]>(
  "../data/shows-ben",
  "theatreShowList"
);
const theatreShowListSophia = loadDatasetExport<TheatreShow[]>(
  "../data/shows-sophia",
  "theatreShowListSophia"
);
const theatreShowListEric = loadDatasetExport<TheatreShow[]>(
  "../data/shows-eric",
  "theatreShowListEric"
);

// ─── District mapping ────────────────────────────────────────────────────────
// Converts the district strings used in shows-ben/sophia to the Convex DB literals.

type ConvexDistrict =
  | "broadway"
  | "off_broadway"
  | "off_off_broadway"
  | "west_end"
  | "touring"
  | "regional"
  | "other";

const DISTRICT_MAP: Record<string, ConvexDistrict> = {
  Broadway: "broadway",
  "Off-Broadway": "off_broadway",
  "Off-Off-Broadway": "off_off_broadway",
  "West End": "west_end",
  Touring: "touring",
  // Playhouse Square is a regional performing arts center in Cleveland.
  "Playhouse Square": "regional",
  // "Local" covers regional venues outside Broadway/West End/touring contexts.
  Local: "regional",
  Other: "other",
};

function mapDistrict(raw: string): ConvexDistrict {
  return DISTRICT_MAP[raw] ?? "other";
}

// ─── Show type fallback for Sophia's list ────────────────────────────────────
// Sophia's data doesn't include `form`. Cross-reference Ben's list first,
// then fall back to "musical" (the majority of shows on both lists).

const benShowsByName = new Map<string, TheatreShow>(
  theatreShowList.map((s) => [s.name.toLowerCase().trim(), s])
);

function getShowType(show: TheatreShow): string {
  if (show.form) return show.form;
  const fromBen = benShowsByName.get(show.name.toLowerCase().trim());
  if (fromBen?.form) return fromBen.form;
  return "musical";
}

// ─── Transform to mutation payload ──────────────────────────────────────────

interface SeedShow {
  name: string;
  type: string;
  rank: number;
  visits: {
    date: string;
    theatre: string;
    district: ConvexDistrict;
    notes?: string;
  }[];
}

function transformShows(list: TheatreShow[]): SeedShow[] {
  return list.map((show) => ({
    name: show.name,
    type: getShowType(show),
    rank: show.rank,
    visits: show.visits.map((v: VisitInfo) => ({
      date: v.date,
      theatre: v.theatre,
      district: mapDistrict(v.district),
      ...(v.notes ? { notes: v.notes } : {}),
    })),
  }));
}

// ─── CLI argument parsing ────────────────────────────────────────────────────

function parseArgs(argv: string[]): {
  userId: string;
  dataset: "ben" | "sophia" | "eric";
  lovedThrough: number;
  likedThrough: number;
  okayThrough: number;
  skipIfExists: boolean;
  dryRun: boolean;
  prod: boolean;
} {
  const args = argv.slice(2);
  const get = (flag: string): string | null => {
    const idx = args.indexOf(flag);
    return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
  };
  const has = (flag: string): boolean => args.includes(flag);

  const userId = get("--userId") ?? get("--user-id");
  const datasetRaw = get("--dataset");

  if (!userId) {
    console.error("Error: --userId <convex_user_id> is required.");
    process.exit(1);
  }

  if (datasetRaw !== "ben" && datasetRaw !== "sophia" && datasetRaw !== "eric") {
    console.error('Error: --dataset must be "ben", "sophia", or "eric".');
    process.exit(1);
  }

  const dataset = datasetRaw as "ben" | "sophia" | "eric";

  // Defaults differ by list shape:
  // ben: 79 shows, sophia: 53 shows, eric: 85 shows.
  const defaultBreakpoints = (() => {
    if (dataset === "ben") return { lovedThrough: 21, likedThrough: 46, okayThrough: 65 };
    if (dataset === "sophia") return { lovedThrough: 13, likedThrough: 30, okayThrough: 45 };
    return { lovedThrough: 32, likedThrough: 52, okayThrough: 66 };
  })();

  const lovedThrough = parseInt(get("--loved-through") ?? String(defaultBreakpoints.lovedThrough), 10);
  const likedThrough = parseInt(get("--liked-through") ?? String(defaultBreakpoints.likedThrough), 10);
  const okayThrough = parseInt(get("--okay-through") ?? String(defaultBreakpoints.okayThrough), 10);

  if (isNaN(lovedThrough) || isNaN(likedThrough) || isNaN(okayThrough)) {
    console.error("Error: Tier breakpoint flags must be numbers.");
    process.exit(1);
  }

  if (!(lovedThrough < likedThrough && likedThrough < okayThrough)) {
    console.error(
      `Error: Tier breakpoints must be strictly ascending: loved (${lovedThrough}) < liked (${likedThrough}) < okay (${okayThrough}).`
    );
    process.exit(1);
  }

  // --skip-if-exists defaults to true; --no-skip-if-exists overrides.
  const skipIfExists = !has("--no-skip-if-exists");
  const dryRun = has("--dry-run");
  const prod = has("--prod");

  return { userId, dataset, lovedThrough, likedThrough, okayThrough, skipIfExists, dryRun, prod };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  const { userId, dataset, lovedThrough, likedThrough, okayThrough, skipIfExists, dryRun, prod } =
    parseArgs(process.argv);

  const list =
    dataset === "ben"
      ? theatreShowList
      : dataset === "sophia"
        ? theatreShowListSophia
        : theatreShowListEric;
  const shows = transformShows(list);

  const tierBreakpoints = { lovedThrough, likedThrough, okayThrough };

  const showCount = shows.length;
  const visitCount = shows.reduce((sum, s) => sum + s.visits.length, 0);

  console.log(`\nStageworth — User Seed`);
  console.log(`${"─".repeat(40)}`);
  console.log(`  Dataset  : ${dataset} (${showCount} shows, ${visitCount} visits)`);
  console.log(`  User ID  : ${userId}`);
  console.log(`  Target   : ${prod ? "PRODUCTION" : "dev"}`);
  console.log(`  Tiers    : loved ≤${lovedThrough} | liked ≤${likedThrough} | okay ≤${okayThrough} | disliked beyond`);
  console.log(`  Skip existing : ${skipIfExists}`);
  console.log(`  Dry run  : ${dryRun}`);
  console.log(`${"─".repeat(40)}\n`);

  if (!dryRun) {
    const confirm = await promptConfirm(
      `About to write to the Convex database. Continue? (y/N) `
    );
    if (!confirm) {
      console.log("Aborted.");
      process.exit(0);
    }
  }

  const mutationArgs = {
    userId,
    shows,
    tierBreakpoints,
    skipIfExists,
    dryRun,
  };

  const argsJson = JSON.stringify(mutationArgs);

  console.log(dryRun ? "Running dry-run preview...\n" : "Seeding...\n");

  // Use spawnSync (not execSync) so the JSON is passed as a raw process argument —
  // no shell interpretation, no quoting issues with apostrophes in show names.
  const convexArgs = [
    "convex",
    "run",
    "admin/seedUserData:seedUserRankingsAndVisits",
    ...(prod ? ["--prod"] : []),
    argsJson,
  ];
  const proc = spawnSync("npx", convexArgs, { encoding: "utf-8" });
  if (proc.error || proc.status !== 0) {
    console.error("Convex run failed:");
    if (proc.stderr) console.error(proc.stderr);
    if (proc.stdout) console.error(proc.stdout);
    if (proc.error) console.error(proc.error.message);
    process.exit(1);
  }
  const rawOutput = proc.stdout;

  // Parse and pretty-print the result.
  let result: Record<string, unknown>;
  try {
    result = JSON.parse(rawOutput.trim());
  } catch {
    // Convex CLI sometimes emits extra lines; try to find the JSON object.
    const lines = rawOutput.trim().split("\n");
    const jsonLine = lines.find((l) => l.trim().startsWith("{"));
    if (!jsonLine) {
      console.log("Raw output:\n", rawOutput);
      process.exit(0);
    }
    result = JSON.parse(jsonLine);
  }

  console.log(`\nResult`);
  console.log(`${"─".repeat(40)}`);

  if (result.skipped) {
    console.log(`  ⚠  Skipped: ${result.reason}`);
  } else {
    const tag = result.dryRun ? " (dry run)" : "";
    console.log(`  Shows created ${tag}   : ${result.showsCreated}`);
    console.log(`  Shows matched          : ${result.showsExisting}`);
    console.log(`  Visits created ${tag}  : ${result.visitsCreated}`);
    console.log(`  Venue matched          : ${result.venueMatched}`);
    console.log(`  Production matched     : ${result.productionMatched}`);
    console.log(`  Raw (no enrichment)    : ${result.rawOnly}`);
    const errors = result.errors as string[];
    if (errors?.length) {
      console.log(`\n  Errors (${errors.length}):`);
      errors.forEach((e: string) => console.log(`    - ${e}`));
    } else {
      console.log(`  Errors                 : none`);
    }
    const fuzzyMatched = result.fuzzyMatched as {
      inputName: string;
      matchedName: string;
      score: number;
    }[];
    if (fuzzyMatched?.length) {
      console.log(`\n  Fuzzy-matched (verify these look right):`);
      fuzzyMatched.forEach(({ inputName, matchedName, score }) =>
        console.log(`    - "${inputName}"  →  "${matchedName}"  (score: ${score})`)
      );
    }
    const wouldCreate = result.wouldCreate as { name: string; normalizedName: string }[];
    if (wouldCreate?.length) {
      console.log(`\n  No catalog match found — would be created as new shows:`);
      wouldCreate.forEach(({ name, normalizedName }) =>
        console.log(`    - "${name}"  (normalized: "${normalizedName}")`)
      );
      console.log(
        `\n  If any of the above already exist in your DB under a different name,`
      );
      console.log(`  add an entry to the NAME_OVERRIDES map in scripts/seedUserShows.ts.`);
    }
  }

  console.log();
}

function promptConfirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.setEncoding("utf-8");
    process.stdin.once("data", (data) => {
      const answer = (data as string).trim().toLowerCase();
      resolve(answer === "y" || answer === "yes");
    });
  });
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
