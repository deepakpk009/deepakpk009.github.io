const fs = require("fs");
const path = require("path");
const { renderPage } = require("./renderer");

const GENERATOR_DIR = __dirname;
const WEBSITE_ROOT = path.resolve(GENERATOR_DIR, "..");
const TEMPLATE_PATH = path.join(GENERATOR_DIR, "template.html");

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

function generateProject(projectName) {
  const projectDir = path.join(WEBSITE_ROOT, projectName);
  const contentPath = path.join(projectDir, "content.json");
  const outputPath = path.join(projectDir, "index.html");

  ensureFileExists(TEMPLATE_PATH, "template.html");
  ensureFileExists(contentPath, "content.json");

  const template = fs.readFileSync(TEMPLATE_PATH, "utf8");
  const data = readJson(contentPath);
  const html = renderPage(data, template);

  fs.writeFileSync(outputPath, html, "utf8");

  console.log(`✔ Generated: ${projectName}/index.html`);
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
      console.log("No project folders found.");
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