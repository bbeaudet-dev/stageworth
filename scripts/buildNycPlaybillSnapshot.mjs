/**
 * Builds:
 *   - data/convex-paste-playbill-productions.json — paste as args to seed:applyPlaybillProductionPaste (only { "items": [...] }).
 *   - data/nyc-playbill-productions-review.json — same rows + optional sourceStatus for humans.
 *
 * Run: node scripts/buildNycPlaybillSnapshot.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const MONTH_MAP = {
  january: 1,
  jan: 1,
  february: 2,
  feb: 2,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  may: 5,
  june: 6,
  jun: 6,
  july: 7,
  jul: 7,
  august: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  october: 10,
  oct: 10,
  november: 11,
  nov: 11,
  december: 12,
  dec: 12,
};

function toIso(monthStr, dayStr, yearStr) {
  const m = MONTH_MAP[monthStr.toLowerCase()];
  if (!m) return null;
  const mm = String(m).padStart(2, "0");
  const dd = String(parseInt(dayStr, 10)).padStart(2, "0");
  return `${yearStr}-${mm}-${dd}`;
}

/** Parse Playbill status lines into schema fields. Unparsed remainder → notes. */
function parsePlaybillStatus(line) {
  const trimmed = (line || "").trim();
  if (!trimmed) {
    return {
      previewDate: null,
      openingDate: null,
      closingDate: null,
      notes: null,
    };
  }

  let previewDate = null;
  let openingDate = null;
  let closingDate = null;

  const closeM = trimmed.match(/Closes ([A-Za-z]+) (\d{1,2}), (\d{4})/i);
  if (closeM) closingDate = toIso(closeM[1], closeM[2], closeM[3]);

  const openM = trimmed.match(/Opens ([A-Za-z]+) (\d{1,2}), (\d{4})/i);
  if (openM) openingDate = toIso(openM[1], openM[2], openM[3]);

  const bpM = trimmed.match(/Begins Previews ([A-Za-z]+) (\d{1,2}), (\d{4})/i);
  if (bpM) previewDate = toIso(bpM[1], bpM[2], bpM[3]);

  const openedM = trimmed.match(/Opened ([A-Za-z]+) (\d{1,2}), (\d{4})/i);
  if (openedM) openingDate = toIso(openedM[1], openedM[2], openedM[3]);

  const openingSoonM = trimmed.match(/Opening ([A-Za-z]+) (\d{1,2}), (\d{4})/i);
  if (openingSoonM && !openingDate) {
    openingDate = toIso(openingSoonM[1], openingSoonM[2], openingSoonM[3]);
  }

  const hasAny = previewDate || openingDate || closingDate;
  const notes = hasAny ? null : trimmed;

  return { previewDate, openingDate, closingDate, notes };
}

function looksLikeScheduleLine(s) {
  return /\b(Closes|Opens|Opened|Opening|Previews|Begins)\b/i.test(s);
}

/** Playbill titles already satisfied by your dev DB (queried 2026); do not paste duplicates. */
const EXCLUDED_FROM_PASTE = new Set([
  "& Juliet",
  "MJ",
  "Maybe Happy Ending",
  "Hadestown",
  "Oh, Mary!",
  "Stranger Things: The First Shadow",
  "Death of a Salesman",
  "Becky Shaw",
]);

const broadwaySource = [
  ["& Juliet", "Stephen Sondheim Theatre", "2022-11-17", "Opened November 17, 2022"],
  ["Aladdin", "New Amsterdam Theatre", "2014-03-20", "Opened March 20, 2014"],
  ["Becky Shaw", "Helen Hayes Theater", null, "Opening April 8, 2026"],
  ["The Book of Mormon", "Eugene O'Neill Theatre", "2011-03-24", "Opened March 24, 2011"],
  ["Buena Vista Social Club", "Gerald Schoenfeld Theatre", "2025-03-19", "Opened March 19, 2025"],
  ["Cats: The Jellicle Ball", "Broadhurst Theatre", null, "Opening April 7, 2026 (previews)"],
  ["Chess", "Imperial Theatre", "2025-11-16", "Opened November 16, 2025"],
  ["Chicago", "Ambassador Theatre", "1996-11-14", "Opened November 14, 1996"],
  ["Death Becomes Her", "Lunt-Fontanne Theatre", "2024-11-21", "Opened November 21, 2024"],
  ["Death of a Salesman", "Winter Garden Theatre", null, "Opening April 9, 2026"],
  ["Dog Day Afternoon", "August Wilson Theatre", null, "Opening March 30, 2026"],
  ["Every Brilliant Thing", "Hudson Theatre", "2026-03-12", "Opened March 12, 2026"],
  ["The Fear of 13", "James Earl Jones Theatre", null, "Opening April 15, 2026"],
  ["Giant", "Music Box Theatre", "2026-03-23", "Opened March 23, 2026"],
  ["The Great Gatsby", "Broadway Theatre", "2024-04-25", "Opened April 25, 2024"],
  ["Hadestown", "Walter Kerr Theatre", "2019-04-17", "Opened April 17, 2019"],
  ["Hamilton", "Richard Rodgers Theatre", "2015-08-06", "Opened August 6, 2015"],
  ["Harry Potter and the Cursed Child", "Lyric Theatre", "2021-12-07", "Opened December 7, 2021 (revised production)"],
  ["Just in Time", "Circle in the Square Theatre", "2025-04-26", "Opened April 26, 2025"],
  ["The Lion King", "Minskoff Theatre", "1997-11-13", "Opened November 13, 1997"],
  ["Maybe Happy Ending", "Belasco Theatre", "2024-11-12", "Opened November 12, 2024"],
  ["MJ", "Neil Simon Theatre", "2022-02-01", "Opened February 1, 2022"],
  ["Moulin Rouge! The Musical", "Al Hirschfeld Theatre", "2019-07-25", "Opened July 25, 2019"],
  ["Oh, Mary!", "Lyceum Theatre", "2024-07-11", "Opened July 11, 2024"],
  ["Operation Mincemeat", "John Golden Theatre", "2025-03-20", "Opened March 20, 2025"],
  ["The Outsiders", "Bernard B. Jacobs Theatre", "2024-04-11", "Opened April 11, 2024"],
  ["Ragtime", "Vivian Beaumont Theater", "2025-10-16", "Opened October 16, 2025"],
  ["Six", "Lena Horne Theatre", "2021-10-03", "Opened October 3, 2021"],
  ["Stranger Things: The First Shadow", "Marquis Theatre", "2025-04-22", "Opened April 22, 2025"],
  ["Two Strangers (Carry a Cake Across New York)", "Longacre Theatre", "2025-11-20", "Opened November 20, 2025"],
  ["Wicked", "Gershwin Theatre", "2003-10-30", "Opened October 30, 2003"],
];

const offParsed = JSON.parse(
  fs.readFileSync(path.join(root, "data/playbill-offbroadway-parsed.json"), "utf8")
);

function buildBroadwayRows() {
  return broadwaySource.map(([showName, theatre, openingIso, statusLine]) => {
    const parsed = parsePlaybillStatus(statusLine);
    const openingDate = openingIso ?? parsed.openingDate;
    const previewDate = parsed.previewDate;
    const closingDate = parsed.closingDate;
    let notes = parsed.notes;
    if (notes && openingDate) notes = null;
    return {
      showName,
      theatre,
      city: "New York",
      district: "broadway",
      previewDate,
      openingDate,
      closingDate,
      productionType: "other",
      notes,
      sourceStatus: statusLine,
    };
  });
}

function buildOffBroadwayRows() {
  return offParsed.map((raw) => {
    const d = raw.details;
    let theatre = "";
    let statusLine = "";

    if (d.length >= 2) {
      statusLine = d[0];
      theatre = d[1];
    } else if (d.length === 1) {
      if (looksLikeScheduleLine(d[0])) {
        statusLine = d[0];
        theatre = "";
      } else {
        theatre = d[0];
        statusLine = "";
      }
    }

    const parsed = parsePlaybillStatus(statusLine);
    const notesFromUnparsed = parsed.notes;
    const notes =
      notesFromUnparsed && theatre
        ? `Venue: ${theatre}. Playbill: ${notesFromUnparsed}`
        : notesFromUnparsed || null;

    return {
      showName: raw.showName,
      theatre: theatre || undefined,
      city: "New York",
      district: "off_broadway",
      previewDate: parsed.previewDate,
      openingDate: parsed.openingDate,
      closingDate: parsed.closingDate,
      productionType: "other",
      notes,
      sourceStatus: [statusLine, theatre].filter(Boolean).join(" · ") || null,
    };
  });
}

const allReviewRows = [...buildBroadwayRows(), ...buildOffBroadwayRows()];

const pasteRows = allReviewRows
  .filter((r) => !EXCLUDED_FROM_PASTE.has(r.showName))
  .map(({ sourceStatus, ...rest }) => {
    const { showName, theatre, city, district, previewDate, openingDate, closingDate, productionType, notes } = rest;
    return {
      showName,
      theatre,
      city,
      district,
      previewDate: previewDate ?? undefined,
      openingDate: openingDate ?? undefined,
      closingDate: closingDate ?? undefined,
      productionType,
      notes: notes ?? undefined,
    };
  });

const convexPaste = { items: pasteRows };

const reviewDoc = {
  meta: {
    purpose:
      "Human-readable mirror of convex-paste-playbill-productions.json with sourceStatus. For Convex, use only convex-paste-playbill-productions.json.",
    convexRun:
      'npx convex run seed:applyPlaybillProductionPaste \'{"items":[...]}\'  (paste full file contents as the argument object, or use Dashboard → Functions → seed:applyPlaybillProductionPaste)',
    matchWarning:
      "showName must normalize to the same string as your shows.normalizedName (see convex/showNormalization.ts). There is no magic fuzzy match—unmatched names appear in missingShow. Stable long-term fix: store Playbill/production external IDs on rows you care about.",
    excludedFromPasteBecauseAlreadyInDevDb: [...EXCLUDED_FROM_PASTE],
    asOf: "2026-03-24",
    sources: [
      "https://www.playbill.com/article/whats-currently-playing-on-broadway",
      "https://www.playbill.com/shows/offbroadway",
    ],
    offOffBroadway: {
      note:
        "No single Playbill list for Off-Off-Broadway; curate from venue calendars if needed.",
      venueCalendars: [
        { name: "La MaMa Experimental Theatre Club", url: "https://www.lamama.org" },
        { name: "The Tank", url: "https://thetanknyc.org" },
        { name: "Rattlestick Playwrights Theater", url: "https://www.rattlestick.org" },
      ],
    },
  },
  productions: allReviewRows,
};

fs.writeFileSync(
  path.join(root, "data/convex-paste-playbill-productions.json"),
  JSON.stringify(convexPaste, null, 2)
);
fs.writeFileSync(
  path.join(root, "data/nyc-playbill-productions-review.json"),
  JSON.stringify(reviewDoc, null, 2)
);

console.log("Wrote data/convex-paste-playbill-productions.json", { items: pasteRows.length });
console.log("Wrote data/nyc-playbill-productions-review.json", { productions: allReviewRows.length });
console.log("Excluded from paste (already in dev DB):", [...EXCLUDED_FROM_PASTE].join(", "));
