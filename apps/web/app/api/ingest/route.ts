import { prisma } from "@o-radar/db";
import { GitHubScraper } from "@o-radar/db/scrapers/github";
import { RssScraper } from "@o-radar/db/scrapers/rss";
import { recordSourceHealth } from "@o-radar/db/scrapers/source-adapter";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const configuredSecret = process.env.INGESTION_SECRET;
  const authorization = request.headers.get("authorization");
  if (!configuredSecret || authorization !== `Bearer ${configuredSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await Promise.allSettled([
    runGitHub(),
    runRss(),
  ]);

  return NextResponse.json({
    github: results[0].status === "fulfilled" ? results[0].value : { failed: 1 },
    rss: results[1].status === "fulfilled" ? results[1].value : { failed: 1 },
  });
}

async function runGitHub() {
  try {
    const result = await new GitHubScraper().run(25);
    await recordSourceHealth(prisma, "GITHUB_ISSUE", {
      fetched: result.fetched,
      created: result.discovered,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
    });
    return result;
  } catch (error) {
    await recordSourceHealth(prisma, "GITHUB_ISSUE", { fetched: 0, created: 0, updated: 0, skipped: 0, failed: 1 }, error);
    throw error;
  }
}

async function runRss() {
  try {
    const result = await new RssScraper().run();
    await recordSourceHealth(prisma, "RSS_FEED", {
      fetched: result.fetched,
      created: result.discovered,
      updated: result.updated,
      skipped: result.skipped,
      failed: result.failed,
    });
    return result;
  } catch (error) {
    await recordSourceHealth(prisma, "RSS_FEED", { fetched: 0, created: 0, updated: 0, skipped: 0, failed: 1 }, error);
    throw error;
  }
}