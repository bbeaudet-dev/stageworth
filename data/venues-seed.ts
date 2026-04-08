export type VenueDistrict =
  | "broadway"
  | "off_broadway"
  | "off_off_broadway"
  | "west_end"
  | "touring"
  | "regional"
  | "other";

export type SeedVenue = {
  name: string;
  district: VenueDistrict;
  city: string;
  state?: string;
  country: string;
  addressLine1?: string;
  source: string;
  sourceUrl: string;
  ingestionConfidence: "high" | "medium" | "low";
};

const BROADWAY_SOURCE_URL = "https://www.broadway.org/broadway-theatres";
const OBA_SOURCE_URL = "https://www.offbroadwayalliance.com/off-broadway-producers-resource-directory/theaters/";
const LORT_SOURCE_URL = "https://lort.org/theatres";

// ─── Broadway ────────────────────────────────────────────────────────────────
export const BROADWAY_VENUES: SeedVenue[] = [
  { name: "Al Hirschfeld Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Ambassador Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "August Wilson Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Belasco Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Bernard B. Jacobs Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Booth Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Broadhurst Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Broadway Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Circle in the Square Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Ethel Barrymore Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Eugene O'Neill Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Gershwin Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Hudson Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Imperial Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "James Earl Jones Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "John Golden Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Lena Horne Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Longacre Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Lunt-Fontanne Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Lyceum Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Lyric Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Majestic Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Marquis Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Minskoff Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Music Box Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Nederlander Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Neil Simon Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "New Amsterdam Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Palace Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Richard Rodgers Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Samuel J. Friedman Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Gerald Schoenfeld Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Shubert Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "St. James Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Stephen Sondheim Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Studio 54", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Todd Haimes Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Vivian Beaumont Theater", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Walter Kerr Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Winter Garden Theatre", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Hayes Theater", district: "broadway", city: "New York", state: "NY", country: "USA", source: "broadway_org", sourceUrl: BROADWAY_SOURCE_URL, ingestionConfidence: "high" },
];

// ─── Off-Broadway & Off-Off-Broadway (NYC) ───────────────────────────────────
// Source: Off-Broadway Alliance producer directory. Addresses corrected against
// official venue websites where earlier entries had errors.
export const OFF_BROADWAY_VENUES: SeedVenue[] = [
  // ── Supper clubs / cabarets ──────────────────────────────────────────────
  { name: "54 Below", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "254 West 54th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },

  // ── Commercial Off-Broadway ──────────────────────────────────────────────
  { name: "Actors Temple Theatre", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "339 West 47th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Apollo Theater", district: "other", city: "New York", state: "NY", country: "USA", addressLine1: "253 West 125th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Astor Place Theatre", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "434 Lafayette Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Asylum NYC", district: "off_off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "307 West 26th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Daryl Roth Theatre", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "101 East 15th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "DR2 Theatre", district: "off_off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "101 East 15th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "The Duke on 42nd Street", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "229 West 42nd Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Gene Frankel Theatre", district: "off_off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "24 Bond Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Audible's Minetta Lane Theatre", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "18 Minetta Lane", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "New World Stages", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "340 West 50th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Orpheum Theater", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "126 Second Avenue", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "The Players Theatre", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "115 MacDougal Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "The Riverside Theatre", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "91 Claremont Avenue", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "The Shed", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "545 West 30th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Soho Playhouse", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "15 Vandam Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Stage 42", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "422 West 42nd Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Theatre 80", district: "off_off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "80 St. Marks Place", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Theater 555", district: "off_off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "555 West 42nd Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Theatre at St. Clement's", district: "off_off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "423 West 46th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Jerry Orbach Theater", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "1627 Broadway", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Anne L. Bernstein Theater", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "1627 Broadway", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Westside Theatre – Upstairs", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "407 West 43rd Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Westside Theatre – Downstairs", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "407 West 43rd Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },

  // ── Not-for-Profit Off-Broadway ──────────────────────────────────────────
  { name: "47th Street Theater", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "304 West 47th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "59E59 Theaters", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "59 East 59th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Abrons Arts Center", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "466 Grand Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "AMT Theater", district: "off_off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "354 West 45th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Ars Nova", district: "off_off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "511 West 54th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Atlantic Theater Company – Linda Gross Theater", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "336 West 20th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Atlantic Stage 2", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "330 West 16th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Baryshnikov Arts Center", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "450 West 37th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Cherry Lane Theatre", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "38 Commerce Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Classic Stage Company", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "136 East 13th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "HERE Arts Center", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "145 Sixth Avenue", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Irish Repertory Theatre", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "132 West 22nd Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Lincoln Center Theater – Mitzi E. Newhouse Theater", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "150 West 65th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Lincoln Center Theater – Claire Tow Theater", district: "off_off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "150 West 65th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Lucille Lortel Theatre", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "121 Christopher Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Manhattan Theatre Club – City Center Stage II", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "131 West 55th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "New York City Center", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "131 West 55th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "New York Theatre Workshop", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "83 East 4th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Playhouse 46 at St. Luke's", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "308 West 46th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Playwrights Horizons", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "416 West 42nd Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Pershing Square Signature Center", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "480 West 42nd Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "The Public Theater", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "425 Lafayette Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Delacorte Theater", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "Central Park, West 81st Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Rattlestick Playwrights Theater", district: "off_off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "224 Waverly Place", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Roundabout – Laura Pels Theatre", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "111 West 46th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "MCC Theater", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "511 West 52nd Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Second Stage Theatre – Tony Kiser Theater", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "305 West 43rd Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Urban Stages", district: "off_off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "259 West 30th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Vineyard Theatre", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "108 East 15th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "WP Theater", district: "off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "2162 Broadway", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },

  // ── Brooklyn Off-Broadway ─────────────────────────────────────────────────
  { name: "BAM Howard Gilman Opera House", district: "off_broadway", city: "Brooklyn", state: "NY", country: "USA", addressLine1: "30 Lafayette Avenue", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "BAM Harvey Theater", district: "off_broadway", city: "Brooklyn", state: "NY", country: "USA", addressLine1: "651 Fulton Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "BAM Fisher", district: "off_broadway", city: "Brooklyn", state: "NY", country: "USA", addressLine1: "321 Ashland Place", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "St. Ann's Warehouse", district: "off_broadway", city: "Brooklyn", state: "NY", country: "USA", addressLine1: "45 Water Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Theatre for a New Audience", district: "off_broadway", city: "Brooklyn", state: "NY", country: "USA", addressLine1: "262 Ashland Place", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },

  // ── Off-Off-Broadway ──────────────────────────────────────────────────────
  { name: "La MaMa E.T.C.", district: "off_off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "74A East 4th Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Ensemble Studio Theatre", district: "off_off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "549 West 52nd Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Dixon Place", district: "off_off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "161 Chrystie Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Flea Theater", district: "off_off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "20 Thomas Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "The New Ohio Theatre", district: "off_off_broadway", city: "New York", state: "NY", country: "USA", addressLine1: "154 Christopher Street", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
  { name: "The Brick Theater", district: "off_off_broadway", city: "Brooklyn", state: "NY", country: "USA", addressLine1: "579 Metropolitan Avenue", source: "offbroadway_alliance", sourceUrl: OBA_SOURCE_URL, ingestionConfidence: "high" },
];

// ─── Regional & Touring Theatres (National) ───────────────────────────────────
export const REGIONAL_VENUES: SeedVenue[] = [
  // ── Chicago, IL ──────────────────────────────────────────────────────────
  { name: "Steppenwolf Theatre", district: "regional", city: "Chicago", state: "IL", country: "USA", addressLine1: "1650 N Halsted Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Goodman Theatre", district: "regional", city: "Chicago", state: "IL", country: "USA", addressLine1: "170 N Dearborn Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Chicago Shakespeare Theater", district: "regional", city: "Chicago", state: "IL", country: "USA", addressLine1: "800 E Grand Avenue", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "CIBC Theatre", district: "touring", city: "Chicago", state: "IL", country: "USA", addressLine1: "18 W Monroe Street", source: "manual_curation", sourceUrl: "https://www.broadwayinchicago.com", ingestionConfidence: "high" },
  { name: "Cadillac Palace Theatre", district: "touring", city: "Chicago", state: "IL", country: "USA", addressLine1: "151 W Randolph Street", source: "manual_curation", sourceUrl: "https://www.broadwayinchicago.com", ingestionConfidence: "high" },
  { name: "Bank of America Theatre", district: "touring", city: "Chicago", state: "IL", country: "USA", addressLine1: "18 W Monroe Street", source: "manual_curation", sourceUrl: "https://www.broadwayinchicago.com", ingestionConfidence: "high" },
  { name: "Auditorium Theatre", district: "touring", city: "Chicago", state: "IL", country: "USA", addressLine1: "50 E Ida B. Wells Drive", source: "manual_curation", sourceUrl: "https://auditoriumtheatre.org", ingestionConfidence: "high" },
  { name: "Court Theatre", district: "regional", city: "Chicago", state: "IL", country: "USA", addressLine1: "5535 S Ellis Avenue", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Lookingglass Theatre", district: "regional", city: "Chicago", state: "IL", country: "USA", addressLine1: "821 N Michigan Avenue", source: "manual_curation", sourceUrl: "https://lookingglasstheatre.org", ingestionConfidence: "high" },
  { name: "Northlight Theatre", district: "regional", city: "Skokie", state: "IL", country: "USA", addressLine1: "9501 Skokie Boulevard", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Los Angeles, CA ───────────────────────────────────────────────────────
  { name: "Hollywood Pantages Theatre", district: "touring", city: "Los Angeles", state: "CA", country: "USA", addressLine1: "6233 Hollywood Boulevard", source: "manual_curation", sourceUrl: "https://www.hollywoodpantages.com", ingestionConfidence: "high" },
  { name: "Ahmanson Theatre", district: "touring", city: "Los Angeles", state: "CA", country: "USA", addressLine1: "135 N Grand Avenue", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Mark Taper Forum", district: "regional", city: "Los Angeles", state: "CA", country: "USA", addressLine1: "135 N Grand Avenue", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Kirk Douglas Theatre", district: "regional", city: "Culver City", state: "CA", country: "USA", addressLine1: "9820 Washington Boulevard", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Geffen Playhouse", district: "regional", city: "Los Angeles", state: "CA", country: "USA", addressLine1: "10886 Le Conte Avenue", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Pasadena Playhouse", district: "regional", city: "Pasadena", state: "CA", country: "USA", addressLine1: "39 S El Molino Avenue", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "The Wallis", district: "regional", city: "Beverly Hills", state: "CA", country: "USA", addressLine1: "9390 N Santa Monica Boulevard", source: "manual_curation", sourceUrl: "https://thewallis.org", ingestionConfidence: "high" },
  { name: "South Coast Repertory", district: "regional", city: "Costa Mesa", state: "CA", country: "USA", addressLine1: "655 Town Center Drive", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "La Jolla Playhouse", district: "regional", city: "La Jolla", state: "CA", country: "USA", addressLine1: "2910 La Jolla Village Drive", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── San Francisco / Bay Area, CA ──────────────────────────────────────────
  { name: "American Conservatory Theater", district: "regional", city: "San Francisco", state: "CA", country: "USA", addressLine1: "415 Geary Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "ACT – The Strand Theater", district: "regional", city: "San Francisco", state: "CA", country: "USA", addressLine1: "1127 Market Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Orpheum Theatre", district: "touring", city: "San Francisco", state: "CA", country: "USA", addressLine1: "1192 Market Street", source: "manual_curation", sourceUrl: "https://www.shnsf.com", ingestionConfidence: "high" },
  { name: "Golden Gate Theatre", district: "touring", city: "San Francisco", state: "CA", country: "USA", addressLine1: "1 Taylor Street", source: "manual_curation", sourceUrl: "https://www.shnsf.com", ingestionConfidence: "high" },
  { name: "Berkeley Repertory Theatre – Roda Theatre", district: "regional", city: "Berkeley", state: "CA", country: "USA", addressLine1: "2015 Addison Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Berkeley Repertory Theatre – Peet's Theatre", district: "regional", city: "Berkeley", state: "CA", country: "USA", addressLine1: "2025 Addison Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "TheatreWorks Silicon Valley", district: "regional", city: "Redwood City", state: "CA", country: "USA", addressLine1: "1071 Middlefield Road", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── San Diego, CA ─────────────────────────────────────────────────────────
  { name: "The Old Globe", district: "regional", city: "San Diego", state: "CA", country: "USA", addressLine1: "1363 Old Globe Way", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "San Diego Civic Theatre", district: "touring", city: "San Diego", state: "CA", country: "USA", addressLine1: "1100 Third Avenue", source: "manual_curation", sourceUrl: "https://www.broadwaysd.com", ingestionConfidence: "high" },

  // ── Sacramento, CA ────────────────────────────────────────────────────────
  { name: "Sacramento Community Center Theater", district: "touring", city: "Sacramento", state: "CA", country: "USA", addressLine1: "1301 L Street", source: "manual_curation", sourceUrl: "https://www.broadwaysacramento.com", ingestionConfidence: "high" },
  { name: "B Street Theatre", district: "regional", city: "Sacramento", state: "CA", country: "USA", addressLine1: "2711 B Street", source: "manual_curation", sourceUrl: "https://bstreettheatre.org", ingestionConfidence: "high" },

  // ── Seattle, WA ───────────────────────────────────────────────────────────
  { name: "The 5th Avenue Theatre", district: "regional", city: "Seattle", state: "WA", country: "USA", addressLine1: "1308 5th Avenue", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Paramount Theatre", district: "touring", city: "Seattle", state: "WA", country: "USA", addressLine1: "911 Pine Street", source: "manual_curation", sourceUrl: "https://www.stgpresents.org", ingestionConfidence: "high" },
  { name: "Seattle Repertory Theatre", district: "regional", city: "Seattle", state: "WA", country: "USA", addressLine1: "155 Mercer Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "ACT Theatre", district: "regional", city: "Seattle", state: "WA", country: "USA", addressLine1: "700 Union Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Portland, OR ──────────────────────────────────────────────────────────
  { name: "Portland Center Stage at The Armory", district: "regional", city: "Portland", state: "OR", country: "USA", addressLine1: "128 NW 11th Avenue", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Keller Auditorium", district: "touring", city: "Portland", state: "OR", country: "USA", addressLine1: "222 SW Clay Street", source: "manual_curation", sourceUrl: "https://www.portland5.com", ingestionConfidence: "high" },
  { name: "Artists Repertory Theatre", district: "regional", city: "Portland", state: "OR", country: "USA", addressLine1: "1515 SW Morrison Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Ashland, OR ───────────────────────────────────────────────────────────
  { name: "Oregon Shakespeare Festival – Angus Bowmer Theatre", district: "regional", city: "Ashland", state: "OR", country: "USA", addressLine1: "15 S Pioneer Street", source: "manual_curation", sourceUrl: "https://www.osfashland.org", ingestionConfidence: "high" },
  { name: "Oregon Shakespeare Festival – Thomas Theatre", district: "regional", city: "Ashland", state: "OR", country: "USA", addressLine1: "15 S Pioneer Street", source: "manual_curation", sourceUrl: "https://www.osfashland.org", ingestionConfidence: "high" },
  { name: "Oregon Shakespeare Festival – Elizabethan Stage", district: "regional", city: "Ashland", state: "OR", country: "USA", addressLine1: "15 S Pioneer Street", source: "manual_curation", sourceUrl: "https://www.osfashland.org", ingestionConfidence: "high" },

  // ── Washington, DC ────────────────────────────────────────────────────────
  { name: "Kennedy Center – Opera House", district: "touring", city: "Washington", state: "DC", country: "USA", addressLine1: "2700 F Street NW", source: "manual_curation", sourceUrl: "https://www.kennedy-center.org", ingestionConfidence: "high" },
  { name: "Kennedy Center – Eisenhower Theater", district: "regional", city: "Washington", state: "DC", country: "USA", addressLine1: "2700 F Street NW", source: "manual_curation", sourceUrl: "https://www.kennedy-center.org", ingestionConfidence: "high" },
  { name: "Kennedy Center – Terrace Theater", district: "regional", city: "Washington", state: "DC", country: "USA", addressLine1: "2700 F Street NW", source: "manual_curation", sourceUrl: "https://www.kennedy-center.org", ingestionConfidence: "high" },
  { name: "Arena Stage – Fichandler Stage", district: "regional", city: "Washington", state: "DC", country: "USA", addressLine1: "1101 6th Street SW", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Arena Stage – Kreeger Theater", district: "regional", city: "Washington", state: "DC", country: "USA", addressLine1: "1101 6th Street SW", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Shakespeare Theatre Company – Sidney Harman Hall", district: "regional", city: "Washington", state: "DC", country: "USA", addressLine1: "610 F Street NW", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Shakespeare Theatre Company – Lansburgh Theatre", district: "regional", city: "Washington", state: "DC", country: "USA", addressLine1: "450 7th Street NW", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Ford's Theatre", district: "regional", city: "Washington", state: "DC", country: "USA", addressLine1: "511 10th Street NW", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "National Theatre", district: "touring", city: "Washington", state: "DC", country: "USA", addressLine1: "1321 Pennsylvania Avenue NW", source: "manual_curation", sourceUrl: "https://www.nationaltheatre.org", ingestionConfidence: "high" },
  { name: "Studio Theatre", district: "regional", city: "Washington", state: "DC", country: "USA", addressLine1: "1501 14th Street NW", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Woolly Mammoth Theatre", district: "regional", city: "Washington", state: "DC", country: "USA", addressLine1: "641 D Street NW", source: "manual_curation", sourceUrl: "https://www.woollymammoth.net", ingestionConfidence: "high" },
  { name: "Signature Theatre", district: "regional", city: "Arlington", state: "VA", country: "USA", addressLine1: "4200 Campbell Avenue", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Round House Theatre", district: "regional", city: "Bethesda", state: "MD", country: "USA", addressLine1: "4545 East-West Highway", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Boston / Cambridge, MA ────────────────────────────────────────────────
  { name: "Citizens Bank Opera House", district: "touring", city: "Boston", state: "MA", country: "USA", addressLine1: "539 Washington Street", source: "manual_curation", sourceUrl: "https://www.bostonoperahouse.com", ingestionConfidence: "high" },
  { name: "Wang Theatre", district: "touring", city: "Boston", state: "MA", country: "USA", addressLine1: "270 Tremont Street", source: "manual_curation", sourceUrl: "https://www.bochcenter.org", ingestionConfidence: "high" },
  { name: "Shubert Theatre", district: "touring", city: "Boston", state: "MA", country: "USA", addressLine1: "265 Tremont Street", source: "manual_curation", sourceUrl: "https://www.bochcenter.org", ingestionConfidence: "high" },
  { name: "American Repertory Theater", district: "regional", city: "Cambridge", state: "MA", country: "USA", addressLine1: "64 Brattle Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Huntington Theatre", district: "regional", city: "Boston", state: "MA", country: "USA", addressLine1: "264 Huntington Avenue", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Pittsfield / Williamstown, MA (Berkshires) ────────────────────────────
  { name: "Barrington Stage Company", district: "regional", city: "Pittsfield", state: "MA", country: "USA", addressLine1: "30 Union Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Williamstown Theatre Festival", district: "regional", city: "Williamstown", state: "MA", country: "USA", addressLine1: "1000 Main Street", source: "manual_curation", sourceUrl: "https://wtfestival.org", ingestionConfidence: "high" },

  // ── Providence, RI ────────────────────────────────────────────────────────
  { name: "Trinity Repertory Company", district: "regional", city: "Providence", state: "RI", country: "USA", addressLine1: "201 Washington Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Providence Performing Arts Center", district: "touring", city: "Providence", state: "RI", country: "USA", addressLine1: "220 Weybosset Street", source: "manual_curation", sourceUrl: "https://www.ppacri.org", ingestionConfidence: "high" },

  // ── Hartford, CT ──────────────────────────────────────────────────────────
  { name: "Hartford Stage", district: "regional", city: "Hartford", state: "CT", country: "USA", addressLine1: "50 Church Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "The Bushnell", district: "touring", city: "Hartford", state: "CT", country: "USA", addressLine1: "166 Capitol Avenue", source: "manual_curation", sourceUrl: "https://www.bushnell.org", ingestionConfidence: "high" },

  // ── New Haven, CT ─────────────────────────────────────────────────────────
  { name: "Yale Repertory Theatre", district: "regional", city: "New Haven", state: "CT", country: "USA", addressLine1: "1120 Chapel Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Shubert Theatre New Haven", district: "touring", city: "New Haven", state: "CT", country: "USA", addressLine1: "247 College Street", source: "manual_curation", sourceUrl: "https://www.shubert.com", ingestionConfidence: "high" },
  { name: "Long Wharf Theatre", district: "regional", city: "New Haven", state: "CT", country: "USA", addressLine1: "222 Sargent Drive", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── East Haddam, CT ───────────────────────────────────────────────────────
  { name: "Goodspeed Musicals", district: "regional", city: "East Haddam", state: "CT", country: "USA", addressLine1: "6 Main Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Westport, CT ─────────────────────────────────────────────────────────
  { name: "Westport Country Playhouse", district: "regional", city: "Westport", state: "CT", country: "USA", addressLine1: "25 Powers Court", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Princeton / New Brunswick / Red Bank, NJ ─────────────────────────────
  { name: "McCarter Theatre", district: "regional", city: "Princeton", state: "NJ", country: "USA", addressLine1: "91 University Place", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "George Street Playhouse", district: "regional", city: "New Brunswick", state: "NJ", country: "USA", addressLine1: "103 College Farm Road", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Two River Theater", district: "regional", city: "Red Bank", state: "NJ", country: "USA", addressLine1: "21 Bridge Avenue", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Upstate New York ──────────────────────────────────────────────────────
  { name: "Geva Theatre Center", district: "regional", city: "Rochester", state: "NY", country: "USA", addressLine1: "75 Woodbury Boulevard", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Syracuse Stage", district: "regional", city: "Syracuse", state: "NY", country: "USA", addressLine1: "820 E Genesee Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Capital Repertory Theatre", district: "regional", city: "Albany", state: "NY", country: "USA", addressLine1: "251 N Pearl Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Philadelphia, PA ──────────────────────────────────────────────────────
  { name: "Academy of Music", district: "touring", city: "Philadelphia", state: "PA", country: "USA", addressLine1: "240 S Broad Street", source: "manual_curation", sourceUrl: "https://www.kimmelculturalcampus.org", ingestionConfidence: "high" },
  { name: "Merriam Theater", district: "touring", city: "Philadelphia", state: "PA", country: "USA", addressLine1: "250 S Broad Street", source: "manual_curation", sourceUrl: "https://www.kimmelculturalcampus.org", ingestionConfidence: "high" },
  { name: "Perelman Theater", district: "regional", city: "Philadelphia", state: "PA", country: "USA", addressLine1: "300 S Broad Street", source: "manual_curation", sourceUrl: "https://www.kimmelculturalcampus.org", ingestionConfidence: "high" },
  { name: "Walnut Street Theatre", district: "regional", city: "Philadelphia", state: "PA", country: "USA", addressLine1: "825 Walnut Street", source: "manual_curation", sourceUrl: "https://www.walnutstreettheatre.org", ingestionConfidence: "high" },
  { name: "Arden Theatre Company", district: "regional", city: "Philadelphia", state: "PA", country: "USA", addressLine1: "40 N 2nd Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Wilma Theater", district: "regional", city: "Philadelphia", state: "PA", country: "USA", addressLine1: "265 S Broad Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Philadelphia Theatre Company", district: "regional", city: "Philadelphia", state: "PA", country: "USA", addressLine1: "480 S Broad Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Pittsburgh, PA ────────────────────────────────────────────────────────
  { name: "Benedum Center", district: "touring", city: "Pittsburgh", state: "PA", country: "USA", addressLine1: "719 Liberty Avenue", source: "manual_curation", sourceUrl: "https://www.trustarts.org", ingestionConfidence: "high" },
  { name: "Byham Theater", district: "touring", city: "Pittsburgh", state: "PA", country: "USA", addressLine1: "101 6th Street", source: "manual_curation", sourceUrl: "https://www.trustarts.org", ingestionConfidence: "high" },
  { name: "Pittsburgh Public Theater", district: "regional", city: "Pittsburgh", state: "PA", country: "USA", addressLine1: "621 Penn Avenue", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "City Theatre Company", district: "regional", city: "Pittsburgh", state: "PA", country: "USA", addressLine1: "1300 Bingham Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Wilmington, DE ────────────────────────────────────────────────────────
  { name: "Delaware Theatre Company", district: "regional", city: "Wilmington", state: "DE", country: "USA", addressLine1: "200 Water Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Baltimore, MD ─────────────────────────────────────────────────────────
  { name: "Hippodrome Theatre", district: "touring", city: "Baltimore", state: "MD", country: "USA", addressLine1: "12 N Eutaw Street", source: "manual_curation", sourceUrl: "https://www.france-merrickpac.com", ingestionConfidence: "high" },
  { name: "Everyman Theatre", district: "regional", city: "Baltimore", state: "MD", country: "USA", addressLine1: "315 W Fayette Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Center Stage", district: "regional", city: "Baltimore", state: "MD", country: "USA", addressLine1: "700 N Calvert Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Minneapolis, MN ───────────────────────────────────────────────────────
  { name: "Guthrie Theater", district: "regional", city: "Minneapolis", state: "MN", country: "USA", addressLine1: "818 S 2nd Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Orpheum Theatre Minneapolis", district: "touring", city: "Minneapolis", state: "MN", country: "USA", addressLine1: "910 Hennepin Avenue", source: "manual_curation", sourceUrl: "https://www.hennepintheatretrust.org", ingestionConfidence: "high" },
  { name: "State Theatre Minneapolis", district: "touring", city: "Minneapolis", state: "MN", country: "USA", addressLine1: "805 Hennepin Avenue", source: "manual_curation", sourceUrl: "https://www.hennepintheatretrust.org", ingestionConfidence: "high" },
  { name: "Pantages Theatre Minneapolis", district: "regional", city: "Minneapolis", state: "MN", country: "USA", addressLine1: "710 Hennepin Avenue", source: "manual_curation", sourceUrl: "https://www.hennepintheatretrust.org", ingestionConfidence: "high" },
  { name: "Children's Theatre Company", district: "regional", city: "Minneapolis", state: "MN", country: "USA", addressLine1: "2400 3rd Avenue S", source: "manual_curation", sourceUrl: "https://childrenstheatre.org", ingestionConfidence: "high" },

  // ── Milwaukee, WI ─────────────────────────────────────────────────────────
  { name: "Milwaukee Repertory Theater", district: "regional", city: "Milwaukee", state: "WI", country: "USA", addressLine1: "108 E Wells Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Skylight Music Theatre", district: "regional", city: "Milwaukee", state: "WI", country: "USA", addressLine1: "158 N Broadway", source: "manual_curation", sourceUrl: "https://skylightmusictheatre.org", ingestionConfidence: "high" },
  { name: "Marcus Performing Arts Center – Uihlein Hall", district: "touring", city: "Milwaukee", state: "WI", country: "USA", addressLine1: "929 N Water Street", source: "manual_curation", sourceUrl: "https://www.marcuscenter.org", ingestionConfidence: "high" },

  // ── Cleveland, OH (Playhouse Square) ─────────────────────────────────────
  { name: "KeyBank State Theatre", district: "touring", city: "Cleveland", state: "OH", country: "USA", addressLine1: "1519 Euclid Avenue", source: "manual_curation", sourceUrl: "https://www.playhousesquare.org", ingestionConfidence: "high" },
  { name: "Connor Palace", district: "touring", city: "Cleveland", state: "OH", country: "USA", addressLine1: "1615 Euclid Avenue", source: "manual_curation", sourceUrl: "https://www.playhousesquare.org", ingestionConfidence: "high" },
  { name: "Ohio Theatre Cleveland", district: "touring", city: "Cleveland", state: "OH", country: "USA", addressLine1: "1511 Euclid Avenue", source: "manual_curation", sourceUrl: "https://www.playhousesquare.org", ingestionConfidence: "high" },
  { name: "Allen Theatre", district: "regional", city: "Cleveland", state: "OH", country: "USA", addressLine1: "1407 Euclid Avenue", source: "manual_curation", sourceUrl: "https://www.playhousesquare.org", ingestionConfidence: "high" },
  { name: "Hanna Theatre", district: "regional", city: "Cleveland", state: "OH", country: "USA", addressLine1: "2067 E 14th Street", source: "manual_curation", sourceUrl: "https://www.playhousesquare.org", ingestionConfidence: "high" },
  { name: "Kennedy's Cabaret", district: "regional", city: "Cleveland", state: "OH", country: "USA", addressLine1: "1553 Euclid Avenue", source: "manual_curation", sourceUrl: "https://www.playhousesquare.org", ingestionConfidence: "high" },
  { name: "Great Lakes Theater", district: "regional", city: "Cleveland", state: "OH", country: "USA", addressLine1: "1407 Euclid Avenue", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Cleveland Play House", district: "regional", city: "Cleveland", state: "OH", country: "USA", addressLine1: "1407 Euclid Avenue", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Columbus, OH ──────────────────────────────────────────────────────────
  { name: "Ohio Theatre", district: "touring", city: "Columbus", state: "OH", country: "USA", addressLine1: "39 E State Street", source: "manual_curation", sourceUrl: "https://www.capa.com/ohio-theatre", ingestionConfidence: "high" },
  { name: "Palace Theatre Columbus", district: "touring", city: "Columbus", state: "OH", country: "USA", addressLine1: "34 W Broad Street", source: "manual_curation", sourceUrl: "https://www.capa.com", ingestionConfidence: "high" },
  { name: "Southern Theatre", district: "regional", city: "Columbus", state: "OH", country: "USA", addressLine1: "21 E Main Street", source: "manual_curation", sourceUrl: "https://www.capa.com", ingestionConfidence: "high" },
  { name: "Lincoln Theatre Columbus", district: "regional", city: "Columbus", state: "OH", country: "USA", addressLine1: "769 E Long Street", source: "manual_curation", sourceUrl: "https://www.capa.com", ingestionConfidence: "high" },

  // ── Cincinnati, OH ────────────────────────────────────────────────────────
  { name: "Aronoff Center – Procter & Gamble Hall", district: "touring", city: "Cincinnati", state: "OH", country: "USA", addressLine1: "650 Walnut Street", source: "manual_curation", sourceUrl: "https://www.cincinnatiarts.org", ingestionConfidence: "high" },
  { name: "Aronoff Center – Jarson-Kaplan Theater", district: "regional", city: "Cincinnati", state: "OH", country: "USA", addressLine1: "650 Walnut Street", source: "manual_curation", sourceUrl: "https://www.cincinnatiarts.org", ingestionConfidence: "high" },
  { name: "Cincinnati Playhouse in the Park", district: "regional", city: "Cincinnati", state: "OH", country: "USA", addressLine1: "962 Mt. Adams Circle", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Ensemble Theatre Cincinnati", district: "regional", city: "Cincinnati", state: "OH", country: "USA", addressLine1: "1127 Vine Street", source: "manual_curation", sourceUrl: "https://www.ensemblecincinnati.org", ingestionConfidence: "high" },

  // ── Detroit, MI ───────────────────────────────────────────────────────────
  { name: "Fox Theatre Detroit", district: "touring", city: "Detroit", state: "MI", country: "USA", addressLine1: "2211 Woodward Avenue", source: "manual_curation", sourceUrl: "https://www.313presents.com", ingestionConfidence: "high" },
  { name: "Fisher Theatre", district: "touring", city: "Detroit", state: "MI", country: "USA", addressLine1: "3011 W Grand Boulevard", source: "manual_curation", sourceUrl: "https://www.nederlander.com", ingestionConfidence: "high" },
  { name: "Detroit Opera House", district: "touring", city: "Detroit", state: "MI", country: "USA", addressLine1: "1526 Broadway Street", source: "manual_curation", sourceUrl: "https://michiganopera.org", ingestionConfidence: "high" },
  { name: "Masonic Temple Theatre", district: "touring", city: "Detroit", state: "MI", country: "USA", addressLine1: "500 Temple Street", source: "manual_curation", sourceUrl: "https://www.themasonic.com", ingestionConfidence: "high" },
  { name: "Detroit Repertory Theatre", district: "regional", city: "Detroit", state: "MI", country: "USA", addressLine1: "13103 Woodrow Wilson Avenue", source: "manual_curation", sourceUrl: "https://www.detroitreptheatre.com", ingestionConfidence: "high" },
  { name: "Meadow Brook Theatre", district: "regional", city: "Rochester", state: "MI", country: "USA", addressLine1: "207 Wilson Hall", source: "manual_curation", sourceUrl: "https://www.mbtheatre.com", ingestionConfidence: "high" },

  // ── Indianapolis, IN ──────────────────────────────────────────────────────
  { name: "Indiana Repertory Theatre", district: "regional", city: "Indianapolis", state: "IN", country: "USA", addressLine1: "140 W Washington Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Murat Theatre", district: "touring", city: "Indianapolis", state: "IN", country: "USA", addressLine1: "502 N New Jersey Street", source: "manual_curation", sourceUrl: "https://www.broadwayinindianapolis.com", ingestionConfidence: "high" },

  // ── Louisville, KY ────────────────────────────────────────────────────────
  { name: "Actors Theatre of Louisville", district: "regional", city: "Louisville", state: "KY", country: "USA", addressLine1: "316 W Main Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Whitney Hall Louisville", district: "touring", city: "Louisville", state: "KY", country: "USA", addressLine1: "501 W Main Street", source: "manual_curation", sourceUrl: "https://www.kentuckyperformingarts.org", ingestionConfidence: "high" },

  // ── Atlanta, GA ───────────────────────────────────────────────────────────
  { name: "Fox Theatre Atlanta", district: "touring", city: "Atlanta", state: "GA", country: "USA", addressLine1: "660 Peachtree Street NE", source: "manual_curation", sourceUrl: "https://www.foxtheatre.org", ingestionConfidence: "high" },
  { name: "Cobb Energy Performing Arts Centre", district: "touring", city: "Atlanta", state: "GA", country: "USA", addressLine1: "2800 Cobb Galleria Pkwy", source: "manual_curation", sourceUrl: "https://www.cobbenergycentre.com", ingestionConfidence: "high" },
  { name: "Alliance Theatre", district: "regional", city: "Atlanta", state: "GA", country: "USA", addressLine1: "1280 Peachtree Street NE", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Actor's Express", district: "regional", city: "Atlanta", state: "GA", country: "USA", addressLine1: "887 W Marietta Street NW", source: "manual_curation", sourceUrl: "https://www.actors-express.com", ingestionConfidence: "high" },

  // ── Nashville, TN ─────────────────────────────────────────────────────────
  { name: "Tennessee Performing Arts Center", district: "touring", city: "Nashville", state: "TN", country: "USA", addressLine1: "505 Deaderick Street", source: "manual_curation", sourceUrl: "https://www.tpac.org", ingestionConfidence: "high" },
  { name: "Tennessee Repertory Theatre", district: "regional", city: "Nashville", state: "TN", country: "USA", addressLine1: "505 Deaderick Street", source: "manual_curation", sourceUrl: "https://www.tnrep.org", ingestionConfidence: "high" },

  // ── Knoxville, TN ─────────────────────────────────────────────────────────
  { name: "Clarence Brown Theatre", district: "regional", city: "Knoxville", state: "TN", country: "USA", addressLine1: "1714 Andy Holt Avenue", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Memphis, TN ───────────────────────────────────────────────────────────
  { name: "Orpheum Theatre Memphis", district: "touring", city: "Memphis", state: "TN", country: "USA", addressLine1: "203 S Main Street", source: "manual_curation", sourceUrl: "https://www.orpheum-memphis.com", ingestionConfidence: "high" },
  { name: "Playhouse on the Square", district: "regional", city: "Memphis", state: "TN", country: "USA", addressLine1: "66 S Cooper Street", source: "manual_curation", sourceUrl: "https://www.playhouseonthesquare.org", ingestionConfidence: "high" },

  // ── Houston, TX ───────────────────────────────────────────────────────────
  { name: "Hobby Center – Sarofim Hall", district: "touring", city: "Houston", state: "TX", country: "USA", addressLine1: "800 Bagby Street", source: "manual_curation", sourceUrl: "https://www.thehobbycenter.org", ingestionConfidence: "high" },
  { name: "Hobby Center – Zilkha Hall", district: "regional", city: "Houston", state: "TX", country: "USA", addressLine1: "800 Bagby Street", source: "manual_curation", sourceUrl: "https://www.thehobbycenter.org", ingestionConfidence: "high" },
  { name: "Alley Theatre", district: "regional", city: "Houston", state: "TX", country: "USA", addressLine1: "615 Texas Avenue", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Dallas / Fort Worth, TX ───────────────────────────────────────────────
  { name: "Music Hall at Fair Park", district: "touring", city: "Dallas", state: "TX", country: "USA", addressLine1: "909 1st Avenue", source: "manual_curation", sourceUrl: "https://www.dallassummermusicals.org", ingestionConfidence: "high" },
  { name: "Winspear Opera House", district: "touring", city: "Dallas", state: "TX", country: "USA", addressLine1: "2403 Flora Street", source: "manual_curation", sourceUrl: "https://www.attpac.org", ingestionConfidence: "high" },
  { name: "Dee and Charles Wyly Theatre", district: "regional", city: "Dallas", state: "TX", country: "USA", addressLine1: "2400 Flora Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Bass Performance Hall", district: "touring", city: "Fort Worth", state: "TX", country: "USA", addressLine1: "525 Commerce Street", source: "manual_curation", sourceUrl: "https://www.basshall.com", ingestionConfidence: "high" },

  // ── Austin, TX ────────────────────────────────────────────────────────────
  { name: "Paramount Theatre Austin", district: "touring", city: "Austin", state: "TX", country: "USA", addressLine1: "713 Congress Avenue", source: "manual_curation", sourceUrl: "https://www.austintheatre.org", ingestionConfidence: "high" },
  { name: "ZACH Theatre", district: "regional", city: "Austin", state: "TX", country: "USA", addressLine1: "202 S Lamar Boulevard", source: "manual_curation", sourceUrl: "https://www.zachtheatre.org", ingestionConfidence: "high" },

  // ── Denver, CO ────────────────────────────────────────────────────────────
  { name: "Buell Theatre", district: "touring", city: "Denver", state: "CO", country: "USA", addressLine1: "1350 Curtis Street", source: "manual_curation", sourceUrl: "https://www.denvercenter.org", ingestionConfidence: "high" },
  { name: "Ellie Caulkins Opera House", district: "touring", city: "Denver", state: "CO", country: "USA", addressLine1: "1400 Curtis Street", source: "manual_curation", sourceUrl: "https://www.denvercenter.org", ingestionConfidence: "high" },
  { name: "Denver Center for the Performing Arts", district: "regional", city: "Denver", state: "CO", country: "USA", addressLine1: "1101 13th Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Salt Lake City, UT ────────────────────────────────────────────────────
  { name: "Pioneer Theatre Company", district: "regional", city: "Salt Lake City", state: "UT", country: "USA", addressLine1: "300 S 1400 E", source: "manual_curation", sourceUrl: "https://www.pioneertheatre.org", ingestionConfidence: "high" },
  { name: "Eccles Theater", district: "touring", city: "Salt Lake City", state: "UT", country: "USA", addressLine1: "131 S Main Street", source: "manual_curation", sourceUrl: "https://www.ecclestheatre.org", ingestionConfidence: "high" },

  // ── Cedar City, UT ────────────────────────────────────────────────────────
  { name: "Utah Shakespeare Festival", district: "regional", city: "Cedar City", state: "UT", country: "USA", addressLine1: "351 W Center Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Phoenix / Tempe, AZ ───────────────────────────────────────────────────
  { name: "Orpheum Theatre Phoenix", district: "touring", city: "Phoenix", state: "AZ", country: "USA", addressLine1: "203 W Adams Street", source: "manual_curation", sourceUrl: "https://www.phoenixconventioncenter.com", ingestionConfidence: "high" },
  { name: "Herberger Theater Center", district: "regional", city: "Phoenix", state: "AZ", country: "USA", addressLine1: "222 E Monroe Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Arizona Theatre Company", district: "regional", city: "Phoenix", state: "AZ", country: "USA", addressLine1: "222 E Monroe Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Tempe Center for the Arts", district: "regional", city: "Tempe", state: "AZ", country: "USA", addressLine1: "700 W Rio Salado Pkwy", source: "manual_curation", sourceUrl: "https://www.tempe.gov/tca", ingestionConfidence: "high" },

  // ── Las Vegas, NV ─────────────────────────────────────────────────────────
  { name: "Smith Center for the Performing Arts", district: "touring", city: "Las Vegas", state: "NV", country: "USA", addressLine1: "361 Symphony Park Avenue", source: "manual_curation", sourceUrl: "https://www.thesmithcenter.com", ingestionConfidence: "high" },

  // ── Albuquerque, NM ───────────────────────────────────────────────────────
  { name: "KiMo Theatre", district: "regional", city: "Albuquerque", state: "NM", country: "USA", addressLine1: "423 Central Avenue NW", source: "manual_curation", sourceUrl: "https://www.kimotickets.com", ingestionConfidence: "high" },
  { name: "Popejoy Hall", district: "touring", city: "Albuquerque", state: "NM", country: "USA", addressLine1: "203 Cornell Drive NE", source: "manual_curation", sourceUrl: "https://popejoypresents.com", ingestionConfidence: "high" },

  // ── St. Louis, MO ─────────────────────────────────────────────────────────
  { name: "Fox Theatre St. Louis", district: "touring", city: "St. Louis", state: "MO", country: "USA", addressLine1: "527 N Grand Boulevard", source: "manual_curation", sourceUrl: "https://www.fabulousfox.com", ingestionConfidence: "high" },
  { name: "Repertory Theatre of St. Louis", district: "regional", city: "Webster Groves", state: "MO", country: "USA", addressLine1: "130 Edgar Road", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "The Muny", district: "regional", city: "St. Louis", state: "MO", country: "USA", addressLine1: "1 Theatre Drive, Forest Park", source: "manual_curation", sourceUrl: "https://www.muny.org", ingestionConfidence: "high" },

  // ── Kansas City, MO ───────────────────────────────────────────────────────
  { name: "Starlight Theatre Kansas City", district: "regional", city: "Kansas City", state: "MO", country: "USA", addressLine1: "4600 Starlight Road", source: "manual_curation", sourceUrl: "https://www.kcstarlight.com", ingestionConfidence: "high" },
  { name: "Kansas City Repertory Theatre", district: "regional", city: "Kansas City", state: "MO", country: "USA", addressLine1: "4949 Cherry Street", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Kauffman Center – Muriel Kauffman Theatre", district: "touring", city: "Kansas City", state: "MO", country: "USA", addressLine1: "1601 Broadway Boulevard", source: "manual_curation", sourceUrl: "https://www.kauffmancenter.org", ingestionConfidence: "high" },

  // ── Omaha, NE ─────────────────────────────────────────────────────────────
  { name: "Orpheum Theater Omaha", district: "touring", city: "Omaha", state: "NE", country: "USA", addressLine1: "409 S 16th Street", source: "manual_curation", sourceUrl: "https://www.omahaperformingarts.org", ingestionConfidence: "high" },
  { name: "Omaha Community Playhouse", district: "regional", city: "Omaha", state: "NE", country: "USA", addressLine1: "6915 Cass Street", source: "manual_curation", sourceUrl: "https://www.omahaplayhouse.com", ingestionConfidence: "high" },

  // ── New Orleans, LA ───────────────────────────────────────────────────────
  { name: "Saenger Theatre New Orleans", district: "touring", city: "New Orleans", state: "LA", country: "USA", addressLine1: "1111 Canal Street", source: "manual_curation", sourceUrl: "https://www.saengernola.com", ingestionConfidence: "high" },
  { name: "Mahalia Jackson Theater", district: "touring", city: "New Orleans", state: "LA", country: "USA", addressLine1: "1419 Basin Street", source: "manual_curation", sourceUrl: "https://www.mahaliajacksontheater.com", ingestionConfidence: "high" },
  { name: "Southern Rep Theatre", district: "regional", city: "New Orleans", state: "LA", country: "USA", addressLine1: "333 Canal Street", source: "manual_curation", sourceUrl: "https://www.southernrep.com", ingestionConfidence: "medium" },

  // ── Miami / South Florida ─────────────────────────────────────────────────
  { name: "Adrienne Arsht Center – Ziff Ballet Opera House", district: "touring", city: "Miami", state: "FL", country: "USA", addressLine1: "1300 Biscayne Boulevard", source: "manual_curation", sourceUrl: "https://www.arshtcenter.org", ingestionConfidence: "high" },
  { name: "Adrienne Arsht Center – Carnival Studio Theater", district: "regional", city: "Miami", state: "FL", country: "USA", addressLine1: "1300 Biscayne Boulevard", source: "manual_curation", sourceUrl: "https://www.arshtcenter.org", ingestionConfidence: "high" },
  { name: "Broward Center – Au-Rene Theater", district: "touring", city: "Fort Lauderdale", state: "FL", country: "USA", addressLine1: "201 SW 5th Avenue", source: "manual_curation", sourceUrl: "https://www.browardcenter.org", ingestionConfidence: "high" },
  { name: "Maltz Jupiter Theatre", district: "regional", city: "Jupiter", state: "FL", country: "USA", addressLine1: "1001 E Indiantown Road", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Sarasota, FL ──────────────────────────────────────────────────────────
  { name: "Asolo Repertory Theatre", district: "regional", city: "Sarasota", state: "FL", country: "USA", addressLine1: "5555 N Tamiami Trail", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "Florida Studio Theatre", district: "regional", city: "Sarasota", state: "FL", country: "USA", addressLine1: "1241 N Palm Avenue", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Naples, FL ────────────────────────────────────────────────────────────
  { name: "Gulfshore Playhouse", district: "regional", city: "Naples", state: "FL", country: "USA", addressLine1: "15 Gulfshore Blvd N", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Tampa / St. Petersburg, FL ────────────────────────────────────────────
  { name: "Straz Center – Carol Morsani Hall", district: "touring", city: "Tampa", state: "FL", country: "USA", addressLine1: "1010 N WC MacInnes Place", source: "manual_curation", sourceUrl: "https://www.strazcenter.org", ingestionConfidence: "high" },
  { name: "Straz Center – Ferguson Hall", district: "regional", city: "Tampa", state: "FL", country: "USA", addressLine1: "1010 N WC MacInnes Place", source: "manual_curation", sourceUrl: "https://www.strazcenter.org", ingestionConfidence: "high" },
  { name: "American Stage Theatre Company", district: "regional", city: "St. Petersburg", state: "FL", country: "USA", addressLine1: "163 3rd Street N", source: "manual_curation", sourceUrl: "https://www.americanstage.org", ingestionConfidence: "high" },

  // ── Orlando, FL ───────────────────────────────────────────────────────────
  { name: "Dr. Phillips Center – Walt Disney Theater", district: "touring", city: "Orlando", state: "FL", country: "USA", addressLine1: "445 S Magnolia Avenue", source: "manual_curation", sourceUrl: "https://www.drphillipscenter.org", ingestionConfidence: "high" },
  { name: "Orlando Repertory Theatre", district: "regional", city: "Orlando", state: "FL", country: "USA", addressLine1: "1001 E Princeton Street", source: "manual_curation", sourceUrl: "https://www.orlandorep.com", ingestionConfidence: "high" },

  // ── Charlotte, NC ─────────────────────────────────────────────────────────
  { name: "Blumenthal – Belk Theater", district: "touring", city: "Charlotte", state: "NC", country: "USA", addressLine1: "130 N Tryon Street", source: "manual_curation", sourceUrl: "https://www.blumenthalarts.org", ingestionConfidence: "high" },
  { name: "Blumenthal – Booth Playhouse", district: "regional", city: "Charlotte", state: "NC", country: "USA", addressLine1: "130 N Tryon Street", source: "manual_curation", sourceUrl: "https://www.blumenthalarts.org", ingestionConfidence: "high" },
  { name: "Actor's Theatre of Charlotte", district: "regional", city: "Charlotte", state: "NC", country: "USA", addressLine1: "650 E Stonewall Street", source: "manual_curation", sourceUrl: "https://www.actorstheatrecharlotte.org", ingestionConfidence: "high" },

  // ── Raleigh / Durham / Chapel Hill, NC ───────────────────────────────────
  { name: "PlayMakers Repertory Company", district: "regional", city: "Chapel Hill", state: "NC", country: "USA", addressLine1: "120 Country Club Road", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
  { name: "DPAC", district: "touring", city: "Durham", state: "NC", country: "USA", addressLine1: "123 Vivian Street", source: "manual_curation", sourceUrl: "https://www.dpacnc.com", ingestionConfidence: "high" },

  // ── Richmond, VA ──────────────────────────────────────────────────────────
  { name: "Virginia Repertory Theatre", district: "regional", city: "Richmond", state: "VA", country: "USA", addressLine1: "114 W Broad Street", source: "manual_curation", sourceUrl: "https://www.va-rep.org", ingestionConfidence: "high" },
  { name: "Carpenter Theatre", district: "touring", city: "Richmond", state: "VA", country: "USA", addressLine1: "600 E Grace Street", source: "manual_curation", sourceUrl: "https://www.etix.com", ingestionConfidence: "high" },

  // ── Montgomery, AL ────────────────────────────────────────────────────────
  { name: "Alabama Shakespeare Festival", district: "regional", city: "Montgomery", state: "AL", country: "USA", addressLine1: "1 Festival Drive", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },

  // ── Portland, ME ──────────────────────────────────────────────────────────
  { name: "Portland Stage Company", district: "regional", city: "Portland", state: "ME", country: "USA", addressLine1: "25A Forest Avenue", source: "lort_org", sourceUrl: LORT_SOURCE_URL, ingestionConfidence: "high" },
];

export const INITIAL_VENUE_SEED: SeedVenue[] = [
  ...BROADWAY_VENUES,
  ...OFF_BROADWAY_VENUES,
  ...REGIONAL_VENUES,
];
