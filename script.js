/* ============================================================
   MANEUVER DRIVING SCHOOL — script.js  v2.0
   Includes: Page Loader · Fixed FAQ Accordion · Nav ·
   Scroll Reveal · Counters · Form · WhatsApp · Parallax
   All animations hardware-accelerated & CLS-safe
   ============================================================ */

(function () {
  "use strict";

  /* ── HELPERS ─────────────────────────────────────────────── */
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
  const raf = requestAnimationFrame.bind(window);
  const raf2 = (fn) => raf(() => raf(fn)); // double-rAF for post-paint reads

  /* ══════════════════════════════════════════════════════════
     1. PAGE LOADER
     Fixed: guard against double-dismiss, transitionend never
     firing (background tab / prefers-reduced-motion), and
     revealObs hoisting issue (hero entrance deferred via
     window._revealReady flag checked by revealObs init below).
  ══════════════════════════════════════════════════════════ */
  const loader = $("#pageLoader");
  const progressBar = $("#plProgressBar");
  let loaderDone = false; /* guard: dismiss runs exactly once */

  function setProgress(pct) {
    if (!progressBar) return;
    progressBar.style.width = Math.min(pct, 100) + "%";
  }

  function dismissLoader() {
    /* ── Guard: never run twice ───────────────────────────── */
    if (loaderDone) return;
    loaderDone = true;

    if (!loader) {
      document.body.classList.remove("loading");
      window._loaderComplete = true;
      return;
    }

    setProgress(100);

    /* After 300 ms show the fade-out */
    setTimeout(() => {
      loader.classList.add("pl-hiding");

      /* ── Reliable exit: use BOTH transitionend AND a hard
         timeout so the page always lands even if the CSS
         transition is skipped (background tab, reduced-motion,
         slow device, display:none race). ─────────────────── */
      let exited = false;
      function onLoaderExit() {
        if (exited) return;
        exited = true;
        loader.classList.add("pl-hidden");
        document.body.classList.remove("loading");
        /* Signal revealObs (defined later) to start observing */
        window._loaderComplete = true;
        if (typeof window._startReveal === "function") window._startReveal();
      }

      /* transitionend fires when CSS opacity/transform finishes */
      loader.addEventListener("transitionend", onLoaderExit, { once: true });
      /* Hard fallback — fires 700 ms after we add pl-hiding,
         well past the 550ms CSS transition duration */
      setTimeout(onLoaderExit, 700);
    }, 300);
  }

  /* Progress animation: 0 → 85% during load, 100% on dismiss */
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

    /* Dismiss as soon as all resources finish loading */
    if (document.readyState === "complete") {
      /* Already loaded (e.g. script deferred / cached page) */
      setTimeout(dismissLoader, 50);
    } else {
      window.addEventListener("load", () => setTimeout(dismissLoader, 50), {
        once: true,
      });
    }
    /* Absolute failsafe — page ALWAYS lands within 3.5 s */
    setTimeout(dismissLoader, 3500);
  } else {
    /* No loader element — mark complete immediately */
    window._loaderComplete = true;
  }

  /* ══════════════════════════════════════════════════════════
     2. HERO ENTRANCE — called once loader has fully exited.
     revealObs is defined later in the file; we bridge the
     timing gap with window._startReveal / _loaderComplete.
  ══════════════════════════════════════════════════════════ */
  window._startReveal = function () {
    /* revealObs is guaranteed to exist by the time this runs
       because it's defined in section 6 below, which executes
       synchronously before any async loader callback fires. */
    if (typeof revealObs === "undefined") return;
    $$(".reveal-fade, .reveal-up, .reveal-left, .reveal-right").forEach(
      (el) => {
        revealObs.observe(el);
      },
    );
  };

  /* ══════════════════════════════════════════════════════════
     3. STICKY NAVBAR — scroll shadow + active link
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
     4. MOBILE HAMBURGER MENU
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
      if (!navbar.contains(e.target)) closeMenu();
    });
  }

  function closeMenu() {
    if (!hamburger || !navMenu) return;
    hamburger.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
    navMenu.classList.remove("open");
  }

  /* ══════════════════════════════════════════════════════════
     5. SMOOTH SCROLL
  ══════════════════════════════════════════════════════════ */
  /* ── Clean URL scroll helper ────────────────────────────────
     Scrolls to the target section WITHOUT writing anything to
     the browser address bar.
     Strategy:
       1. e.preventDefault()  — stops default anchor jump
       2. window.scrollTo()   — smooth-scroll to correct offset
       3. history.replaceState(null,'', location.pathname)
          — immediately wipes any #hash the browser may have
            written, keeping the URL as plain domain.com
  ─────────────────────────────────────────────────────────── */
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
    /* Erase any hash the browser wrote before our handler ran */
    history.replaceState(null, "", location.pathname);
  }

  /* ── Handle logo (data-scroll-top) and scroll-cue (data-scroll-to) ── */
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

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const raw = a.getAttribute("href");
      /* href="#" with no ID is a no-op — ignore */
      if (raw === "#") {
        e.preventDefault();
        return;
      }
      const id = raw.slice(1);
      if (!id) return;
      e.preventDefault();
      scrollToSection(id);
    });
  });

  /* ── Also strip any hash that arrives when the page first loads
     (e.g. user bookmarked domain.com/#contact — we silently scroll
     to the right section but immediately clean the URL) ──────── */
  (function handleInitialHash() {
    const hash = location.hash;
    if (!hash || hash === "#") return;
    const id = hash.slice(1);
    /* Use a short delay so the page has painted before we scroll */
    setTimeout(() => {
      scrollToSection(id);
    }, 100);
  })();

  /* ══════════════════════════════════════════════════════════
     6. SCROLL REVEAL — IntersectionObserver
  ══════════════════════════════════════════════════════════ */
  /* On narrow viewports, convert horizontal reveals to vertical
     to eliminate any translateX that could trigger horizontal scroll */
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

  /* Start observing:
     - If loader already finished (cached/fast page): start now
     - If loader is still running: _startReveal() will be called
       by onLoaderExit() once the fade-out completes
     - If no loader element at all: start immediately */
  if (window._loaderComplete) {
    window._startReveal();
  }
  /* else: _startReveal is registered on window and will be
     called by dismissLoader → onLoaderExit when ready */

  /* ══════════════════════════════════════════════════════════
     7. ANIMATED COUNTERS (about stats + pass-rate circle)
  ══════════════════════════════════════════════════════════ */
  function animateCounter(el, target, duration = 1600) {
    const start = performance.now();
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      el.textContent =
        target % 1 !== 0
          ? (target * ease).toFixed(1)
          : Math.floor(target * ease);
      if (progress < 1) raf(step);
    }
    raf(step);
  }

  /* About stats bar */
  const statsBar = $(".about-stats-bar");
  let statsDone = false;
  if (statsBar) {
    new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !statsDone) {
          statsDone = true;
          const nums = $$(".stat-num", statsBar);
          const targets = [10, 500, 5];
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

  /* Pass-rate circle */
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
          animateCounter(span, 95, 1800);
        }
      },
      { threshold: 0.5 },
    ).observe(prcNum);
  }

  /* ══════════════════════════════════════════════════════════
     8. FAQ ACCORDION — perfectly mirrored open/close
     Strategy: read actual scrollHeight, set explicit px values
     both ways so the CSS transition runs identically in both
     directions. No `hidden` attribute — height:0 + opacity:0
     keeps it visually hidden while remaining in the DOM flow
     (so scrollHeight reads correctly at all times).
  ══════════════════════════════════════════════════════════ */
  $$(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq-item");
      const answer = item.querySelector(".faq-answer");
      const isOpen = item.classList.contains("open");

      /* --- Close all other open items with animation --- */
      $$(".faq-item.open").forEach((openItem) => {
        if (openItem === item) return;
        collapseItem(openItem);
      });

      /* --- Toggle this item --- */
      if (isOpen) {
        collapseItem(item);
      } else {
        expandItem(item);
      }
    });
  });

  function expandItem(item) {
    const btn = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");

    item.classList.add("open");
    btn.setAttribute("aria-expanded", "true");

    /* 1. Make sure it's visible but at 0 height */
    answer.style.height = "0px";
    answer.style.opacity = "0";
    answer.removeAttribute("hidden");
    answer.classList.remove("is-open");

    /* 2. Read natural height (after removing display:none / hidden) */
    const targetH = answer.scrollHeight;

    /* 3. Double-rAF: first frame commits 0px to compositor,
          second frame triggers the transition to targetH */
    raf2(() => {
      answer.classList.add("is-open");
      answer.style.height = targetH + "px";
      answer.style.opacity = "1";
    });
  }

  function collapseItem(item) {
    const btn = item.querySelector(".faq-question");
    const answer = item.querySelector(".faq-answer");

    /* 1. Pin height to current rendered value before animating */
    const currentH = answer.scrollHeight;
    answer.style.height = currentH + "px";
    answer.style.opacity = "1";

    item.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    answer.classList.remove("is-open");

    /* 2. Double-rAF to collapse back to 0 */
    raf2(() => {
      answer.style.height = "0px";
      answer.style.opacity = "0";
    });
  }

  /* Keyboard: close on Escape */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu();
      $$(".faq-item.open").forEach(collapseItem);
    }
  });

  /* ── Prevent hash from reappearing on browser back/forward ──
     If the user navigates with Back/Forward and a hash state
     was in the history stack, popstate fires with a hash.
     We immediately wipe it so the URL stays clean. ──────── */
  window.addEventListener("popstate", () => {
    if (location.hash) {
      history.replaceState(null, "", location.pathname);
    }
  });

  /* ══════════════════════════════════════════════════════════
     9. CONTACT FORM — validation + async submit
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

    validators.forEach((v) => {
      const field = $(`#${v.id}`);
      if (!field) return;
      field.addEventListener("blur", () => validateField(v));
      field.addEventListener("input", () => {
        if (field.classList.contains("error")) validateField(v);
      });
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();

      /* ── 1. Validate all required fields ─────────────────── */
      const allValid = validators.every((v) => validateField(v));
      if (!allValid) {
        const first = form.querySelector(".error");
        if (first) {
          first.scrollIntoView({ behavior: "smooth", block: "center" });
          first.focus();
        }
        return;
      }

      /* ── 2. Read field values ─────────────────────────────── */
      const firstName = ($("#firstName").value || "").trim();
      const lastName = ($("#lastName").value || "").trim();
      const phone = ($("#phone").value || "").trim();
      const email = ($("#email").value || "").trim();
      const pkgSelect = $("#package");
      const pkgLabel =
        pkgSelect && pkgSelect.selectedIndex > 0
          ? pkgSelect.options[pkgSelect.selectedIndex].text
          : "Not selected";
      const message = ($("#message").value || "").trim();

      /* ── 3. Build the structured WhatsApp message ─────────── */
      /* FIXES:
         - Emoji replaced with plain ASCII labels (emoji in URLs
           can appear as ? on some WhatsApp versions / devices)
         - *bold* asterisks kept — WhatsApp markdown parses these
           correctly when the text is URL-encoded properly
         - Separator uses simple dashes (Unicode box-drawing chars
           like ── get mangled on some Android WhatsApp builds)
         - Package label stripped of the star symbol (★) which
           becomes ? when passed through encodeURIComponent on
           some locales — replaced with [Most Popular] text
         - Newlines built as explicit \n string concat, NOT
           template-literal line breaks, to guarantee consistency
           across all JS engines
      ─────────────────────────────────────────────────────── */
      const now = new Date();
      const timestamp = now.toLocaleString("en-CA", {
        timeZone: "America/Vancouver",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      /* Strip non-ASCII characters from package label to prevent ? symbols */
      const pkgLabelClean = pkgLabel
        .replace(/[^\x00-\x7F]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      /* Strip non-ASCII from user message too */
      const messageClean = message.replace(/[^\x00-\x7F]/g, "").trim();

      const NL = "\n"; /* explicit newline */
      const SEP = "----------------------------";

      const waLines = [
        "*NEW LESSON ENQUIRY*",
        "*Maneuver Driving School*",
        SEP,
        "*Name:* " + firstName + " " + lastName,
        "*Phone:* " + phone,
        "*Email:* " + email,
        "*Package:* " + pkgLabelClean,
        "*Message:* " + (messageClean || "None"),
        SEP,
        "*Time:* " + timestamp + " (Vancouver)",
      ];

      const waMessage = waLines.join(NL);

      /* ── 4. Encode and open WhatsApp ──────────────────────── */
      /* Your WhatsApp number: +977 9863037607 (Nepal) */
      const waNumber = "9779863037607";
      const waURL =
        "https://wa.me/" + waNumber + "?text=" + encodeURIComponent(waMessage);

      /* ── 5. Show success state immediately ───────────────── */
      submitBtn.classList.add("hidden");
      submitSpinner.classList.add("hidden");
      formSuccess.classList.remove("hidden");
      form.reset();

      /* ── 6. Open WhatsApp in a new tab ───────────────────── */
      /* Small timeout so the user sees the success message     */
      /* before being taken to WhatsApp                        */
      setTimeout(() => {
        window.open(waURL, "_blank", "noopener,noreferrer");
      }, 600);

      /* ── 7. Reset button after 10 s ─────────────────────── */
      setTimeout(() => {
        formSuccess.classList.add("hidden");
        submitBtn.classList.remove("hidden");
        submitBtn.disabled = false;
        submitText.textContent = "Send Message — We'll Reply Within Hours";
      }, 10000);
    });
  }

  /* ══════════════════════════════════════════════════════════
     10. SCROLL-TO-TOP BUTTON
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
     11. PACKAGE CARDS — dim siblings on hover
  ══════════════════════════════════════════════════════════ */
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

  /* ══════════════════════════════════════════════════════════
     12. WHO CARDS — staggered reveal delay
  ══════════════════════════════════════════════════════════ */
  $$(".who-card").forEach((card, i) => {
    card.style.setProperty("--delay", `${i * 0.1}s`);
  });

  /* ══════════════════════════════════════════════════════════
     13. REVIEW CARDS — 3-D tilt on mouse move (desktop only)
  ══════════════════════════════════════════════════════════ */
  const isTouch = () =>
    "ontouchstart" in window || navigator.maxTouchPoints > 0;

  if (!isTouch()) {
    $$(".review-card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) / (r.width / 2);
        const dy = (e.clientY - r.top - r.height / 2) / (r.height / 2);
        card.style.transform = `translateY(-5px) rotateX(${-dy * 4}deg) rotateY(${dx * 4}deg)`;
        card.style.transition = "transform 0.1s ease";
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
        card.style.transition = "transform 0.4s ease";
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     14. ROADTEST ITEMS — slide-in on hover
  ══════════════════════════════════════════════════════════ */
  $$(".rt-item").forEach((item) => {
    item.style.transition =
      "background 0.25s ease, transform 0.25s ease, border-color 0.25s ease";
  });

  /* ══════════════════════════════════════════════════════════
     15. FLOATING WHATSAPP BUTTON (mobile only)
  ══════════════════════════════════════════════════════════ */
  function addWhatsAppFloat() {
    if (document.getElementById("waFloat")) return;
    if (window.innerWidth > 640) return;

    const wa = document.createElement("a");
    wa.id = "waFloat";
    wa.href =
      "https://wa.me/17787232850?text=Hi%20I%20want%20to%20book%20a%20driving%20lesson!";
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
     16. STEP HOVERS
  ══════════════════════════════════════════════════════════ */
  $$(".step").forEach((step) => {
    const num = step.querySelector(".step-num");
    if (!num) return;
    step.addEventListener("mouseenter", () => {
      num.style.background = "var(--gold)";
      num.style.color = "var(--navy)";
      num.style.transform = "scale(1.1)";
    });
    step.addEventListener("mouseleave", () => {
      num.style.background = "";
      num.style.color = "";
      num.style.transform = "";
    });
  });

  /* ══════════════════════════════════════════════════════════
     17. PACKAGE CARDS — stagger delay + observe
  ══════════════════════════════════════════════════════════ */
  $$(".pkg-card").forEach((card, i) => {
    card.style.setProperty("--delay", `${i * 0.07}s`);
    revealObs.observe(card);
  });

  /* ══════════════════════════════════════════════════════════
     18. GOOGLE STARS ENTRANCE
  ══════════════════════════════════════════════════════════ */
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

  /* ══════════════════════════════════════════════════════════
     19. HERO BADGE PULSE (alive feeling)
  ══════════════════════════════════════════════════════════ */
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

  /* ══════════════════════════════════════════════════════════
     20. FONT PRELOAD + BRANDED CONSOLE LOG
  ══════════════════════════════════════════════════════════ */
  if ("fonts" in document) {
    document.fonts.ready.then(() =>
      document.body.classList.add("fonts-loaded"),
    );
  }

  console.log(
    "%c Maneuver Driving School %c v2.0 — Licensed & Certified ",
    "background:#0A1628;color:#C9943A;padding:4px 8px;font-weight:bold;border-radius:4px 0 0 4px",
    "background:#C9943A;color:#0A1628;padding:4px 8px;font-weight:bold;border-radius:0 4px 4px 0",
  );
})();
