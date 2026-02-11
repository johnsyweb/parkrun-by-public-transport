import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const projectRoot = path.resolve(__dirname, "..");
const iconsDir = path.join(projectRoot, "public", "icons");
const sourceSvg = path.join(iconsDir, "tree.svg");

const targets = [
  { size: 180, name: "tree-180.png" },
  { size: 192, name: "tree-192.png" },
  { size: 512, name: "tree-512.png" },
];

await mkdir(iconsDir, { recursive: true });

await Promise.all(
  targets.map(async ({ size, name }) => {
    const outputPath = path.join(iconsDir, name);
    await sharp(sourceSvg)
      .resize(size, size, { fit: "contain" })
      .png()
      .toFile(outputPath);
  }),
);

console.log("Generated PNG icons from tree.svg");
