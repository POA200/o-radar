import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { prisma as defaultPrisma } from "@o-radar/db";

const GITHUB_API_URL = "https://api.github.com";
const SOURCE = "GITHUB_ISSUE" as const;

export const DEFAULT_GITHUB_KEYWORDS = [
  "looking for designer",
  "grant proposal",
  "bounty",
  "smart contract audit",
  "frontend",
  "UI overhaul",
] as const;

type GitHubLabel = {
  name: string;
  color: string;
  description: string | null;
};

type GitHubIssue = {
  id: number;
  title: string;
  body: string | null;
  html_url: string;
  repository_url: string;
  created_at: string;
  user: { login: string; html_url: string } | null;
  labels: GitHubLabel[];
};

type GitHubSearchResponse = { items: GitHubIssue[] };
type GitHubRepositoryResponse = { stargazers_count: number };
type Logger = Pick<Console, "info" | "warn" | "error">;

export type GitHubScraperOptions = {
  prisma?: PrismaClient;
  token?: string;
  keywords?: readonly string[];
  fetch?: typeof globalThis.fetch;
  logger?: Logger;
};

export type GitHubScrapeResult = {
  discovered: number;
  skipped: number;
  failed: number;
};

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfter?: string,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

export class GitHubScraper {
  private readonly prisma: PrismaClient;
  private readonly token?: string;
  private readonly keywords: readonly string[];
  private readonly request: typeof globalThis.fetch;
  private readonly logger: Logger;

  constructor(options: GitHubScraperOptions = {}) {
    this.prisma = options.prisma ?? defaultPrisma;
    this.token = options.token ?? process.env.GITHUB_PAT;
    this.keywords = options.keywords ?? DEFAULT_GITHUB_KEYWORDS;
    this.request = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.logger = options.logger ?? console;
  }

  async run(perKeywordLimit = 25): Promise<GitHubScrapeResult> {
    const issues = new Map<number, GitHubIssue>();

    for (const keyword of this.keywords) {
      const response = await this.searchIssues(keyword, perKeywordLimit);

      for (const issue of response.items) {
        issues.set(issue.id, issue);
      }
    }

    let discovered = 0;
    let skipped = 0;
    let failed = 0;

    for (const issue of issues.values()) {
      try {
        const result = await this.persistIssue(issue);

        if (result === "skipped") skipped += 1;
        else discovered += 1;
      } catch (error) {
        if (error instanceof GitHubApiError && (error.status === 403 || error.status === 429)) {
          throw error;
        }

        failed += 1;
        this.logger.error(`Failed to persist GitHub issue ${issue.html_url}`, error);
      }
    }

    return { discovered, skipped, failed };
  }

  private async searchIssues(keyword: string, perPage: number) {
    const url = new URL("/search/issues", GITHUB_API_URL);
    url.searchParams.set("q", `${keyword} in:title,body is:issue`);
    url.searchParams.set("per_page", String(Math.min(Math.max(perPage, 1), 100)));

    return this.getJson<GitHubSearchResponse>(url);
  }

  private async getRepositoryStars(repositoryUrl: string) {
    const repository = await this.getJson<GitHubRepositoryResponse>(repositoryUrl);
    return repository.stargazers_count;
  }

  private async getJson<T>(url: URL | string): Promise<T> {
    const response = await this.request(url, {
      headers: {
        Accept: "application/vnd.github+json",
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!response.ok) {
      const retryAfter = response.headers.get("retry-after") ?? undefined;
      const reset = response.headers.get("x-ratelimit-reset");
      const resetMessage = reset
        ? ` Rate limit resets at ${new Date(Number(reset) * 1000).toISOString()}.`
        : "";

      if (response.status === 403 || response.status === 429) {
        throw new GitHubApiError(
          `GitHub API rate limit or access error (${response.status}).${resetMessage}`,
          response.status,
          retryAfter,
        );
      }

      throw new GitHubApiError(
        `GitHub API request failed with ${response.status}: ${await response.text()}`,
        response.status,
      );
    }

    return (await response.json()) as T;
  }

  private async persistIssue(issue: GitHubIssue): Promise<"created" | "skipped"> {
    const nativeId = String(issue.id);
    const hash = createHash("sha256").update(`${SOURCE}:${nativeId}`).digest("hex");
    const existing = await this.prisma.opportunity.findUnique({ where: { hash } });

    if (existing) {
      this.logger.info(`Skipped duplicate GitHub opportunity: ${issue.html_url}`);
      return "skipped";
    }

    const repositoryStars = await this.getRepositoryStars(issue.repository_url);
    const rawPayload = {
      source: SOURCE,
      issueId: issue.id,
      author: issue.user
        ? { handle: issue.user.login, profileUrl: issue.user.html_url }
        : null,
      repositoryStars,
      createdAt: issue.created_at,
      labels: issue.labels,
      issue,
    };
    const opportunity = await this.prisma.opportunity.create({
      data: {
        source: SOURCE,
        nativeId,
        hash,
        title: issue.title,
        url: issue.html_url,
        content: issue.body ?? "",
        score: this.calculateScore(issue),
      },
    });

    await this.prisma.evidence.create({
      data: {
        opportunityId: opportunity.id,
        type: "GITHUB_ISSUE_METADATA",
        rawPayload,
      },
    });

    if (issue.user) {
      await this.prisma.lead.upsert({
        where: {
          opportunityId_platform_handle: {
            opportunityId: opportunity.id,
            platform: "GITHUB",
            handle: issue.user.login,
          },
        },
        update: { profileUrl: issue.user.html_url },
        create: {
          opportunityId: opportunity.id,
          handle: issue.user.login,
          platform: "GITHUB",
          profileUrl: issue.user.html_url,
          status: "DISCOVERED",
        },
      });
    }

    return "created";
  }

  private calculateScore(issue: GitHubIssue) {
    const content = `${issue.title} ${issue.body ?? ""}`.toLowerCase();
    const matches = this.keywords.filter((keyword) => content.includes(keyword.toLowerCase()));
    const explicitIntent = /(looking for|hiring|grant|bounty|audit|need help)/i.test(content);

    return Math.min(100, matches.length * 15 + (explicitIntent ? 25 : 0));
  }
}