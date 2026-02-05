import { chromium } from "playwright";
import { createServer } from "http-server";
import { cp, mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

async function generateScreenshot() {
  const distPath = resolve(rootDir, "dist");
  const tempRoot = await mkdtemp(join(tmpdir(), "pr-by-pt-"));
  const servedRoot = join(tempRoot, "site");
  const basePath = join(servedRoot, "parkrun-by-public-transport");

  await cp(distPath, basePath, { recursive: true });

  const server = createServer({
    root: servedRoot,
  });

  const port = 8080;
  await new Promise<void>((resolve) => {
    server.listen(port, () => {
      console.log(`Serving ${distPath} on http://localhost:${port}`);
      resolve();
    });
  });

  try {
    const browser = await chromium.launch();

    // Desktop screenshot (16:9)
    const desktopPage = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    });

    const url = `http://localhost:${port}/parkrun-by-public-transport/`;

    console.log(`Loading page at ${url}...`);

    try {
      await desktopPage.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
    } catch (error) {
      console.error("Failed to load page");
      throw error;
    }

    // Wait for map to load
    await desktopPage.waitForSelector("#map", { timeout: 10000 });

    // Wait for any animations/transitions
    await desktopPage.waitForTimeout(2000);

    const desktopPath = resolve(distPath, "og-image.png");
    await desktopPage.screenshot({
      path: desktopPath,
      type: "png",
    });
    console.log("✓ Generated og-image.png");

    // Mobile screenshot (iPhone 14 Pro)
    const mobilePage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });

    try {
      await mobilePage.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
    } catch (error) {
      console.error("Failed to load mobile page");
      throw error;
    }

    await mobilePage.waitForSelector("#map", { timeout: 10000 });
    await mobilePage.waitForTimeout(2000);

    const mobilePath = resolve(distPath, "screenshot-mobile.png");
    await mobilePage.screenshot({
      path: mobilePath,
      type: "png",
    });
    console.log("✓ Generated screenshot-mobile.png");

    await browser.close();
  } finally {
    server.close();
    await rm(tempRoot, { recursive: true, force: true });
  }
}

generateScreenshot().catch((err) => {
  console.error("Error generating screenshots:", err);
  process.exit(1);
});
