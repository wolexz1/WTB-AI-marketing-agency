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

const createPageLoader = () => {
  const loaderText = "WOLEXZTHEBRAND";
  const loader = document.createElement("div");
  loader.className = "page-loader is-active";
  loader.setAttribute("aria-hidden", "true");
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
  document.body.classList.add("page-is-loading");

  const show = () => {
    document.body.classList.add("page-is-loading");
    loader.classList.add("is-active");
  };

  const hide = () => {
    window.setTimeout(() => {
      loader.classList.remove("is-active");
      document.body.classList.remove("page-is-loading");
    }, 420);
  };

  window.addEventListener("load", hide, { once: true });
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

      show();
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
  }
});

navToggle?.addEventListener("click", () => {
  const isOpen = navLinks?.classList.toggle("is-open") || false;
  navToggle.classList.toggle("is-open", isOpen);
  navToggle.setAttribute("aria-expanded", String(isOpen));
});

navLinks?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("is-open");
    navToggle?.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
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

const createSharePanel = ({ compact = false } = {}) => {
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
  panel.className = compact ? "share-panel share-panel-compact" : "share-panel";
  panel.setAttribute("aria-label", "Share this article");

  const links = buildShareLinks({ url: canonical, title, text: description, image: shareImage })
    .map(
      (item) =>
        `<a href="${item.href}" ${item.sameTab ? "" : 'target="_blank" rel="noopener noreferrer"'}>${item.label}</a>`
    )
    .join("");

  panel.innerHTML = `
    <div class="share-copy">
      <span>Share this insight</span>
      <h2>Help another founder find this.</h2>
      <p>Share the article on your favourite platform. The blog image is already attached through the page preview.</p>
    </div>
    ${shareImage ? `<img class="share-preview" src="${shareImage}" alt="" aria-hidden="true" loading="lazy" decoding="async">` : ""}
    <div class="share-actions">
      <button class="share-native" type="button">Share</button>
      ${links}
      <button class="share-copy-link" type="button">Copy link</button>
    </div>
    <p class="share-status" role="status" aria-live="polite"></p>
  `;

  const nativeButton = panel.querySelector(".share-native");
  const copyButton = panel.querySelector(".share-copy-link");
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

  return panel;
};

const setupBlogSharing = () => {
  if (document.body.classList.contains("blog-article-page")) {
    const articleHero = document.querySelector(".article-hero-image")?.closest(".article-shell");
    const articleBody = document.querySelector(".article-body");
    const sharePanel = createSharePanel();

    if (articleHero?.parentNode) {
      articleHero.insertAdjacentElement("afterend", sharePanel);
    } else if (articleBody?.parentNode) {
      articleBody.insertAdjacentElement("beforebegin", sharePanel);
    }

    articleBody?.insertAdjacentElement("afterend", createSharePanel({ compact: true }));
  }

  if (document.body.classList.contains("blog-page")) {
    const blogGrid = document.querySelector(".blog-grid");
    blogGrid?.insertAdjacentElement("afterend", createSharePanel({ compact: true }));
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
