async function loadContent() {
  // Note: fetch() won't work on file:// in most browsers.
  const res = await fetch("content.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load content.json");
  return res.json();
}

/* -----------------------------
   Small DOM / validation helpers
------------------------------ */
function $(id) {
  return document.getElementById(id);
}

function removeMount(id) {
  const el = $(id);
  if (el) el.remove();
}

function hasText(s) {
  return typeof s === "string" && s.trim().length > 0;
}

function hasArray(a) {
  return Array.isArray(a) && a.length > 0;
}

function isHttpUrl(u) {
  return typeof u === "string" && (u.startsWith("http://") || u.startsWith("https://"));
}

function mountHtml(id, html) {
  const el = $(id);
  if (!el) return;

  if (!hasText(html)) {
    el.remove();
    return;
  }
  el.innerHTML = html;
}

/* -----------------------------
   Meta / head helpers
------------------------------ */
function setFavicon(href, rel, sizes) {
  let link = document.querySelector(`link[rel="${rel}"]${sizes ? `[sizes="${sizes}"]` : ""}`);
  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    if (sizes) link.sizes = sizes;
    document.head.appendChild(link);
  }
  link.href = href;
}

function upsertMeta(nameOrProp, value, isProperty = false) {
  if (!hasText(value)) return;
  const selector = isProperty ? `meta[property="${nameOrProp}"]` : `meta[name="${nameOrProp}"]`;
  let meta = document.querySelector(selector);
  if (!meta) {
    meta = document.createElement("meta");
    if (isProperty) meta.setAttribute("property", nameOrProp);
    else meta.setAttribute("name", nameOrProp);
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", value);
}

function applyMeta(data) {
  const meta = data.meta || {};
  document.documentElement.lang = meta.lang || "en";
  if (hasText(meta.title)) document.title = meta.title;

  upsertMeta("description", meta.description);
  upsertMeta("keywords", meta.keywords);
  upsertMeta("author", meta.author);

  if (hasText(meta.canonical)) {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = meta.canonical;
  }

  const og = meta.og || {};
  upsertMeta("og:type", og.type, true);
  upsertMeta("og:url", og.url, true);
  upsertMeta("og:title", og.title, true);
  upsertMeta("og:description", og.description, true);
  upsertMeta("og:image", og.image, true);
  upsertMeta("og:site_name", og.siteName, true);

  const tw = meta.twitter || {};
  upsertMeta("twitter:card", tw.card, true);
  upsertMeta("twitter:url", tw.url, true);
  upsertMeta("twitter:title", tw.title, true);
  upsertMeta("twitter:description", tw.description, true);
  upsertMeta("twitter:image", tw.image, true);

  const fav = meta.favicons || {};
  if (hasText(fav.png192)) setFavicon(fav.png192, "icon", "192x192");
  if (hasText(fav.png32)) setFavicon(fav.png32, "icon", "32x32");
  if (hasText(fav.png16)) setFavicon(fav.png16, "icon", "16x16");
  if (hasText(fav.appleTouch)) setFavicon(fav.appleTouch, "apple-touch-icon");
  if (hasText(fav.shortcut)) setFavicon(fav.shortcut, "shortcut icon");
}

function applyTheme(data) {
  const t = data.theme || {};
  const root = document.documentElement.style;

  const map = {
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
    "--box-shadow-color": t.boxShadowColor
  };

  Object.entries(map).forEach(([k, v]) => {
    if (hasText(v)) root.setProperty(k, v);
  });

  if (typeof t.heroWatermarkOpacity === "number") {
    root.setProperty("--hero-watermark-opacity", String(t.heroWatermarkOpacity));
  }
  if (typeof t.ctaWatermarkOpacity === "number") {
    root.setProperty("--cta-watermark-opacity", String(t.ctaWatermarkOpacity));
  }

  const icon = data.product?.icon;
  if (hasText(icon)) {
    root.setProperty("--hero-watermark", `url("${icon}")`);
    root.setProperty("--cta-watermark", `url("${icon}")`);
  }
}

/* -----------------------------
   Small SVG helpers
------------------------------ */
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

/* -----------------------------
   Reusable render bits
------------------------------ */
function renderButtons(buttons = []) {
  if (!hasArray(buttons)) return "";
  return `
    <div class="download-buttons">
      ${buttons
        .map((b) => {
          if (!b || !hasText(b.url) || !hasText(b.label)) return "";
          return `
            <a href="${b.url}" class="download-btn ${b.style || "primary"}" target="_blank" rel="noopener">
              ${iconFor(b.type)}
              ${b.label}
            </a>
          `;
        })
        .join("")}
    </div>
  `;
}

/* -----------------------------
   OPTIONAL section builders
------------------------------ */
function buildHeroHtml(data) {
  const p = data.product || {};
  const screenshots = data.media?.screenshots || [];
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
            ${hasText(p.icon) ? `<img src="${p.icon}" alt="${p.name || "App"} App Icon" class="app-icon-hero">` : ""}
            ${hasText(p.heroTitle) ? `<h1>${p.heroTitle}</h1>` : ""}
            ${hasText(p.heroDescription) ? `<p>${p.heroDescription}</p>` : ""}
            ${hasArray(p.storeButtons) ? renderButtons(p.storeButtons) : ""}

            ${
              hasArray(p.stats)
                ? `<div class="app-stats">
                    ${p.stats
                      .map(
                        (s) => `
                        <div class="stat">
                          <span class="stat-value">${s?.value || ""}</span>
                          <span class="stat-label">${s?.label || ""}</span>
                        </div>
                      `
                      )
                      .join("")}
                  </div>`
                : ""
            }
          </div>

          ${
            hasScreens
              ? `<div class="hero-right">
                  <div class="screenshots-container" id="screenshotsContainer">
                    <div id="slidesRoot"></div>

                    <button class="screenshot-nav prev" id="prevBtn" aria-label="Previous screenshot">‹</button>
                    <button class="screenshot-nav next" id="nextBtn" aria-label="Next screenshot">›</button>

                    <div class="screenshot-dots" id="dotsRoot"></div>
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
  if (!hasText(v.youtubeEmbedUrl) || !hasText(v.title)) return "";

  return `
    <section id="${v.sectionId || "demo"}" class="video-section">
      <div class="container">
        <h2>${v.title}</h2>
        <div class="video-wrapper">
          <div class="video-container">
            <iframe
              src="${v.youtubeEmbedUrl}"
              title="${v.iframeTitle || ""}"
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
        <h2 class="section-title">${hw.title}</h2>
        <div class="steps">
          ${hw.steps
            .map(
              (s) => `
              <div class="step">
                ${hasText(s?.number) ? `<div class="step-number">${s.number}</div>` : ""}
                ${hasText(s?.title) ? `<h3>${s.title}</h3>` : ""}
                ${hasText(s?.text) ? `<p>${s.text}</p>` : ""}
              </div>
            `
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function buildFeaturesHtml(data) {
  const f = data.sections?.features || {};
  if (!hasText(f.title) || !hasArray(f.cards)) return "";

  return `
    <section class="features">
      <div class="container">
        <h2 class="section-title">${f.title}</h2>
        <div class="feature-grid">
          ${f.cards
            .map((c) => {
              const bullets = c?.bullets || [];
              if (!hasText(c?.title) && !hasArray(bullets)) return "";
              return `
                <div class="feature-card">
                  ${hasText(c?.icon) ? `<span class="feature-icon">${c.icon}</span>` : ""}
                  ${hasText(c?.title) ? `<h3>${c.title}</h3>` : ""}
                  ${
                    hasArray(bullets)
                      ? `<ul>${bullets.map((b) => `<li>${b}</li>`).join("")}</ul>`
                      : ""
                  }
                </div>
              `;
            })
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function buildPerfectForHtml(data) {
  const p = data.sections?.perfectFor || {};
  if (!hasText(p.title) || !hasArray(p.items)) return "";

  return `
    <section class="perfect-for">
      <div class="container">
        <h2 class="section-title">${p.title}</h2>
        <div class="use-cases">
          ${p.items
            .map(
              (u) => `
              <div class="use-case">
                ${hasText(u?.icon) ? `<div class="use-case-icon">${u.icon}</div>` : ""}
                ${hasText(u?.title) ? `<h3>${u.title}</h3>` : ""}
                ${hasText(u?.text) ? `<p>${u.text}</p>` : ""}
              </div>
            `
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function buildFaqHtml(data) {
  const f = data.sections?.faq || {};
  if (!hasText(f.title) || !hasArray(f.items)) return "";

  // NOTE: We intentionally DO NOT set id="faq" here, because the mount div itself is already #faq.
  // Footer links should point to "#faq" (the mount) and will still work.
  return `
    <section class="faq-section">
      <div class="container">
        <h2 class="section-title">${f.title}</h2>
        <div class="faq-container" id="faqContainer">
          ${f.items
            .map(
              (it) => `
              <div class="faq-item">
                <div class="faq-question">
                  <span>${it?.q || ""}</span>
                  <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                  <p>${it?.a || ""}</p>
                </div>
              </div>
            `
            )
            .join("")}
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
          ${hasText(c.title) ? `<h2>${c.title}</h2>` : ""}
          ${hasText(c.text) ? `<p>${c.text}</p>` : ""}
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

  // Filter hash links that point to missing mounts (ex: "#faq" when FAQ removed)
  const existingIds = new Set(Array.from(document.querySelectorAll("[id]")).map((el) => el.id));
  const filterLinks = (links = []) =>
    links.filter((l) => {
      if (!l || !hasText(l.url) || !hasText(l.label)) return false;
      if (l.url.startsWith("#")) {
        const id = l.url.slice(1);
        return existingIds.has(id);
      }
      return true;
    });

  const socialHtml = hasArray(f.social)
    ? `
      <div class="social-links">
        ${f.social
          .map((s) => {
            if (!s || !hasText(s.url)) return "";
            const icon = socialIconFor(s.type);
            return `
              <a href="${s.url}" target="_blank" rel="noopener" aria-label="${s.label || s.type || "Social"}">
                ${icon || ""}
              </a>
            `;
          })
          .join("")}
      </div>
    `
    : "";

  const columnsHtml = hasArray(f.columns)
    ? f.columns
        .map((col) => {
          const links = filterLinks(col?.links || []);
          const extraHtml = hasText(col?.extraHtml) ? col.extraHtml : "";
          const hasCol = hasText(col?.title) || hasArray(links) || hasText(extraHtml);
          if (!hasCol) return "";

          const linksHtml = hasArray(links)
            ? links
                .map((l) => {
                  const target = isHttpUrl(l.url) ? "_blank" : "_self";
                  const rel = isHttpUrl(l.url) ? ' rel="noopener"' : "";
                  return `<a href="${l.url}" target="${target}"${rel}>${l.label}</a>`;
                })
                .join("")
            : "";

          return `
            <div class="footer-section">
              ${hasText(col?.title) ? `<h3>${col.title}</h3>` : ""}
              ${linksHtml}
              ${extraHtml}
            </div>
          `;
        })
        .join("")
    : "";

  return `
    <footer>
      <div class="container">
        <div class="footer-content">
          <div class="footer-section">
            ${
              hasText(f.brand?.logo) || hasText(f.brand?.name)
                ? `<div class="footer-logo">
                    ${hasText(f.brand?.logo) ? `<img src="${f.brand.logo}" alt="${f.brand?.name || "Logo"} Logo">` : ""}
                    ${hasText(f.brand?.name) ? `<span class="footer-logo-text">${f.brand.name}</span>` : ""}
                  </div>`
                : ""
            }

            ${hasText(f.brand?.about) ? `<p>${f.brand.about}</p>` : ""}
            ${socialHtml}
          </div>

          ${columnsHtml}
        </div>

        ${
          hasText(f.copyright)
            ? `<div class="footer-bottom"><p>${f.copyright}</p></div>`
            : ""
        }
      </div>
    </footer>
  `;
}

/* -----------------------------
   Schema (optional)
------------------------------ */
function applySchemas(data) {
  const s1 = $("schema-software");
  const s2 = $("schema-faq");
  const s3 = $("schema-org");

  // Software schema (optional)
  if (s1 && data.schema?.softwareApplication) {
    const sw = structuredClone(data.schema.softwareApplication);
    if (hasArray(data.media?.screenshots)) sw.screenshot = data.media.screenshots.map((x) => x.src);
    s1.textContent = JSON.stringify(sw, null, 2);
  } else if (s1) {
    s1.remove();
  }

  // FAQ schema (optional)
  const faqItems = data.sections?.faq?.items || [];
  if (s2 && hasArray(faqItems)) {
    s2.textContent = JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqItems
          .filter((x) => hasText(x?.q) && hasText(x?.a))
          .map((x) => ({
            "@type": "Question",
            name: x.q,
            acceptedAnswer: { "@type": "Answer", text: x.a }
          }))
      },
      null,
      2
    );
  } else if (s2) {
    s2.remove();
  }

  // Organization schema (optional)
  if (s3 && data.schema?.organization) {
    s3.textContent = JSON.stringify(data.schema.organization, null, 2);
  } else if (s3) {
    s3.remove();
  }
}

/* -----------------------------
   Behaviors (only if relevant)
------------------------------ */
function initFaq() {
  const questions = document.querySelectorAll(".faq-question");
  if (!questions.length) return;

  questions.forEach((q) => {
    q.addEventListener("click", () => {
      const item = q.parentElement;
      const wasActive = item.classList.contains("active");
      document.querySelectorAll(".faq-item").forEach((x) => x.classList.remove("active"));
      if (!wasActive) item.classList.add("active");
    });
  });
}

function initAnimations() {
  const targets = document.querySelectorAll(".feature-card, .step, .use-case, .faq-item");
  if (!targets.length) return;

  const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    });
  }, observerOptions);

  targets.forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(30px)";
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(el);
  });
}

function initSmoothScroll() {
  const anchors = document.querySelectorAll('a[href^="#"]');
  if (!anchors.length) return;

  anchors.forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      if (!href || href === "#") return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function initSlideshow(screenshots = []) {
  if (!hasArray(screenshots)) return;

  const slidesRoot = $("slidesRoot");
  const dotsRoot = $("dotsRoot");
  const container = $("screenshotsContainer");
  const prevBtn = $("prevBtn");
  const nextBtn = $("nextBtn");

  if (!slidesRoot || !dotsRoot || !container) return;

  slidesRoot.innerHTML = screenshots
    .map(
      (s, i) => `
      <div class="screenshot-slide ${i === 0 ? "active" : ""}">
        <img src="${s.src}" alt="${s.alt || ""}" loading="lazy">
      </div>
    `
    )
    .join("");

  dotsRoot.innerHTML = screenshots
    .map((_, i) => `<span class="dot ${i === 0 ? "active" : ""}" data-slide="${i}"></span>`)
    .join("");

  let currentSlide = 0;
  const slides = Array.from(container.querySelectorAll(".screenshot-slide"));
  const dots = Array.from(container.querySelectorAll(".dot"));
  const totalSlides = slides.length;

  if (!totalSlides) return;

  let intervalId = null;

  const showSlide = (index) => {
    slides.forEach((s) => s.classList.remove("active"));
    dots.forEach((d) => d.classList.remove("active"));

    if (index >= totalSlides) currentSlide = 0;
    if (index < 0) currentSlide = totalSlides - 1;

    slides[currentSlide]?.classList.add("active");
    dots[currentSlide]?.classList.add("active");
  };

  const next = () => {
    currentSlide += 1;
    if (currentSlide >= totalSlides) currentSlide = 0;
    showSlide(currentSlide);
  };

  const prev = () => {
    currentSlide -= 1;
    if (currentSlide < 0) currentSlide = totalSlides - 1;
    showSlide(currentSlide);
  };

  const start = () => {
    stop();
    intervalId = setInterval(next, 4000);
  };

  const stop = () => {
    if (intervalId) clearInterval(intervalId);
    intervalId = null;
  };

  nextBtn?.addEventListener("click", () => {
    next();
    stop();
    start();
  });

  prevBtn?.addEventListener("click", () => {
    prev();
    stop();
    start();
  });

  dots.forEach((d, i) => {
    d.addEventListener("click", () => {
      currentSlide = i;
      showSlide(currentSlide);
      stop();
      start();
    });
  });

  container.addEventListener("mouseenter", stop);
  container.addEventListener("mouseleave", start);

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      prev();
      stop();
      start();
    } else if (e.key === "ArrowRight") {
      next();
      stop();
      start();
    }
  });

  let touchStartX = 0;
  let touchEndX = 0;
  container.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });
  container.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    if (touchEndX < touchStartX - 50) {
      next();
      stop();
      start();
    }
    if (touchEndX > touchStartX + 50) {
      prev();
      stop();
      start();
    }
  });

  start();
}

/* -----------------------------
   Main
------------------------------ */
async function main() {
  const data = await loadContent();

  applyMeta(data);
  applyTheme(data);

  // Render (optional mounts)
  mountHtml("hero", buildHeroHtml(data));
  mountHtml("video", buildVideoHtml(data));
  mountHtml("howItWorks", buildHowItWorksHtml(data));
  mountHtml("features", buildFeaturesHtml(data));
  mountHtml("perfectFor", buildPerfectForHtml(data));
  mountHtml("faq", buildFaqHtml(data));
  mountHtml("cta", buildCtaHtml(data));

  // Schemas may depend on sections
  applySchemas(data);

  // Footer should be last so it can filter hash links based on what got rendered/removed
  mountHtml("footer", buildFooterHtml(data));

  // Init behaviors only if their elements exist
  initSlideshow(data.media?.screenshots || []);
  initFaq();
  initSmoothScroll();
  initAnimations();
}

main().catch((e) => {
  console.error(e);
  document.body.innerHTML = `
    <div style="padding:24px;font-family:Arial;color:#fff;background:#121212">
      <h2>Failed to load content.json</h2>
      <p>Run this folder via a local server (example: <code>python -m http.server</code>) and open http://localhost:8000/</p>
      <pre style="white-space:pre-wrap;color:#B0B0B0">${String(e)}</pre>
    </div>
  `;
});
