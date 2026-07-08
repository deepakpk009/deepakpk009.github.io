function hasText(s) {
  return typeof s === "string" && s.trim().length > 0;
}

function hasArray(a) {
  return Array.isArray(a) && a.length > 0;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeScreenshotOrientation(orientation) {
  return orientation === "landscape" ? "landscape" : "portrait";
}

function normalizeVideoOrientation(orientation) {
  return orientation === "landscape" ? "landscape" : "portrait";
}

function isHttpUrl(u) {
  return typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://"));
}

function svgGooglePlay() {
  return `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
    </svg>
  `;
}

function svgAmazon() {
  return `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M15.93,17.09C15.75,17.25 15.5,17.26 15.3,17.15C14.41,16.41 14.25,16.07 13.76,15.36C12.29,16.86 11.25,17.31 9.34,17.31C7.09,17.31 5.33,15.92 5.33,13.14C5.33,10.96 6.5,9.5 8.19,8.76C9.66,8.12 11.75,8 13.31,7.84V7.5C13.31,6.84 13.36,6.09 12.95,5.54C12.58,5.05 11.95,4.84 11.44,4.84C10.5,4.84 9.65,5.33 9.45,6.31C9.41,6.56 9.22,6.8 8.97,6.81L6.24,6.5C6,6.46 5.76,6.26 5.82,5.88C6.5,2.29 9.71,1.5 12.5,1.5C13.95,1.5 15.81,1.88 16.97,2.91C18.41,4.15 18.28,5.78 18.28,7.58V12.29C18.28,13.53 18.83,14.08 19.35,14.76C19.53,15 19.56,15.26 19.37,15.42C18.9,15.83 17.86,16.71 17.4,17.12L17.39,17.11M13.31,10.68C13.31,12.81 13.36,14.56 12.41,16.5C12.41,16.5 11.14,15.23 11.14,13.14C11.14,10.96 12.82,10.26 13.31,10.05V10.68Z"/>
    </svg>
  `;
}

function svgFacebook() {
  return `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96A10 10 0 0 0 22 12.06C22 6.53 17.5 2.04 12 2.04Z"/>
    </svg>
  `;
}

function iconFor(type) {
  if (type === "googlePlay") return svgGooglePlay();
  if (type === "amazon") return svgAmazon();
  return "";
}

function socialIconFor(type) {
  if (type === "facebook") return svgFacebook();
  return "";
}

function buildThemeStyle(data) {
  const t = data.theme || {};
  const icon = data.product?.icon;

  const vars = {
    "--primary-green": t.primaryGreen,
    "--dark-green": t.darkGreen,
    "--light-green": t.lightGreen,
    "--darker-green": t.darkerGreen,
    "--black": t.black,
    "--dark-bg": t.darkBg,
    "--card-bg": t.cardBg,
    "--text-white": t.textWhite,
    "--text-gray": t.textGray,
    "--border-green": t.borderGreen,
    "--box-shadow-color": t.boxShadowColor,
    "--hero-watermark-opacity": typeof t.heroWatermarkOpacity === "number" ? String(t.heroWatermarkOpacity) : undefined,
    "--cta-watermark-opacity": typeof t.ctaWatermarkOpacity === "number" ? String(t.ctaWatermarkOpacity) : undefined,
    "--hero-watermark": hasText(icon) ? `url("${icon}")` : undefined,
    "--cta-watermark": hasText(icon) ? `url("${icon}")` : undefined
  };

  const css = Object.entries(vars)
    .filter(([, v]) => hasText(v))
    .map(([k, v]) => `${k}:${v};`)
    .join("");

  return hasText(css) ? `<style>:root{${css}}</style>` : "";
}

function buildMetaTags(data) {
  const meta = data.meta || {};
  const og = meta.og || {};
  const tw = meta.twitter || {};
  const fav = meta.favicons || {};

  const tags = [];

  tags.push(`<title>${escapeHtml(meta.title || "App")}</title>`);

  if (hasText(meta.description)) tags.push(`<meta name="description" content="${escapeHtml(meta.description)}" />`);
  if (hasText(meta.keywords)) tags.push(`<meta name="keywords" content="${escapeHtml(meta.keywords)}" />`);
  if (hasText(meta.author)) tags.push(`<meta name="author" content="${escapeHtml(meta.author)}" />`);
  if (hasText(meta.canonical)) tags.push(`<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`);

  if (hasText(og.type)) tags.push(`<meta property="og:type" content="${escapeHtml(og.type)}" />`);
  if (hasText(og.url)) tags.push(`<meta property="og:url" content="${escapeHtml(og.url)}" />`);
  if (hasText(og.title)) tags.push(`<meta property="og:title" content="${escapeHtml(og.title)}" />`);
  if (hasText(og.description)) tags.push(`<meta property="og:description" content="${escapeHtml(og.description)}" />`);
  if (hasText(og.image)) tags.push(`<meta property="og:image" content="${escapeHtml(og.image)}" />`);
  if (hasText(og.siteName)) tags.push(`<meta property="og:site_name" content="${escapeHtml(og.siteName)}" />`);

  if (hasText(tw.card)) tags.push(`<meta name="twitter:card" content="${escapeHtml(tw.card)}" />`);
  if (hasText(tw.url)) tags.push(`<meta name="twitter:url" content="${escapeHtml(tw.url)}" />`);
  if (hasText(tw.title)) tags.push(`<meta name="twitter:title" content="${escapeHtml(tw.title)}" />`);
  if (hasText(tw.description)) tags.push(`<meta name="twitter:description" content="${escapeHtml(tw.description)}" />`);
  if (hasText(tw.image)) tags.push(`<meta name="twitter:image" content="${escapeHtml(tw.image)}" />`);

  if (hasText(fav.png192)) tags.push(`<link rel="icon" sizes="192x192" href="${escapeHtml(fav.png192)}" />`);
  if (hasText(fav.png32)) tags.push(`<link rel="icon" sizes="32x32" href="${escapeHtml(fav.png32)}" />`);
  if (hasText(fav.png16)) tags.push(`<link rel="icon" sizes="16x16" href="${escapeHtml(fav.png16)}" />`);
  if (hasText(fav.appleTouch)) tags.push(`<link rel="apple-touch-icon" href="${escapeHtml(fav.appleTouch)}" />`);
  if (hasText(fav.shortcut)) tags.push(`<link rel="shortcut icon" href="${escapeHtml(fav.shortcut)}" />`);

  tags.push(buildThemeStyle(data));

  return tags.join("\n  ");
}

function renderButtons(buttons = []) {
  if (!hasArray(buttons)) return "";

  return `
    <div class="download-buttons">
      ${buttons.map((b) => {
        if (!b || !hasText(b.url) || !hasText(b.label)) return "";

        return `
          <a href="${escapeHtml(b.url)}" class="download-btn ${escapeHtml(b.style || "primary")}" target="_blank" rel="noopener">
            ${iconFor(b.type)}
            ${escapeHtml(b.label)}
          </a>
        `;
      }).join("")}
    </div>
  `;
}

function buildHeroHtml(data) {
  const p = data.product || {};
  const screenshots = data.media?.screenshots || [];
  const screenshotOrientation = normalizeScreenshotOrientation(data.media?.screenshotOrientation);
  const hasScreens = hasArray(screenshots);

  const hasHero =
    hasText(p.heroTitle) ||
    hasText(p.heroDescription) ||
    hasText(p.icon) ||
    hasArray(p.storeButtons) ||
    hasArray(p.stats) ||
    hasScreens;

  if (!hasHero) return "";

  const heroGridStyle = hasScreens ? "" : 'style="grid-template-columns: 1fr;"';

  return `
    <section class="hero">
      <div class="container">
        <div class="hero-content" ${heroGridStyle}>
          <div class="hero-left">
            ${hasText(p.icon) ? `<img src="${escapeHtml(p.icon)}" alt="${escapeHtml(p.name || "App")} App Icon" class="app-icon-hero">` : ""}
            ${hasText(p.heroTitle) ? `<h1>${escapeHtml(p.heroTitle)}</h1>` : ""}
            ${hasText(p.heroDescription) ? `<p>${escapeHtml(p.heroDescription)}</p>` : ""}
            ${hasArray(p.storeButtons) ? renderButtons(p.storeButtons) : ""}

            ${
              hasArray(p.stats)
                ? `<div class="app-stats">
                    ${p.stats.map((s) => `
                      <div class="stat">
                        <span class="stat-value">${escapeHtml(s?.value || "")}</span>
                        <span class="stat-label">${escapeHtml(s?.label || "")}</span>
                      </div>
                    `).join("")}
                  </div>`
                : ""
            }
          </div>

          ${
            hasScreens
              ? `<div class="hero-right">
                  <div class="screenshots-container is-${screenshotOrientation}" id="screenshotsContainer">
                    <div id="slidesRoot">
                      ${screenshots.map((s, i) => `
                        <div class="screenshot-slide ${i === 0 ? "active" : ""}">
                          <img src="${escapeHtml(s.src)}" alt="${escapeHtml(s.alt || "")}" loading="lazy">
                        </div>
                      `).join("")}
                    </div>

                    <button class="screenshot-nav prev" id="prevBtn" aria-label="Previous screenshot">‹</button>
                    <button class="screenshot-nav next" id="nextBtn" aria-label="Next screenshot">›</button>

                    <div class="screenshot-dots" id="dotsRoot">
                      ${screenshots.map((_, i) => `<span class="dot ${i === 0 ? "active" : ""}" data-slide="${i}"></span>`).join("")}
                    </div>
                  </div>
                </div>`
              : ""
          }
        </div>
      </div>
    </section>
  `;
}

function buildVideoHtml(data) {
  const v = data.media?.video || {};
  const videoOrientation = normalizeVideoOrientation(data.media?.videoOrientation);

  if (!hasText(v.youtubeEmbedUrl) || !hasText(v.title)) return "";

  return `
    <section id="${escapeHtml(v.sectionId || "demo")}" class="video-section">
      <div class="container">
        <h2>${escapeHtml(v.title)}</h2>
        <div class="video-wrapper">
          <div class="video-container is-${videoOrientation}">
            <iframe
              src="${escapeHtml(v.youtubeEmbedUrl)}"
              title="${escapeHtml(v.iframeTitle || "")}"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
              loading="lazy"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  `;
}

function buildHowItWorksHtml(data) {
  const hw = data.sections?.howItWorks || {};
  if (!hasText(hw.title) || !hasArray(hw.steps)) return "";

  return `
    <section class="how-it-works">
      <div class="container">
        <h2 class="section-title">${escapeHtml(hw.title)}</h2>
        <div class="steps">
          ${hw.steps.map((s) => `
            <div class="step">
              ${hasText(s?.number) ? `<div class="step-number">${escapeHtml(s.number)}</div>` : ""}
              ${hasText(s?.title) ? `<h3>${escapeHtml(s.title)}</h3>` : ""}
              ${hasText(s?.text) ? `<p>${escapeHtml(s.text)}</p>` : ""}
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function buildFeaturesHtml(data) {
  const f = data.sections?.features || data.product?.features || {};
  if (!hasText(f.title) || !hasArray(f.cards)) return "";

  return `
    <section class="features">
      <div class="container">
        <h2 class="section-title">${escapeHtml(f.title)}</h2>
        <div class="feature-grid">
          ${f.cards.map((c) => {
            const bullets = c?.bullets || [];
            if (!hasText(c?.title) && !hasArray(bullets)) return "";

            return `
              <div class="feature-card">
                ${hasText(c?.icon) ? `<span class="feature-icon">${escapeHtml(c.icon)}</span>` : ""}
                ${hasText(c?.title) ? `<h3>${escapeHtml(c.title)}</h3>` : ""}
                ${hasArray(bullets) ? `<ul>${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>` : ""}
              </div>
            `;
          }).join("")}
        </div>
      </div>
    </section>
  `;
}

function buildPerfectForHtml(data) {
  const p = data.sections?.perfectFor || data.product?.perfectFor || {};
  if (!hasText(p.title) || !hasArray(p.items)) return "";

  return `
    <section class="perfect-for">
      <div class="container">
        <h2 class="section-title">${escapeHtml(p.title)}</h2>
        <div class="use-cases">
          ${p.items.map((u) => `
            <div class="use-case">
              ${hasText(u?.icon) ? `<div class="use-case-icon">${escapeHtml(u.icon)}</div>` : ""}
              ${hasText(u?.title) ? `<h3>${escapeHtml(u.title)}</h3>` : ""}
              ${hasText(u?.text) ? `<p>${escapeHtml(u.text)}</p>` : ""}
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function buildFaqHtml(data) {
  const f = data.sections?.faq || data.product?.faq || {};
  if (!hasText(f.title) || !hasArray(f.items)) return "";

  return `
    <section id="faq" class="faq-section">
      <div class="container">
        <h2 class="section-title">${escapeHtml(f.title)}</h2>
        <div class="faq-container" id="faqContainer">
          ${f.items.map((it) => `
            <div class="faq-item">
              <div class="faq-question">
                <span>${escapeHtml(it?.q || "")}</span>
                <span class="faq-toggle">+</span>
              </div>
              <div class="faq-answer">
                <p>${escapeHtml(it?.a || "")}</p>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    </section>
  `;
}

function buildCtaHtml(data) {
  const c = data.sections?.cta || {};
  const hasCta = hasText(c.title) || hasText(c.text) || hasArray(c.buttons);
  if (!hasCta) return "";

  return `
    <section class="cta-section">
      <div class="container">
        <div class="cta-content">
          ${hasText(c.title) ? `<h2>${escapeHtml(c.title)}</h2>` : ""}
          ${hasText(c.text) ? `<p>${escapeHtml(c.text)}</p>` : ""}
          ${hasArray(c.buttons) ? renderButtons(c.buttons) : ""}
        </div>
      </div>
    </section>
  `;
}

function buildFooterHtml(data) {
  const f = data.footer || {};

  const hasFooter =
    hasText(f.brand?.name) ||
    hasText(f.brand?.about) ||
    hasText(f.brand?.logo) ||
    hasArray(f.columns) ||
    hasArray(f.social) ||
    hasText(f.copyright);

  if (!hasFooter) return "";

  const renderedSectionIds = new Set(["faq", "demo"]);

  const filterLinks = (links = []) =>
    links.filter((l) => {
      if (!l || !hasText(l.url) || !hasText(l.label)) return false;

      if (l.url.startsWith("#")) {
        const id = l.url.slice(1);
        return renderedSectionIds.has(id);
      }

      return true;
    });

  const socialHtml = hasArray(f.social)
    ? `
      <div class="social-links">
        ${f.social.map((s) => {
          if (!s || !hasText(s.url)) return "";

          const icon = socialIconFor(s.type);

          return `
            <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" aria-label="${escapeHtml(s.label || s.type || "Social")}">
              ${icon || ""}
            </a>
          `;
        }).join("")}
      </div>
    `
    : "";

  const columnsHtml = hasArray(f.columns)
    ? f.columns.map((col) => {
        const links = filterLinks(col?.links || []);
        const extraHtml = hasText(col?.extraHtml) ? col.extraHtml : "";
        const hasCol = hasText(col?.title) || hasArray(links) || hasText(extraHtml);

        if (!hasCol) return "";

        const linksHtml = hasArray(links)
          ? links.map((l) => {
              const target = isHttpUrl(l.url) ? "_blank" : "_self";
              const rel = isHttpUrl(l.url) ? ' rel="noopener"' : "";
              return `<a href="${escapeHtml(l.url)}" target="${target}"${rel}>${escapeHtml(l.label)}</a>`;
            }).join("")
          : "";

        return `
          <div class="footer-section">
            ${hasText(col?.title) ? `<h3>${escapeHtml(col.title)}</h3>` : ""}
            ${linksHtml}
            ${extraHtml}
          </div>
        `;
      }).join("")
    : "";

  return `
    <footer>
      <div class="container">
        <div class="footer-content">
          <div class="footer-section">
            ${
              hasText(f.brand?.logo) || hasText(f.brand?.name)
                ? `<div class="footer-logo">
                    ${hasText(f.brand?.logo) ? `<img src="${escapeHtml(f.brand.logo)}" alt="${escapeHtml(f.brand?.name || "Logo")} Logo">` : ""}
                    ${hasText(f.brand?.name) ? `<span class="footer-logo-text">${escapeHtml(f.brand.name)}</span>` : ""}
                  </div>`
                : ""
            }

            ${hasText(f.brand?.about) ? `<p>${escapeHtml(f.brand.about)}</p>` : ""}
            ${socialHtml}
          </div>

          ${columnsHtml}
        </div>

        ${hasText(f.copyright) ? `<div class="footer-bottom"><p>${escapeHtml(f.copyright)}</p></div>` : ""}
      </div>
    </footer>
  `;
}

function buildSchemaTags(data) {
  const tags = [];

  if (data.schema?.softwareApplication) {
    const sw = structuredClone
      ? structuredClone(data.schema.softwareApplication)
      : JSON.parse(JSON.stringify(data.schema.softwareApplication));

    if (hasArray(data.media?.screenshots)) {
      sw.screenshot = data.media.screenshots.map((x) => x.src);
    }

    tags.push(`<script type="application/ld+json">${JSON.stringify(sw, null, 2)}</script>`);
  }

  const faqItems = data.sections?.faq?.items || data.product?.faq?.items || [];

  if (hasArray(faqItems)) {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems
        .filter((x) => hasText(x?.q) && hasText(x?.a))
        .map((x) => ({
          "@type": "Question",
          name: x.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: x.a
          }
        }))
    };

    tags.push(`<script type="application/ld+json">${JSON.stringify(faqSchema, null, 2)}</script>`);
  }

  if (data.schema?.organization) {
    tags.push(`<script type="application/ld+json">${JSON.stringify(data.schema.organization, null, 2)}</script>`);
  }

  return tags.join("\n  ");
}

function buildBodyContent(data) {
  return [
    buildHeroHtml(data),
    buildVideoHtml(data),
    buildHowItWorksHtml(data),
    buildFeaturesHtml(data),
    buildPerfectForHtml(data),
    buildFaqHtml(data),
    buildCtaHtml(data),
    buildFooterHtml(data)
  ].filter(hasText).join("\n");
}

function renderPage(data, template) {
  const lang = data.meta?.lang || "en";

  return template
    .replaceAll("{{LANG}}", escapeHtml(lang))
    .replaceAll("{{META_TAGS}}", buildMetaTags(data))
    .replaceAll("{{SCHEMA_TAGS}}", buildSchemaTags(data))
    .replaceAll("{{BODY_CONTENT}}", buildBodyContent(data));
}

module.exports = {
  renderPage
};