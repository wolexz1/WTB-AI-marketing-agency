(() => {
  const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
  const products = {
    launchpad: { name: "WhatsApp AI Launchpad", price: 5500, promise: "Use this step-by-step guide to set up your WhatsApp AI assistant with approved business information, useful customer replies and safe human handoffs, without coding." },
    "growth-engine": { name: "WhatsApp AI Growth Engine", price: 10500, promise: "Keep your business responsive and protect buying opportunities while you sleep, travel or focus elsewhere. Build a WhatsApp sales and service system that answers from approved business information, qualifies serious buyers, recommends the right next step and brings in your team when human judgement matters." },
  };
  const fbq = (...args) => { if (typeof window.fbq === "function") window.fbq(...args); };
  const cookie = (name) => document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) || "";
  const funnelSession = (() => {
    const existing = sessionStorage.getItem("wtb_wa_funnel_session");
    if (existing) return existing;
    const created = crypto.randomUUID?.() || `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem("wtb_wa_funnel_session", created);
    return created;
  })();
  const trackFunnel = (eventName, details = {}) => {
    const referrer = (() => { try { return new URL(document.referrer).hostname; } catch { return ""; } })();
    fetch("/api/whatsapp-ai-guides/event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      keepalive: true,
      body: JSON.stringify({
        sessionId: funnelSession,
        eventName,
        productId: details.productId || "",
        ctaLocation: details.ctaLocation || "",
        pagePath: location.pathname,
        metadata: { referrer, fbc: Boolean(cookie("_fbc")), viewport: `${innerWidth}x${innerHeight}` },
      }),
    }).catch(() => {});
  };

  trackFunnel("page_view");

  window.addEventListener("load", () => {
    fbq("track", "ViewContent", { content_ids: Object.keys(products), content_type: "product_group", content_name: "WTB WhatsApp AI Guides", currency: "NGN", value: 5500 });
  }, { once: true });

  const checkout = document.querySelector("#checkoutDialog");
  const checkoutForm = document.querySelector("#checkoutForm");
  const fallback = document.querySelector("#checkoutFallback");
  const isLocalPreview = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const paystackScriptUrl = "https://js.paystack.co/v2/inline.js";
  let paystackPromise;
  const loadPaystack = () => {
    if (window.PaystackPop) return Promise.resolve(window.PaystackPop);
    if (paystackPromise) return paystackPromise;
    paystackPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = paystackScriptUrl;
      script.async = true;
      script.onload = () => window.PaystackPop ? resolve(window.PaystackPop) : reject(new Error("Paystack did not become available."));
      script.onerror = () => reject(new Error("Paystack could not load."));
      document.head.append(script);
    }).catch((error) => { paystackPromise = null; throw error; });
    return paystackPromise;
  };
  const resetCheckoutButton = (product) => {
    const submit = checkoutForm.querySelector("#checkoutSubmit");
    submit.disabled = false;
    submit.textContent = `Pay securely — ${money.format(product.price)}`;
  };
  const clearFallback = () => {
    fallback.hidden = true;
    fallback.removeAttribute("href");
  };
  const openCheckout = (productId, location) => {
    const product = products[productId];
    if (!product || !checkout) return;
    checkout.querySelector("#checkoutTitle").textContent = product.name;
    checkout.querySelector("#checkoutPrice").textContent = `${money.format(product.price)} one-time`;
    checkout.querySelector("#checkoutSummary").textContent = product.promise;
    checkout.querySelector("#checkoutProduct").value = productId;
    checkout.querySelector("#checkoutLocation").value = location || "page";
    checkout.querySelector("#checkoutFbp").value = cookie("_fbp");
    checkout.querySelector("#checkoutFbc").value = cookie("_fbc");
    checkout.querySelector("#checkoutStatus").textContent = "";
    clearFallback();
    resetCheckoutButton(product);
    checkout.showModal();
    checkout.querySelector("input[name=firstName]").focus();
    loadPaystack().catch(() => {});
    trackFunnel("checkout_opened", { productId, ctaLocation: location });
    fbq("trackCustom", "ProductSelected", { content_id: productId, value: product.price, currency: "NGN", cta_location: location });
  };
  document.querySelectorAll("[data-guide-buy]").forEach((button) => button.addEventListener("click", () => {
    trackFunnel("cta_click", { productId: button.dataset.guideProduct, ctaLocation: button.dataset.ctaLocation });
    openCheckout(button.dataset.guideProduct, button.dataset.ctaLocation);
  }));
  document.querySelectorAll("[data-guide-compare]").forEach((link) => link.addEventListener("click", () => trackFunnel("compare_click", { ctaLocation: link.dataset.ctaLocation })));
  document.querySelectorAll(".dialog-close").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
  document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));
  checkoutForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = checkoutForm.querySelector("#checkoutProduct").value;
    const product = products[id];
    if (!product) return;
    const eventId = `checkout_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    trackFunnel("checkout_submitted", { productId: id, ctaLocation: checkoutForm.querySelector("#checkoutLocation").value });
    fbq("track", "InitiateCheckout", { content_ids: [id], content_type: "product", value: product.price, currency: "NGN", num_items: 1 }, { eventID: eventId });
    const submit = checkoutForm.querySelector("#checkoutSubmit");
    const status = checkoutForm.querySelector("#checkoutStatus");
    clearFallback();
    submit.disabled = true;
    submit.textContent = "Opening secure Paystack popup…";
    status.textContent = "Preparing your secure payment…";
    let slowTimer;
    try {
      const scriptReady = loadPaystack().catch(() => null);
      const response = await fetch(checkoutForm.action, { method: "POST", body: new FormData(checkoutForm), headers: { Accept: "application/json" }, credentials: "same-origin" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.accessCode || !payload.reference) throw new Error(payload.message || "Secure checkout could not start.");
      const paymentUrl = new URL(payload.authorizationUrl || "", location.href);
      if (paymentUrl.protocol !== "https:" || paymentUrl.hostname !== "checkout.paystack.com") throw new Error("Secure checkout link is unavailable. Please try again.");
      trackFunnel("checkout_initialized", { productId: id, ctaLocation: checkoutForm.querySelector("#checkoutLocation").value });
      fallback.href = paymentUrl.href;
      fallback.onclick = () => trackFunnel("paystack_fallback", { productId: id, ctaLocation: checkoutForm.querySelector("#checkoutLocation").value });
      status.textContent = "Connecting to Paystack. This may take a moment on mobile data…";
      slowTimer = window.setTimeout(() => {
        trackFunnel("paystack_slow", { productId: id, ctaLocation: checkoutForm.querySelector("#checkoutLocation").value });
        fallback.hidden = false;
        status.textContent = "The popup is taking longer than expected. You can open the same secure payment directly.";
      }, 7000);
      const PaystackPop = await scriptReady;
      if (!PaystackPop) {
        window.clearTimeout(slowTimer);
        trackFunnel("paystack_error", { productId: id, ctaLocation: checkoutForm.querySelector("#checkoutLocation").value });
        fallback.hidden = false;
        status.textContent = "The Paystack popup could not load. Open the same secure payment directly below.";
        resetCheckoutButton(product);
        return;
      }
      const popup = new PaystackPop();
      popup.resumeTransaction(payload.accessCode, {
        onLoad: () => {
          window.clearTimeout(slowTimer);
          trackFunnel("paystack_opened", { productId: id, ctaLocation: checkoutForm.querySelector("#checkoutLocation").value });
          clearFallback();
          if (checkout.open) checkout.close();
        },
        onSuccess: (transaction) => {
          window.clearTimeout(slowTimer);
          const reference = transaction?.reference || payload.reference;
          window.location.assign(`/whatsapp-ai-guides/thank-you/?reference=${encodeURIComponent(reference)}`);
        },
        onCancel: () => {
          window.clearTimeout(slowTimer);
          clearFallback();
          trackFunnel("paystack_cancelled", { productId: id, ctaLocation: checkoutForm.querySelector("#checkoutLocation").value });
          status.textContent = "Payment was not completed. Your details are still here when you are ready.";
          resetCheckoutButton(product);
          if (!checkout.open) checkout.showModal();
        },
        onError: () => {
          window.clearTimeout(slowTimer);
          clearFallback();
          trackFunnel("paystack_error", { productId: id, ctaLocation: checkoutForm.querySelector("#checkoutLocation").value });
          status.textContent = "Paystack could not open. Please check your connection and try again.";
          resetCheckoutButton(product);
          if (!checkout.open) checkout.showModal();
        },
      });
    } catch (error) {
      window.clearTimeout(slowTimer);
      const hasPaymentLink = fallback.hasAttribute("href");
      if (hasPaymentLink) fallback.hidden = false;
      else clearFallback();
      trackFunnel("paystack_error", { productId: id, ctaLocation: checkoutForm.querySelector("#checkoutLocation").value });
      status.textContent = hasPaymentLink
        ? "The popup could not open. Use the same secure Paystack checkout below."
        : isLocalPreview
        ? "Payment testing requires the live Cloudflare page. This local copy is for design preview only."
        : error.message || "Secure checkout could not start. Please try again.";
      resetCheckoutButton(product);
    }
  });

  const previewDialog = document.querySelector("#previewDialog");
  const previewImage = document.querySelector("#previewImage");
  const openPreview = (button) => {
    previewImage.src = button.dataset.full;
    previewDialog.showModal();
    fbq("trackCustom", "PreviewOpened", { preview: button.dataset.full.split("/").pop() });
  };
  const bindPreview = (button) => button.addEventListener("click", () => openPreview(button));
  document.querySelectorAll("[data-guide-preview]").forEach(bindPreview);

  const previewTrack = document.querySelector("[data-preview-track]");
  const previewToggle = document.querySelector("[data-preview-toggle]");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  if (previewTrack && previewToggle && !reducedMotion.matches) {
    const originals = [...previewTrack.children];
    originals.forEach((card) => {
      const clone = card.cloneNode(true);
      clone.dataset.carouselClone = "";
      clone.setAttribute("aria-hidden", "true");
      clone.tabIndex = -1;
      bindPreview(clone);
      previewTrack.append(clone);
    });
    const firstClone = previewTrack.querySelector("[data-carousel-clone]");

    let pausedByUser = false;
    let pausedByInteraction = false;
    let resumeTimer;
    let lastFrame = performance.now();
    let animationFrame = 0;
    const updateToggle = () => {
      previewToggle.setAttribute("aria-pressed", String(pausedByUser));
      previewToggle.textContent = pausedByUser ? "Resume movement" : "Pause movement";
    };
    const pauseTemporarily = () => {
      pausedByInteraction = true;
      clearTimeout(resumeTimer);
    };
    const resumeSoon = () => {
      clearTimeout(resumeTimer);
      resumeTimer = setTimeout(() => { pausedByInteraction = false; }, 1800);
    };
    const move = (now) => {
      const elapsed = Math.min(now - lastFrame, 50);
      lastFrame = now;
      if (!pausedByUser && !pausedByInteraction && !document.hidden) {
        previewTrack.scrollLeft += elapsed * 0.024;
        const loopPoint = firstClone.offsetLeft - previewTrack.firstElementChild.offsetLeft;
        if (previewTrack.scrollLeft >= loopPoint) previewTrack.scrollLeft -= loopPoint;
      }
      animationFrame = requestAnimationFrame(move);
    };

    previewToggle.addEventListener("click", () => {
      pausedByUser = !pausedByUser;
      updateToggle();
    });
    previewTrack.addEventListener("pointerenter", pauseTemporarily);
    previewTrack.addEventListener("pointerleave", resumeSoon);
    previewTrack.addEventListener("pointerdown", pauseTemporarily, { passive: true });
    previewTrack.addEventListener("pointerup", resumeSoon, { passive: true });
    previewTrack.addEventListener("focusin", pauseTemporarily);
    previewTrack.addEventListener("focusout", resumeSoon);
    previewTrack.addEventListener("wheel", () => { pauseTemporarily(); resumeSoon(); }, { passive: true });
    const startMovement = () => {
      if (animationFrame) return;
      lastFrame = performance.now();
      animationFrame = requestAnimationFrame(move);
    };
    const stopMovement = () => {
      if (!animationFrame) return;
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    };
    new IntersectionObserver(([entry]) => entry.isIntersecting ? startMovement() : stopMovement(), { rootMargin: "180px 0px", threshold: 0.01 }).observe(previewTrack);
    updateToggle();
  } else if (previewToggle) {
    previewToggle.hidden = true;
  }

  const pageUrl = "https://wtbaimarketing.com/whatsapp-ai-guides/";
  const shareText = `I found a practical guide for Nigerian business owners handling 40+ WhatsApp chats a day. Launchpad is ₦5,500 and the advanced Growth Engine is ₦10,500. ${pageUrl}`;
  const share = async (type, location = "landing_page") => {
    fbq("trackCustom", "ShareClick", { location, method: type });
    if (type === "native" && navigator.share) {
      try { await navigator.share({ title: "WTB WhatsApp AI Guides", text: shareText, url: pageUrl }); return; } catch (error) { if (error.name === "AbortError") return; }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
  };
  document.querySelectorAll("[data-guide-share]").forEach((button) => button.addEventListener("click", () => share(button.dataset.guideShare, button.dataset.shareLocation)));

  const sticky = document.querySelector("[data-guide-sticky]");
  const heroChoices = document.querySelector(matchMedia("(max-width: 900px)").matches ? ".hero-quick-actions" : ".hero-actions");
  if (sticky && heroChoices && "IntersectionObserver" in window) {
    let choicesVisible = true;
    const visibleBlockers = new Set();
    const updateSticky = () => { sticky.hidden = choicesVisible || visibleBlockers.size > 0; };
    new IntersectionObserver(([entry]) => { choicesVisible = entry.isIntersecting; updateSticky(); }, { threshold: 0.01 }).observe(heroChoices);
    const blockerObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting ? visibleBlockers.add(entry.target) : visibleBlockers.delete(entry.target));
      updateSticky();
    }, { threshold: 0.01 });
    document.querySelectorAll("#choose, .final-cta, footer").forEach((section) => blockerObserver.observe(section));
  }

  const scrollEvents = new Set();
  const reportScroll = () => {
    const available = document.documentElement.scrollHeight - innerHeight;
    if (available <= 0) return;
    const depth = scrollY / available;
    [[0.5, "scroll_50"], [0.9, "scroll_90"]].forEach(([threshold, eventName]) => {
      if (depth >= threshold && !scrollEvents.has(eventName)) {
        scrollEvents.add(eventName);
        trackFunnel(eventName);
      }
    });
  };
  addEventListener("scroll", reportScroll, { passive: true });

  const sectionLinks = [...document.querySelectorAll(".section-nav a[href^='#']")].filter((link) => !link.classList.contains("button"));
  if (sectionLinks.length) {
    const sections = sectionLinks.map((link) => document.querySelector(link.hash)).filter(Boolean);
    let scheduled = false;
    const updateCurrentSection = () => {
      const marker = document.querySelector(".nav-dock")?.offsetHeight + 36 || 120;
      let activeId = "";
      sections.forEach((section) => { if (section.getBoundingClientRect().top <= marker) activeId = section.id; });
      sectionLinks.forEach((link) => link.toggleAttribute("aria-current", link.hash === `#${activeId}`));
      scheduled = false;
    };
    addEventListener("scroll", () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(updateCurrentSection);
    }, { passive: true });
    updateCurrentSection();
  }

  if (!matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window) {
    const reveals = document.querySelectorAll(".pain-grid article, .calculator-card, .before-after, .capability-grid article, .preview-track button:not([data-carousel-clone]), .product-card, .value-grid article, .faq details");
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
    reveals.forEach((element, index) => {
      element.classList.add("motion-reveal");
      element.style.transitionDelay = `${Math.min(index % 4, 3) * 55}ms`;
      revealObserver.observe(element);
    });
    document.documentElement.classList.add("motion-ready");
  }
})();
