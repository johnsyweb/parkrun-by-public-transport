import { chromium } from "playwright";
import { createServer } from "http-server";
import { cp, mkdtemp, rm } from "fs/promises";
import type { Server } from "http";
import { tmpdir } from "os";
import { dirname, join, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

type HttpServerInstance = ReturnType<typeof createServer> & {
  server: Server;
};

async function listen(httpServer: HttpServerInstance): Promise<number> {
  return new Promise((resolveListen, reject) => {
    httpServer.server.once("error", reject);
    httpServer.listen(0, "127.0.0.1", () => {
      const address = httpServer.server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to bind screenshot server"));
        return;
      }
      resolveListen(address.port);
    });
  });
}

async function generateScreenshot() {
  const distPath = resolve(rootDir, "dist");
  const tempRoot = await mkdtemp(join(tmpdir(), "pr-by-pt-"));
  const servedRoot = join(tempRoot, "site");
  const basePath = join(servedRoot, "parkrun-by-public-transport");

  await cp(distPath, basePath, { recursive: true });

  const httpServer = createServer({
    root: servedRoot,
  }) as HttpServerInstance;

  const port = await listen(httpServer);
  console.log(`Serving ${distPath} on http://127.0.0.1:${port}`);

  try {
    const browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    });

    const url = `http://127.0.0.1:${port}/parkrun-by-public-transport/`;
    console.log(`Loading page at ${url}...`);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Event list is rendered only after data load + nearest-stop calculation.
    // That work can block the main thread; use a long wall-clock timeout.
    await page.waitForFunction(
      () => {
        const loading = document.querySelector("#event-list .loading");
        return !loading || !/loading events/i.test(loading.textContent ?? "");
      },
      { timeout: 180000 },
    );

    await page.evaluate(() => {
      window.dispatchEvent(new Event("resize"));
    });
    await page.waitForTimeout(1000);

    // Social preview and docs use this capture (see og:image in index.html).
    const desktopPath = resolve(distPath, "screenshot-desktop.png");
    await page.screenshot({
      path: desktopPath,
      type: "png",
    });
    // Keep public/ in sync so local Vite builds ship the latest capture.
    await cp(desktopPath, resolve(rootDir, "public/screenshot-desktop.png"));
    console.log("✓ Generated screenshot-desktop.png");

    await browser.close();
  } finally {
    await new Promise<void>((resolveClose) => {
      httpServer.server.close(() => resolveClose());
    });
    await rm(tempRoot, { recursive: true, force: true });
  }
}

generateScreenshot().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  if (message.includes("Executable doesn't exist")) {
    console.error(
      "Error generating screenshots: Playwright browsers are not installed.\n" +
        "Run: aube exec playwright install chromium",
    );
  } else {
    console.error("Error generating screenshots:", err);
  }
  process.exit(1);
});
