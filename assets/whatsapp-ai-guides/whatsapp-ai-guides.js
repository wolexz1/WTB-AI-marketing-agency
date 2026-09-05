(() => {
  const money = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
  const products = {
    launchpad: { name: "WhatsApp AI Launchpad", price: 5500 },
    "growth-engine": { name: "WhatsApp AI Growth Engine", price: 10500 },
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
  const openCheckout = (productId, location) => {
    const product = products[productId];
    if (!product || !checkout) return;
    checkout.querySelector("#checkoutTitle").textContent = product.name;
    checkout.querySelector("#checkoutSummary").textContent = `${money.format(product.price)} one-time. Confirm Meta Business Agent appears in your WhatsApp business tools before buying; access varies by account and market. Instant private PDF access follows verified payment.`;
    checkout.querySelector("#checkoutProduct").value = productId;
    checkout.querySelector("#checkoutLocation").value = location || "page";
    checkout.querySelector("#checkoutFbp").value = cookie("_fbp");
    checkout.querySelector("#checkoutFbc").value = cookie("_fbc");
    checkout.showModal();
    checkout.querySelector("input[name=firstName]").focus();
    fbq("trackCustom", "ProductSelected", { content_id: productId, value: product.price, currency: "NGN", cta_location: location });
  };
  document.querySelectorAll("[data-guide-buy]").forEach((button) => button.addEventListener("click", () => openCheckout(button.dataset.guideProduct, button.dataset.ctaLocation)));
  document.querySelectorAll(".dialog-close").forEach((button) => button.addEventListener("click", () => button.closest("dialog").close()));
  document.querySelectorAll("dialog").forEach((dialog) => dialog.addEventListener("click", (event) => { if (event.target === dialog) dialog.close(); }));
  checkoutForm?.addEventListener("submit", () => {
    const id = checkoutForm.querySelector("#checkoutProduct").value;
    const product = products[id];
    const eventId = `checkout_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    fbq("track", "InitiateCheckout", { content_ids: [id], content_type: "product", value: product.price, currency: "NGN", num_items: 1 }, { eventID: eventId });
    const submit = checkoutForm.querySelector("#checkoutSubmit");
    submit.disabled = true;
    submit.textContent = "Opening secure Paystack checkout…";
  });

  const previewDialog = document.querySelector("#previewDialog");
  const previewImage = document.querySelector("#previewImage");
  document.querySelectorAll("[data-guide-preview]").forEach((button) => button.addEventListener("click", () => {
    previewImage.src = button.dataset.full;
    previewDialog.showModal();
    fbq("trackCustom", "PreviewOpened", { preview: button.dataset.full.split("/").pop() });
  }));

  const pageUrl = "https://wtbaimarketing.com/whatsapp-ai-guides/";
  const shareText = `I found a practical guide for Nigerian business owners handling 40+ WhatsApp chats a day. Launchpad is ₦5,500 and the advanced Growth Engine is ₦10,500. ${pageUrl}`;
  const share = async (type) => {
    fbq("trackCustom", "ShareClick", { location: "landing_page_referral_section", method: type });
    if (type === "native" && navigator.share) {
      try { await navigator.share({ title: "WTB WhatsApp AI Guides", text: shareText, url: pageUrl }); return; } catch (error) { if (error.name === "AbortError") return; }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
  };
  document.querySelectorAll("[data-guide-share]").forEach((button) => button.addEventListener("click", () => share(button.dataset.guideShare)));

  const sticky = document.querySelector("[data-guide-sticky]");
  const hero = document.querySelector(".hero");
  if (sticky && hero && "IntersectionObserver" in window) {
    let heroVisible = true;
    const visibleBlockers = new Set();
    const updateSticky = () => { sticky.hidden = heroVisible || visibleBlockers.size > 0; };
    new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; updateSticky(); }, { threshold: 0.05 }).observe(hero);
    const blockerObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.isIntersecting ? visibleBlockers.add(entry.target) : visibleBlockers.delete(entry.target));
      updateSticky();
    }, { threshold: 0.01 });
    document.querySelectorAll("#choose, .faq, .share-section, .final-cta, footer").forEach((section) => blockerObserver.observe(section));
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
    const reveals = document.querySelectorAll(".pain-grid article, .calculator-card, .before-after, .capability-grid article, .preview-track button, .product-card, .value-grid article, .faq details");
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
