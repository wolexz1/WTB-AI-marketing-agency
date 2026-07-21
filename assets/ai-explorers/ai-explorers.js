// AI Explorers product page: product selection, previews, and secure checkout.
(() => {
  const products = {
    workbook: { name: "AI Explorers Workbook", price: 4500, description: "One full-colour, fillable workbook PDF for your family." },
    complete: { name: "AI Explorers Family Library", price: 7500, description: "Three separate private PDFs: the 37-page interactive workbook, low-ink workbook and Parent Companion." },
  };
  const selectorDialog = document.querySelector("[data-ai-selector-dialog]");
  const dialog = document.querySelector("[data-ai-checkout-dialog]");
  const form = document.querySelector("[data-ai-checkout-form]");
  const status = document.querySelector(".ai-explorers-checkout-status");
  const title = document.querySelector("#checkoutTitle");
  const description = document.querySelector("#checkoutDescription");
  const productInput = form?.elements.product;
  const submit = form?.querySelector("button[type='submit']");
  const hero = document.querySelector(".ai-explorers-hero");
  const stickyBuy = document.querySelector("[data-ai-sticky-buy]");
  const gallery = Array.from(document.querySelectorAll("[data-ai-gallery] button"));
  const lightbox = document.querySelector("[data-ai-lightbox]");
  const lightboxImage = lightbox?.querySelector("img");
  const lightboxCaption = document.querySelector("#aiPreviewCaption");
  const shareWidget = document.querySelector("[data-ai-share-widget]");
  const sharePanel = document.querySelector("[data-ai-share-panel]");
  const shareCopy = document.querySelector("[data-ai-share-copy]");
  let selectedProduct = "complete";
  let ctaLocation = "page";
  let previewIndex = 0;

  document.querySelector("#aiExplorersYear").textContent = String(new Date().getFullYear());
  const track = (event, product, extra = {}) => window.gtag?.("event", event, { product_name: products[product].name, value: products[product].price, currency: "NGN", ...extra });

  const openCheckout = (product, location) => {
    selectedProduct = products[product] ? product : "complete";
    ctaLocation = location || "page";
    const choice = products[selectedProduct];
    form?.reset();
    productInput.value = selectedProduct;
    title.textContent = choice.name;
    description.textContent = choice.description;
    submit.textContent = `Continue to Paystack - N${choice.price.toLocaleString("en-NG")}`;
    status.textContent = "";
    submit.disabled = false;
    track("select_ai_explorers_product", selectedProduct, { cta_location: ctaLocation });
    dialog?.showModal?.();
    dialog?.querySelector("input")?.focus();
  };

  const openPurchaseSelector = (location) => {
    ctaLocation = location || "page";
    selectorDialog?.showModal?.();
    selectorDialog?.querySelector("[data-ai-selector-product]")?.focus();
  };

  const shareUrl = () => document.querySelector("link[rel='canonical']")?.href || `${window.location.origin}${window.location.pathname}`;
  const shareMessage = () => "A thoughtful, parent-guided AI workbook for children ages 9-11. Have a look at AI Explorers:";
  const encodedShare = () => encodeURIComponent(`${shareMessage()} ${shareUrl()}`);
  const openSharePanel = () => {
    if (!sharePanel) return;
    sharePanel.hidden = !sharePanel.hidden;
    shareWidget?.classList.toggle("is-open", !sharePanel.hidden);
    document.querySelector("[data-ai-share-toggle]")?.setAttribute("aria-expanded", String(!sharePanel.hidden));
  };
  document.querySelectorAll("[data-ai-share-toggle]").forEach((button) => button.addEventListener("click", openSharePanel));
  document.querySelectorAll("[data-ai-share-whatsapp]").forEach((link) => link.href = `https://wa.me/?text=${encodedShare()}`);
  document.querySelectorAll("[data-ai-share-facebook]").forEach((link) => link.href = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl())}`);
  document.querySelectorAll("[data-ai-share-x]").forEach((link) => link.href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage())}&url=${encodeURIComponent(shareUrl())}`);
  shareCopy?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(shareUrl());
      shareCopy.textContent = "Link copied";
      window.setTimeout(() => { shareCopy.textContent = "Copy link"; }, 1800);
    } catch { window.prompt("Copy this page link", shareUrl()); }
  });
  document.querySelectorAll("[data-ai-native-share]").forEach((button) => button.addEventListener("click", async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "AI Explorers", text: shareMessage(), url: shareUrl() }); } catch { /* The parent chose not to share. */ }
      return;
    }
    window.open(`https://wa.me/?text=${encodedShare()}`, "_blank", "noopener,noreferrer");
  }));

  document.querySelectorAll("[data-ai-buy]").forEach((button) => button.addEventListener("click", () => {
    if (button.tagName === "A") return;
    if (button.dataset.aiProduct) openCheckout(button.dataset.aiProduct, button.dataset.ctaLocation);
    else openPurchaseSelector(button.dataset.ctaLocation);
  }));
  document.querySelectorAll("[data-ai-selector-product]").forEach((button) => button.addEventListener("click", () => {
    selectorDialog?.close();
    openCheckout(button.dataset.aiSelectorProduct, ctaLocation || button.dataset.ctaLocation);
  }));
  document.querySelectorAll("[data-ai-preview-cta]").forEach((link) => link.addEventListener("click", () => window.gtag?.("event", "view_product_preview")));
  document.querySelectorAll("[data-ai-classroom]").forEach((link) => link.addEventListener("click", () => window.gtag?.("event", "click_classroom_licence")));

  if (hero && stickyBuy && "IntersectionObserver" in window) new IntersectionObserver(([entry]) => { stickyBuy.hidden = entry.isIntersecting; }, { threshold: 0.2 }).observe(hero);
  const renderPreview = (index) => { if (!gallery.length || !lightboxImage) return; previewIndex = (index + gallery.length) % gallery.length; const preview = gallery[previewIndex]; lightboxImage.src = preview.dataset.preview; lightboxImage.alt = preview.querySelector("img")?.alt || "AI Explorers workbook preview"; lightboxCaption.textContent = preview.dataset.caption || "AI Explorers workbook preview."; };
  gallery.forEach((item, index) => item.addEventListener("click", () => { renderPreview(index); lightbox?.showModal(); }));
  lightbox?.querySelector("[data-ai-preview-prev]")?.addEventListener("click", () => renderPreview(previewIndex - 1));
  lightbox?.querySelector("[data-ai-preview-next]")?.addEventListener("click", () => renderPreview(previewIndex + 1));

  const pollForVerification = async (reference, attempts = 0) => {
    if (attempts >= 100) return;
    try { const response = await fetch(`/api/ai-explorers/verify?reference=${encodeURIComponent(reference)}`); const result = await response.json(); if (result.verified) { window.location.assign(`/ai-explorers/thank-you/?reference=${encodeURIComponent(reference)}`); return; } } catch { /* Retry for slow mobile networks. */ }
    window.setTimeout(() => pollForVerification(reference, attempts + 1), 3000);
  };
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const firstName = String(form.elements.firstName.value || "").trim();
    const email = String(form.elements.email.value || "").trim();
    if (!firstName || !email) return;
    submit.disabled = true; status.textContent = "Preparing secure checkout...";
    try {
      const response = await fetch("/api/ai-explorers/initialize", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ firstName, email, product: selectedProduct, ctaLocation }) });
      const result = await response.json();
      if (!response.ok || !result.accessCode || !result.reference) throw new Error(result.message || "We could not prepare checkout. Please try again.");
      // Paystack's CDN currently exposes PaystackPop. Keep the fallback for
      // the documented V2 global so a future library update does not break checkout.
      const PaystackCheckout = window.PaystackPop || window.Paystack;
      if (typeof PaystackCheckout !== "function") throw new Error("Secure checkout did not load. Please refresh the page and try again.");
      track("begin_checkout_ai_explorers", selectedProduct, { cta_location: ctaLocation, transaction_id: result.reference });
      // Once Paystack is ready, remove our form so the payment window is the only focus.
      dialog?.close();
      form.reset();
      submit.disabled = false;
      new PaystackCheckout().resumeTransaction(result.accessCode);
      pollForVerification(result.reference);
    } catch (error) { status.textContent = error.message || "We could not start checkout. Please try again."; submit.disabled = false; }
  });
})();
