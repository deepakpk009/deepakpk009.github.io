const fs = require("fs");
const path = require("path");

const GENERATOR_DIR = __dirname;
const WEBSITE_ROOT = path.resolve(GENERATOR_DIR, "..");

// Change this if needed.
const SITE_BASE_URL = "https://deepakpk.com";

const EXCLUDED_FOLDERS = new Set([
  "generator",
  ".git",
  ".github",
  "node_modules",
  "code_analysis_tools",
  "images",
  "js"
]);

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function escapeXml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function normalizeUrl(url) {
  if (!hasText(url)) return "";
  return url.endsWith("/") ? url : `${url}/`;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getProjectFolders() {
  return fs.readdirSync(WEBSITE_ROOT)
    .filter((name) => {
      if (EXCLUDED_FOLDERS.has(name)) return false;

      const fullPath = path.join(WEBSITE_ROOT, name);
      if (!fs.statSync(fullPath).isDirectory()) return false;

      return fs.existsSync(path.join(fullPath, "content.json"));
    })
    .sort();
}

function getProjectInfo(projectName) {
  const projectDir = path.join(WEBSITE_ROOT, projectName);
  const contentPath = path.join(projectDir, "content.json");
  const indexPath = path.join(projectDir, "index.html");

  const data = readJson(contentPath);

  const title =
    data.product?.name ||
    data.meta?.title ||
    projectName;

  const description =
    data.meta?.description ||
    data.product?.heroDescription ||
    "";

  const canonical =
    data.meta?.canonical ||
    `${SITE_BASE_URL}/${projectName}/`;

  const url = normalizeUrl(canonical);

  let lastmod = getTodayDate();

  if (fs.existsSync(indexPath)) {
    const stat = fs.statSync(indexPath);
    lastmod = stat.mtime.toISOString().slice(0, 10);
  }

  return {
    projectName,
    title,
    description,
    url,
    lastmod
  };
}

function collectProjects() {
  return getProjectFolders()
    .map(getProjectInfo)
    .filter((item) => hasText(item.url));
}

function generateRobotsTxt(projects) {
  const content = `User-agent: *
Allow: /

Sitemap: ${SITE_BASE_URL}/sitemap.xml
Sitemap: ${SITE_BASE_URL}/sitemap.txt

# AI / LLM crawler info
# ${SITE_BASE_URL}/llm.txt
# ${SITE_BASE_URL}/llm.md
`;

  fs.writeFileSync(path.join(WEBSITE_ROOT, "robots.txt"), content, "utf8");
  console.log("✔ Generated: robots.txt");
}

function generateSitemapXml(projects) {
  const urls = projects.map((item) => {
    return `  <url>
    <loc>${escapeXml(item.url)}</loc>
    <lastmod>${escapeXml(item.lastmod)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;

  fs.writeFileSync(path.join(WEBSITE_ROOT, "sitemap.xml"), xml, "utf8");
  console.log("✔ Generated: sitemap.xml");
}

function generateSitemapTxt(projects) {
  const content = projects
    .map((item) => item.url)
    .join("\n") + "\n";

  fs.writeFileSync(path.join(WEBSITE_ROOT, "sitemap.txt"), content, "utf8");
  console.log("✔ Generated: sitemap.txt");
}

function generateLlmTxt(projects) {
  const lines = [];

  lines.push("# Deepak PK Apps");
  lines.push("");
  lines.push("Official app landing pages by Deepak PK.");
  lines.push("");
  lines.push("This file is intended to help AI crawlers and language models understand the available app pages on this website.");
  lines.push("");
  lines.push("## Apps");

  projects.forEach((item) => {
    lines.push("");
    lines.push(`- ${item.title}`);
    lines.push(`  URL: ${item.url}`);

    if (hasText(item.description)) {
      lines.push(`  Description: ${item.description}`);
    }
  });

  lines.push("");

  fs.writeFileSync(path.join(WEBSITE_ROOT, "llm.txt"), lines.join("\n"), "utf8");
  console.log("✔ Generated: llm.txt");
}

function generateLlmMd(projects) {
  const lines = [];

  lines.push("# Deepak PK Apps");
  lines.push("");
  lines.push("Official app landing pages by Deepak PK.");
  lines.push("");
  lines.push("This file summarizes the available application pages for crawlers, AI search tools, and language models.");
  lines.push("");
  lines.push("## App Pages");

  projects.forEach((item) => {
    lines.push("");
    lines.push(`### ${item.title}`);
    lines.push("");
    lines.push(`- URL: ${item.url}`);
    lines.push(`- Last Updated: ${item.lastmod}`);

    if (hasText(item.description)) {
      lines.push(`- Description: ${item.description}`);
    }
  });

  lines.push("");

  fs.writeFileSync(path.join(WEBSITE_ROOT, "llm.md"), lines.join("\n"), "utf8");
  console.log("✔ Generated: llm.md");
}

function generateAll() {
  const projects = collectProjects();

  if (!projects.length) {
    console.log("No project folders found. Each project folder should contain content.json.");
    process.exit(1);
  }

  generateRobotsTxt(projects);
  generateSitemapXml(projects);
  generateSitemapTxt(projects);
  generateLlmTxt(projects);
  generateLlmMd(projects);

  console.log(`\nDone. Generated site-wide SEO files for ${projects.length} project(s).`);
}

try {
  generateAll();
} catch (err) {
  console.error("\nSEO generation failed:");
  console.error(err.message);
  process.exit(1);
}