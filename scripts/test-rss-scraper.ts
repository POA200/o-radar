import "dotenv/config";
import { RssScraper } from "../packages/db/src/scrapers/rss.js";

async function main() {
  const result = await new RssScraper().run();
  console.info("RSS scraper result:", result);
}

void main().catch((error) => {
  console.error("RSS scraper failed:", error);
  process.exitCode = 1;
});