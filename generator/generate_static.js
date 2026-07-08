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

function copyMasterCss(projectDir) {
  ensureFileExists(MASTER_CSS_PATH, "generator/styles.css");

  const targetCssPath = path.join(projectDir, "styles.css");
  fs.copyFileSync(MASTER_CSS_PATH, targetCssPath);
}

function generateProject(projectName) {
  const projectDir = path.join(WEBSITE_ROOT, projectName);
  const contentPath = path.join(projectDir, "content.json");
  const outputPath = path.join(projectDir, "index.html");

  ensureFileExists(TEMPLATE_PATH, "generator/template.html");
  ensureFileExists(contentPath, `${projectName}/content.json`);

  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  const data = readJson(contentPath);

  const html = renderPage(data, template);

  fs.writeFileSync(outputPath, html, "utf8");
  copyMasterCss(projectDir);

  console.log(`✔ Generated: ${projectName}/index.html`);
  console.log(`✔ Copied CSS: ${projectName}/styles.css`);
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
    console.log(`\nDone. Generated ${projects.length} page(s).`);
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