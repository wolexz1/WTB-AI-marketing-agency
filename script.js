(() => {
  const primaryOrigin = "https://wtbaimarketing.com";
  const oldPagesHost = "wtb-ai-marketing-agency.pages.dev";
  const oldGitHubHost = "wolexz1.github.io";
  const oldGitHubBase = /^\/WTB-AI-marketing-agency\/?/;

  if (window.location.hostname === oldGitHubHost) {
    const cleanPath = window.location.pathname.replace(oldGitHubBase, "/");
    window.location.replace(`${primaryOrigin}${cleanPath}${window.location.search}${window.location.hash}`);
  }

  if (window.location.hostname === oldPagesHost) {
    window.location.replace(`${primaryOrigin}${window.location.pathname}${window.location.search}${window.location.hash}`);
  }
})();

const setupTestimonialSlider = () => {
  const track = document.querySelector(".testimonial-track");

  if (!track || track.dataset.cloned === "true") {
    return;
  }

  Array.from(track.children).forEach((card) => {
    const clone = card.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    track.appendChild(clone);
  });

  track.dataset.cloned = "true";
};

const setupCompactBriefServiceOptions = () => {
  const options = [
    ["", "Choose a focus"],
    ["AI consultancy, automation and AI agents", "AI consultancy, automation and AI agents"],
    ["Marketing strategy and growth systems", "Marketing strategy and growth systems"],
    ["Content, social media and email marketing", "Content, social media and email marketing"],
    ["SEO and AI search visibility", "SEO and AI search visibility"],
    ["Paid ads, lead generation and funnels", "Paid ads, lead generation and funnels"],
    ["Websites, ecommerce and landing pages", "Websites, ecommerce and landing pages"],
    ["Influencer, UGC and X trend campaigns", "Influencer, UGC and X trend campaigns"],
    ["Full growth system - recommend the best fit", "Full growth system - recommend the best fit"],
  ];

  document.querySelectorAll('select[name="service"]').forEach((select) => {
    const currentValue = select.value;
    select.replaceChildren(
      ...options.map(([value, label]) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = label;
        return option;
      }),
    );
    if (options.some(([value]) => value === currentValue)) {
      select.value = currentValue;
    }
  });
};

setupCompactBriefServiceOptions();

setupTestimonialSlider();

const createPageLoader = () => {
  if (window.__wtbPageLoaderReady) return;
  window.__wtbPageLoaderReady = true;

  const loaderText = "WOLEXZTHEBRAND";
  const loader = document.querySelector(".page-loader") || document.createElement("div");
  loader.className = "page-loader";
  loader.setAttribute("aria-hidden", "true");
  if (!loader.parentElement) {
    loader.innerHTML = `
      <div class="page-loader-inner">
        <div class="page-loader-word">${loaderText
          .split("")
          .map((letter, index) => `<span style="--letter-index:${index}">${letter}</span>`)
          .join("")}</div>
        <div class="page-loader-line"></div>
      </div>
    `;
    document.body.appendChild(loader);
  }

  let removeTimer = null;
  let failSafeTimer = null;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const continuedFromNavigation = sessionStorage.getItem("wtb-page-transition") === "1";
  sessionStorage.removeItem("wtb-page-transition");

  const show = () => {
    window.clearTimeout(removeTimer);
    window.clearTimeout(failSafeTimer);
    document.body.classList.add("page-is-loading");
    loader.classList.add("is-active");
    // A navigation transition must never become a stuck screen.
    failSafeTimer = window.setTimeout(hide, 1100);
  };

  const hide = () => {
    window.clearTimeout(failSafeTimer);
    loader.classList.remove("is-active");
    document.body.classList.remove("page-is-loading");
    window.clearTimeout(removeTimer);
    removeTimer = window.setTimeout(() => {
      if (!loader.classList.contains("is-active")) loader.remove();
    }, reduceMotion ? 0 : 280);
  };

  // Give the transition a brief, intentional appearance without waiting for
  // images, analytics, video, or third-party checkout scripts.
  if (!continuedFromNavigation) {
    show();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => window.setTimeout(hide, reduceMotion ? 0 : 420), { once: true });
    } else {
      window.setTimeout(hide, reduceMotion ? 0 : 360);
    }
  }
  window.addEventListener("pageshow", hide);

  document.addEventListener(
    "click",
    (event) => {
      const link = event.target.closest("a[href]");

      if (
        !link ||
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        link.target === "_blank" ||
        link.hasAttribute("download")
      ) {
        return;
      }

      const href = link.getAttribute("href") || "";

      if (
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:")
      ) {
        return;
      }

      const nextUrl = new URL(link.href, window.location.href);

      if (nextUrl.origin !== window.location.origin) {
        return;
      }

      const samePage =
        nextUrl.pathname === window.location.pathname &&
        nextUrl.search === window.location.search;

      if (samePage && nextUrl.hash) {
        return;
      }

      event.preventDefault();
      sessionStorage.setItem("wtb-page-transition", "1");
      show();
      window.setTimeout(() => window.location.assign(nextUrl.href), reduceMotion ? 0 : 180);
    },
    true
  );
};

if (document.body) {
  createPageLoader();
}

const formNote = document.querySelector("#formNote");
const quickFormNote = document.querySelector("#quickFormNote");
const websiteBriefNote = document.querySelector("#websiteBriefNote");
const modal = document.querySelector("#briefModal");
const modalTriggers = Array.from(document.querySelectorAll(".brief-modal-trigger"));
const modalClosers = Array.from(document.querySelectorAll("[data-modal-close]"));
const revealItems = Array.from(document.querySelectorAll(".reveal"));
const statNumbers = Array.from(document.querySelectorAll(".stat-number"));
const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");
const heroVideo = document.querySelector(".hero-video");
const motionAllowed = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (motionAllowed) {
  let cursorFrame = null;

  window.addEventListener(
    "pointermove",
    (event) => {
      if (cursorFrame) {
        return;
      }

      cursorFrame = window.requestAnimationFrame(() => {
        const x = (event.clientX / window.innerWidth - 0.5).toFixed(3);
        const y = (event.clientY / window.innerHeight - 0.5).toFixed(3);
        document.documentElement.style.setProperty("--cursor-x", x);
        document.documentElement.style.setProperty("--cursor-y", y);
        cursorFrame = null;
      });
    },
    { passive: true }
  );
}

const loadHeroVideo = () => {
  if (!heroVideo || heroVideo.dataset.loaded === "true") {
    return;
  }

  heroVideo.querySelectorAll("source[data-src]").forEach((source) => {
    source.src = source.dataset.src;
    source.removeAttribute("data-src");
  });
  heroVideo.dataset.loaded = "true";
  heroVideo.load();
  heroVideo.play().catch(() => {});
};

if (heroVideo && motionAllowed) {
  window.addEventListener("load", () => {
    window.setTimeout(loadHeroVideo, 1200);
  }, { once: true });
}

revealItems.forEach((item, index) => {
  const delay = Math.min((index % 6) * 70, 350);
  item.style.setProperty("--reveal-delay", `${delay}ms`);
});

const animateStat = (stat) => {
  if (stat.dataset.counted === "true") {
    return;
  }

  stat.dataset.counted = "true";

  const target = Number(stat.dataset.count || 0);
  const suffix = stat.dataset.suffix || "";
  const duration = 2600;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(target * eased);

    stat.textContent = `${value}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
};

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        entry.target.querySelectorAll(".stat-number").forEach(animateStat);
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.18 }
);

revealItems.forEach((item) => revealObserver.observe(item));
statNumbers.forEach((stat) => {
  if (!stat.closest(".reveal")) {
    animateStat(stat);
  }
});

const openModal = () => {
  if (!modal) {
    document.querySelector("#briefForm")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }

  modal?.classList.add("is-open");
  modal?.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  modal?.querySelector("input[name='name']")?.focus();
};

const closeModal = () => {
  modal?.classList.remove("is-open");
  modal?.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
};

modalTriggers.forEach((trigger) => {
  trigger.addEventListener("click", openModal);
});

modalClosers.forEach((closer) => {
  closer.addEventListener("click", closeModal);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && modal?.classList.contains("is-open")) {
    closeModal();
  }

  if (event.key === "Escape" && navLinks?.classList.contains("is-open")) {
    navLinks.classList.remove("is-open");
    navToggle?.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
    navToggle?.setAttribute("aria-label", "Open navigation menu");
  }
});

navToggle?.addEventListener("click", () => {
  const isOpen = navLinks?.classList.toggle("is-open") || false;
  navToggle.classList.toggle("is-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
  navToggle.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
});

navLinks?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("is-open");
    navToggle?.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
    navToggle?.setAttribute("aria-label", "Open navigation menu");
  });
});

const setupFormSpamGuards = () => {
  const forms = Array.from(document.querySelectorAll("form[action='/api/submit']"));
  const startedAt = Date.now();
  const tokenValue = `wtb-${startedAt}-${window.location.hostname.replace(/[^a-z0-9.-]/gi, "")}`;

  forms.forEach((form) => {
    [
      ["_form_started_at", String(startedAt)],
      ["_form_token", tokenValue],
      ["_contact_url", ""],
      ["company_url", ""],
    ].forEach(([name, value]) => {
      if (form.querySelector(`[name="${name}"]`)) {
        return;
      }

      const input = document.createElement("input");
      input.type = name === "_contact_url" || name === "company_url" ? "text" : "hidden";
      input.name = name;
      input.value = value;
      input.className = "hidden-field";
      input.tabIndex = -1;
      input.autocomplete = "off";
      input.setAttribute("aria-hidden", "true");
      form.appendChild(input);
    });

    const select = form.querySelector("select[name='service']");
    if (select && !Array.from(select.options).some((option) => option.value === "AI marketing consultancy" || option.textContent === "AI marketing consultancy")) {
      const option = document.createElement("option");
      option.textContent = "AI marketing consultancy";
      select.appendChild(option);
    }
  });
};

setupFormSpamGuards();

const buildShareLinks = ({ url, title, text, image }) => {
  const shareUrl = encodeURIComponent(url);
  const shareTitle = encodeURIComponent(title);
  const shareText = encodeURIComponent(text || title);
  const shareImage = encodeURIComponent(image || "");

  return [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${shareText}%20${shareUrl}`,
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`,
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`,
    },
    {
      label: "Threads",
      href: `https://www.threads.net/intent/post?text=${shareTitle}%20${shareUrl}`,
    },
    {
      label: "Telegram",
      href: `https://t.me/share/url?url=${shareUrl}&text=${shareTitle}`,
    },
    {
      label: "Pinterest",
      href: `https://pinterest.com/pin/create/button/?url=${shareUrl}&media=${shareImage}&description=${shareTitle}`,
    },
    {
      label: "Email",
      href: `mailto:?subject=${shareTitle}&body=${shareText}%0A%0A${shareUrl}`,
      sameTab: true,
    },
  ];
};

const getShareAssetPath = (fileName) => {
  const prefix = document.body.classList.contains("blog-article-page") ? "../../assets/" : "../assets/";
  return `${prefix}${fileName}`;
};

const shareIcons = {
  WhatsApp: "icon-whatsapp.svg",
  X: "icon-x.svg",
  Facebook: "icon-facebook.svg",
  LinkedIn: "icon-linkedin.svg",
  Threads: "icon-threads.svg",
  Telegram: "icon-telegram.svg",
  Pinterest: "icon-pinterest.svg",
  Email: "icon-email.svg",
};

const renderShareAction = (item) => {
  const icon = shareIcons[item.label];
  const iconMarkup = icon ? `<img src="${getShareAssetPath(icon)}" alt="" aria-hidden="true" loading="lazy" decoding="async">` : "";
  return `<a href="${item.href}" ${item.sameTab ? "" : 'target="_blank" rel="noopener noreferrer"'}>${iconMarkup}<span>${item.label}</span></a>`;
};

const createSharePanel = ({ compact = false, rail = false } = {}) => {
  const canonical = document.querySelector("link[rel='canonical']")?.href || window.location.href;
  const title =
    document.querySelector("meta[property='og:title']")?.content ||
    document.title ||
    "WTB AI Marketing Agency";
  const description =
    document.querySelector("meta[property='og:description']")?.content ||
    document.querySelector("meta[name='description']")?.content ||
    "Useful marketing insight from WTB AI Marketing Agency.";
  const shareImage = document.querySelector("meta[property='og:image']")?.content;
  const panel = document.createElement("section");
  panel.className = rail ? "share-panel share-rail" : compact ? "share-panel share-panel-compact" : "share-panel";
  panel.setAttribute("aria-label", "Share this article");

  const links = buildShareLinks({ url: canonical, title, text: description, image: shareImage })
    .map(renderShareAction)
    .join("");

  const copyIcon = `<img src="${getShareAssetPath("icon-copy.svg")}" alt="" aria-hidden="true" loading="lazy" decoding="async">`;

  panel.innerHTML = rail
    ? `
    <button class="share-rail-toggle" type="button" aria-expanded="false">
      <span>Share blog</span>
    </button>
    <div class="share-popover">
      <div class="share-rail-copy">
        <strong>Share this blog</strong>
        <span>Send this article to someone who needs better marketing clarity.</span>
      </div>
      <div class="share-actions" aria-label="Share links">
        ${links}
        <button class="share-copy-link" type="button">${copyIcon}<span>Copy link</span></button>
      </div>
    </div>
    <p class="share-status" role="status" aria-live="polite"></p>
  `
    : `
    <div class="share-copy">
      <span>Share</span>
      <h2>Found this useful?</h2>
      <p>Share it with someone who needs better marketing clarity.</p>
    </div>
    <div class="share-actions">
      <button class="share-native" type="button">Share</button>
      ${links}
      <button class="share-copy-link" type="button">${copyIcon}<span>Copy link</span></button>
    </div>
    <p class="share-status" role="status" aria-live="polite"></p>
  `;

  const nativeButton = panel.querySelector(".share-native");
  const copyButton = panel.querySelector(".share-copy-link");
  const railToggle = panel.querySelector(".share-rail-toggle");
  const status = panel.querySelector(".share-status");

  if (!navigator.share) {
    nativeButton?.remove();
  } else {
    nativeButton?.addEventListener("click", async () => {
      try {
        await navigator.share({ title, text: description, url: canonical });
        status.textContent = "Thanks for sharing.";
      } catch {
        status.textContent = "";
      }
    });
  }

  copyButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(canonical);
      status.textContent = "Link copied.";
    } catch {
      status.textContent = "Copy this link: " + canonical;
    }
  });

  railToggle?.addEventListener("click", () => {
    const isOpen = panel.classList.toggle("is-open");
    railToggle.setAttribute("aria-expanded", String(isOpen));
  });

  if (rail) {
    document.addEventListener("click", (event) => {
      if (!panel.contains(event.target)) {
        panel.classList.remove("is-open");
        railToggle?.setAttribute("aria-expanded", "false");
      }
    });
  }

  return panel;
};

const setupBlogSharing = () => {
  if (document.body.classList.contains("blog-article-page")) {
    document.body.appendChild(createSharePanel({ rail: true }));
  }

  if (document.body.classList.contains("blog-page")) {
    document.body.appendChild(createSharePanel({ rail: true }));
  }
};

setupBlogSharing();

document.querySelector("#briefForm")?.addEventListener("submit", () => {
  formNote.textContent = "Sending your brief securely now.";
});

document.querySelector("#quickBriefForm")?.addEventListener("submit", () => {
  quickFormNote.textContent = "Sending your brief securely now.";
});

const websiteBriefForm = document.querySelector("#websiteBriefForm");

const formatNaira = (amount) => `\u20a6${Number(amount || 0).toLocaleString("en-NG")}`;
const basicWebsitePrice = 150000;
const adsBudgetForm = document.querySelector("#adsBudgetForm");
const adsEstimateLeadForm = document.querySelector("#adsEstimateLeadForm");
const adsEstimateNote = document.querySelector("#adsEstimateNote");
const adsCalculatorShareButtons = Array.from(document.querySelectorAll("[data-share-calculator]"));

const getCleanAdsCalculatorUrl = () => {
  const canonical = document.querySelector("link[rel='canonical']")?.href;
  return canonical || `${window.location.origin}${window.location.pathname}`;
};

const hydrateAdsCalculatorFromUrl = () => {
  if (!adsBudgetForm || !window.location.search) {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  const allowedFields = [
    "industry",
    "goal",
    "budget",
    "duration_value",
    "duration_unit",
    "location",
    "platform",
    "creative",
    "destination",
  ];
  let hydrated = false;

  allowedFields.forEach((field) => {
    const value = params.get(field);
    const control = adsBudgetForm.elements[field];

    if (!value || !control) {
      return;
    }

    if (control.tagName === "SELECT" && !Array.from(control.options).some((option) => option.value === value)) {
      return;
    }

    control.value = value;
    hydrated = true;
  });

  return hydrated;
};

const cleanAdsCalculatorUrl = () => {
  if (!adsBudgetForm || !window.history?.replaceState || !window.location.search) {
    return;
  }

  const cleanUrl = `${window.location.pathname}${window.location.hash || ""}`;
  window.history.replaceState({}, document.title, cleanUrl);
};

const formatCompactNumber = (value) => {
  const number = Math.max(0, Math.round(value || 0));

  if (number >= 1000000) {
    return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  }

  if (number >= 1000) {
    return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}k`;
  }

  return number.toLocaleString("en-NG");
};

const calculateAdsEstimate = () => {
  if (!adsBudgetForm) {
    return null;
  }

  const values = Object.fromEntries(new FormData(adsBudgetForm).entries());
  const budget = Math.max(Number(values.budget || 0), 0);
  const durationValue = Math.max(Number(values.duration_value || 30), 1);
  const durationUnit = values.duration_unit || "days";
  const campaignDays =
    durationUnit === "weeks"
      ? durationValue * 7
      : durationUnit === "months"
        ? durationValue * 30
        : durationValue;
  const industryFactors = {
    ecommerce: { cost: 1.12, conversion: 0.92, label: "Ecommerce" },
    real_estate: { cost: 1.72, conversion: 0.72, label: "Real estate" },
    fashion_beauty: { cost: 1.08, conversion: 0.98, label: "Fashion, beauty, or cosmetics" },
    education: { cost: 1.18, conversion: 1.03, label: "Education" },
    food: { cost: 0.92, conversion: 1.1, label: "Food and hospitality" },
    healthcare: { cost: 1.34, conversion: 0.86, label: "Healthcare or wellness" },
    fintech: { cost: 1.62, conversion: 0.74, label: "Fintech or finance" },
    logistics: { cost: 1.22, conversion: 0.9, label: "Logistics or delivery service" },
    travel_hospitality: { cost: 1.26, conversion: 0.88, label: "Travel, hotel, or short-let" },
    events_entertainment: { cost: 1.02, conversion: 1.04, label: "Events or entertainment" },
    automotive: { cost: 1.46, conversion: 0.78, label: "Automotive or car sales" },
    construction: { cost: 1.42, conversion: 0.8, label: "Construction or home services" },
    professional: { cost: 1.36, conversion: 0.88, label: "Professional service" },
    legal: { cost: 1.58, conversion: 0.82, label: "Legal or consulting" },
    personal_brand: { cost: 0.96, conversion: 1.0, label: "Personal brand" },
  };
  const locationFactors = {
    lagos: { cost: 1.24, label: "Lagos" },
    abuja: { cost: 1.15, label: "Abuja / FCT" },
    rivers: { cost: 1.1, label: "Rivers State / Port Harcourt" },
    oyo: { cost: 1.05, label: "Oyo State" },
    ogun: { cost: 1.04, label: "Ogun State" },
    kano: { cost: 1.08, label: "Kano State" },
    kaduna: { cost: 1.03, label: "Kaduna State" },
    edo: { cost: 1.02, label: "Edo State" },
    delta: { cost: 1.01, label: "Delta State" },
    anambra: { cost: 1.03, label: "Anambra State" },
    enugu: { cost: 0.99, label: "Enugu State" },
    akwa_ibom: { cost: 0.98, label: "Akwa Ibom State" },
    kwara: { cost: 0.96, label: "Kwara State" },
    imo: { cost: 0.97, label: "Imo State" },
    nigeria: { cost: 1.0, label: "Nigeria-wide" },
    outside_major: { cost: 0.9, label: "Other Nigerian states" },
  };
  const creativeFactors = {
    weak: { ctr: 0.72, conversion: 0.76, label: "weak or untested creative" },
    average: { ctr: 1, conversion: 1, label: "average creative" },
    strong: { ctr: 1.35, conversion: 1.22, label: "strong creative and offer" },
  };
  const destinationFactors = {
    whatsapp: { conversion: 1.16, label: "WhatsApp chat" },
    landing: { conversion: 1.05, label: "landing page" },
    website: { conversion: 0.9, label: "website page" },
    form: { conversion: 1.1, label: "lead form" },
  };
  const goalFactors = {
    awareness: { conversion: 0.45, label: "brand awareness" },
    traffic: { conversion: 0.65, label: "website traffic" },
    leads: { conversion: 1, label: "leads" },
    whatsapp: { conversion: 1.1, label: "WhatsApp messages" },
    sales: { conversion: 0.52, label: "online sales" },
    bookings: { conversion: 0.84, label: "bookings or calls" },
  };
  const platformMetrics = {
    meta: { label: "Meta", cpm: 2800, ctr: 0.012, cvr: 0.072 },
    google: { label: "Google", cpc: 520, ctr: 0.05, cvr: 0.095 },
    tiktok: { label: "TikTok", cpm: 1900, ctr: 0.009, cvr: 0.045 },
    retargeting: { label: "Retargeting", cpm: 2300, ctr: 0.018, cvr: 0.12 },
  };
  const recommendedSplits = {
    awareness: { meta: 0.5, google: 0.1, tiktok: 0.3, retargeting: 0.1 },
    traffic: { meta: 0.4, google: 0.35, tiktok: 0.15, retargeting: 0.1 },
    leads: { meta: 0.38, google: 0.37, tiktok: 0.1, retargeting: 0.15 },
    whatsapp: { meta: 0.58, google: 0.18, tiktok: 0.08, retargeting: 0.16 },
    sales: { meta: 0.42, google: 0.32, tiktok: 0.08, retargeting: 0.18 },
    bookings: { meta: 0.34, google: 0.46, tiktok: 0.05, retargeting: 0.15 },
  };
  const singlePlatformSplits = {
    meta: { meta: 0.82, retargeting: 0.18 },
    google: { google: 0.84, retargeting: 0.16 },
    tiktok: { tiktok: 0.82, retargeting: 0.18 },
  };

  const industry = industryFactors[values.industry] || industryFactors.ecommerce;
  const location = locationFactors[values.location] || locationFactors.nigeria;
  const creative = creativeFactors[values.creative] || creativeFactors.average;
  const destination = destinationFactors[values.destination] || destinationFactors.whatsapp;
  const goal = goalFactors[values.goal] || goalFactors.leads;
  const split = values.platform === "recommend" ? recommendedSplits[values.goal] || recommendedSplits.leads : singlePlatformSplits[values.platform] || recommendedSplits.leads;
  const dailyBudget = budget / campaignDays;
  const durationEfficiency =
    campaignDays < 7
      ? 0.76
      : campaignDays < 14
        ? 0.88
        : campaignDays > 120
          ? 0.9
          : 1;
  const deliveryPressure =
    dailyBudget < 5000
      ? 0.86
      : dailyBudget > 100000
        ? 0.94
        : 1;

  const qualityMultiplier = industry.conversion * creative.conversion * destination.conversion * goal.conversion * durationEfficiency * deliveryPressure;
  const costMultiplier = industry.cost * location.cost;
  let impressions = 0;
  let clicks = 0;
  let actions = 0;

  Object.entries(split).forEach(([platform, ratio]) => {
    const spend = budget * ratio;
    const metric = platformMetrics[platform];
    const ctr = metric.ctr * creative.ctr;
    let platformClicks = 0;
    let platformImpressions = 0;

    if (metric.cpc) {
      const cpc = metric.cpc * costMultiplier;
      platformClicks = spend / cpc;
      platformImpressions = platformClicks / Math.max(ctr, 0.001);
    } else {
      const cpm = metric.cpm * costMultiplier;
      platformImpressions = (spend / cpm) * 1000;
      platformClicks = platformImpressions * ctr;
    }

    impressions += platformImpressions;
    clicks += platformClicks;
    actions += platformClicks * metric.cvr * qualityMultiplier;
  });

  const conservative = Math.max(1, Math.round(actions * 0.62));
  const expected = Math.max(1, Math.round(actions));
  const strong = Math.max(expected, Math.round(actions * 1.38));
  const cpl = expected ? budget / expected : 0;
  const retargetingBudget = budget * (split.retargeting || 0);
  const runway =
    campaignDays < 7
      ? "Too short"
      : campaignDays < 14
        ? "Tight"
        : campaignDays < 45
          ? "Good"
          : "Long enough";
  const budgetAdvice =
    dailyBudget < 5000
      ? "Your daily budget is tight. Focus on one clear objective, one strong offer, and fewer platforms."
      : campaignDays < 7
        ? "The campaign window is short. Expect higher pressure and less learning time."
        : budget < 500000
          ? "This is a useful testing budget. Use it to validate creative, offer, and lead quality."
          : "This budget can support stronger testing, retargeting, and weekly optimization.";
  const durationLabel = `${campaignDays} day${campaignDays === 1 ? "" : "s"}`;
  const difficultyScore =
    industry.cost * location.cost * (1 / Math.max(industry.conversion, 0.45)) * (1 / Math.max(goal.conversion, 0.45));
  const difficultyLevel =
    difficultyScore >= 3.2
      ? "Very high"
      : difficultyScore >= 2.2
        ? "High"
        : difficultyScore >= 1.35
          ? "Moderate"
          : "Lower";
  const difficultyNote =
    difficultyLevel === "Very high"
      ? `${industry.label} in ${location.label} is a difficult lead environment. Use stronger proof, sharper creative, clearer conversion paths, and retargeting before scaling.`
      : difficultyLevel === "High"
        ? `${industry.label} in ${location.label} is competitive, so weak creative, unclear offers, or weak conversion pages can raise your cost per lead quickly.`
        : difficultyLevel === "Moderate"
          ? `${industry.label} in ${location.label} has normal campaign pressure. Creative quality, offer clarity, and destination quality will decide how close you get to the strong range.`
          : `${industry.label} in ${location.label} usually gives more room to test, but the offer and creative still need to be clear.`;
  const methodologyNote = `Adjusted for ${industry.label.toLowerCase()} difficulty, ${location.label} competition, ${goal.label}, ${creative.label}, ${destination.label}, platform mix, budget, and ${durationLabel}.`;
  const splitText = Object.entries(split)
    .map(([platform, ratio]) => `${platformMetrics[platform].label}: ${Math.round(ratio * 100)}%`)
    .join(", ");
  const objectiveAdvice =
    values.goal === "awareness"
      ? "Objective setup: optimize for reach, video views, or engagement before asking cold audiences to buy."
      : values.goal === "traffic"
        ? "Objective setup: optimize for quality traffic and retarget people who visit the page."
        : values.goal === "sales"
          ? "Objective setup: use conversion or sales campaigns only when tracking, offer, and product page are ready."
          : values.goal === "whatsapp"
            ? "Objective setup: keep the WhatsApp path fast, direct, and ready for immediate replies."
            : "Objective setup: optimize for leads or enquiries, then qualify and follow up quickly.";
  const summary = `${formatNaira(budget)} over ${durationLabel} for ${industry.label.toLowerCase()} in ${location.label} may generate about ${formatCompactNumber(impressions)} impressions, ${formatCompactNumber(clicks)} clicks, and ${conservative}-${strong} ${goal.label}.`;
  const improvementLever =
    values.creative === "weak"
      ? "Biggest lever: improve the creative and offer before increasing budget."
      : values.destination === "website"
          ? "Biggest lever: improve the landing page or lead path before scaling spend."
          : "Biggest lever: keep testing creative angles and retarget warm audiences.";

  return {
    budget,
    impressions,
    clicks,
    conservative,
    expected,
    strong,
    cpl,
    dailyBudget,
    retargetingBudget,
    campaignDays,
    runway,
    split,
    splitText,
    goal,
    budgetAdvice,
    summary,
    improvementLever,
    objectiveAdvice,
    difficultyLevel,
    difficultyNote,
    methodologyNote,
    hiddenSummary: `${summary} Daily budget: ${formatNaira(Math.round(dailyBudget))}. Platform split: ${splitText}. Lead difficulty: ${difficultyLevel}. ${difficultyNote} Creative: ${creative.label}. Destination: ${destination.label}. ${objectiveAdvice} This is a planning estimate, not a guaranteed result.`,
  };
};

const renderAdsEstimate = () => {
  const estimate = calculateAdsEstimate();

  if (!estimate) {
    return;
  }

  const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) {
      element.textContent = value;
    }
  };

  setText("[data-ads-summary]", estimate.summary);
  setText("[data-ads-fit]", estimate.budgetAdvice);
  setText("[data-ads-impressions]", formatCompactNumber(estimate.impressions));
  setText("[data-ads-clicks]", formatCompactNumber(estimate.clicks));
  setText("[data-ads-leads]", `${estimate.conservative}-${estimate.strong}`);
  setText("[data-ads-cpl]", formatNaira(Math.round(estimate.cpl)));
  setText("[data-ads-daily]", formatNaira(Math.round(estimate.dailyBudget)));
  setText("[data-ads-duration]", `${estimate.campaignDays} days`);
  setText("[data-ads-retargeting]", estimate.retargetingBudget ? formatNaira(Math.round(estimate.retargetingBudget)) : "Not included");
  setText("[data-ads-runway]", estimate.runway);
  setText("[data-ads-conservative]", estimate.conservative);
  setText("[data-ads-expected]", estimate.expected);
  setText("[data-ads-strong]", estimate.strong);
  setText("[data-ads-range]", `These are planning estimates for ${estimate.goal.label.toLowerCase()}, not guaranteed campaign results.`);
  setText("[data-ads-difficulty]", estimate.difficultyLevel);
  setText("[data-ads-methodology]", `${estimate.difficultyNote} ${estimate.methodologyNote}`);
  setText("[data-ads-lever]", estimate.improvementLever);
  setText("[data-ads-objective]", estimate.objectiveAdvice);

  const splitContainer = document.querySelector("[data-platform-split]");
  if (splitContainer) {
    splitContainer.innerHTML = Object.entries(estimate.split)
      .map(([platform, ratio]) => {
        const label = { meta: "Meta", google: "Google", tiktok: "TikTok", retargeting: "Retarget" }[platform] || platform;
        const percent = Math.round(ratio * 100);
        return `<div class="split-row"><span>${label}</span><div class="split-bar"><span style="width:${percent}%"></span></div><strong>${percent}%</strong></div>`;
      })
      .join("");
  }

  const hiddenEstimate = document.querySelector("[data-ads-hidden-estimate]");
  if (hiddenEstimate) {
    hiddenEstimate.value = estimate.hiddenSummary;
  }
};

adsBudgetForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const resultCard = document.querySelector("[data-ads-result-card]");
  const submitButton = adsBudgetForm.querySelector(".calculator-submit");

  if (resultCard) {
    resultCard.classList.add("is-calculating");
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Calculating...";
  }

  setTimeout(() => {
    renderAdsEstimate();
    cleanAdsCalculatorUrl();

    if (resultCard) {
      resultCard.classList.remove("is-calculating");
      resultCard.classList.add("has-calculated");
    }

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Calculate estimate";
    }
  }, 900);
});

if (adsBudgetForm) {
  const resultCard = document.querySelector("[data-ads-result-card]");
  resultCard?.classList.remove("has-calculated");

  if (hydrateAdsCalculatorFromUrl()) {
    renderAdsEstimate();
    resultCard?.classList.add("has-calculated");
    cleanAdsCalculatorUrl();
  }
}

document.querySelector("[data-copy-estimate]")?.addEventListener("click", async () => {
  const estimate = calculateAdsEstimate();

  if (!estimate) {
    return;
  }

  try {
    await navigator.clipboard.writeText(estimate.hiddenSummary);
    document.querySelector("[data-copy-estimate]").textContent = "Estimate copied";
  } catch {
    document.querySelector("[data-copy-estimate]").textContent = "Copy unavailable";
  }
});

adsCalculatorShareButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    const shareData = {
      title: "Ads Budget Calculator Nigeria",
      text: "Use this free Nigerian ads budget calculator to estimate reach, clicks, leads, CPL, and campaign pressure before spending.",
      url: getCleanAdsCalculatorUrl(),
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(shareData.url);
      button.textContent = "Link copied";
      window.setTimeout(() => {
        button.textContent = "Share calculator";
      }, 1800);
    } catch {
      button.textContent = "Copy link";
    }
  });
});

adsEstimateLeadForm?.addEventListener("submit", () => {
  renderAdsEstimate();

  if (adsEstimateNote) {
    adsEstimateNote.textContent = "Sending your estimate and campaign details securely now.";
  }
});

const updateWebsiteBriefPricing = () => {
  if (!websiteBriefForm) {
    return null;
  }

  const enteredBaseValue = Number(websiteBriefForm.querySelector("[name='budget']")?.value || 0);
  const baseValue = enteredBaseValue > 0 ? Math.max(enteredBaseValue, basicWebsitePrice) : basicWebsitePrice;
  const websiteType = websiteBriefForm.querySelector("[name='website_type']")?.value || "";
  const pages = Array.from(websiteBriefForm.querySelectorAll("[name='pages[]']:checked")).map((item) => item.value);
  const features = Array.from(websiteBriefForm.querySelectorAll("[name='features[]']:checked")).map((item) => item.value);
  const premiumAddons = Array.from(websiteBriefForm.querySelectorAll("[name='premium_addons[]']:checked")).map((item) => item.value);
  const ecommerceAddon = websiteBriefForm.querySelector("[name='ecommerce_addon']")?.value || "";
  const seoAddon = websiteBriefForm.querySelector("[name='seo_addon']")?.value || "";
  const ecommerceSuggested = websiteType === "Ecommerce store" || pages.includes("Shop") || features.includes("Product checkout");
  const seoSuggested = features.includes("SEO setup");
  const ecommerceSelected = premiumAddons.includes("Ecommerce setup") || ecommerceAddon === "Ecommerce setup" || ecommerceSuggested;
  const seoSelected = premiumAddons.includes("SEO setup") || seoAddon === "SEO setup" || seoSuggested;
  const addonRules = [
    { feature: "SEO setup", label: "SEO setup", amount: 100000 },
    { feature: "Payment gateway", label: "Payment gateway integration", amount: 150000 },
    { feature: "Newsletter", label: "Newsletter signup setup", amount: 80000 },
    { feature: "Blog", label: "Blog setup", amount: 120000 },
    { feature: "Live chat", label: "Live chat setup", amount: 75000 },
    { feature: "User login", label: "User login/member access", amount: 500000 },
    { feature: "File upload", label: "File upload system", amount: 250000 },
    { feature: "Google Analytics", label: "Google Analytics setup", amount: 50000 },
    { feature: "Search Console", label: "Google Search Console setup", amount: 50000 },
    { feature: "Social preview", label: "Social preview image setup", amount: 50000 },
    { feature: "Custom domain", label: "Custom domain payment for 1 year", amount: 70000 },
  ];
  const addons = addonRules
    .filter((rule) => features.includes(rule.feature))
    .map(({ label, amount }) => ({ label, amount }));

  if (seoSelected && !addons.some((item) => item.label === "SEO setup")) {
    addons.push({ label: "SEO setup", amount: 100000 });
  }

  if (ecommerceSelected) {
    addons.push({ label: "Ecommerce setup", amount: 400000 });
  }

  const addonTotal = addons.reduce((sum, item) => sum + item.amount, 0);
  const finalTotal = baseValue + addonTotal;
  const addonText = addons.length
    ? addons.map((item) => `${item.label}: ${formatNaira(item.amount)}`).join("; ")
    : "No paid add-ons selected.";
  const totalText = baseValue
    ? `${formatNaira(finalTotal)} total (${formatNaira(baseValue)} base + ${formatNaira(addonTotal)} add-ons)`
    : `Basic website base starts from ${formatNaira(basicWebsitePrice)}.`;

  websiteBriefForm.querySelector("[name='base_budget_amount']").value = formatNaira(baseValue);
  websiteBriefForm.querySelector("[name='selected_addons']").value = addonText;
  websiteBriefForm.querySelector("[name='final_budget_amount']").value = formatNaira(finalTotal);
  websiteBriefForm.querySelector("[data-budget-total]").textContent = totalText;
  websiteBriefForm.querySelector("[data-budget-addons]").textContent = addonText;

  return { baseValue, addonTotal, finalTotal, addonText };
};

websiteBriefForm?.addEventListener("input", updateWebsiteBriefPricing);
websiteBriefForm?.addEventListener("change", updateWebsiteBriefPricing);
updateWebsiteBriefPricing();

const addAiExplorersFooterLink = () => {
  document.querySelectorAll(".footer-grid").forEach((footerGrid) => {
    if (footerGrid.querySelector(".footer-products")) return;
    const productColumn = document.createElement("div");
    productColumn.className = "footer-column footer-products";
    productColumn.innerHTML = '<h3>Products</h3><a href="/ai-explorers/">AI Explorers</a><small>Family AI workbook for ages 9-11.</small>';
    const socials = footerGrid.querySelector(".footer-socials");
    footerGrid.insertBefore(productColumn, socials || null);
  });
};

addAiExplorersFooterLink();

const hydrateLatestBlogStrips = async () => {
  const strips = document.querySelectorAll(".top-posts-strip");

  if (!strips.length) {
    return;
  }

  try {
    const response = await fetch("/blog/", { credentials: "same-origin" });

    if (!response.ok) {
      return;
    }

    const blogHtml = await response.text();
    const blogDoc = new DOMParser().parseFromString(blogHtml, "text/html");
    const blogCards = Array.from(blogDoc.querySelectorAll(".blog-card-link"))
      .map((card) => {
        const href = card.getAttribute("href");
        const absoluteUrl = new URL(href, `${window.location.origin}/blog/`);

        if (absoluteUrl.origin !== window.location.origin || !absoluteUrl.pathname.startsWith("/blog/")) {
          return null;
        }

        const title = card.querySelector("h2")?.textContent?.trim();
        const category = card.querySelector("span")?.textContent?.trim() || "WTB blog";

        if (!title) {
          return null;
        }

        return {
          href: absoluteUrl.pathname,
          title,
          category,
        };
      })
      .filter(Boolean)
      .slice(0, 5);

    if (blogCards.length < 5) {
      return;
    }

    const renderCards = [...blogCards, ...blogCards]
      .map((post, index) => {
        const hiddenAttrs = index >= blogCards.length ? ' aria-hidden="true" tabindex="-1"' : "";
        return `<a class="top-post-card" href="${post.href}"${hiddenAttrs}><span>${post.category}</span><strong>${post.title}</strong><small>Read the guide</small></a>`;
      })
      .join("");

    strips.forEach((strip) => {
      const track = strip.querySelector(".top-posts-track");

      if (track) {
        track.innerHTML = renderCards;
      }
    });
  } catch {
    // Keep the static fallback cards if the blog index cannot be read, such as local file previews.
  }
};

hydrateLatestBlogStrips();

websiteBriefForm?.addEventListener("submit", (event) => {
  const pricing = updateWebsiteBriefPricing();
  const finalBudget = pricing?.baseValue ? formatNaira(pricing.finalTotal) : formatNaira(basicWebsitePrice);
  const baseBudget = pricing?.baseValue ? formatNaira(pricing.baseValue) : formatNaira(basicWebsitePrice);
  const addons = pricing?.addonText || "No paid add-ons selected.";
  const autoresponse = websiteBriefForm.querySelector("[name='_autoresponse']");

  if (autoresponse) {
    autoresponse.value = `Thank you for sending your website brief to WTB AI Marketing Agency. We have received your details and will review your project. Your base website budget is: ${baseBudget}. Add-ons selected: ${addons}. Your final calculated payment amount is: ${finalBudget}. If anything is missing, do not worry; we can create the missing copy, images, brand direction, page structure, SEO keywords, and other website materials for you so we do not waste time. To proceed, kindly make payment of ${finalBudget} to: Bank: GT Bank. Account Name: Olukoya Oluwole. Account Number: 0116506079. After payment, please send your payment confirmation receipt to wolexzthebrand@gmail.com or WhatsApp +234 809 758 5489. Once confirmed, we will advise the next step for your website project.`;
  }

  websiteBriefNote.textContent = `Sending your website brief securely now. Check your email after submission for payment details matching: ${finalBudget}.`;
});
