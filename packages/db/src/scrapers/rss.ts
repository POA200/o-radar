import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { XMLParser } from "fast-xml-parser";
import { prisma as defaultPrisma } from "../index.js";

const SOURCE = "RSS_FEED" as const;

type Logger = Pick<Console, "info" | "warn" | "error">;

export type RssScraperOptions = {
  prisma?: PrismaClient;
  feeds?: readonly string[];
  fetch?: typeof globalThis.fetch;
  logger?: Logger;
};

export type RssScrapeResult = {
  discovered: number;
  skipped: number;
  failed: number;
};

type FeedItem = {
  id: string;
  title: string;
  url: string;
  content: string;
  author?: string;
  publishedAt?: string;
  rawPayload: Record<string, unknown>;
  feedUrl: string;
  feedTitle?: string;
};

export class RssScraper {
  private readonly prisma: PrismaClient;
  private readonly feeds: readonly string[];
  private readonly request: typeof globalThis.fetch;
  private readonly logger: Logger;
  private readonly parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    textNodeName: "#text",
  });

  constructor(options: RssScraperOptions = {}) {
    this.prisma = options.prisma ?? defaultPrisma;
    this.feeds = options.feeds ?? RssScraper.feedsFromEnvironment();
    this.request = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.logger = options.logger ?? console;
  }

  static feedsFromEnvironment(value = process.env.RSS_FEEDS) {
    return (value ?? "")
      .split(",")
      .map((feed) => feed.trim())
      .filter(Boolean);
  }

  async run(): Promise<RssScrapeResult> {
    if (this.feeds.length === 0) {
      this.logger.warn("No RSS feeds configured. Set RSS_FEEDS to comma-separated feed URLs.");
      return { discovered: 0, skipped: 0, failed: 0 };
    }

    const items: FeedItem[] = [];
    let failed = 0;

    for (const feedUrl of this.feeds) {
      try {
        items.push(...(await this.fetchFeed(feedUrl)));
      } catch (error) {
        failed += 1;
        this.logger.error(`Failed to read RSS feed ${feedUrl}`, error);
      }
    }

    let discovered = 0;
    let skipped = 0;

    for (const item of items) {
      try {
        const result = await this.persistItem(item);
        if (result === "skipped") skipped += 1;
        else discovered += 1;
      } catch (error) {
        failed += 1;
        this.logger.error(`Failed to persist RSS item ${item.url}`, error);
      }
    }

    return { discovered, skipped, failed };
  }

  private async fetchFeed(feedUrl: string): Promise<FeedItem[]> {
    const response = await this.request(feedUrl, {
      headers: { Accept: "application/rss+xml, application/atom+xml, application/xml" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      throw new Error(`RSS request failed with ${response.status}`);
    }

    const parsed = this.parser.parse(await response.text()) as Record<string, unknown>;
    return this.normalizeFeed(parsed, feedUrl);
  }

  private normalizeFeed(parsed: Record<string, unknown>, feedUrl: string): FeedItem[] {
    const rss = asRecord(parsed.rss);
    const rssChannel = asRecord(rss?.channel);
    const atom = asRecord(parsed.feed);
    const feedTitle = getText(rssChannel?.title) ?? getText(atom?.title);
    const rssItems = asArray(rssChannel?.item);
    const atomItems = asArray(atom?.entry);
    const entries = rssItems.length ? rssItems : atomItems;

    return entries.flatMap((entry) => {
      const item = asRecord(entry);
      if (!item) return [];

      const url = getUrl(item);
      const title = getText(item.title);
      if (!url || !title) return [];

      const publishedAt = getText(item.pubDate) ?? getText(item.published) ?? getText(item.updated);
      return [{
        id: getText(item.guid) ?? getText(item.id) ?? url,
        title,
        url,
        content: getText(item.description) ?? getText(item.summary) ?? getText(item.content) ?? "",
        author: getText(item.author) ?? getText(item.creator) ?? getAuthorName(item.author),
        publishedAt,
        rawPayload: item,
        feedUrl,
        feedTitle,
      }];
    });
  }

  private async persistItem(item: FeedItem): Promise<"created" | "skipped"> {
    const nativeId = item.id;
    const hash = createHash("sha256").update(`${SOURCE}:${nativeId}`).digest("hex");
    const existing = await this.prisma.opportunity.findUnique({ where: { hash } });

    if (existing) {
      this.logger.info(`Skipped duplicate RSS opportunity: ${item.url}`);
      return "skipped";
    }

    const opportunity = await this.prisma.opportunity.create({
      data: {
        source: SOURCE,
        nativeId,
        hash,
        title: item.title,
        url: item.url,
        content: item.content,
        score: this.calculateScore(item),
        createdAt: toDate(item.publishedAt),
      },
    });

    await this.prisma.evidence.create({
      data: {
        opportunityId: opportunity.id,
        type: "RSS_ITEM",
        rawPayload: JSON.parse(JSON.stringify({
          source: SOURCE,
          feedUrl: item.feedUrl,
          feedTitle: item.feedTitle ?? null,
          author: item.author ?? null,
          publishedAt: item.publishedAt ?? null,
          item: item.rawPayload,
        })),
      },
    });

    if (item.author) {
      await this.prisma.lead.upsert({
        where: {
          opportunityId_platform_handle: {
            opportunityId: opportunity.id,
            platform: "RSS",
            handle: item.author,
          },
        },
        update: {},
        create: {
          opportunityId: opportunity.id,
          handle: item.author,
          platform: "RSS",
          status: "DISCOVERED",
        },
      });
    }

    return "created";
  }

  private calculateScore(item: FeedItem) {
    const content = `${item.title} ${item.content}`.toLowerCase();
    const intentMatches = ["grant", "bounty", "hiring", "looking for", "job", "contributor", "audit"]
      .filter((keyword) => content.includes(keyword));

    return Math.min(100, intentMatches.length * 15 + (item.author ? 10 : 0));
  }
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return value === undefined ? [] : [value];
}

function getText(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") return String(value).trim();
  const record = asRecord(value);
  if (record) return getText(record["#text"]);
  return undefined;
}

function getUrl(item: Record<string, unknown>): string | undefined {
  const direct = getText(item.link);
  if (direct) return direct;

  const link = asRecord(item.link);
  return getText(link?.["@_href"]);
}

function getAuthorName(value: unknown): string | undefined {
  const author = asRecord(value);
  return getText(author?.name);
}

function toDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}