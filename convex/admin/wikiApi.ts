/** Shared Wikipedia / Wikimedia JSON fetch with retries (used by seed + legacy Wikidata tooling). */
export async function fetchJson(url: string): Promise<any> {
  const full = url.includes("?") ? `${url}&origin=*` : `${url}?origin=*`;
  let lastErr: unknown = null;

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const res = await fetch(full, {
        headers: {
          "User-Agent":
            "stageworth/1.0 (show/production seeding via Convex; contact: benbeaudet.com)",
        },
      });
      const text = await res.text();
      const trimmed = text.trim();
      if (trimmed.startsWith("You are making too many requests")) {
        const waitMs = 4000 * attempt;
        await new Promise((r) => setTimeout(r, waitMs));
        continue;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${trimmed.slice(0, 200)}`);
      }
      if (trimmed.startsWith("<")) {
        throw new Error("Non-JSON HTML response body");
      }
      return JSON.parse(text);
    } catch (err) {
      lastErr = err;
      const message = err instanceof Error ? err.message : String(err);
      const waitMs = 2000 * attempt;
      await new Promise((r) => setTimeout(r, waitMs));
    }
  }

  const message = lastErr instanceof Error ? lastErr.message : String(lastErr);
  throw new Error(`Wikipedia request failed for ${full.slice(0, 200)}... :: ${message}`);
}
