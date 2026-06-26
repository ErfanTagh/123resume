/**
 * Post-build prerender step (SEO).
 *
 * Serves the freshly built `dist/` over a tiny static server, opens each public
 * route in headless Chromium, waits for the React app to render, and writes the
 * finished HTML back to `dist/<route>/index.html`. Crawlers then receive full
 * HTML; real users still get the normal SPA (main.tsx hydrates the markup).
 *
 * Uses maintained Puppeteer (bundled Chrome) — no react-snap / ancient Chromium.
 */
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import puppeteer from "puppeteer";

const DIST = join(process.cwd(), "dist");
const PORT = 45678;

// Public, indexable routes to prerender. Keep in sync with sitemap/robots.
const ROUTES = [
  "/",
  "/templates",
  "/pricing",
  "/about",
  "/careers",
  "/contact",
  "/privacy",
  "/terms",
  "/data-protection",
  "/cookies",
  "/blog",
  "/blog/resume-mistakes",
  "/blog/ats-friendly-resume",
  "/blog/quantifying-achievements",
  "/blog/remote-job-applications",
  "/blog/career-change-resume",
  "/blog/cover-letter-vs-resume",
];

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
};

// Static server: serve real files, fall back to index.html for SPA routes.
function startServer() {
  return new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      try {
        const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
        let filePath = join(DIST, urlPath);
        if (!extname(filePath) || !existsSync(filePath)) {
          filePath = join(DIST, "index.html");
        }
        const body = await readFile(filePath);
        res.setHeader("Content-Type", MIME[extname(filePath)] || "application/octet-stream");
        res.end(body);
      } catch {
        res.statusCode = 500;
        res.end("error");
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

async function run() {
  if (!existsSync(join(DIST, "index.html"))) {
    console.error("[prerender] dist/index.html not found — run vite build first.");
    process.exit(1);
  }

  const server = await startServer();
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  let failed = 0;
  try {
    for (const route of ROUTES) {
      const page = await browser.newPage();
      try {
        await page.goto(`http://localhost:${PORT}${route}`, {
          waitUntil: "networkidle2",
          timeout: 45000,
        });
        // Give React a beat to finish painting.
        await new Promise((r) => setTimeout(r, 400));
        const html = "<!DOCTYPE html>" + (await page.evaluate(() => document.documentElement.outerHTML));

        const outDir = route === "/" ? DIST : join(DIST, route);
        await mkdir(outDir, { recursive: true });
        await writeFile(join(outDir, "index.html"), html, "utf8");
        console.log(`[prerender] ✓ ${route}`);
      } catch (err) {
        failed++;
        console.error(`[prerender] ✗ ${route}: ${err.message}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  if (failed > 0) {
    console.error(`[prerender] ${failed} route(s) failed.`);
    process.exit(1);
  }
  console.log(`[prerender] done — ${ROUTES.length} routes.`);
}

run();
