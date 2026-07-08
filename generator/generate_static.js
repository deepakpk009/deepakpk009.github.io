const fs = require("fs");
const path = require("path");
const { renderPage } = require("./renderer");

const GENERATOR_DIR = __dirname;
const WEBSITE_ROOT = path.resolve(GENERATOR_DIR, "..");

const TEMPLATE_PATH = path.join(GENERATOR_DIR, "template.html");
const MASTER_CSS_PATH = path.join(GENERATOR_DIR, "styles.css");

function ensureFileExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function getProjectFolders() {
  return fs.readdirSync(WEBSITE_ROOT)
    .filter((name) => {
      if (name === "generator") return false;

      const fullPath = path.join(WEBSITE_ROOT, name);
      if (!fs.statSync(fullPath).isDirectory()) return false;

      return fs.existsSync(path.join(fullPath, "content.json"));
    })
    .sort();
}

function copyMasterCss(projectDir, projectName) {
  ensureFileExists(MASTER_CSS_PATH, "generator/styles.css");

  const targetCssPath = path.join(projectDir, "styles.css");
  fs.copyFileSync(MASTER_CSS_PATH, targetCssPath);

  console.log(`✔ Copied CSS: ${projectName}/styles.css`);
}

function buildManifest(data, projectName) {
  const product = data.product || {};
  const meta = data.meta || {};
  const theme = data.theme || {};

  const name = product.name || meta.title || projectName;
  const description = meta.description || product.heroDescription || "";
  const icon = product.icon || "images/app_icon.png";

  const primaryColor = theme.primary || theme.primaryGreen || "#4CAF50";
  const backgroundColor = theme.background || theme.darkBg || "#121212";

  return {
    name,
    short_name: name.length > 12 ? name.slice(0, 12) : name,
    description,
    start_url: `/${projectName}/`,
    scope: `/${projectName}/`,
    display: "standalone",
    background_color: backgroundColor,
    theme_color: primaryColor,
    icons: [
      {
        src: icon,
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: icon,
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}

function generateManifest(projectDir, projectName, data) {
  const manifest = buildManifest(data, projectName);
  const outputPath = path.join(projectDir, "manifest.webmanifest");

  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2), "utf8");

  console.log(`✔ Generated: ${projectName}/manifest.webmanifest`);
}

function generateProject(projectName) {
  const projectDir = path.join(WEBSITE_ROOT, projectName);
  const contentPath = path.join(projectDir, "content.json");
  const outputPath = path.join(projectDir, "index.html");

  ensureFileExists(TEMPLATE_PATH, "generator/template.html");
  ensureFileExists(MASTER_CSS_PATH, "generator/styles.css");
  ensureFileExists(contentPath, `${projectName}/content.json`);

  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  const data = readJson(contentPath);

  const html = renderPage(data, template);

  fs.writeFileSync(outputPath, html, "utf8");
  console.log(`✔ Generated: ${projectName}/index.html`);

  copyMasterCss(projectDir, projectName);
  generateManifest(projectDir, projectName, data);
}

function printHelp() {
  console.log(`
Usage:
  node generator/generate_static.js <project-folder>
  node generator/generate_static.js --all

Examples:
  node generator/generate_static.js dittoscan
  node generator/generate_static.js browsepad
  node generator/generate_static.js --all
`);
}

function main() {
  const arg = process.argv[2];

  if (!arg || arg === "--help" || arg === "-h") {
    printHelp();
    process.exit(arg ? 0 : 1);
  }

  if (arg === "--all") {
    const projects = getProjectFolders();

    if (!projects.length) {
      console.log("No project folders found. Each project folder should contain content.json.");
      process.exit(1);
    }

    projects.forEach(generateProject);
    console.log(`\nDone. Generated ${projects.length} product page(s).`);
    return;
  }

  generateProject(arg);
}

try {
  main();
} catch (err) {
  console.error("\nGeneration failed:");
  console.error(err.message);
  process.exit(1);
}