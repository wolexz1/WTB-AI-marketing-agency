(() => {
  const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
  const products = {
    launchpad: { name: "WhatsApp AI Launchpad", price: 5500, promise: "Keep your WhatsApp business responsive when you are busy, asleep or away. Set up approved answers and safe handoffs so more buying conversations stay alive until you or your team can close them." },
    "growth-engine": { name: "WhatsApp AI Growth Engine", price: 10500, promise: "Keep your business responsive and protect buying opportunities while you sleep, travel or focus elsewhere. Build a WhatsApp sales and service system that answers from approved business information, qualifies serious buyers, recommends the right next step and brings in your team when human judgement matters." },
  };
  const fbq = (...args) => { if (typeof window.fbq === "function") window.fbq(...args); };
  const cookie = (name) => document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) || "";

  window.addEventListener("load", () => {
    fbq("track", "ViewContent", { content_ids: Object.keys(products), content_type: "product_group", content_name: "WTB WhatsApp AI Guides", currency: "NGN", value: 5500 });
  }, { once: true });

  const calculator = document.querySelector("[data-guide-calculator]");
  if (calculator) {
    const form = calculator.querySelector("form");
    const result = calculator.querySelector("#lossResult");
    const update = () => {
      const data = new FormData(form);
      const missed = Math.max(0, Number(data.get("missed")) || 0);
      const rate = Math.min(100, Math.max(0, Number(data.get("rate")) || 0)) / 100;
      const profit = Math.max(0, Number(data.get("profit")) || 0);
      result.textContent = money.format(missed * 30 * rate * profit);
    };
    form.addEventListener("input", update);
  }

  const checkout = document.querySelector("#checkoutDialog");
  const checkoutForm = document.querySelector("#checkoutForm");
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
    resetCheckoutButton(product);
    checkout.showModal();
    checkout.querySelector("input[name=firstName]").focus();
    fbq("trackCustom", "ProductSelected", { content_id: productId, value: product.price, currency: "NGN", cta_location: location });
  };
  document.querySelectorAll("[data-guide-buy]").forEach((button) => button.addEventListener("click", () => openCheckout(button.dataset.guideProduct, button.dataset.ctaLocation)));
  document.querySelectorAll(".dialog-close").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
  document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));
  checkoutForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = checkoutForm.querySelector("#checkoutProduct").value;
    const product = products[id];
    if (!product) return;
    const eventId = `checkout_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    fbq("track", "InitiateCheckout", { content_ids: [id], content_type: "product", value: product.price, currency: "NGN", num_items: 1 }, { eventID: eventId });
    const submit = checkoutForm.querySelector("#checkoutSubmit");
    const status = checkoutForm.querySelector("#checkoutStatus");
    submit.disabled = true;
    submit.textContent = "Opening secure Paystack popup…";
    status.textContent = "Preparing your secure payment…";
    try {
      const [PaystackPop, response] = await Promise.all([
        loadPaystack(),
        fetch(checkoutForm.action, { method: "POST", body: new FormData(checkoutForm), headers: { Accept: "application/json" }, credentials: "same-origin" }),
      ]);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.accessCode || !payload.reference) throw new Error(payload.message || "Secure checkout could not start.");
      checkout.close();
      const popup = new PaystackPop();
      popup.resumeTransaction(payload.accessCode, {
        onSuccess: (transaction) => {
          const reference = transaction?.reference || payload.reference;
          window.location.assign(`/whatsapp-ai-guides/thank-you/?reference=${encodeURIComponent(reference)}`);
        },
        onCancel: () => {
          status.textContent = "Payment was not completed. Your details are still here when you are ready.";
          resetCheckoutButton(product);
          checkout.showModal();
        },
        onError: () => {
          status.textContent = "Paystack could not open. Please check your connection and try again.";
          resetCheckoutButton(product);
          checkout.showModal();
        },
      });
    } catch (error) {
      status.textContent = isLocalPreview
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

    let pausedByUser = false;
    let pausedByInteraction = false;
    let resumeTimer;
    let lastFrame = performance.now();
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
        const loopPoint = previewTrack.scrollWidth / 2;
        if (previewTrack.scrollLeft >= loopPoint) previewTrack.scrollLeft -= loopPoint;
      }
      requestAnimationFrame(move);
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
    updateToggle();
    requestAnimationFrame(move);
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
