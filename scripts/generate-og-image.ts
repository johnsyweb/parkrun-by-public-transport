import { chromium } from "playwright";
import { resolve } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, "..");

async function generateOgImage() {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
  });

  const port = process.env.PORT || 5173;
  const url = `http://localhost:${port}/parkrun-by-public-transport/`;

  console.log(`Loading page at ${url}...`);
  console.log("Make sure dev server is running with 'pnpm dev'");

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
  } catch (error) {
    console.error(
      "Failed to load page. Make sure dev server is running with 'pnpm dev'",
    );
    throw error;
  }

  // Wait for map to load
  await page.waitForSelector("#map", { timeout: 10000 });

  // Wait for any animations/transitions
  await page.waitForTimeout(2000);

  // Hide UI elements we don't want in OG image
  await page.addStyleTag({
    content: `
      .controls { display: none !important; }
      #sidebar { display: none !important; }
      footer { display: none !important; }
      header h1 { font-size: 2.5rem; margin: 1rem 0; }
      header { background: linear-gradient(135deg, #4A2142 0%, #6B3A5E 100%); color: white; padding: 2rem; }
      #map { height: 600px !important; }
      .leaflet-control { display: none !important; }
    `,
  });

  const pngPath = resolve(rootDir, "public/og-image.png");
  await page.screenshot({
    path: pngPath,
    type: "png",
  });

  await browser.close();
  console.log("✓ Generated og-image.png");
}

generateOgImage().catch((err) => {
  console.error("Error generating og-image.png:", err);
  process.exit(1);
});
