const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const appJs = fs.readFileSync(path.join(__dirname, "..", "app.js"), "utf8");

function extractFunction(name) {
  const pattern = new RegExp(`function ${name}\\([^)]*\\) {[\\s\\S]*?^}`, "m");
  const match = appJs.match(pattern);
  assert.ok(match, `Expected to find function ${name} in app.js`);
  return match[0];
}

const sandbox = { module: { exports: {} }, exports: {} };
const bootstrap = `
${extractFunction("hasText")}
${extractFunction("normalizeVideoOrientation")}
${extractFunction("buildVideoHtml")}
module.exports = { normalizeVideoOrientation, buildVideoHtml };
`;

vm.runInNewContext(bootstrap, sandbox);

const { normalizeVideoOrientation, buildVideoHtml } = sandbox.module.exports;

test("normalizeVideoOrientation defaults invalid values to portrait", () => {
  assert.equal(normalizeVideoOrientation(undefined), "portrait");
  assert.equal(normalizeVideoOrientation("square"), "portrait");
  assert.equal(normalizeVideoOrientation("landscape"), "landscape");
});

test("buildVideoHtml applies the requested video frame orientation", () => {
  const landscapeHtml = buildVideoHtml({
    media: {
      videoOrientation: "landscape",
      video: {
        sectionId: "demo",
        title: "Video Demo",
        youtubeEmbedUrl: "https://www.youtube.com/embed/example12345",
        iframeTitle: "Demo video"
      }
    }
  });

  const portraitHtml = buildVideoHtml({
    media: {
      video: {
        sectionId: "demo",
        title: "Video Demo",
        youtubeEmbedUrl: "https://www.youtube.com/embed/example12345",
        iframeTitle: "Demo video"
      }
    }
  });

  assert.match(landscapeHtml, /video-container is-landscape/);
  assert.match(portraitHtml, /video-container is-portrait/);
});
