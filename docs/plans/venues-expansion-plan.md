# Venues Expansion Plan

## Overview

The venues table serves as a canonical registry for physical theatre spaces, used for:
1. Auto-matching user-submitted theatre/city strings to a verified venue record (enabling map pins, deduplication, and data quality)
2. Powering live autocomplete in the Add Visit modal
3. Surfacing unmatched user-submitted locations for admin review

This plan covers four areas: seed data expansion, city name normalization, live venue search autocomplete, and an admin tab for unmatched locations.

---

## Part 1 — Venue Seed Expansion

### Approach

Seeds are run via `venues:seedInitialCatalogDev` (mutation) or `venues:seedInitialCatalog` (internal mutation). The upsert logic is already idempotent — re-running a seed safely patches existing records and inserts new ones. We will add two new seed batches to the `INITIAL_VENUE_SEED` array in `convex/venues.ts`.

After seeding, run the existing `venues:backfillVenueCoordinates` action to geocode any newly added venues without lat/lng.

### Batch 2 — Off-Broadway (NYC)

Complete list of commercial and not-for-profit Off-Broadway venues. Venues already present in Batch 1 are noted. Several Batch 1 addresses need correction (see notes).

**Address corrections from Batch 1:**
- `Anne L. Bernstein Theater`: our seed has `210 West 50th Street` — correct address is `1627 Broadway` (The Theater Center building)
- `Asylum NYC`: our seed has `123 E 24th Street` — correct address is `307 West 26th Street`

#### Commercial Off-Broadway

| Name | Address | District | Notes |
|------|---------|----------|-------|
| Actors Temple Theatre | 339 West 47th Street | off_broadway | |
| Astor Place Theatre | 434 Lafayette Street | off_broadway | ✓ Already in Batch 1 |
| Asylum NYC | 307 West 26th Street | off_off_broadway | ✓ Batch 1 (address fix needed) |
| Daryl Roth Theatre | 101 East 15th Street | off_broadway | |
| DR2 Theatre | 101 East 15th Street | off_off_broadway | Same building as Daryl Roth |
| The Duke on 42nd Street | 229 West 42nd Street | off_broadway | |
| Gene Frankel Theatre | 24 Bond Street | off_off_broadway | |
| Audible's Minetta Lane Theatre | 18 Minetta Lane | off_broadway | ✓ Already in Batch 1 |
| New World Stages | 340 West 50th Street | off_broadway | 5 stages (499/350/499/350/199) |
| Orpheum Theater | 126 Second Avenue | off_broadway | |
| The Players Theatre | 115 MacDougal Street | off_broadway | |
| The Riverside Theatre | 91 Claremont Avenue | off_broadway | Inside The Riverside Church |
| The Shed | 545 West 30th Street | off_broadway | Newer multi-use venue |
| Soho Playhouse | 15 Vandam Street | off_broadway | |
| Stage 42 | 422 West 42nd Street | off_broadway | |
| Theatre 80 | 80 St. Marks Place | off_off_broadway | |
| Theater 555 | 555 West 42nd Street | off_off_broadway | |
| Theatre at St. Clement's | 423 West 46th Street | off_off_broadway | |
| Jerry Orbach Theater | 1627 Broadway | off_broadway | Part of The Theater Center |
| Anne L. Bernstein Theater | 1627 Broadway | off_broadway | ✓ Batch 1 (address fix needed) |
| Westside Theatre – Upstairs | 407 West 43rd Street | off_broadway | |
| Westside Theatre – Downstairs | 407 West 43rd Street | off_broadway | |

#### Not-for-Profit Off-Broadway

| Name | Address | District | Notes |
|------|---------|----------|-------|
| 47th Street Theater | 304 West 47th Street | off_broadway | Puerto Rican Traveling Theatre |
| 59E59 Theaters | 59 East 59th Street | off_broadway | 3 spaces (195/97/50-70) |
| Abrons Arts Center | 466 Grand Street | off_broadway | Henry Street Settlement |
| AMT Theater | 354 West 45th Street | off_off_broadway | |
| Ars Nova | 511 West 54th Street | off_off_broadway | Also operates at 27 Barrow St |
| Atlantic Theater Company – Linda Gross Theater | 336 West 20th Street | off_broadway | ✓ Already in Batch 1 |
| Atlantic Stage 2 | 330 West 16th Street | off_broadway | ✓ Already in Batch 1 |
| Baryshnikov Arts Center | 450 West 37th Street | off_broadway | Jerome Robbins Theater (238 seats) |
| Cherry Lane Theatre | 38 Commerce Street | off_broadway | Oldest continually running OB theatre |
| Classic Stage Company | 136 East 13th Street | off_broadway | |
| HERE Arts Center | 145 Sixth Avenue | off_broadway | |
| Irish Repertory Theatre | 132 West 22nd Street | off_broadway | |
| Lincoln Center Theater – Mitzi E. Newhouse | 150 West 65th Street | off_broadway | |
| Lincoln Center Theater – Claire Tow | 150 West 65th Street | off_off_broadway | 112-seat black box |
| Lucille Lortel Theatre | 121 Christopher Street | off_broadway | |
| Manhattan Theatre Club – City Center Stage II | 131 West 55th Street | off_broadway | |
| New York City Center | 131 West 55th Street | off_broadway | Also hosts large-scale OB/special engagements |
| New York Theatre Workshop | 83 East 4th Street | off_broadway | |
| Playhouse 46 at St. Luke's | 308 West 46th Street | off_broadway | |
| Playwrights Horizons | 416 West 42nd Street | off_broadway | Mainstage + Peter Jay Sharp Theater |
| Pershing Square Signature Center | 480 West 42nd Street | off_broadway | 4 spaces (Irene Diamond, Romulus Linney, Alice Griffin Jewel Box, Ford Studio) |
| The Public Theater | 425 Lafayette Street | off_broadway | 5+ spaces; Newman Theater is the main |
| Delacorte Theater | Central Park, New York | off_broadway | The Public's outdoor Shakespeare venue |
| Rattlestick Playwrights Theater | 224 Waverly Place | off_off_broadway | |
| Roundabout – Laura Pels Theatre | 111 West 46th Street | off_broadway | |
| Roundabout – Black Box Theatre | 111 West 46th Street | off_off_broadway | |
| MCC Theater | 511 West 52nd Street | off_broadway | Robert W. Wilson MCC Theater Space |
| Second Stage Theatre – Tony Kiser Theater | 305 West 43rd Street | off_broadway | (2st's OB venue; Hayes Theater is their Broadway house) |
| Urban Stages | 259 West 30th Street | off_off_broadway | ✓ Already in Batch 1 (as "Bowery Palace" — needs review) |
| Vineyard Theatre | 108 East 15th Street | off_broadway | ✓ Already in Batch 1 |
| WP Theater | 2162 Broadway | off_broadway | ✓ Already in Batch 1 |

#### Brooklyn Off-Broadway

| Name | Address | District | Notes |
|------|---------|----------|-------|
| BAM Howard Gilman Opera House | 30 Lafayette Avenue, Brooklyn | off_broadway | ✓ Already in Batch 1 |
| BAM Harvey Theater | 651 Fulton Street, Brooklyn | off_broadway | Smaller BAM proscenium space |
| BAM Fisher | 321 Ashland Place, Brooklyn | off_broadway | Fishman Space + Gilbert Family Theatre |
| St. Ann's Warehouse | 45 Water Street, Brooklyn | off_broadway | |
| Theatre for a New Audience | 262 Ashland Place, Brooklyn | off_broadway | Polonsky Shakespeare Center |

#### Notable Off-Off Broadway

| Name | Address | District | Notes |
|------|---------|----------|-------|
| La MaMa E.T.C. | 74A East 4th Street | off_off_broadway | Historic experimental theatre |
| Ensemble Studio Theatre | 549 West 52nd Street | off_off_broadway | |
| Dixon Place | 161 Chrystie Street | off_off_broadway | |
| Flea Theater | 20 Thomas Street | off_off_broadway | |
| The New Ohio Theatre | 154 Christopher Street | off_off_broadway | |
| The Brick Theater | 579 Metropolitan Avenue, Brooklyn | off_off_broadway | |
| 54 Below | 254 West 54th Street | off_broadway | ✓ Already in Batch 1 — supper club/cabaret, not traditional OB |

---

### Batch 3 — National Regional Theatres

Organized by city. District is `regional` for all unless noted as `touring` (large presenter houses). Sources: LORT member directory, Broadway Across America presenter network, venue websites.

#### Chicago, IL

| Name | Address | District |
|------|---------|----------|
| Steppenwolf Theatre – Mainstage | 1650 N Halsted Street | regional |
| Steppenwolf Theatre – Endstage | 1650 N Halsted Street | regional |
| Goodman Theatre – Albert Theatre | 170 N Dearborn Street | regional |
| Goodman Theatre – Owen Theatre | 170 N Dearborn Street | regional |
| Chicago Shakespeare Theater | 800 E Grand Avenue (Navy Pier) | regional |
| CIBC Theatre | 18 W Monroe Street | touring |
| Cadillac Palace Theatre | 151 W Randolph Street | touring |
| Bank of America Theatre | 18 W Monroe Street | touring |
| Auditorium Theatre | 50 E Ida B. Wells Drive | touring |
| Court Theatre | 5535 S Ellis Avenue | regional |
| Lookingglass Theatre | 821 N Michigan Avenue | regional |
| Northlight Theatre | 9501 Skokie Blvd, Skokie | regional |

#### Los Angeles, CA

| Name | Address | District |
|------|---------|----------|
| Hollywood Pantages Theatre | 6233 Hollywood Boulevard | touring |
| Ahmanson Theatre | 135 N Grand Avenue | touring |
| Mark Taper Forum | 135 N Grand Avenue | regional |
| Kirk Douglas Theatre | 9820 Washington Blvd, Culver City | regional |
| Geffen Playhouse | 10886 Le Conte Avenue, Westwood | regional |
| Pasadena Playhouse | 39 S El Molino Avenue, Pasadena | regional |
| The Wallis | 9390 N Santa Monica Blvd, Beverly Hills | regional |
| South Coast Repertory | 655 Town Center Drive, Costa Mesa | regional |
| La Jolla Playhouse – Mandell Weiss Theatre | 2910 La Jolla Village Drive, La Jolla | regional |
| La Jolla Playhouse – Donald & Darlene Shiley Stage | 2910 La Jolla Village Drive, La Jolla | regional |

#### San Francisco / Bay Area, CA

| Name | Address | District |
|------|---------|----------|
| American Conservatory Theater – Geary Theater | 415 Geary Street, San Francisco | regional |
| American Conservatory Theater – Strand Theater | 1127 Market Street, San Francisco | regional |
| Orpheum Theatre | 1192 Market Street, San Francisco | touring |
| SHN Golden Gate Theatre | 1 Taylor Street, San Francisco | touring |
| Berkeley Repertory Theatre – Roda Theatre | 2015 Addison Street, Berkeley | regional |
| Berkeley Repertory Theatre – Peet's Theatre | 2025 Addison Street, Berkeley | regional |

#### Seattle, WA

| Name | Address | District |
|------|---------|----------|
| The 5th Avenue Theatre | 1308 5th Avenue | regional |
| Paramount Theatre | 911 Pine Street | touring |
| Seattle Repertory Theatre – Bagley Wright | 155 Mercer Street | regional |
| Seattle Repertory Theatre – Leo K. Theatre | 155 Mercer Street | regional |
| ACT Theatre | 700 Union Street | regional |

#### Washington, DC

| Name | Address | District |
|------|---------|----------|
| Kennedy Center – Opera House | 2700 F Street NW | touring |
| Kennedy Center – Eisenhower Theater | 2700 F Street NW | regional |
| Kennedy Center – Terrace Theater | 2700 F Street NW | regional |
| Arena Stage – Fichandler Stage | 1101 6th Street SW | regional |
| Arena Stage – Kreeger Theater | 1101 6th Street SW | regional |
| Arena Stage – Kogod Cradle | 1101 6th Street SW | regional |
| Shakespeare Theatre Company – Sidney Harman Hall | 610 F Street NW | regional |
| Shakespeare Theatre Company – Lansburgh Theatre | 450 7th Street NW | regional |
| Ford's Theatre | 511 10th Street NW | regional |
| National Theatre | 1321 Pennsylvania Avenue NW | touring |
| Studio Theatre | 1501 14th Street NW | regional |
| Woolly Mammoth Theatre | 641 D Street NW | regional |
| Signature Theatre | 4200 Campbell Avenue, Arlington, VA | regional |
| Round House Theatre | 4545 East-West Highway, Bethesda, MD | regional |

#### Boston / Cambridge, MA

| Name | Address | District |
|------|---------|----------|
| Citizens Bank Opera House | 539 Washington Street | touring |
| Wang Theatre | 270 Tremont Street | touring |
| Shubert Theatre | 265 Tremont Street | touring |
| American Repertory Theater – Loeb Drama Center | 64 Brattle Street, Cambridge | regional |
| Huntington Theatre – Avenue of the Arts | 264 Huntington Avenue | regional |
| Huntington Theatre – Calderwood Pavilion | 527 Tremont Street | regional |

#### Minneapolis, MN

| Name | Address | District |
|------|---------|----------|
| Guthrie Theater – Wurtele Thrust Stage | 818 S 2nd Street | regional |
| Guthrie Theater – McGuire Proscenium Stage | 818 S 2nd Street | regional |
| Guthrie Theater – Dowling Studio | 818 S 2nd Street | regional |
| Orpheum Theatre | 910 Hennepin Avenue | touring |
| State Theatre | 805 Hennepin Avenue | touring |
| Pantages Theatre | 710 Hennepin Avenue | touring |
| Children's Theatre Company | 2400 3rd Avenue S | regional |

#### Cleveland, OH (Playhouse Square)

| Name | Address | District |
|------|---------|----------|
| KeyBank State Theatre | 1519 Euclid Avenue | touring |
| Connor Palace | 1615 Euclid Avenue | touring |
| Ohio Theatre (Cleveland) | 1511 Euclid Avenue | touring |
| Allen Theatre | 1407 Euclid Avenue | regional |
| Hanna Theatre | 2067 E 14th Street | regional |
| Kennedy's Cabaret | 1553 Euclid Avenue | regional |
| Great Lakes Theater | 1407 Euclid Avenue | regional |
| Cleveland Play House | 1407 Euclid Avenue | regional |

#### Columbus, OH

| Name | Address | District |
|------|---------|----------|
| Ohio Theatre (Columbus) | 39 E State Street | touring |
| Palace Theatre (Columbus) | 34 W Broad Street | touring |
| Southern Theatre | 21 E Main Street | regional |
| Lincoln Theatre (Columbus) | 769 E Long Street | regional |
| Available Light Theatre | 1112 N High Street | regional |

#### Cincinnati, OH

| Name | Address | District |
|------|---------|----------|
| Aronoff Center – Procter & Gamble Hall | 650 Walnut Street | touring |
| Aronoff Center – Jarson-Kaplan Theater | 650 Walnut Street | regional |
| Cincinnati Playhouse – Marx Theatre | 962 Mt. Adams Circle | regional |
| Cincinnati Playhouse – Thompson Shelterhouse | 962 Mt. Adams Circle | regional |
| Ensemble Theatre Cincinnati | 1127 Vine Street | regional |

#### Detroit, MI

| Name | Address | District |
|------|---------|----------|
| Fox Theatre | 2211 Woodward Avenue | touring |
| Fisher Theatre | 3011 W Grand Boulevard | touring |
| Detroit Opera House | 1526 Broadway Street | touring |
| Masonic Temple – Masonic Auditorium | 500 Temple Street | touring |
| Detroit Repertory Theatre | 13103 Woodrow Wilson Avenue | regional |
| Meadow Brook Theatre | 207 Wilson Hall, Rochester | regional |

#### Pittsburgh, PA

| Name | Address | District |
|------|---------|----------|
| Benedum Center | 719 Liberty Avenue | touring |
| Byham Theater | 101 6th Street | touring |
| O'Reilly Theater | 621 Penn Avenue | regional |
| Pittsburgh Public Theater | 621 Penn Avenue | regional |
| City Theatre Company | 1300 Bingham Street | regional |
| August Wilson African American Cultural Center | 980 Liberty Avenue | regional |

#### Philadelphia, PA

| Name | Address | District |
|------|---------|----------|
| Academy of Music | 240 S Broad Street | touring |
| Merriam Theater | 250 S Broad Street | touring |
| Kimmel Center – Verizon Hall | 300 S Broad Street | touring |
| Kimmel Center – Perelman Theater | 300 S Broad Street | regional |
| Walnut Street Theatre | 825 Walnut Street | regional |
| Arden Theatre Company | 40 N 2nd Street | regional |
| Wilma Theater | 265 S Broad Street | regional |
| Philadelphia Theatre Company | 480 S Broad Street | regional |

#### Atlanta, GA

| Name | Address | District |
|------|---------|----------|
| Fox Theatre | 660 Peachtree Street NE | touring |
| Cobb Energy Performing Arts Centre | 2800 Cobb Galleria Pkwy | touring |
| Alliance Theatre | 1280 Peachtree Street NE | regional |
| Actor's Express | 887 W Marietta Street NW | regional |

#### Houston, TX

| Name | Address | District |
|------|---------|----------|
| Hobby Center – Sarofim Hall | 800 Bagby Street | touring |
| Hobby Center – Zilkha Hall | 800 Bagby Street | regional |
| Alley Theatre – Large Stage | 615 Texas Avenue | regional |
| Alley Theatre – Neuhaus Stage | 615 Texas Avenue | regional |

#### Dallas / Fort Worth, TX

| Name | Address | District |
|------|---------|----------|
| Music Hall at Fair Park | 909 1st Avenue | touring |
| Winspear Opera House | 2403 Flora Street | touring |
| Dee and Charles Wyly Theatre | 2400 Flora Street | regional |
| Dallas Theater Center | 2400 Flora Street | regional |
| Bass Performance Hall | 525 Commerce Street, Fort Worth | touring |

#### Denver, CO

| Name | Address | District |
|------|---------|----------|
| Buell Theatre | 1350 Curtis Street | touring |
| Ellie Caulkins Opera House | 1400 Curtis Street | touring |
| Denver Center for the Performing Arts – Space Theatre | 1101 13th Street | regional |
| Denver Center for the Performing Arts – Stage Theatre | 1101 13th Street | regional |
| Denver Center for the Performing Arts – Wolf Theatre | 1101 13th Street | regional |

#### Nashville, TN

| Name | Address | District |
|------|---------|----------|
| Tennessee Performing Arts Center – Polk Theater | 505 Deaderick Street | touring |
| Tennessee Performing Arts Center – Johnson Theater | 505 Deaderick Street | regional |
| Schermerhorn Symphony Center | 1 Symphony Place | regional |

#### St. Louis, MO

| Name | Address | District |
|------|---------|----------|
| Fox Theatre (St. Louis) | 527 N Grand Boulevard | touring |
| Repertory Theatre of St. Louis | 130 Edgar Road, Webster Groves | regional |
| The Muny | 1 Theatre Drive, Forest Park | regional |

#### Kansas City, MO

| Name | Address | District |
|------|---------|----------|
| Starlight Theatre | 4600 Starlight Road | regional |
| Kansas City Repertory Theatre – Spencer Theatre | 4949 Cherry Street | regional |
| Kansas City Repertory Theatre – Copaken Stage | 101 W 22nd Street | regional |

#### Milwaukee, WI

| Name | Address | District |
|------|---------|----------|
| Milwaukee Repertory Theater – Quadracci Powerhouse | 108 E Wells Street | regional |
| Milwaukee Repertory Theater – Stiemke Studio | 108 E Wells Street | regional |
| Milwaukee Repertory Theater – Stackner Cabaret | 108 E Wells Street | regional |
| Skylight Music Theatre | 158 N Broadway | regional |

#### Indianapolis, IN

| Name | Address | District |
|------|---------|----------|
| Indiana Repertory Theatre | 140 W Washington Street | regional |
| Old National Centre – Murat Theatre | 502 N New Jersey Street | touring |

#### Louisville, KY

| Name | Address | District |
|------|---------|----------|
| Actors Theatre of Louisville – Pamela Brown Auditorium | 316 W Main Street | regional |
| Actors Theatre of Louisville – Victor Jory Theatre | 316 W Main Street | regional |
| Actors Theatre of Louisville – Bingham Theatre | 316 W Main Street | regional |
| Whitney Hall (Louisville) | 501 W Main Street | touring |

#### Baltimore, MD

| Name | Address | District |
|------|---------|----------|
| Hippodrome Theatre | 12 N Eutaw Street | touring |
| Everyman Theatre | 315 W Fayette Street | regional |
| Center Stage | 700 N Calvert Street | regional |

#### Hartford, CT

| Name | Address | District |
|------|---------|----------|
| Hartford Stage | 50 Church Street | regional |
| The Bushnell | 166 Capitol Avenue | touring |

#### New Haven, CT

| Name | Address | District |
|------|---------|----------|
| Yale Repertory Theatre | 1120 Chapel Street | regional |
| Shubert Theatre (New Haven) | 247 College Street | touring |
| Long Wharf Theatre | 222 Sargent Drive | regional |

#### Providence, RI

| Name | Address | District |
|------|---------|----------|
| Trinity Repertory Company | 201 Washington Street | regional |
| Providence Performing Arts Center | 220 Weybosset Street | touring |

#### Portland, OR

| Name | Address | District |
|------|---------|----------|
| Portland Center Stage at The Armory | 128 NW 11th Avenue | regional |
| Arlene Schnitzer Concert Hall | 1037 SW Broadway | touring |
| Keller Auditorium | 222 SW Clay Street | touring |
| Artists Repertory Theatre | 1515 SW Morrison Street | regional |

#### San Diego, CA

| Name | Address | District |
|------|---------|----------|
| The Old Globe – Old Globe Theatre | 1363 Old Globe Way, Balboa Park | regional |
| The Old Globe – Lowell Davies Festival Theatre | 1363 Old Globe Way, Balboa Park | regional |
| The Old Globe – Sheryl and Harvey White Theatre | 1363 Old Globe Way, Balboa Park | regional |
| San Diego Civic Theatre | 1100 Third Avenue | touring |
| La Jolla Playhouse (see LA section) | | |

#### Phoenix / Tempe, AZ

| Name | Address | District |
|------|---------|----------|
| Orpheum Theatre (Phoenix) | 203 W Adams Street | touring |
| Herberger Theater Center | 222 E Monroe Street | regional |
| Arizona Theatre Company | 222 E Monroe Street | regional |
| Tempe Center for the Arts | 700 W Rio Salado Pkwy, Tempe | regional |

#### New Orleans, LA

| Name | Address | District |
|------|---------|----------|
| Saenger Theatre | 1111 Canal Street | touring |
| Mahalia Jackson Theater | 1419 Basin Street | touring |
| Southern Rep Theatre | 333 Canal Street | regional |

#### Miami / South Florida

| Name | Address | District |
|------|---------|----------|
| Adrienne Arsht Center – Ziff Ballet Opera House | 1300 Biscayne Boulevard | touring |
| Adrienne Arsht Center – Carnival Studio Theater | 1300 Biscayne Boulevard | regional |
| Broward Center – Au-Rene Theater | 201 SW 5th Avenue, Fort Lauderdale | touring |
| Maltz Jupiter Theatre | 1001 E Indiantown Road, Jupiter | regional |

#### Austin, TX

| Name | Address | District |
|------|---------|----------|
| Paramount Theatre (Austin) | 713 Congress Avenue | touring |
| ZACH Theatre – Topfer Theatre | 202 S Lamar Boulevard | regional |

#### Charlotte, NC

| Name | Address | District |
|------|---------|----------|
| Blumenthal – Belk Theater | 130 N Tryon Street | touring |
| Blumenthal – Booth Playhouse | 130 N Tryon Street | regional |

#### Raleigh / Chapel Hill, NC

| Name | Address | District |
|------|---------|----------|
| PlayMakers Repertory Company | 120 Country Club Road, Chapel Hill | regional |
| DPAC (Durham Performing Arts Center) | 123 Vivian Street, Durham | touring |

#### Other Notable Regional

| Name | City | Address | District |
|------|------|---------|----------|
| Oregon Shakespeare Festival – Angus Bowmer Theatre | Ashland, OR | 15 S Pioneer Street | regional |
| Oregon Shakespeare Festival – Thomas Theatre | Ashland, OR | 15 S Pioneer Street | regional |
| Guthrie Theater (already in Minneapolis) | | | |
| Goodspeed Musicals | East Haddam, CT | 6 Main Street | regional |
| Barrington Stage Company | Pittsfield, MA | 30 Union Street | regional |
| Geva Theatre Center | Rochester, NY | 75 Woodbury Blvd | regional |
| Syracuse Stage | Syracuse, NY | 820 E Genesee Street | regional |
| McCarter Theatre | Princeton, NJ | 91 University Place | regional |
| George Street Playhouse | New Brunswick, NJ | 103 College Farm Road | regional |
| Alabama Shakespeare Festival | Montgomery, AL | 1 Festival Drive | regional |
| Asolo Repertory Theatre | Sarasota, FL | 5555 N Tamiami Trail | regional |
| Florida Studio Theatre | Sarasota, FL | 1241 N Palm Avenue | regional |
| Gulfshore Playhouse | Naples, FL | 15 Gulfshore Blvd N | regional |
| Utah Shakespeare Festival | Cedar City, UT | 351 W Center Street | regional |
| Pioneer Theatre Company | Salt Lake City, UT | 300 S 1400 E | regional |
| TheatreWorks Silicon Valley | Redwood City, CA | 1071 Middlefield Road | regional |

---

## Part 2 — City Name Normalization

### The Problem

`resolveVenueIdForVisit` (in `convex/visits.ts`) uses exact string equality on the `city` field to narrow its venue lookup via the `by_city_normalized_name` and `by_city` indices. Our database stores `city: "New York"`. If a user types **"New York City"**, **"NYC"**, or **"New York, NY"**, the exact-match index query returns nothing, and the function falls back to scanning all venues — making the venue match less precise and slower.

Google Maps geocoding is already tolerant of city alias variants, so normalization does **not** help with coordinate geocoding. The value here is specifically for **visit-time venue matching** — ensuring users get a `venueId` on their visit record even when they type a common abbreviation.

### Scope

Add `normalizeCityName(city: string): string` to `convex/showNormalization.ts` (or a new `convex/cityNormalization.ts`). Apply it in:
1. `resolveVenueIdForVisit` before the index queries
2. The `addVisit` and `updateVisit` mutation handlers when writing the `city` field to the visits document

### Alias Map (v1)

```ts
const CITY_ALIASES: Record<string, string> = {
  "nyc": "New York",
  "new york city": "New York",
  "ny": "New York",          // only when standalone, not "Albany NY"
  "la": "Los Angeles",
  "los angeles ca": "Los Angeles",
  "sf": "San Francisco",
  "san francisco ca": "San Francisco",
  "dc": "Washington",
  "washington dc": "Washington",
  "washington d.c.": "Washington",
  "chi": "Chicago",
  "chi-town": "Chicago",
  "philly": "Philadelphia",
  "phl": "Philadelphia",
  "bos": "Boston",
  "atl": "Atlanta",
  "hou": "Houston",
  "dal": "Dallas",
  "dfw": "Dallas",           // edge case — technically Fort Worth area
  "cle": "Cleveland",
  "cbus": "Columbus",
  "cincy": "Cincinnati",
  "nola": "New Orleans",
  "nawlins": "New Orleans",
  "pdx": "Portland",
  "slc": "Salt Lake City",
  "mke": "Milwaukee",
  "stl": "St. Louis",
  "kc": "Kansas City",
  "mpls": "Minneapolis",
  "msp": "Minneapolis",
  "pgh": "Pittsburgh",
  "pitt": "Pittsburgh",
  "nash": "Nashville",
};
```

Normalization steps:
1. Trim whitespace
2. Strip trailing state abbreviation (`"New York, NY"` → `"New York"`)
3. Lowercase, lookup in alias map → return canonical form if found
4. Otherwise title-case the trimmed result and return

### Estimate

~50 lines of code. Low risk, purely additive.

---

## Part 3 — Live Venue Search Autocomplete

### Backend: `searchVenues` query

Add to `convex/venues.ts`:

```ts
export const search = query({
  args: { q: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const q = args.q.trim();
    if (q.length < 2) return [];
    const normalized = normalizeVenueName(q);
    const limit = Math.min(args.limit ?? 8, 20);

    // Prefix scan on normalizedName index
    const results = await ctx.db
      .query("venues")
      .withIndex("by_normalized_name", (q) =>
        q.gte("normalizedName", normalized).lt("normalizedName", normalized + "\uffff")
      )
      .filter((q) => q.eq(q.field("isActive"), true))
      .take(limit);

    // Also do a full scan if prefix yields < limit results, scoring by similarity
    // (keeps recall high for partial middle-of-name queries like "pantages")
    // ... see implementation notes

    return results.map((v) => ({
      _id: v._id,
      name: v.name,
      city: v.city,
      state: v.state,
      district: v.district,
    }));
  },
});
```

**Implementation note on recall:** The `by_normalized_name` prefix scan handles queries that start with the venue name (e.g., "majes" → "Majestic Theatre"). For tokens appearing mid-name (e.g., "pantages"), we'll do a secondary pass using Dice coefficient similarity (the existing `stringSimilarity` helper) over the full venue set, capped at 200 venues. Results from both passes are merged, deduped, and sorted by score.

### Frontend: `LocationSection` changes

1. **Move Theatre field above City field** in the "Other" form
2. **Replace the Theatre `TextInput`** with a compound component:
   - A `TextInput` for the theatre name
   - A dropdown overlay (absolute-positioned `View`) that appears when `q.length >= 2`
   - Each row: `[Venue Name]  [City, State]` (city/state in muted smaller text)
   - On row tap: `setTheatre(venue.name)` + `setCity(venue.city)` → dropdown closes
   - On blur or clear: dropdown closes
3. **City field** remains below; it can still be manually edited after autocomplete fills it

### Debouncing

Fire the `searchVenues` query 200ms after the last keystroke to avoid hammering Convex on every character.

---

## Part 4 — Admin: Unmatched Venues Tab

### Goal

A simple read-only list (similar to the existing user feedback tab) showing every unique `(theatre, city)` combination from the visits table that has no `venueId`. Sorted by visit count descending. No actions required at launch — purely for visibility.

### Backend query

Add to `convex/visits.ts` (or a new `convex/admin/venueReview.ts`):

```ts
export const listUnmatchedLocations = query({
  args: {},
  handler: async (ctx) => {
    const visits = await ctx.db.query("visits").collect();
    const counts = new Map<string, { theatre: string; city: string; count: number }>();
    for (const visit of visits) {
      if (visit.venueId) continue;
      const theatre = visit.theatre?.trim();
      if (!theatre) continue;
      const city = visit.city?.trim() ?? "";
      const key = `${theatre.toLowerCase()}::${city.toLowerCase()}`;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { theatre, city, count: 1 });
      }
    }
    return [...counts.values()].sort((a, b) => b.count - a.count);
  },
});
```

### Frontend

New tab in `website/src/app/admin/page.tsx` (alongside existing tabs):

- Tab label: **"Unmatched Locations"**
- Table columns: **Theatre** | **City** | **Visit Count**
- No pagination needed at launch (total unmatched set will be small initially)
- No action buttons at launch — just the list for review

---

## Implementation Order

| # | Task | Files | Effort |
|---|------|-------|--------|
| 1 | Add Batch 2 Off-Broadway + address fixes to `INITIAL_VENUE_SEED` | `convex/venues.ts` | Medium |
| 2 | Add Batch 3 Regional to `INITIAL_VENUE_SEED` | `convex/venues.ts` | Medium |
| 3 | Run seed + backfill geocoding | CLI | Trivial |
| 4 | City normalization utility + wire into `resolveVenueIdForVisit` + mutations | `convex/visits.ts`, `convex/showNormalization.ts` | Small |
| 5 | `search` query in `convex/venues.ts` | `convex/venues.ts` | Small |
| 6 | `LocationSection` autocomplete UI (theatre above city, dropdown) | `src/features/add-visit/components/LocationSection.tsx` | Medium |
| 7 | Unmatched locations query | `convex/visits.ts` or `convex/admin/venueReview.ts` | Small |
| 8 | Admin tab for unmatched locations | `website/src/app/admin/page.tsx` | Small |

Steps 1–3 are data-only and can be done as one PR. Steps 4–8 are code changes and can be a second PR.
