import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const nextRoot = path.join(root, ".next");
const manifestPath = path.join(nextRoot, "build-manifest.json");

if (!fs.existsSync(manifestPath)) {
  throw new Error("Missing .next/build-manifest.json. Run `npm run build` first.");
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const filesFor = (route) => new Set([...(manifest.pages["/_app"] ?? []), ...(manifest.pages[route] ?? [])]);
const initialFiles = filesFor("/");
const resumeFiles = filesFor("/resume");
const sizeOf = (relativePath) => fs.statSync(path.join(nextRoot, relativePath)).size;
const total = (files) => files.reduce((sum, file) => sum + sizeOf(file), 0);
const initialJs = [...initialFiles].filter((file) => file.endsWith(".js"));
const initialCss = [...initialFiles].filter((file) => file.endsWith(".css"));
const resumeJs = [...resumeFiles].filter((file) => file.endsWith(".js"));
const resumeCss = [...resumeFiles].filter((file) => file.endsWith(".css"));
const fontDir = path.join(root, "public", "fonts");
const fonts = fs.readdirSync(fontDir).filter((file) => file.endsWith(".woff2"));
const fontBytes = fonts.reduce((sum, file) => sum + fs.statSync(path.join(fontDir, file)).size, 0);

const budgets = [
  ["initial JavaScript", total(initialJs), 475 * 1024],
  ["initial CSS", total(initialCss), 76 * 1024],
  ["resume JavaScript", total(resumeJs), 400 * 1024],
  ["resume CSS", total(resumeCss), 78 * 1024],
  ["local WOFF2 fonts", fontBytes, 160 * 1024],
];

const failures = budgets.filter(([, actual, limit]) => actual > limit);
for (const [label, actual, limit] of budgets) {
  const mark = actual <= limit ? "PASS" : "FAIL";
  console.log(`${mark} ${label}: ${(actual / 1024).toFixed(1)} KiB / ${(limit / 1024).toFixed(0)} KiB`);
}

const globalCss = fs.readFileSync(path.join(root, "styles", "globals.css"), "utf8");
if (/fonts\.(googleapis|gstatic)\.com/.test(globalCss)) {
  failures.push(["external font request", 1, 0]);
  console.error("FAIL external font request remains in globals.css");
}

if (failures.length) process.exitCode = 1;
