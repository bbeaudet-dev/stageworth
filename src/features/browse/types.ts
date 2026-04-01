import type { Id } from "@/convex/_generated/dataModel";

export type ProductionWithShow = {
  _id: Id<"productions">;
  theatre: string;
  city?: string;
  previewDate?: string;
  openingDate?: string;
  closingDate?: string;
  posterUrl?: string | null;
  ticketmasterEventUrl?: string;
  show?: {
    _id?: Id<"shows">;
    name?: string;
    type?: string;
    images?: string[];
  };
};

export type BrowseSection = { title: string; data: ProductionWithShow[] };
