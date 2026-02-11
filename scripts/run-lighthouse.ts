import { spawn } from "node:child_process";
import { access, readFile, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";

const DEFAULT_PORT = "4173";
const DEFAULT_URL = `http://localhost:${DEFAULT_PORT}/parkrun-by-public-transport/`;
const reportPath = path.resolve("lighthouse-report.json");
const baselinePath = path.resolve("lighthouse-baseline.json");

const lighthouseUrl = process.env.LIGHTHOUSE_URL ?? DEFAULT_URL;
const lighthousePort = process.env.LIGHTHOUSE_PORT ?? DEFAULT_PORT;
const waitTimeoutMs = Number(process.env.LIGHTHOUSE_TIMEOUT_MS ?? "60000");

const previewArgs = [
  path.resolve("node_modules/vite/bin/vite.js"),
  "preview",
  "--port",
  lighthousePort,
  "--strictPort",
  "--host",
  "localhost",
];

const categories = ["performance", "accessibility", "best-practices", "seo"];

const runCommand = (command: string, args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} exited with code ${code}`));
      }
    });
  });

const waitForServer = async (url: string, timeoutMs: number) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) {
        return;
      }
    } catch {
      // Ignore until the preview server is ready.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`Timed out waiting for preview server at ${url}`);
};

const loadBaseline = async () => {
  try {
    await access(baselinePath, constants.F_OK);
  } catch {
    return null;
  }

  const baselineRaw = await readFile(baselinePath, "utf8");
  return JSON.parse(baselineRaw) as {
    performance: number;
    updatedAt: string;
  };
};

const saveBaseline = async (performance: number) => {
  const baseline = {
    performance,
    updatedAt: new Date().toISOString(),
  };
  await writeFile(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
};

const loadScores = async () => {
  const reportRaw = await readFile(reportPath, "utf8");
  const report = JSON.parse(reportRaw) as {
    categories: Record<string, { score?: number }>;
  };

  const getScore = (key: string) => report.categories?.[key]?.score ?? 0;

  return {
    performance: getScore("performance"),
    accessibility: getScore("accessibility"),
    bestPractices: getScore("best-practices"),
    seo: getScore("seo"),
  };
};

const main = async () => {
  const previewProcess = spawn(process.execPath, previewArgs, {
    stdio: "inherit",
  });

  try {
    await waitForServer(lighthouseUrl, waitTimeoutMs);

    await runCommand("lighthouse", [
      lighthouseUrl,
      "--output=json",
      `--output-path=${reportPath}`,
      `--only-categories=${categories.join(",")}`,
      "--quiet",
      "--chrome-flags=--headless=new --no-sandbox",
    ]);

    const scores = await loadScores();

    const failedCategories = [
      scores.accessibility < 1 ? "accessibility" : null,
      scores.bestPractices < 1 ? "best-practices" : null,
      scores.seo < 1 ? "seo" : null,
    ].filter(Boolean) as string[];

    if (failedCategories.length > 0) {
      throw new Error(
        `Lighthouse scores below 100: ${failedCategories.join(", ")}`,
      );
    }

    const baseline = await loadBaseline();
    if (!baseline) {
      await saveBaseline(scores.performance);
      console.log(
        `Created ${path.basename(baselinePath)} with performance score ${Math.round(scores.performance * 100)}.`,
      );
      return;
    }

    if (scores.performance < baseline.performance) {
      throw new Error(
        `Performance score dropped from ${Math.round(baseline.performance * 100)} to ${Math.round(scores.performance * 100)}.`,
      );
    }

    if (scores.performance > baseline.performance) {
      await saveBaseline(scores.performance);
      console.log(
        `Updated ${path.basename(baselinePath)} to performance score ${Math.round(scores.performance * 100)}.`,
      );
    }
  } finally {
    if (!previewProcess.killed) {
      previewProcess.kill("SIGTERM");
    }
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
