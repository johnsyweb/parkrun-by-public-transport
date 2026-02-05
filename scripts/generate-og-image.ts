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

  // Create a static HTML template for the OG image
  // No server needed - just render the HTML directly
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>parkrun Events Near Public Transport in Victoria</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400;1,700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Atkinson Hyperlegible', sans-serif;
      background: linear-gradient(135deg, #4A2142 0%, #6B3A5E 100%);
      color: white;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 100vh;
      padding: 2rem;
    }
    .container {
      text-align: center;
      max-width: 1000px;
    }
    h1 {
      font-size: 3.5rem;
      font-weight: 700;
      margin-bottom: 1rem;
      line-height: 1.2;
    }
    .tagline {
      font-size: 1.8rem;
      font-weight: 400;
      opacity: 0.95;
      margin-bottom: 2rem;
    }
    .features {
      display: flex;
      justify-content: space-around;
      margin-top: 2rem;
      gap: 2rem;
    }
    .feature {
      flex: 1;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      backdrop-filter: blur(10px);
    }
    .feature-icon {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
    }
    .feature-text {
      font-size: 1rem;
      font-weight: 500;
    }
    .bottom-text {
      margin-top: 3rem;
      font-size: 0.95rem;
      opacity: 0.85;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏃 parkrun Events<br>Near Public Transport<br>in Victoria 🇦🇺</h1>
    <p class="tagline">Find running clubs accessible by train, tram, bus & metro</p>
    <div class="features">
      <div class="feature">
        <div class="feature-icon">🗺️</div>
        <div class="feature-text">Interactive Map</div>
      </div>
      <div class="feature">
        <div class="feature-icon">🚇</div>
        <div class="feature-text">Public Transport</div>
      </div>
      <div class="feature">
        <div class="feature-icon">📍</div>
        <div class="feature-text">Smart Filtering</div>
      </div>
    </div>
    <div class="bottom-text">johnsy.com/parkrun-by-public-transport</div>
  </div>
</body>
</html>`;

  await page.setContent(html);

  // Wait for fonts to load
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);

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
