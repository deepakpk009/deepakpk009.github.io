(function () {
  function initFaq() {
    const questions = document.querySelectorAll(".faq-question");
    if (!questions.length) return;

    questions.forEach((q) => {
      q.addEventListener("click", () => {
        const item = q.parentElement;
        const wasActive = item.classList.contains("active");

        document.querySelectorAll(".faq-item").forEach((x) => x.classList.remove("active"));

        if (!wasActive) {
          item.classList.add("active");
        }
      });
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
        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      });
    });
  }

  function initAnimations() {
    const targets = document.querySelectorAll(".feature-card, .step, .use-case, .faq-item");
    if (!targets.length) return;

    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => {
        el.style.opacity = "1";
        el.style.transform = "translateY(0)";
      });
      return;
    }

    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px"
    };

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

  function initSlideshow() {
    const container = document.getElementById("screenshotsContainer");
    const prevBtn = document.getElementById("prevBtn");
    const nextBtn = document.getElementById("nextBtn");

    if (!container) return;

    const slides = Array.from(container.querySelectorAll(".screenshot-slide"));
    const dots = Array.from(container.querySelectorAll(".dot"));

    if (!slides.length) return;

    let currentSlide = 0;
    let intervalId = null;

    function showSlide(index) {
      if (index >= slides.length) currentSlide = 0;
      else if (index < 0) currentSlide = slides.length - 1;
      else currentSlide = index;

      slides.forEach((s) => s.classList.remove("active"));
      dots.forEach((d) => d.classList.remove("active"));

      slides[currentSlide]?.classList.add("active");
      dots[currentSlide]?.classList.add("active");
    }

    function next() {
      showSlide(currentSlide + 1);
    }

    function prev() {
      showSlide(currentSlide - 1);
    }

    function stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    }

    function start() {
      stop();
      if (slides.length > 1) {
        intervalId = setInterval(next, 4000);
      }
    }

    nextBtn?.addEventListener("click", () => {
      next();
      start();
    });

    prevBtn?.addEventListener("click", () => {
      prev();
      start();
    });

    dots.forEach((d, i) => {
      d.addEventListener("click", () => {
        showSlide(i);
        start();
      });
    });

    container.addEventListener("mouseenter", stop);
    container.addEventListener("mouseleave", start);

    document.addEventListener("keydown", (e) => {
      if (!container.matches(":hover")) return;

      if (e.key === "ArrowLeft") {
        prev();
        start();
      } else if (e.key === "ArrowRight") {
        next();
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
        start();
      }

      if (touchEndX > touchStartX + 50) {
        prev();
        start();
      }
    });

    showSlide(0);
    start();
  }

  document.addEventListener("DOMContentLoaded", () => {
    initSlideshow();
    initFaq();
    initSmoothScroll();
    initAnimations();
  });
})();