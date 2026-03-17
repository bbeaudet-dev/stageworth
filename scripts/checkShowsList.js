const fs = require("node:fs");
const path = require("node:path");

function loadAllShows() {
  const raw = fs.readFileSync(path.join("/tmp", "all-shows.json"), "utf8");
  const idx = raw.indexOf("[");
  if (idx === -1) {
    throw new Error("Unexpected shows:list output – no JSON array found");
  }
  const shows = JSON.parse(raw.slice(idx));
  return shows;
}

function normalizeName(name) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function main() {
  const shows = loadAllShows();
  const showMap = new Map();
  for (const s of shows) {
    const norm = normalizeName(s.name);
    if (!showMap.has(norm)) showMap.set(norm, s.name);
  }

  const requested = [
    "Natasha, Pierre, and the Great Comet of 1812",
    "Once",
    "The Color Purple",
    "Into the Woods",
    "Ghost Quartet",
    "Sunday in the Park with George",
    "Exodus",
    "Company",
    "Fun Home",
    "Matilda",
    "Cabaret",
    "Death Becomes Her",
    "Ragtime",
    "The Curious Case of Benjamin Button (WE)",
    "Les Miserables",
    "Wicked",
    "Operation Mincemeat",
    "Hamilton",
    "Bat Boy",
    "Anything Goes",
    "Hadestown",
    "The 25th Annual Putnam County Spelling Bee",
    "Liberation",
    "John Proctor is the Villain",
    "Oedipus",
    "Oh, Mary!",
    "A Strange Loop",
    "Falsettos",
    "The Book of Mormon",
    "Hedwig and the Angry Inch",
    "The Curious Incident of the Dog in the Night Time",
    "Spare Parts",
    "Beau",
    "Chicago",
    "Bug",
    "Marcel on the Train",
    "Avenue Q",
    "Parade",
    "In The Heights",
    "Titanique",
    "Pippin",
    "Angels in America",
    "Peter and the Starcatcher",
    "My Neighbor Totoro (WE)",
    "Porgy and Bess",
    "Sweeney Todd",
    "Waitress",
    "Newsies",
    "ha ha ha ha ha ha ha",
    "Maybe Happy Ending",
    "The Band’s Visit",
    "Two Strangers (Carry a Cake Across New York)",
    "Miss Saigon",
    "Gypsy",
    "Ginger Twinsies",
    "Cold War Choir Practice",
    "The Prom",
    "A Little Night Music",
    "Big Fish",
    "Groundhog Day",
    "Chinese Republicans",
    "The Unknown",
    "West Side Story",
    "Burnout Paradise",
    "All Out",
    "Dear Evan Hansen",
    "Pirates! The Penzance Musical",
    "Bigfoot",
    "Just in Time",
    "The Great Gatsby",
    "Here Lies Love",
    "The Disappear",
    "The Outsiders",
    "Chess",
    "An American in Paris",
    "Cinderella",
    "Amelie",
    "Madame President (WE)",
    "Data",
    "From Here to Eternity (WE)",
  ];

  const items = requested.map((name, index) => {
    const stripped = name.replace(/\s*\(WE\)\s*$/i, "");
    const norm = normalizeName(stripped);
    const foundName = showMap.get(norm) || null;
    return {
      index: index + 1,
      requested: name,
      found: !!foundName,
      matchedName: foundName,
    };
  });

  const foundCount = items.filter((r) => r.found).length;
  const missingCount = items.length - foundCount;

  console.log(
    JSON.stringify(
      {
        found: foundCount,
        missing: missingCount,
        items,
      },
      null,
      2
    )
  );
}

main();

