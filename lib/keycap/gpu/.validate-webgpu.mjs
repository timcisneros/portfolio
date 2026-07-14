import fs from "node:fs";
import http from "node:http";
import { chromium } from "@playwright/test";

const source = fs.readFileSync(new URL("./shader.ts", import.meta.url), "utf8");
const kernelSource = fs.readFileSync(new URL("../kernel.ts", import.meta.url), "utf8");
const kernel = Object.fromEntries(Array.from(kernelSource.matchAll(/^\s*(\w+):\s*(-?[\d.]+),/gm), ([, key, value]) => [key, Number(value)]));
const match = source.match(/\/\* wgsl \*\/ `([\s\S]*)`;/);
if (!match) throw new Error("WGSL source not found");
const shader = match[1].replace(/\$\{K\.(\w+)(?:\s*\*\s*([\d.]+))?\}/g, (_expression, key, multiplier) => {
  if (!(key in kernel)) throw new Error(`Unknown kernel constant ${key}`);
  return String(kernel[key] * (multiplier ? Number(multiplier) : 1));
});
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium-browser",
  headless: true,
  args: [
    "--enable-unsafe-webgpu",
    "--enable-features=WebGPU",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
  ],
});
const server = http.createServer((_request, response) => response.end("<!doctype html><title>WGSL validation</title>"));
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const page = await browser.newPage();
await page.goto(`http://127.0.0.1:${address.port}`);
const result = await page.evaluate(async (code) => {
  if (!navigator.gpu) return { unsupported: "navigator.gpu unavailable" };
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) return { unsupported: "adapter unavailable" };
  const device = await adapter.requestDevice();
  const module = device.createShaderModule({ code });
  const info = await module.getCompilationInfo();
  return { messages: info.messages.map((message) => ({ type: message.type, message: message.message, line: message.lineNum })) };
}, shader);
await browser.close();
server.close();
console.log(JSON.stringify(result, null, 2));
if ("unsupported" in result || result.messages.some((message) => message.type === "error")) process.exit(1);
