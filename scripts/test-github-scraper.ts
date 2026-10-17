import "dotenv/config";
import { GitHubScraper } from "../packages/db/src/scrapers/github.js";

const scraper = new GitHubScraper();

async function main() {
  try {
    const result = await scraper.run(5);
    console.info("GitHub scraper result:", result);
  } catch (error) {
    console.error("GitHub scraper failed:", error);
    process.exitCode = 1;
  }
}

void main();