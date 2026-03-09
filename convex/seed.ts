import { internalMutation } from "./_generated/server";

const PORTFOLIO_BASE_URL = "https://benbeaudet.com";

type ShowType = "musical" | "play" | "opera" | "dance" | "other";

interface ShowEntry {
  name: string;
  type: ShowType;
  image: string;
}

// All 72 shows from the personal portfolio, to populate the shows database.
// This is the catalog of shows users can select from when adding to their list.
const SHOWS_CATALOG: ShowEntry[] = [
  { name: "Hadestown", type: "musical", image: "/images-theatre/hadestown.jpg" },
  { name: "Maybe Happy Ending", type: "musical", image: "/images-theatre/maybe-happy-ending.jpg" },
  { name: "Les Misérables", type: "musical", image: "/images-theatre/les-miserables.jpg" },
  { name: "Hamilton", type: "musical", image: "/images-theatre/hamilton.jpg" },
  { name: "Mexodus", type: "musical", image: "/images-theatre/mexodus.webp" },
  { name: "Operation Mincemeat", type: "musical", image: "/images-theatre/operation-mincemeat.jpg" },
  { name: "Come From Away", type: "musical", image: "/images-theatre/come-from-away.jpg" },
  { name: "Death Becomes Her", type: "musical", image: "/images-theatre/death-becomes-her.jpg" },
  { name: "Phantom of the Opera", type: "musical", image: "/images-theatre/phantom-of-the-opera.jpg" },
  { name: "Two Strangers (Carry a Cake Across New York)", type: "musical", image: "/images-theatre/two-strangers.jpg" },
  { name: "Marcel on the Train", type: "play", image: "/images-theatre/marcel-on-the-train.jpg" },
  { name: "John Proctor is the Villain", type: "play", image: "/images-theatre/john-proctor.jpg" },
  { name: "Suffs", type: "musical", image: "/images-theatre/suffs.jpg" },
  { name: "Water for Elephants", type: "musical", image: "/images-theatre/water-for-elephants.jpg" },
  { name: "Oedipus", type: "play", image: "/images-theatre/oedipus.jpg" },
  { name: "Gypsy", type: "musical", image: "/images-theatre/gypsy.jpg" },
  { name: "Sunset Blvd.", type: "musical", image: "/images-theatre/sunset-blvd.jpg" },
  { name: "The 25th Annual Putnam County Spelling Bee", type: "musical", image: "/images-theatre/spelling-bee.jpg" },
  { name: "Punch", type: "play", image: "/images-theatre/punch.jpg" },
  { name: "Cabaret", type: "musical", image: "/images-theatre/cabaret.jpg" },
  { name: "Job", type: "play", image: "/images-theatre/job.jpg" },
  { name: "High Spirits", type: "musical", image: "/images-theatre/high-spirits.jpg" },
  { name: "Moulin Rouge", type: "musical", image: "/images-theatre/moulin-rouge.jpg" },
  { name: "POTUS", type: "play", image: "/images-theatre/potus.jpg" },
  { name: "Bug", type: "play", image: "/images-theatre/bug.jpg" },
  { name: "Wicked", type: "musical", image: "/images-theatre/wicked.jpg" },
  { name: "The Heart of Robin Hood", type: "play", image: "/images-theatre/the-heart-of-robin-hood.png" },
  { name: "Little Shop of Horrors", type: "musical", image: "/images-theatre/little-shop-of-horrors.jpg" },
  { name: "Floyd Collins", type: "musical", image: "/images-theatre/floyd-collins.jpg" },
  { name: "The Disappear", type: "play", image: "/images-theatre/the-disappear.jpg" },
  { name: "Some Like It Hot", type: "musical", image: "/images-theatre/some-like-it-hot.jpg" },
  { name: "Chicago", type: "musical", image: "/images-theatre/chicago.jpg" },
  { name: "Waiting For Godot", type: "play", image: "/images-theatre/waiting-for-godot.jpg" },
  { name: "Parade", type: "musical", image: "/images-theatre/parade.jpg" },
  { name: "The Other Place", type: "play", image: "/images-theatre/the-other-place.jpg" },
  { name: "RENT", type: "musical", image: "/images-theatre/rent.webp" },
  { name: "Mamma Mia!", type: "musical", image: "/images-theatre/mamma-mia.jpg" },
  { name: "Play That Goes Wrong", type: "play", image: "/images-theatre/play-that-goes-wrong.jpg" },
  { name: "Liberation", type: "play", image: "/images-theatre/liberation.jpg" },
  { name: "Chess", type: "musical", image: "/images-theatre/chess.jpg" },
  { name: "Dead Outlaw", type: "musical", image: "/images-theatre/dead-outlaw.jpg" },
  { name: "The Great Gatsby", type: "musical", image: "/images-theatre/great-gatsby.jpg" },
  { name: "The Outsiders", type: "musical", image: "/images-theatre/the-outsiders.jpg" },
  { name: "Hell's Kitchen", type: "musical", image: "/images-theatre/hells-kitchen.jpg" },
  { name: "& Juliet", type: "musical", image: "/images-theatre/and-juliet.jpg" },
  { name: "Call Me Izzy", type: "play", image: "/images-theatre/call-me-izzy.jpg" },
  { name: "The Last 5 Years", type: "musical", image: "/images-theatre/the-last-5-years.jpg" },
  { name: "Life of Pi", type: "play", image: "/images-theatre/life-of-pi.jpg" },
  { name: "Dear Evan Hansen", type: "musical", image: "/images-theatre/dear-evan-hansen.jpg" },
  { name: "Fiddler on the Roof", type: "musical", image: "/images-theatre/fiddler-on-the-roof.jpg" },
  { name: "In the Heights", type: "musical", image: "/images-theatre/in-the-heights.jpg" },
  { name: "Book of Mormon", type: "musical", image: "/images-theatre/book-of-mormon.jpg" },
  { name: "A Strange Loop", type: "musical", image: "/images-theatre/a-strange-loop.jpg" },
  { name: "Ginger Twinsies", type: "play", image: "/images-theatre/ginger-twinsies.jpg" },
  { name: "Pride & Prejudice", type: "play", image: "/images-theatre/pride-and-prejudice.webp" },
  { name: "Rockettes Christmas Spectacular", type: "dance", image: "/images-theatre/rockettes-christmas-spectacular.webp" },
  { name: "Pen Pals", type: "play", image: "/images-theatre/pen-pals.jpg" },
  { name: "The Notebook", type: "musical", image: "/images-theatre/the-notebook.jpg" },
  { name: "The Rocky Horror Show", type: "musical", image: "/images-theatre/rocky-horror.png" },
  { name: "The Bookstore", type: "play", image: "/images-theatre/the-bookstore.jpg" },
  { name: "Marjorie Prime", type: "play", image: "/images-theatre/marjorie-prime.jpg" },
  { name: "Company", type: "musical", image: "/images-theatre/company.jpg" },
  { name: "Harry Potter and the Cursed Child", type: "play", image: "/images-theatre/harry-potter-cursed-child.jpg" },
  { name: "Shucked", type: "musical", image: "/images-theatre/shucked.jpg" },
  { name: "Data", type: "play", image: "/images-theatre/data.jpg" },
  { name: "Stranger Things: The First Shadow", type: "play", image: "/images-theatre/stranger-things.jpg" },
  { name: "Oh, Mary!", type: "play", image: "/images-theatre/oh-mary.jpg" },
  { name: "Six", type: "musical", image: "/images-theatre/six.jpg" },
  { name: "Lord Nil: Seven Deadly Sins", type: "other", image: "/images-theatre/lord-nil.jpg" },
  { name: "André de Shields is Tartuffe", type: "play", image: "/images-theatre/tartuffe.webp" },
  { name: "An Ark", type: "play", image: "/images-theatre/an-ark.webp" },
  { name: "Perfect Crime", type: "play", image: "/images-theatre/perfect-crime.jpg" },
];

// Populates the shows table with the catalog above.
// Run from the Convex dashboard: npx convex run seed:populateShows
export const populateShows = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("shows").collect();
    if (existing.length > 0) {
      throw new Error(
        `Shows table already has ${existing.length} entries — clear it first to re-seed`
      );
    }

    let count = 0;
    for (const show of SHOWS_CATALOG) {
      await ctx.db.insert("shows", {
        name: show.name,
        type: show.type,
        images: [`${PORTFOLIO_BASE_URL}${show.image}`],
        isUserCreated: false,
      });
      count++;
    }

    return { populated: count };
  },
});
