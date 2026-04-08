/**
 * Maps common city abbreviations and alternate names to the canonical city
 * string stored in the venues table. Keys must be lowercase (comparison is
 * case-insensitive). Add new entries here whenever a new city is seeded or a
 * common alias surfaces in user-submitted visit data.
 */
export const CITY_ALIASES: Record<string, string> = {
  // ── New York ────────────────────────────────────────────────────────────────
  "nyc": "New York",
  "new york city": "New York",
  "new york ny": "New York",

  // ── Los Angeles ─────────────────────────────────────────────────────────────
  "la": "Los Angeles",
  "los angeles ca": "Los Angeles",

  // ── San Francisco ───────────────────────────────────────────────────────────
  "sf": "San Francisco",
  "san francisco ca": "San Francisco",

  // ── Washington ──────────────────────────────────────────────────────────────
  "dc": "Washington",
  "washington dc": "Washington",
  "washington d c": "Washington",

  // ── Chicago ─────────────────────────────────────────────────────────────────
  "chi": "Chicago",
  "chi-town": "Chicago",
  "chitown": "Chicago",
  "chicago il": "Chicago",

  // ── Philadelphia ────────────────────────────────────────────────────────────
  "philly": "Philadelphia",
  "philadelphia pa": "Philadelphia",
  "phl": "Philadelphia",

  // ── Boston ──────────────────────────────────────────────────────────────────
  "bos": "Boston",
  "boston ma": "Boston",

  // ── Atlanta ─────────────────────────────────────────────────────────────────
  "atl": "Atlanta",
  "atlanta ga": "Atlanta",

  // ── Houston ─────────────────────────────────────────────────────────────────
  "hou": "Houston",
  "houston tx": "Houston",

  // ── Dallas ──────────────────────────────────────────────────────────────────
  "dal": "Dallas",
  "dallas tx": "Dallas",
  "dfw": "Dallas",

  // ── Cleveland ───────────────────────────────────────────────────────────────
  "cle": "Cleveland",
  "cleveland oh": "Cleveland",

  // ── Columbus ────────────────────────────────────────────────────────────────
  "cbus": "Columbus",
  "columbus oh": "Columbus",

  // ── Cincinnati ──────────────────────────────────────────────────────────────
  "cincy": "Cincinnati",
  "cincinnati oh": "Cincinnati",

  // ── New Orleans ─────────────────────────────────────────────────────────────
  "nola": "New Orleans",
  "nawlins": "New Orleans",
  "new orleans la": "New Orleans",

  // ── Portland ────────────────────────────────────────────────────────────────
  "pdx": "Portland",
  "portland or": "Portland",

  // ── Salt Lake City ──────────────────────────────────────────────────────────
  "slc": "Salt Lake City",
  "salt lake city ut": "Salt Lake City",

  // ── Milwaukee ───────────────────────────────────────────────────────────────
  "mke": "Milwaukee",
  "milwaukee wi": "Milwaukee",

  // ── St. Louis ───────────────────────────────────────────────────────────────
  "stl": "St. Louis",
  "saint louis": "St. Louis",
  "st louis": "St. Louis",
  "st. louis mo": "St. Louis",

  // ── Kansas City ─────────────────────────────────────────────────────────────
  "kc": "Kansas City",
  "kansas city mo": "Kansas City",
  "kansas city ks": "Kansas City",

  // ── Minneapolis ─────────────────────────────────────────────────────────────
  "mpls": "Minneapolis",
  "msp": "Minneapolis",
  "minneapolis mn": "Minneapolis",

  // ── Pittsburgh ──────────────────────────────────────────────────────────────
  "pgh": "Pittsburgh",
  "pitt": "Pittsburgh",
  "pittsburgh pa": "Pittsburgh",

  // ── Nashville ───────────────────────────────────────────────────────────────
  "nash": "Nashville",
  "nashville tn": "Nashville",

  // ── Detroit ─────────────────────────────────────────────────────────────────
  "detroit mi": "Detroit",

  // ── Denver ──────────────────────────────────────────────────────────────────
  "denver co": "Denver",

  // ── Seattle ─────────────────────────────────────────────────────────────────
  "seattle wa": "Seattle",

  // ── Austin ──────────────────────────────────────────────────────────────────
  "austin tx": "Austin",

  // ── Miami ───────────────────────────────────────────────────────────────────
  "miami fl": "Miami",

  // ── Orlando ─────────────────────────────────────────────────────────────────
  "orlando fl": "Orlando",

  // ── Tampa ───────────────────────────────────────────────────────────────────
  "tampa fl": "Tampa",

  // ── Charlotte ───────────────────────────────────────────────────────────────
  "charlotte nc": "Charlotte",

  // ── Indianapolis ────────────────────────────────────────────────────────────
  "indianapolis in": "Indianapolis",
  "indy": "Indianapolis",

  // ── Louisville ──────────────────────────────────────────────────────────────
  "louisville ky": "Louisville",

  // ── Baltimore ───────────────────────────────────────────────────────────────
  "baltimore md": "Baltimore",

  // ── Richmond ────────────────────────────────────────────────────────────────
  "richmond va": "Richmond",

  // ── Las Vegas ───────────────────────────────────────────────────────────────
  "las vegas nv": "Las Vegas",
  "vegas": "Las Vegas",

  // ── Phoenix ─────────────────────────────────────────────────────────────────
  "phoenix az": "Phoenix",

  // ── Albuquerque ─────────────────────────────────────────────────────────────
  "albuquerque nm": "Albuquerque",
  "abq": "Albuquerque",

  // ── Omaha ───────────────────────────────────────────────────────────────────
  "omaha ne": "Omaha",
};
