import RssParser from "rss-parser";

const rss = new RssParser();

export const FEEDS: { url: string; label: string }[] = [
  { url: "https://www.broadwayworld.com/rss.cfm?rssid=1", label: "BWW News" },
  { url: "https://www.broadwayworld.com/rss.cfm?rssid=61", label: "BWW Openings" },
  { url: "https://www.broadwayworld.com/rss.cfm?rssid=4", label: "BWW Closings" },
  { url: "https://playbill.com/rss", label: "Playbill" },
  { url: "https://www.theatermania.com/rss", label: "TheaterMania" },
];

export type RssItem = {
  url: string;
  title: string;
  content: string;
  pubDate: string;
  feedLabel: string;
};

export async function fetchFeedItems(feed: { url: string; label: string }): Promise<RssItem[]> {
  const parsed = await rss.parseURL(feed.url);
  return (parsed.items ?? [])
    .map((item) => ({
      url: item.link ?? item.guid ?? "",
      title: item.title ?? "",
      content: item.contentSnippet ?? item.content ?? "",
      pubDate: item.pubDate ?? "",
      feedLabel: feed.label,
    }))
    .filter((item) => item.url.length > 0);
}
