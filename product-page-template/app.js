async function loadContent() {
  // Note: fetch() won't work on file:// in most browsers.
  const res = await fetch("content.json", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load content.json");
  return res.json();
}

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
  document.documentElement.lang = data.meta?.lang || "en";
  document.title = data.meta?.title || document.title;

  if (data.meta?.description) upsertMeta("description", data.meta.description);
  if (data.meta?.keywords) upsertMeta("keywords", data.meta.keywords);
  if (data.meta?.author) upsertMeta("author", data.meta.author);

  if (data.meta?.canonical) {
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = data.meta.canonical;
  }

  // OG
  const og = data.meta?.og;
  if (og) {
    if (og.type) upsertMeta("og:type", og.type, true);
    if (og.url) upsertMeta("og:url", og.url, true);
    if (og.title) upsertMeta("og:title", og.title, true);
    if (og.description) upsertMeta("og:description", og.description, true);
    if (og.image) upsertMeta("og:image", og.image, true);
    if (og.siteName) upsertMeta("og:site_name", og.siteName, true);
  }

  // Twitter
  const tw = data.meta?.twitter;
  if (tw) {
    if (tw.card) upsertMeta("twitter:card", tw.card, true);
    if (tw.url) upsertMeta("twitter:url", tw.url, true);
    if (tw.title) upsertMeta("twitter:title", tw.title, true);
    if (tw.description) upsertMeta("twitter:description", tw.description, true);
    if (tw.image) upsertMeta("twitter:image", tw.image, true);
  }

  // Favicons
  const fav = data.meta?.favicons;
  if (fav) {
    if (fav.png192) setFavicon(fav.png192, "icon", "192x192");
    if (fav.png32) setFavicon(fav.png32, "icon", "32x32");
    if (fav.png16) setFavicon(fav.png16, "icon", "16x16");
    if (fav.appleTouch) setFavicon(fav.appleTouch, "apple-touch-icon");
    if (fav.shortcut) setFavicon(fav.shortcut, "shortcut icon");
  }
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
    "--border-green": t.borderGreen
  };

  Object.entries(map).forEach(([k, v]) => {
    if (v) root.setProperty(k, v);
  });

  if (typeof t.heroWatermarkOpacity === "number") {
    root.setProperty("--hero-watermark-opacity", String(t.heroWatermarkOpacity));
  }
  if (typeof t.ctaWatermarkOpacity === "number") {
    root.setProperty("--cta-watermark-opacity", String(t.ctaWatermarkOpacity));
  }

  const icon = data.product?.icon;
  if (icon) {
    root.setProperty("--hero-watermark", `url("${icon}")`);
    root.setProperty("--cta-watermark", `url("${icon}")`);
  }
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

function iconFor(type) {
  if (type === "googlePlay") return svgGooglePlay();
  if (type === "amazon") return svgAmazon();
  return "";
}

function renderButtons(buttons = []) {
  return `
    <div class="download-buttons">
      ${buttons
        .map(
          (b) => `
          <a href="${b.url}" class="download-btn ${b.style || "primary"}" target="_blank" rel="noopener">
            ${iconFor(b.type)}
            ${b.label}
          </a>
        `
        )
        .join("")}
    </div>
  `;
}

function renderHero(data) {
  const el = document.getElementById("hero");
  const p = data.product || {};
  el.innerHTML = `
    <section class="hero">
      <div class="container">
        <div class="hero-content">
          <div class="hero-left">
            <img src="${p.icon || ""}" alt="${p.name || "App"} App Icon" class="app-icon-hero">
            <h1>${p.heroTitle || ""}</h1>
            <p>${p.heroDescription || ""}</p>
            ${renderButtons(p.storeButtons || [])}
            <div class="app-stats">
              ${(p.stats || [])
                .map(
                  (s) => `
                  <div class="stat">
                    <span class="stat-value">${s.value}</span>
                    <span class="stat-label">${s.label}</span>
                  </div>
                `
                )
                .join("")}
            </div>
          </div>

          <div class="hero-right">
            <div class="screenshots-container" id="screenshotsContainer">
              <div id="slidesRoot"></div>

              <button class="screenshot-nav prev" id="prevBtn" aria-label="Previous screenshot">‹</button>
              <button class="screenshot-nav next" id="nextBtn" aria-label="Next screenshot">›</button>

              <div class="screenshot-dots" id="dotsRoot"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderVideo(data) {
  const el = document.getElementById("video");
  const v = data.media?.video || {};
  el.innerHTML = `
    <section id="${v.sectionId || "demo"}" class="video-section">
      <div class="container">
        <h2>${v.title || ""}</h2>
        <div class="video-wrapper">
          <div class="video-container">
            <iframe
              src="${v.youtubeEmbedUrl || ""}"
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

function renderHowItWorks(data) {
  const el = document.getElementById("howItWorks");
  const hw = data.sections?.howItWorks || {};
  el.innerHTML = `
    <section class="how-it-works">
      <div class="container">
        <h2 class="section-title">${hw.title || ""}</h2>
        <div class="steps">
          ${(hw.steps || [])
            .map(
              (s) => `
              <div class="step">
                <div class="step-number">${s.number || ""}</div>
                <h3>${s.title || ""}</h3>
                <p>${s.text || ""}</p>
              </div>
            `
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderFeatures(data) {
  const el = document.getElementById("features");
  const f = data.sections?.features || {};
  el.innerHTML = `
    <section class="features">
      <div class="container">
        <h2 class="section-title">${f.title || ""}</h2>
        <div class="feature-grid">
          ${(f.cards || [])
            .map(
              (c) => `
              <div class="feature-card">
                <span class="feature-icon">${c.icon || ""}</span>
                <h3>${c.title || ""}</h3>
                <ul>
                  ${(c.bullets || []).map((b) => `<li>${b}</li>`).join("")}
                </ul>
              </div>
            `
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderPerfectFor(data) {
  const el = document.getElementById("perfectFor");
  const p = data.sections?.perfectFor || {};
  el.innerHTML = `
    <section class="perfect-for">
      <div class="container">
        <h2 class="section-title">${p.title || ""}</h2>
        <div class="use-cases">
          ${(p.items || [])
            .map(
              (u) => `
              <div class="use-case">
                <div class="use-case-icon">${u.icon || ""}</div>
                <h3>${u.title || ""}</h3>
                <p>${u.text || ""}</p>
              </div>
            `
            )
            .join("")}
        </div>
      </div>
    </section>
  `;
}

function renderFaq(data) {
  const el = document.getElementById("faq");
  const f = data.sections?.faq || {};
  el.innerHTML = `
    <section class="faq-section">
      <div class="container">
        <h2 class="section-title">${f.title || ""}</h2>
        <div class="faq-container" id="faqContainer">
          ${(f.items || [])
            .map(
              (it) => `
              <div class="faq-item">
                <div class="faq-question">
                  <span>${it.q || ""}</span>
                  <span class="faq-toggle">+</span>
                </div>
                <div class="faq-answer">
                  <p>${it.a || ""}</p>
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

function renderCta(data) {
  const el = document.getElementById("cta");
  const c = data.sections?.cta || {};
  el.innerHTML = `
    <section class="cta-section">
      <div class="container">
        <div class="cta-content">
          <h2>${c.title || ""}</h2>
          <p>${c.text || ""}</p>
          ${renderButtons(c.buttons || [])}
        </div>
      </div>
    </section>
  `;
}

function renderFooter(data) {
  const el = document.getElementById("footer");
  const f = data.footer || {};
  el.innerHTML = `
    <footer>
      <div class="container">
        <div class="footer-content">
          <div class="footer-section">
            <div class="footer-logo">
              <img src="${f.brand?.logo || ""}" alt="${f.brand?.name || "Logo"} Logo">
              <span class="footer-logo-text">${f.brand?.name || ""}</span>
            </div>
            <p>${f.brand?.about || ""}</p>

            <div class="social-links">
              ${(f.social || [])
                .map(
                  (s) => `
                  <a href="${s.url}" target="_blank" rel="noopener" aria-label="${s.label}">
                    f
                  </a>
                `
                )
                .join("")}
            </div>
          </div>

          ${(f.columns || [])
            .map(
              (col) => `
              <div class="footer-section">
                <h3>${col.title || ""}</h3>
                ${(col.links || []).map((l) => `<a href="${l.url}" target="${l.url.startsWith("http") ? "_blank" : "_self"}" rel="noopener">${l.label}</a>`).join("")}
                ${col.extraHtml || ""}
              </div>
            `
            )
            .join("")}
        </div>

        <div class="footer-bottom">
          <p>${f.copyright || ""}</p>
        </div>
      </div>
    </footer>
  `;
}

function applySchemas(data) {
  // Software schema
  const s1 = document.getElementById("schema-software");
  if (s1 && data.schema?.softwareApplication) {
    const sw = structuredClone(data.schema.softwareApplication);
    // Optionally enrich screenshots/video dynamically from JSON:
    if (data.media?.screenshots?.length) sw.screenshot = data.media.screenshots.map((x) => x.src);
    s1.textContent = JSON.stringify(sw, null, 2);
  }

  // FAQ schema
  const s2 = document.getElementById("schema-faq");
  const faq = data.sections?.faq?.items || [];
  if (s2 && faq.length) {
    s2.textContent = JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faq.map((x) => ({
          "@type": "Question",
          "name": x.q,
          "acceptedAnswer": { "@type": "Answer", "text": x.a }
        }))
      },
      null,
      2
    );
  }

  // Org schema
  const s3 = document.getElementById("schema-org");
  if (s3 && data.schema?.organization) {
    s3.textContent = JSON.stringify(data.schema.organization, null, 2);
  }
}

function initFaq() {
  document.querySelectorAll(".faq-question").forEach((q) => {
    q.addEventListener("click", () => {
      const item = q.parentElement;
      const wasActive = item.classList.contains("active");
      document.querySelectorAll(".faq-item").forEach((x) => x.classList.remove("active"));
      if (!wasActive) item.classList.add("active");
    });
  });
}

function initAnimations() {
  const observerOptions = { threshold: 0.1, rootMargin: "0px 0px -50px 0px" };
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    });
  }, observerOptions);

  document.querySelectorAll(".feature-card, .step, .use-case, .faq-item").forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(30px)";
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(el);
  });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href");
      const target = href ? document.querySelector(href) : null;
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

function initSlideshow(screenshots = []) {
  const slidesRoot = document.getElementById("slidesRoot");
  const dotsRoot = document.getElementById("dotsRoot");
  const container = document.getElementById("screenshotsContainer");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

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

  nextBtn?.addEventListener("click", () => { next(); stop(); start(); });
  prevBtn?.addEventListener("click", () => { prev(); stop(); start(); });

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
    if (e.key === "ArrowLeft") { prev(); stop(); start(); }
    else if (e.key === "ArrowRight") { next(); stop(); start(); }
  });

  // Touch swipe support
  let touchStartX = 0;
  let touchEndX = 0;
  container.addEventListener("touchstart", (e) => {
    touchStartX = e.changedTouches[0].screenX;
  });
  container.addEventListener("touchend", (e) => {
    touchEndX = e.changedTouches[0].screenX;
    if (touchEndX < touchStartX - 50) { next(); stop(); start(); }
    if (touchEndX > touchStartX + 50) { prev(); stop(); start(); }
  });

  start();
}

async function main() {
  const data = await loadContent();

  applyMeta(data);
  applyTheme(data);

  renderHero(data);
  renderVideo(data);
  renderHowItWorks(data);
  renderFeatures(data);
  renderPerfectFor(data);
  renderFaq(data);
  renderCta(data);
  renderFooter(data);

  applySchemas(data);

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
