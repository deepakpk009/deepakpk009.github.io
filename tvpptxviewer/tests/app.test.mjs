import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appPath = path.join(__dirname, "..", "app.js");

async function loadAppContext() {
  const source = await fs.readFile(appPath, "utf8");
  const bootlessSource = source.replace(/\nmain\(\)\.catch\([\s\S]*$/, "\n");

  const documentStub = {
    body: { innerHTML: "" },
    head: { appendChild() {} },
    documentElement: { lang: "en", style: { setProperty() {} } },
    createElement() {
      return {
        setAttribute() {},
        appendChild() {},
        remove() {},
        style: {},
        sizes: "",
        rel: "",
        href: ""
      };
    },
    getElementById() {
      return null;
    },
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [];
    },
    addEventListener() {}
  };

  const context = {
    console,
    document: documentStub,
    fetch: async () => ({ ok: true, json: async () => ({}) }),
    setInterval,
    clearInterval
  };
  context.window = context;
  context.globalThis = context;

  vm.createContext(context);
  vm.runInContext(bootlessSource, context, { filename: appPath });
  return context;
}

test("buildHeroHtml applies portrait orientation class to the screenshot container", async () => {
  const { buildHeroHtml } = await loadAppContext();

  const html = buildHeroHtml({
    product: {
      heroTitle: "TV PPTX Viewer",
      heroDescription: "Read documents fast."
    },
    media: {
      screenshotOrientation: "portrait",
      screenshots: [{ src: "images/screenshots/ss001.jpg", alt: "Portrait screenshot" }]
    }
  });

  assert.match(html, /screenshots-container is-portrait/);
});

test("buildHeroHtml applies landscape orientation class to the screenshot container", async () => {
  const { buildHeroHtml } = await loadAppContext();

  const html = buildHeroHtml({
    product: {
      heroTitle: "TV PPTX Viewer",
      heroDescription: "Read documents fast."
    },
    media: {
      screenshotOrientation: "landscape",
      screenshots: [{ src: "images/screenshots/ss001.jpg", alt: "Landscape screenshot" }]
    }
  });

  assert.match(html, /screenshots-container is-landscape/);
});
