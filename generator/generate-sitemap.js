#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

const SITE_NAME = "Apps by Deepak";
const SITE_URL = "https://deepakpk.com";

// The generator folder is expected to be directly inside the website root.
const ROOT_DIRECTORY = path.resolve(__dirname, "..");

// Input file.
const PROJECTS_FILE = path.join(
    ROOT_DIRECTORY,
    "apps",
    "projects.json"
);

// Root-level sitemap files.
const XML_OUTPUT_FILE = path.join(
    ROOT_DIRECTORY,
    "sitemap.xml"
);

const TEXT_OUTPUT_FILE = path.join(
    ROOT_DIRECTORY,
    "sitemap.txt"
);

// Human-readable HTML sitemap.
const HTML_OUTPUT_DIRECTORY = path.join(
    ROOT_DIRECTORY,
    "sitemap"
);

const HTML_OUTPUT_FILE = path.join(
    HTML_OUTPUT_DIRECTORY,
    "index.html"
);

/**
 * Add static pages that are not included in projects.json.
 *
 * Optional fields:
 * - description
 * - thumbnail
 * - lastModified
 * - changeFrequency
 * - priority
 */
const STATIC_PAGES = [
    {
        title: "Apps by Deepak",
        description:
            "Explore Android, Android TV, Fire TV, and mobile applications developed by Deepak.",
        url: `${SITE_URL}/`,
        priority: 1.0,
        changeFrequency: "weekly"
    },
    {
        title: "All Apps",
        description:
            "Browse all applications developed by Deepak.",
        url: `${SITE_URL}/apps/`,
        priority: 0.9,
        changeFrequency: "weekly"
    },
    {
        title: "Website Sitemap",
        description:
            "Browse all application and product pages available on the website.",
        url: `${SITE_URL}/sitemap/`,
        priority: 0.4,
        changeFrequency: "weekly"
    }
];

const VALID_CHANGE_FREQUENCIES = new Set([
    "always",
    "hourly",
    "daily",
    "weekly",
    "monthly",
    "yearly",
    "never"
]);

// -----------------------------------------------------------------------------
// File helpers
// -----------------------------------------------------------------------------

function readJsonFile(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Input file not found: ${filePath}`);
    }

    let content;

    try {
        content = fs.readFileSync(filePath, "utf8");
    } catch (error) {
        throw new Error(
            `Could not read ${filePath}: ${error.message}`
        );
    }

    try {
        return JSON.parse(content);
    } catch (error) {
        throw new Error(
            `Invalid JSON in ${filePath}: ${error.message}`
        );
    }
}

function ensureDirectory(directoryPath) {
    fs.mkdirSync(directoryPath, {
        recursive: true
    });
}

function writeTextFile(filePath, content) {
    try {
        fs.writeFileSync(filePath, content, "utf8");
    } catch (error) {
        throw new Error(
            `Could not write ${filePath}: ${error.message}`
        );
    }
}

// -----------------------------------------------------------------------------
// Validation and normalization
// -----------------------------------------------------------------------------

function normalizeText(value) {
    return typeof value === "string"
        ? value.trim()
        : "";
}

function normalizeUrl(value) {
    const rawUrl = normalizeText(value);

    if (!rawUrl) {
        return null;
    }

    try {
        const parsedUrl = new URL(rawUrl);

        if (
            parsedUrl.protocol !== "https:" &&
            parsedUrl.protocol !== "http:"
        ) {
            return null;
        }

        // Fragments should not normally be included in a sitemap.
        parsedUrl.hash = "";

        return parsedUrl.toString();
    } catch {
        return null;
    }
}

function normalizeLastModified(value) {
    const rawValue = normalizeText(value);

    if (!rawValue) {
        return null;
    }

    const parsedDate = new Date(rawValue);

    if (Number.isNaN(parsedDate.getTime())) {
        return null;
    }

    return parsedDate.toISOString().split("T")[0];
}

function normalizeChangeFrequency(value) {
    const normalizedValue = normalizeText(value).toLowerCase();

    if (!VALID_CHANGE_FREQUENCIES.has(normalizedValue)) {
        return null;
    }

    return normalizedValue;
}

function normalizePriority(value) {
    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return null;
    }

    const parsedValue = Number(value);

    if (
        !Number.isFinite(parsedValue) ||
        parsedValue < 0 ||
        parsedValue > 1
    ) {
        return null;
    }

    return parsedValue.toFixed(1);
}

function createFallbackTitle(url) {
    try {
        const parsedUrl = new URL(url);

        const pathname = parsedUrl.pathname
            .replace(/^\/+|\/+$/g, "");

        if (!pathname) {
            return parsedUrl.hostname;
        }

        const finalPathSegment = pathname
            .split("/")
            .filter(Boolean)
            .pop();

        return finalPathSegment
            .replace(/[-_]+/g, " ")
            .replace(/\b\w/g, character =>
                character.toUpperCase()
            );
    } catch {
        return "Website Page";
    }
}

// -----------------------------------------------------------------------------
// Escaping helpers
// -----------------------------------------------------------------------------

function escapeXml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&apos;");
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// -----------------------------------------------------------------------------
// Page normalization
// -----------------------------------------------------------------------------

function normalizeProject(project, index) {
    if (
        !project ||
        typeof project !== "object" ||
        Array.isArray(project)
    ) {
        console.warn(
            `Skipping project #${index + 1}: entry is not an object.`
        );

        return null;
    }

    const url = normalizeUrl(project.url);

    if (!url) {
        console.warn(
            `Skipping project #${index + 1}: missing or invalid URL.`
        );

        return null;
    }

    const title =
        normalizeText(project.title) ||
        createFallbackTitle(url);

    return {
        title,
        description: normalizeText(project.description),
        thumbnail: normalizeUrl(project.thumbnail),
        url,
        lastModified: normalizeLastModified(
            project.lastModified || project.lastmod
        ),
        changeFrequency: normalizeChangeFrequency(
            project.changeFrequency || project.changefreq
        ),
        priority: normalizePriority(project.priority),
        type: "project"
    };
}

function normalizeStaticPage(page, index) {
    if (
        !page ||
        typeof page !== "object" ||
        Array.isArray(page)
    ) {
        console.warn(
            `Skipping static page #${index + 1}: entry is not an object.`
        );

        return null;
    }

    const url = normalizeUrl(page.url);

    if (!url) {
        console.warn(
            `Skipping static page #${index + 1}: invalid URL.`
        );

        return null;
    }

    return {
        title:
            normalizeText(page.title) ||
            createFallbackTitle(url),
        description: normalizeText(page.description),
        thumbnail: normalizeUrl(page.thumbnail),
        url,
        lastModified: normalizeLastModified(
            page.lastModified || page.lastmod
        ),
        changeFrequency: normalizeChangeFrequency(
            page.changeFrequency || page.changefreq
        ),
        priority: normalizePriority(page.priority),
        type: "static"
    };
}

function removeDuplicateUrls(pages) {
    const uniquePages = [];
    const seenUrls = new Set();

    for (const page of pages) {
        if (!page) {
            continue;
        }

        const duplicateKey = page.url.toLowerCase();

        if (seenUrls.has(duplicateKey)) {
            console.warn(
                `Skipping duplicate URL: ${page.url}`
            );

            continue;
        }

        seenUrls.add(duplicateKey);
        uniquePages.push(page);
    }

    return uniquePages;
}

function loadPages() {
    const data = readJsonFile(PROJECTS_FILE);

    if (!Array.isArray(data.projects)) {
        throw new Error(
            'projects.json must contain a top-level "projects" array.'
        );
    }

    const staticPages = STATIC_PAGES
        .map(normalizeStaticPage)
        .filter(Boolean);

    const projectPages = data.projects
        .map(normalizeProject)
        .filter(Boolean);

    const pages = removeDuplicateUrls([
        ...staticPages,
        ...projectPages
    ]);

    if (pages.length === 0) {
        throw new Error(
            "No valid URLs were found for sitemap generation."
        );
    }

    return pages;
}

// -----------------------------------------------------------------------------
// XML sitemap
// -----------------------------------------------------------------------------

function generateXmlUrlEntry(page) {
    const lines = [
        "  <url>",
        `    <loc>${escapeXml(page.url)}</loc>`
    ];

    if (page.lastModified) {
        lines.push(
            `    <lastmod>${escapeXml(page.lastModified)}</lastmod>`
        );
    }

    if (page.changeFrequency) {
        lines.push(
            `    <changefreq>${escapeXml(page.changeFrequency)}</changefreq>`
        );
    }

    if (page.priority !== null) {
        lines.push(
            `    <priority>${escapeXml(page.priority)}</priority>`
        );
    }

    if (page.thumbnail) {
        lines.push("    <image:image>");

        lines.push(
            `      <image:loc>${escapeXml(page.thumbnail)}</image:loc>`
        );

        if (page.title) {
            lines.push(
                `      <image:title>${escapeXml(page.title)}</image:title>`
            );
        }

        if (page.description) {
            lines.push(
                `      <image:caption>${escapeXml(page.description)}</image:caption>`
            );
        }

        lines.push("    </image:image>");
    }

    lines.push("  </url>");

    return lines.join("\n");
}

function generateXmlSitemap(pages) {
    const entries = pages
        .map(generateXmlUrlEntry)
        .join("\n");

    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
        '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
        entries,
        "</urlset>",
        ""
    ].join("\n");
}

// -----------------------------------------------------------------------------
// Text sitemap
// -----------------------------------------------------------------------------

function generateTextSitemap(pages) {
    return `${pages
        .map(page => page.url)
        .join("\n")}\n`;
}

// -----------------------------------------------------------------------------
// HTML sitemap
// -----------------------------------------------------------------------------

function generateProjectCard(page) {
    const imageHtml = page.thumbnail
        ? `
                    <div class="app-icon-wrapper">
                        <img
                            class="app-icon"
                            src="${escapeHtml(page.thumbnail)}"
                            alt="${escapeHtml(page.title)} app icon"
                            width="84"
                            height="84"
                            loading="lazy"
                            decoding="async"
                        >
                    </div>`
        : `
                    <div
                        class="app-icon-wrapper app-icon-placeholder"
                        aria-hidden="true"
                    >
                        ${escapeHtml(
                            page.title.charAt(0).toUpperCase()
                        )}
                    </div>`;

    const descriptionHtml = page.description
        ? `<p>${escapeHtml(page.description)}</p>`
        : "";

    return `
                <article class="app-card">
                    ${imageHtml}

                    <div class="app-content">
                        <h2>
                            <a href="${escapeHtml(page.url)}">
                                ${escapeHtml(page.title)}
                            </a>
                        </h2>

                        ${descriptionHtml}

                        <a
                            class="visit-link"
                            href="${escapeHtml(page.url)}"
                            aria-label="View ${escapeHtml(page.title)} product page"
                        >
                            View product page
                            <span aria-hidden="true">→</span>
                        </a>
                    </div>
                </article>`;
}

function generateStaticPageItem(page) {
    const descriptionHtml = page.description
        ? `<span>${escapeHtml(page.description)}</span>`
        : "";

    return `
                    <li>
                        <a href="${escapeHtml(page.url)}">
                            ${escapeHtml(page.title)}
                        </a>

                        ${descriptionHtml}
                    </li>`;
}

function generateHtmlSitemap(pages) {
    const projectPages = pages.filter(
        page => page.type === "project"
    );

    const staticPages = pages.filter(
        page => page.type === "static"
    );

    const generatedDate = new Intl.DateTimeFormat(
        "en",
        {
            dateStyle: "long",
            timeZone: "UTC"
        }
    ).format(new Date());

    const projectCards = projectPages
        .map(generateProjectCard)
        .join("\n");

    const staticPageItems = staticPages
        .map(generateStaticPageItem)
        .join("\n");

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    >

    <title>Website Sitemap | ${escapeHtml(SITE_NAME)}</title>

    <meta
        name="description"
        content="Browse all application and product pages available on ${escapeHtml(SITE_NAME)}."
    >

    <meta
        name="robots"
        content="index, follow"
    >

    <link
        rel="canonical"
        href="${escapeHtml(`${SITE_URL}/sitemap/`)}"
    >

    <link
        rel="sitemap"
        type="application/xml"
        title="XML Sitemap"
        href="${escapeHtml(`${SITE_URL}/sitemap.xml`)}"
    >

    <style>
        :root {
            color-scheme: light dark;

            --page-background: #f5f7fb;
            --card-background: #ffffff;
            --text-primary: #172033;
            --text-secondary: #5c667a;
            --border-color: #e1e6ef;
            --accent-color: #1769e0;
            --accent-hover: #0d51b8;
            --shadow-color: rgba(28, 43, 72, 0.08);
        }

        @media (prefers-color-scheme: dark) {
            :root {
                --page-background: #0d1119;
                --card-background: #161c27;
                --text-primary: #f1f5fb;
                --text-secondary: #aab4c5;
                --border-color: #2a3342;
                --accent-color: #72a9ff;
                --accent-hover: #9bc1ff;
                --shadow-color: rgba(0, 0, 0, 0.25);
            }
        }

        * {
            box-sizing: border-box;
        }

        html {
            scroll-behavior: smooth;
        }

        body {
            margin: 0;
            background: var(--page-background);
            color: var(--text-primary);
            font-family:
                Inter,
                -apple-system,
                BlinkMacSystemFont,
                "Segoe UI",
                Roboto,
                Helvetica,
                Arial,
                sans-serif;
            line-height: 1.6;
        }

        a {
            color: var(--accent-color);
        }

        a:hover {
            color: var(--accent-hover);
        }

        .page-container {
            width: min(1120px, calc(100% - 32px));
            margin: 0 auto;
            padding: 56px 0;
        }

        .page-header {
            max-width: 760px;
            margin-bottom: 42px;
        }

        .page-header h1 {
            margin: 0 0 12px;
            font-size: clamp(2rem, 5vw, 3.5rem);
            line-height: 1.12;
            letter-spacing: -0.04em;
        }

        .page-header p {
            margin: 0;
            color: var(--text-secondary);
            font-size: 1.05rem;
        }

        .sitemap-files {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 24px;
        }

        .sitemap-files a {
            display: inline-flex;
            align-items: center;
            min-height: 44px;
            padding: 10px 16px;
            border: 1px solid var(--border-color);
            border-radius: 10px;
            background: var(--card-background);
            font-weight: 650;
            text-decoration: none;
        }

        .section-title {
            margin: 48px 0 20px;
            font-size: 1.55rem;
            letter-spacing: -0.02em;
        }

        .main-pages {
            margin: 0;
            padding: 0;
            list-style: none;
            border: 1px solid var(--border-color);
            border-radius: 16px;
            background: var(--card-background);
            overflow: hidden;
        }

        .main-pages li {
            display: grid;
            gap: 2px;
            padding: 18px 20px;
        }

        .main-pages li + li {
            border-top: 1px solid var(--border-color);
        }

        .main-pages a {
            font-weight: 700;
            text-decoration: none;
        }

        .main-pages span {
            color: var(--text-secondary);
            font-size: 0.94rem;
        }

        .app-grid {
            display: grid;
            grid-template-columns:
                repeat(auto-fit, minmax(300px, 1fr));
            gap: 18px;
        }

        .app-card {
            display: flex;
            gap: 18px;
            min-width: 0;
            padding: 22px;
            border: 1px solid var(--border-color);
            border-radius: 18px;
            background: var(--card-background);
            box-shadow: 0 12px 30px var(--shadow-color);
        }

        .app-icon-wrapper {
            display: grid;
            flex: 0 0 84px;
            width: 84px;
            height: 84px;
            place-items: center;
            border: 1px solid var(--border-color);
            border-radius: 18px;
            background: var(--page-background);
            overflow: hidden;
        }

        .app-icon {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        .app-icon-placeholder {
            font-size: 2rem;
            font-weight: 800;
        }

        .app-content {
            display: flex;
            min-width: 0;
            flex-direction: column;
            align-items: flex-start;
        }

        .app-content h2 {
            margin: 0;
            font-size: 1.15rem;
            line-height: 1.35;
        }

        .app-content h2 a {
            color: var(--text-primary);
            text-decoration: none;
        }

        .app-content h2 a:hover {
            color: var(--accent-color);
        }

        .app-content p {
            margin: 8px 0 14px;
            color: var(--text-secondary);
            font-size: 0.94rem;
        }

        .visit-link {
            margin-top: auto;
            font-size: 0.92rem;
            font-weight: 700;
            text-decoration: none;
        }

        .page-footer {
            margin-top: 52px;
            padding-top: 24px;
            border-top: 1px solid var(--border-color);
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        @media (max-width: 520px) {
            .page-container {
                width: min(100% - 24px, 1120px);
                padding: 34px 0;
            }

            .app-card {
                flex-direction: column;
            }
        }
    </style>
</head>

<body>
    <main class="page-container">
        <header class="page-header">
            <h1>Website Sitemap</h1>

            <p>
                Browse the product and application pages available on
                ${escapeHtml(SITE_NAME)}.
            </p>

            <nav
                class="sitemap-files"
                aria-label="Machine-readable sitemap files"
            >
                <a href="../sitemap.xml">
                    XML sitemap
                </a>

                <a href="../sitemap.txt">
                    Text sitemap
                </a>
            </nav>
        </header>

        <section aria-labelledby="main-pages-title">
            <h2
                class="section-title"
                id="main-pages-title"
            >
                Main pages
            </h2>

            <ul class="main-pages">
                ${staticPageItems}
            </ul>
        </section>

        <section aria-labelledby="applications-title">
            <h2
                class="section-title"
                id="applications-title"
            >
                Applications
            </h2>

            <div class="app-grid">
                ${projectCards}
            </div>
        </section>

        <footer class="page-footer">
            <p>
                ${projectPages.length} application pages listed.
                Sitemap generated on ${escapeHtml(generatedDate)}.
            </p>
        </footer>
    </main>
</body>
</html>
`;
}

// -----------------------------------------------------------------------------
// Main execution
// -----------------------------------------------------------------------------

function main() {
    try {
        console.log("Generating sitemaps...");
        console.log(`Reading projects from: ${PROJECTS_FILE}`);

        const pages = loadPages();

        // Only the HTML sitemap requires a directory.
        ensureDirectory(HTML_OUTPUT_DIRECTORY);

        const xmlSitemap = generateXmlSitemap(pages);
        const textSitemap = generateTextSitemap(pages);
        const htmlSitemap = generateHtmlSitemap(pages);

        writeTextFile(XML_OUTPUT_FILE, xmlSitemap);
        writeTextFile(TEXT_OUTPUT_FILE, textSitemap);
        writeTextFile(HTML_OUTPUT_FILE, htmlSitemap);

        const projectCount = pages.filter(
            page => page.type === "project"
        ).length;

        const staticPageCount = pages.filter(
            page => page.type === "static"
        ).length;

        console.log("");
        console.log("Sitemap generation completed successfully.");
        console.log(`Project pages: ${projectCount}`);
        console.log(`Static pages: ${staticPageCount}`);
        console.log(`Total URLs: ${pages.length}`);
        console.log("");
        console.log(`Created: ${XML_OUTPUT_FILE}`);
        console.log(`Created: ${TEXT_OUTPUT_FILE}`);
        console.log(`Created: ${HTML_OUTPUT_FILE}`);
    } catch (error) {
        console.error("");
        console.error("Sitemap generation failed.");
        console.error(error.message);

        process.exitCode = 1;
    }
}

main();