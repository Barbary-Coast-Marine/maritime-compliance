/**
 * Maritime Intelligence Feed — /api/intel/feed
 *
 * Polls Tavily (web search API) for current USCG safety alerts, Port State
 * Control inspection focus areas, and CFR compliance updates. Results are
 * merged from three queries, deduped by URL, sorted by recency, and cached
 * for 30 minutes to avoid hammering the Tavily quota on every page load.
 */
import { FastifyInstance } from "fastify";
import { tavily } from "@tavily/core";

export interface IntelItem {
  title: string;
  url: string;
  snippet: string;
  source: string;
  published_date: string | null;
}

interface IntelFeedResponse {
  items: IntelItem[];
  fetched_at: string;
}

const QUERIES = [
  "USCG marine safety alert 2025 2026",
  "Port State Control inspection focus areas 2026",
  "46 CFR passenger vessel compliance update",
];

const INCLUDE_DOMAINS = [
  "ecfr.gov",
  "uscg.mil",
  "dco.uscg.mil",
  "ntsb.gov",
  "marinelink.com",
  "maritime-executive.com",
];

const CACHE_TTL_MS = 30 * 60 * 1000;

interface CacheEntry {
  data: IntelFeedResponse;
  expires: number;
}

let cache: CacheEntry | null = null;

function extractDomain(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export async function intelRoutes(app: FastifyInstance) {
  /**
   * GET /api/intel/feed
   * Maritime intelligence feed powered by Tavily.
   * No auth — public endpoint.
   */
  app.get("/intel/feed", async (_request, reply) => {
    // Serve cached response if fresh
    if (cache && cache.expires > Date.now()) {
      return cache.data;
    }

    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return reply.status(500).send({ error: "TAVILY_API_KEY not configured" });
    }

    try {
      const client = tavily({ apiKey });

      const searches = await Promise.all(
        QUERIES.map((q) =>
          client
            .search(q, {
              searchDepth: "advanced",
              maxResults: 5,
              includeDomains: INCLUDE_DOMAINS,
            })
            .catch((err) => {
              app.log.warn({ err, query: q }, "Tavily search failed");
              return { results: [] as any[] };
            })
        )
      );

      // Merge + dedupe by URL (preserving fetch order for fallback sorting)
      const seen = new Set<string>();
      const merged: IntelItem[] = [];

      for (const resp of searches) {
        for (const r of resp.results ?? []) {
          if (!r?.url || seen.has(r.url)) continue;
          seen.add(r.url);
          const content: string = r.content ?? "";
          merged.push({
            title: r.title ?? "(untitled)",
            url: r.url,
            snippet: content.slice(0, 300),
            source: extractDomain(r.url),
            published_date: (r as { publishedDate?: string }).publishedDate ?? null,
          });
        }
      }

      // Sort by recency: published_date desc, items without dates keep insertion order
      merged.sort((a, b) => {
        if (a.published_date && b.published_date) {
          return b.published_date.localeCompare(a.published_date);
        }
        if (a.published_date) return -1;
        if (b.published_date) return 1;
        return 0;
      });

      const response: IntelFeedResponse = {
        items: merged,
        fetched_at: new Date().toISOString(),
      };

      cache = { data: response, expires: Date.now() + CACHE_TTL_MS };
      return response;
    } catch (err) {
      app.log.error(err, "Failed to fetch intel feed");
      return reply.status(500).send({ error: "Failed to fetch intel feed" });
    }
  });
}
