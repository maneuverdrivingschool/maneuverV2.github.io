/* ============================================================
   MANEUVER DRIVING SCHOOL — script.js  v2.5 (Dynamic CSV Architecture)
   Includes: Page Loader · Fixed FAQ Accordion · Nav ·
   Scroll Reveal · Counters · Form · WhatsApp · Parallax
   All animations hardware-accelerated & CLS-safe
   ============================================================ */

(function () {
  "use strict";

  /* ── DYNAMIC CONFIGURATION ENGINE ───────────────────────── */
  // Clean Workspace Share ID connected via high-performance flat stream
  const SPREADSHEET_ID = "1ho5TrJ6dpJQ5EGcyV_b_CKgF0XRf4Pi6WTfeTPy8ctM";
  let fallbackWhatsappNumber = "17787232850";

  /* ── HELPERS ─────────────────────────────────────────────── */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const raf = requestAnimationFrame.bind(window);
  const raf2 = (fn) => raf(() => raf(fn));

  // Converts any column header string to a safe, normalized object property key
  const normalizeKey = (str) =>
    String(str)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  /* ══════════════════════════════════════════════════════════
     1. PAGE LOADER
  ══════════════════════════════════════════════════════════ */
  const loader = $("#pageLoader");
  const progressBar = $("#plProgressBar");
  let loaderDone = false;

  function setProgress(pct) {
    if (!progressBar) return;
    progressBar.style.width = Math.min(pct, 100) + "%";
  }

  function dismissLoader() {
    if (loaderDone) return;
    loaderDone = true;

    if (!loader) {
      document.body.classList.remove("loading");
      window._loaderComplete = true;
      return;
    }

    setProgress(100);

    setTimeout(() => {
      loader.classList.add("pl-hiding");
      let exited = false;
      function onLoaderExit() {
        if (exited) return;
        exited = true;
        loader.classList.add("pl-hidden");
        document.body.classList.remove("loading");
        window._loaderComplete = true;
        if (typeof window._startReveal === "function") window._startReveal();
      }

      loader.addEventListener("transitionend", onLoaderExit, { once: true });
      setTimeout(onLoaderExit, 700);
    }, 300);
  }

  function runFakeProgress() {
    const steps = [
      { pct: 15, ms: 90 },
      { pct: 35, ms: 220 },
      { pct: 55, ms: 380 },
      { pct: 72, ms: 530 },
      { pct: 85, ms: 680 },
    ];
    steps.forEach(({ pct, ms }) => setTimeout(() => setProgress(pct), ms));
  }

  if (loader) {
    document.body.classList.add("loading");
    runFakeProgress();

    if (document.readyState === "complete") {
      setTimeout(dismissLoader, 50);
    } else {
      window.addEventListener("load", () => setTimeout(dismissLoader, 50), {
        once: true,
      });
    }
    setTimeout(dismissLoader, 3500);
  } else {
    window._loaderComplete = true;
  }

  /* ══════════════════════════════════════════════════════════
     2. HERO ENTRANCE — called once loader has fully exited.
  ══════════════════════════════════════════════════════════ */
  window._startReveal = function () {
    if (typeof revealObs === "undefined") return;
    $$(".reveal-fade, .reveal-up, .reveal-left, .reveal-right").forEach(
      (el) => {
        revealObs.observe(el);
      },
    );
  };

  /* ══════════════════════════════════════════════════════════
     3. DATA CONVERTER & SHEET MANAGER (CSV STANDARDIZATION)
  ══════════════════════════════════════════════════════════ */
  function parseCSVLine(line) {
    // Handles commas, quoted fields, and escaped double-quotes in Google CSV output.
    const fields = [];
    let current = "";
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"' && insideQuotes && next === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === "," && !insideQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    fields.push(current.trim());
    return fields.map((field) => field.replace(/^"|"$/g, ""));
  }

  async function fetchGoogleSheetData(tabName) {
    // Try both common public Google Sheets CSV endpoints. The /pub endpoint only works
    // when the sheet is formally published; /gviz also works for many "Anyone with link"
    // sheets. This prevents the site from silently keeping fallback HTML content.
    const encodedSheetName = encodeURIComponent(tabName);
    const cacheBust = `cacheBust=${Date.now()}`;
    const urls = [
      `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodedSheetName}&${cacheBust}`,
      `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/pub?output=csv&sheet=${encodedSheetName}&${cacheBust}`,
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`HTTP status: ${response.status}`);
        }

        const csvText = await response.text();
        const trimmed = csvText.trim();

        // If Google returns an HTML permission/login/error page, do not parse it as CSV.
        if (
          !trimmed ||
          /^</.test(trimmed) ||
          /<html|<!doctype/i.test(trimmed)
        ) {
          throw new Error(
            "Google returned HTML instead of CSV. Check sheet sharing/publishing settings.",
          );
        }

        const lines = trimmed
          .split(/\r?\n/)
          .filter((line) => line.trim() !== "");
        if (!lines.length) return [];

        const headers = parseCSVLine(lines[0]).map((header) => header.trim());
        if (!headers.some(Boolean)) return [];

        const objectsList = [];
        for (let i = 1; i < lines.length; i++) {
          const columns = parseCSVLine(lines[i]);
          const entry = {};

          headers.forEach((headerName, index) => {
            if (!headerName) return;
            const value = columns[index] !== undefined ? columns[index] : "";
            entry[headerName] = value;
            entry[normalizeKey(headerName)] = value;
          });

          // Skip fully empty rows so blank sheet lines do not create empty cards.
          if (
            Object.values(entry).some((value) => String(value).trim() !== "")
          ) {
            objectsList.push(entry);
          }
        }

        console.info(
          `Loaded ${objectsList.length} rows from Google Sheet tab: ${tabName}`,
        );
        return objectsList;
      } catch (err) {
        console.warn(`Sheet endpoint failed for tab [${tabName}]:`, err);
      }
    }

    console.warn(
      `Spreadsheet sync bypassed for tab: [${tabName}]. Fallback layout remains active.`,
    );
    return null;
  }

  async function initializeDynamicDatabaseSync() {
    console.log(
      "Maneuver Driving School: Running live structural update loops...",
    );

    // A. Sync Company Configuration elements
    const configData = await fetchGoogleSheetData("CompanyConfig");
    if (configData) {
      const configMap = {};
      configData.forEach((row) => {
        const keyProp = row["Key"] || row["key"];
        const valueProp = row["Value"] || row["value"];
        if (keyProp) configMap[normalizeKey(keyProp)] = valueProp;
      });

      if (configMap["whatsappnumber"]) {
        fallbackWhatsappNumber = String(configMap["whatsappnumber"]).replace(
          /\D/g,
          "",
        );
      }

      $$("[data-sheet-config]").forEach((element) => {
        const propertyKey = normalizeKey(
          element.getAttribute("data-sheet-config"),
        );
        if (configMap[propertyKey]) {
          if (element.tagName === "A") {
            if (propertyKey === "phone" && configMap["phoneraw"]) {
              element.href =
                "tel:" + String(configMap["phoneraw"]).replace(/\s+/g, "");
            } else if (propertyKey === "email") {
              element.href = "mailto:" + configMap["email"];
            }
          }
          const nestedSvg = element.querySelector("svg");
          if (nestedSvg) {
            element.innerHTML =
              nestedSvg.outerHTML + " " + configMap[propertyKey];
          } else {
            element.textContent = configMap[propertyKey];
          }
        }
      });
    }

    // B. Sync Dynamic Section Content loops
    const dynamicLoopContainers = $$("[data-sheet-loop]");
    for (const container of dynamicLoopContainers) {
      const tabTargetName = container.getAttribute("data-sheet-loop");
      const listData = await fetchGoogleSheetData(tabTargetName);

      if (!listData || listData.length === 0) {
        console.warn(
          `Dynamic loop bypass: No data returned from sheet tab [${tabTargetName}].`,
        );
        continue;
      }

      if (!container.firstElementChild) {
        console.warn(
          `Dynamic loop bypass: No template item found for [${tabTargetName}].`,
        );
        continue;
      }

      const itemTemplate = container.firstElementChild.cloneNode(true);
      container.innerHTML = "";

      listData.forEach((rowRecord, index) => {
        const instanceNode = itemTemplate.cloneNode(true);

        if (tabTargetName === "Packages") {
          const featuredFlag =
            String(rowRecord["isfeatured"] || "").toLowerCase() === "true";
          const bestValueFlag =
            String(rowRecord["bestvalue"] || "").toLowerCase() === "true";

          instanceNode.className = "pkg-card reveal-up";
          if (featuredFlag) instanceNode.classList.add("pkg-featured");

          const originalBadge = instanceNode.querySelector(
            ".pkg-popular-badge, .pkg-best-value-badge",
          );
          if (originalBadge) originalBadge.remove();

          if (featuredFlag) {
            instanceNode.insertAdjacentHTML(
              "afterbegin",
              `<div class="pkg-popular-badge">★ Most Popular</div>`,
            );
          } else if (bestValueFlag) {
            instanceNode.insertAdjacentHTML(
              "afterbegin",
              `<div class="pkg-best-value-badge">Best Value</div>`,
            );
          }
          instanceNode.style.setProperty("--delay", `${index * 0.07}s`);
        }

        $$("[data-field]", instanceNode).forEach((field) => {
          const matchingColumn = normalizeKey(field.getAttribute("data-field"));
          if (rowRecord[matchingColumn] !== undefined) {
            field.textContent = rowRecord[matchingColumn];
          }
        });

        container.appendChild(instanceNode);
      });

      if (tabTargetName === "FAQs") {
        setupFAQList(container);
      }
    }

    initializePackageHoverFixes();
    if (typeof window._startReveal === "function" && window._loaderComplete) {
      window._startReveal();
    }
  }

  /* ══════════════════════════════════════════════════════════
     4. STICKY NAVBAR — scroll shadow + active link
  ══════════════════════════════════════════════════════════ */
  const navbar = $("#navbar");

  function updateNavbar() {
    navbar && navbar.classList.toggle("scrolled", window.scrollY > 20);
  }

  const sections = $$("section[id], div[id]");
  const navAnchors = $$(".nav-links a");

  function updateActiveLink() {
    let current = "";
    const mid = window.scrollY + window.innerHeight / 3;
    sections.forEach((sec) => {
      if (sec.offsetTop <= mid) current = sec.id;
    });
    navAnchors.forEach((a) => {
      a.classList.toggle("active", a.getAttribute("href") === `#${current}`);
    });
  }

  window.addEventListener(
    "scroll",
    () => {
      updateNavbar();
      updateActiveLink();
      updateScrollTop();
    },
    { passive: true },
  );

  updateNavbar();
  updateActiveLink();

  /* ══════════════════════════════════════════════════════════
     5. MOBILE HAMBURGER MENU
  ══════════════════════════════════════════════════════════ */
  const hamburger = $("#hamburger");
  const navMenu = $("#navMenu");

  if (hamburger && navMenu) {
    hamburger.addEventListener("click", () => {
      const isOpen = hamburger.classList.toggle("open");
      hamburger.setAttribute("aria-expanded", String(isOpen));
      navMenu.classList.toggle("open", isOpen);
    });

    $$(".nav-links a").forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", (e) => {
      if (navbar && !navbar.contains(e.target)) closeMenu();
    });
  }

  function closeMenu() {
    if (!hamburger || !navMenu) return;
    hamburger.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
    navMenu.classList.remove("open");
  }

  /* ══════════════════════════════════════════════════════════
     6. SMOOTH SCROLL
  ══════════════════════════════════════════════════════════ */
  function scrollToSection(id) {
    const target = document.getElementById(id);
    if (!target) return;
    const navH =
      parseInt(
        getComputedStyle(document.documentElement).getPropertyValue(
          "--nav-height",
        ),
      ) || 72;
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - navH - 8,
      behavior: "smooth",
    });
    history.replaceState(null, "", location.pathname);
  }

  $$("[data-scroll-top]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: "smooth" });
      history.replaceState(null, "", location.pathname);
    });
  });

  $$("[data-scroll-to]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      scrollToSection(el.getAttribute("data-scroll-to"));
    });
  });

  document.addEventListener("click", function (e) {
    const anchor = e.target.closest('a[href^="#"]');
    if (!anchor) return;
    const raw = anchor.getAttribute("href");
    if (raw === "#") {
      e.preventDefault();
      return;
    }
    const id = raw.slice(1);
    if (!id) return;
    e.preventDefault();
    scrollToSection(id);
  });

  (function handleInitialHash() {
    const hash = location.hash;
    if (!hash || hash === "#") return;
    const id = hash.slice(1);
    setTimeout(() => {
      scrollToSection(id);
    }, 100);
  })();

  /* ══════════════════════════════════════════════════════════
     7. SCROLL REVEAL — IntersectionObserver
  ══════════════════════════════════════════════════════════ */
  function normalizeRevealsForMobile() {
    if (window.innerWidth > 640) return;
    $$(".reveal-left, .reveal-right").forEach((el) => {
      el.classList.remove("reveal-left", "reveal-right");
      el.classList.add("reveal-up");
    });
  }
  normalizeRevealsForMobile();
  window.addEventListener("resize", normalizeRevealsForMobile, {
    passive: true,
  });

  const revealObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -48px 0px" },
  );

  if (window._loaderComplete) {
    window._startReveal();
  }

  /* ══════════════════════════════════════════════════════════
     8. ANIMATED COUNTERS (about stats + pass-rate circle)
  ══════════════════════════════════════════════════════════ */
  function animateCounter(el, target, duration = 1600) {
    const start = performance.now();
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent =
        target % 1 !== 0
          ? (target * ease).toFixed(1)
          : Math.floor(target * ease);
      if (progress < 1) raf(step);
    }
    raf(step);
  }

  const statsBar = $(".about-stats-bar");
  let statsDone = false;
  if (statsBar) {
    new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !statsDone) {
          statsDone = true;
          const nums = $$(".stat-num", statsBar);
          const targets = [2, 100, 5];
          nums.forEach((el, i) => {
            const suffix = el.querySelector(".stat-plus, .stat-star");
            const suffixHTML = suffix ? suffix.outerHTML : "";
            const span = document.createElement("span");
            span.textContent = "0";
            el.innerHTML = "";
            el.appendChild(span);
            if (suffixHTML) el.insertAdjacentHTML("beforeend", suffixHTML);
            animateCounter(span, targets[i]);
          });
        }
      },
      { threshold: 0.5 },
    ).observe(statsBar);
  }

  const prcNum = $(".prc-num");
  let prcDone = false;
  if (prcNum) {
    new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !prcDone) {
          prcDone = true;
          const suffix = prcNum.querySelector("span");
          const span = document.createElement("span");
          span.textContent = "0";
          prcNum.innerHTML = "";
          prcNum.appendChild(span);
          if (suffix) prcNum.appendChild(suffix);
          animateCounter(span, 90, 1800);
        }
      },
      { threshold: 0.5 },
    ).observe(prcNum);
  }

  /* ══════════════════════════════════════════════════════════
     9. FAQ ACCORDION — perfectly mirrored open/close
  ══════════════════════════════════════════════════════════ */
  function expandItem(item) {
    const btn = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");
    if (!btn || !answer) return;

    item.classList.add("open");
    btn.setAttribute("aria-expanded", "true");

    answer.style.height = "0px";
    answer.style.opacity = "0";
    answer.removeAttribute("hidden");
    answer.classList.remove("is-open");

    const targetH = answer.scrollHeight;

    raf2(() => {
      answer.classList.add("is-open");
      answer.style.height = targetH + "px";
      answer.style.opacity = "1";
    });
  }

  function collapseItem(item) {
    const btn = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");
    if (!btn || !answer) return;

    const currentH = answer.scrollHeight;
    answer.style.height = currentH + "px";
    answer.style.opacity = "1";

    item.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    answer.classList.remove("is-open");

    raf2(() => {
      answer.style.height = "0px";
      answer.style.opacity = "0";
    });
  }

  function setupFAQList(container) {
    if (!container) return;

    // Homepage preview: only show first 4 FAQs. The full faqs.html page does not use this attribute.
    const isPreview = container.getAttribute("data-faq-preview") === "true";
    const limit = Number(container.getAttribute("data-faq-preview-limit")) || 4;
    const items = $$(".faq-item", container);

    items.forEach((item, index) => {
      if (isPreview && index >= limit) {
        item.style.display = "none";
      } else {
        item.style.display = "";
      }

      const btn = item.querySelector(".faq-question");
      if (btn) btn.setAttribute("aria-expanded", "false");
      item.classList.remove("open");

      const answer = item.querySelector(".faq-answer");
      if (answer) {
        answer.classList.remove("is-open");
        answer.style.height = "0px";
        answer.style.opacity = "0";
      }
    });

    if (container.dataset.faqAccordionBound === "true") return;
    container.dataset.faqAccordionBound = "true";

    container.addEventListener("click", (event) => {
      const btn = event.target.closest(".faq-question");
      if (!btn || !container.contains(btn)) return;

      const item = btn.closest(".faq-item");
      if (!item || item.style.display === "none") return;

      const isOpen = item.classList.contains("open");
      $$(".faq-item.open", container).forEach((openItem) => {
        if (openItem !== item) collapseItem(openItem);
      });

      isOpen ? collapseItem(item) : expandItem(item);
    });
  }

  // Bind static fallback FAQ markup before Google Sheets replaces it. The dynamic sync calls this again after loading.
  $$(".faq-list").forEach(setupFAQList);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
      $$(".faq-item.open").forEach(collapseItem);
    }
  });

  window.addEventListener("popstate", () => {
    if (location.hash) {
      history.replaceState(null, "", location.pathname);
    }
  });

  /* ══════════════════════════════════════════════════════════
     10. CONTACT FORM — validation + Formspree submit
  ══════════════════════════════════════════════════════════ */
  const form = $("#contactForm");
  const submitBtn = $("#submitBtn");
  const submitText = $("#submitText");
  const submitSpinner = $("#submitSpinner");
  const formSuccess = $("#formSuccess");

  if (form) {
    const validators = [
      {
        id: "firstName",
        errorId: "firstNameError",
        rule: (v) => v.length >= 2,
        msg: "Please enter your first name (at least 2 characters).",
      },
      {
        id: "lastName",
        errorId: "lastNameError",
        rule: (v) => v.length >= 2,
        msg: "Please enter your last name (at least 2 characters).",
      },
      {
        id: "phone",
        errorId: "phoneError",
        rule: (v) => /^[\d\s\(\)\+\-]{7,}$/.test(v),
        msg: "Please enter a valid phone number.",
      },
      {
        id: "email",
        errorId: "emailError",
        rule: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        msg: "Please enter a valid email address.",
      },
    ];

    function validateField({ id, errorId, rule, msg }) {
      const field = $(`#${id}`);
      const error = $(`#${errorId}`);
      if (!field || !error) return true;
      const ok = rule(field.value.trim());
      field.classList.toggle("error", !ok);
      error.textContent = ok ? "" : msg;
      return ok;
    }

    function showFormMessage(message, isError = false) {
      if (!formSuccess) return;
      formSuccess.classList.remove("hidden");
      formSuccess.classList.toggle("form-error", isError);
      const text = formSuccess.querySelector("span");
      if (text) text.textContent = message;
    }

    validators.forEach((v) => {
      const field = $(`#${v.id}`);
      if (!field) return;
      field.addEventListener("blur", () => validateField(v));
      field.addEventListener("input", () => {
        if (field.classList.contains("error")) validateField(v);
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const allValid = validators.every((v) => validateField(v));
      if (!allValid) {
        const first = form.querySelector(".error");
        if (first) {
          first.scrollIntoView({ behavior: "smooth", block: "center" });
          first.focus();
        }
        return;
      }

      const endpoint = form.getAttribute("action");
      if (!endpoint || endpoint.includes("YOUR_FORM_ID")) {
        showFormMessage(
          "Formspree is not connected yet. Replace YOUR_FORM_ID in index.html with your real Formspree form ID.",
          true,
        );
        return;
      }

      if (submitBtn) submitBtn.disabled = true;
      if (submitText) submitText.textContent = "Sending...";
      if (submitSpinner) submitSpinner.classList.remove("hidden");
      if (formSuccess) formSuccess.classList.add("hidden");

      try {
        const formData = new FormData(form);
        const response = await fetch(endpoint, {
          method: "POST",
          body: formData,
          headers: { Accept: "application/json" },
        });

        if (!response.ok) {
          let errorMessage =
            "Something went wrong. Please try again or call us directly.";
          try {
            const data = await response.json();
            if (
              data &&
              data.errors &&
              data.errors[0] &&
              data.errors[0].message
            ) {
              errorMessage = data.errors[0].message;
            }
          } catch (_) {}
          throw new Error(errorMessage);
        }

        form.reset();
        showFormMessage(
          "Your enquiry has been sent successfully. We will get back to you soon.",
        );
      } catch (err) {
        showFormMessage(
          err.message ||
            "Something went wrong. Please try again or call us directly.",
          true,
        );
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.textContent = "Send Message";
        if (submitSpinner) submitSpinner.classList.add("hidden");
      }
    });
  }

  /* ══════════════════════════════════════════════════════════
     11. SCROLL-TO-TOP BUTTON
  ══════════════════════════════════════════════════════════ */
  const scrollTopBtn = $("#scrollTop");

  function updateScrollTop() {
    scrollTopBtn &&
      scrollTopBtn.classList.toggle("visible", window.scrollY > 500);
  }

  scrollTopBtn &&
    scrollTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

  /* ══════════════════════════════════════════════════════════
     12. PACKAGE CARDS — dim siblings on hover
  ══════════════════════════════════════════════════════════ */
  function initializePackageHoverFixes() {
    const pkgCards = $$(".pkg-card");
    pkgCards.forEach((card) => {
      card.addEventListener("mouseenter", () => {
        pkgCards.forEach((c) => {
          if (c !== card && !c.classList.contains("pkg-featured")) {
            c.style.opacity = "0.68";
            c.style.filter = "saturate(0.7)";
          }
        });
      });
      card.addEventListener("mouseleave", () => {
        pkgCards.forEach((c) => {
          c.style.opacity = "";
          c.style.filter = "";
        });
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     13. WHO CARDS — staggered reveal delay
  ══════════════════════════════════════════════════════════ */
  $$(".who-card").forEach((card, i) => {
    card.style.setProperty("--delay", `${i * 0.1}s`);
  });

  /* ══════════════════════════════════════════════════════════
     14. REVIEW CARDS — 3-D tilt on mouse move (desktop only)
  ══════════════════════════════════════════════════════════ */
  const isTouch = () =>
    "ontouchstart" in window || navigator.maxTouchPoints > 0;

  if (!isTouch()) {
    document.addEventListener("mousemove", function (e) {
      const card = e.target.closest(".review-card");
      if (!card) return;
      const r = card.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
      const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
      card.style.transform = `translateY(-5px) rotateX(${-dy * 4}deg) rotateY(${dx * 4}deg)`;
      card.style.transition = "transform 0.1s ease";
    });

    document.addEventListener(
      "mouseleave",
      function (e) {
        if (e.target.classList.contains("review-card")) {
          e.target.style.transform = "";
          e.target.style.transition = "transform 0.4s ease";
        }
      },
      true,
    );
  }

  /* ══════════════════════════════════════════════════════════
     15. ROADTEST ITEMS & FLOATING WHATSAPP BUTTON
  ══════════════════════════════════════════════════════════ */
  $$(".rt-item").forEach((item) => {
    item.style.transition =
      "background 0.25s ease, transform 0.25s ease, border-color 0.25s ease";
  });

  function addWhatsAppFloat() {
    if (document.getElementById("waFloat")) return;
    if (window.innerWidth > 640) return;

    const wa = document.createElement("a");
    wa.id = "waFloat";
    wa.href = `https://wa.me/${fallbackWhatsappNumber}?text=Hi%20I%20want%20to%20book%20a%20driving%20lesson!`;
    wa.target = "_blank";
    wa.rel = "noopener noreferrer";
    wa.setAttribute("aria-label", "Chat on WhatsApp");
    wa.innerHTML = `<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`;

    Object.assign(wa.style, {
      position: "fixed",
      bottom: "82px",
      right: "20px",
      width: "52px",
      height: "52px",
      background: "#25D366",
      color: "#fff",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyCenter: "center",
      justifyContent: "center",
      boxShadow: "0 4px 20px rgba(37,211,102,0.5)",
      zIndex: "499",
      textDecoration: "none",
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
    });

    wa.addEventListener("mouseenter", () => {
      wa.style.transform = "scale(1.1)";
      wa.style.boxShadow = "0 6px 28px rgba(37,211,102,0.65)";
    });
    wa.addEventListener("mouseleave", () => {
      wa.style.transform = "";
      wa.style.boxShadow = "0 4px 20px rgba(37,211,102,0.5)";
    });

    document.body.appendChild(wa);
  }

  addWhatsAppFloat();
  window.addEventListener("resize", addWhatsAppFloat, { passive: true });

  /* ══════════════════════════════════════════════════════════
     16. STEP HOVERS · STARS ENTRANCE · PULSE
  ══════════════════════════════════════════════════════════ */
  $$(".step").forEach((step) => {
    const num = step.querySelector(".step-num");
    if (!num) return;
    step.addEventListener("mouseenter", () => {
      num.style.background = "var(--gold)";
      num.style.color = "var(--navy)";
      num.style.transform = "scale(1.1)";
    });
    step.style.addEventListener ||
      step.addEventListener("mouseleave", () => {
        num.style.background = "";
        num.style.color = "";
        num.style.transform = "";
      });
  });

  const grbStars = $(".grb-stars");
  let starsDone = false;
  if (grbStars) {
    new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !starsDone) {
          starsDone = true;
          grbStars.style.cssText +=
            "opacity:0;transform:scale(0.75);transition:opacity .5s ease,transform .5s cubic-bezier(.34,1.56,.64,1)";
          raf2(() => {
            grbStars.style.opacity = "1";
            grbStars.style.transform = "scale(1)";
          });
        }
      },
      { threshold: 0.8 },
    ).observe(grbStars);
  }

  const badge = $(".hero-badge");
  if (badge) {
    let visible = true;
    setInterval(() => {
      const dot = badge.querySelector(".badge-dot");
      if (dot) {
        dot.style.transform = visible ? "scale(1.4)" : "scale(1)";
        dot.style.opacity = visible ? "0.5" : "1";
        dot.style.transition = "transform 0.5s ease, opacity 0.5s ease";
        visible = !visible;
      }
    }, 1000);
  }

  if ("fonts" in document) {
    document.fonts.ready.then(() =>
      document.body.classList.add("fonts-loaded"),
    );
  }

  // Run dynamic setup
  if (document.readyState === "complete") {
    initializeDynamicDatabaseSync();
  } else {
    window.addEventListener("load", initializeDynamicDatabaseSync);
  }

  console.log(
    "%c Maneuver Driving School %c v2.0 — Licensed & Certified ",
    "background:#0A1628;color:#C9943A;padding:4px 8px;font-weight:bold;border-radius:4px 0 0 4px",
    "background:#C9943A;color:#0A1628;padding:4px 8px;font-weight:bold;border-radius:0 4px 4px 0",
  );
})();
