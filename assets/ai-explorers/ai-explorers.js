// AI Explorers product page: isolated interaction and secure checkout client.
(() => {
  const price = 7500;
  const dialog = document.querySelector("[data-ai-checkout-dialog]");
  const checkoutForm = document.querySelector("[data-ai-checkout-form]");
  const checkoutStatus = document.querySelector(".ai-explorers-checkout-status");
  const buyButtons = Array.from(document.querySelectorAll("[data-ai-buy]"));
  const stickyBuy = document.querySelector("[data-ai-sticky-buy]");
  const hero = document.querySelector(".ai-explorers-hero");
  const gallery = Array.from(document.querySelectorAll("[data-ai-gallery] button"));
  const lightbox = document.querySelector("[data-ai-lightbox]");
  const lightboxImage = lightbox?.querySelector("img");
  const lightboxCaption = document.querySelector("#aiPreviewCaption");
  let ctaLocation = "page";
  let previewIndex = 0;

  document.querySelector("#aiExplorersYear").textContent = String(new Date().getFullYear());
  window.gtag?.("event", "view_ai_explorers", { product_name: "AI Explorers Family Kit", value: price, currency: "NGN" });

  const track = (name, extra = {}) => window.gtag?.("event", name, { product_name: "AI Explorers Family Kit", value: price, currency: "NGN", ...extra });

  const openCheckout = (location) => {
    ctaLocation = location || "page";
    track(location === "pricing" ? "click_buy_pricing" : "click_buy_hero", { cta_location: ctaLocation });
    if (typeof dialog?.showModal === "function") {
      dialog.showModal();
      dialog.querySelector("input")?.focus();
    } else {
      checkoutStatus.textContent = "Checkout is not available in this browser. Please use a current browser and try again.";
    }
  };

  buyButtons.forEach((button) => button.addEventListener("click", () => openCheckout(button.dataset.ctaLocation)));
  document.querySelectorAll("[data-ai-preview-cta]").forEach((link) => link.addEventListener("click", () => track("view_product_preview", { cta_location: link.getAttribute("href") || "page" })));
  document.querySelectorAll("[data-ai-classroom]").forEach((link) => link.addEventListener("click", () => track("click_classroom_licence")));

  if (hero && stickyBuy && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      stickyBuy.hidden = entry.isIntersecting;
    }, { threshold: 0.2 });
    observer.observe(hero);
  }

  const renderPreview = (index) => {
    if (!gallery.length || !lightboxImage || !lightboxCaption) return;
    previewIndex = (index + gallery.length) % gallery.length;
    const preview = gallery[previewIndex];
    lightboxImage.src = preview.dataset.preview;
    lightboxImage.alt = preview.querySelector("img")?.alt || "AI Explorers workbook preview";
    lightboxCaption.textContent = preview.dataset.caption || "AI Explorers workbook preview.";
  };

  gallery.forEach((item, index) => item.addEventListener("click", () => {
    renderPreview(index);
    lightbox?.showModal();
    track("view_product_preview", { preview_index: index + 1 });
  }));
  lightbox?.querySelector("[data-ai-preview-prev]")?.addEventListener("click", () => renderPreview(previewIndex - 1));
  lightbox?.querySelector("[data-ai-preview-next]")?.addEventListener("click", () => renderPreview(previewIndex + 1));
  lightbox?.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") renderPreview(previewIndex - 1);
    if (event.key === "ArrowRight") renderPreview(previewIndex + 1);
  });

  const showCheckoutError = (message) => {
    checkoutStatus.textContent = message;
    checkoutForm?.querySelector("button[type='submit']")?.removeAttribute("disabled");
  };

  const pollForVerification = async (reference, attempts = 0) => {
    if (attempts >= 100) return;
    try {
      const response = await fetch(`/api/ai-explorers/verify?reference=${encodeURIComponent(reference)}`, { headers: { Accept: "application/json" } });
      const result = await response.json();
      if (result.verified) {
        window.location.assign(`/ai-explorers/thank-you/?reference=${encodeURIComponent(reference)}`);
        return;
      }
    } catch {
      // The next poll provides another chance on slow mobile networks.
    }
    window.setTimeout(() => pollForVerification(reference, attempts + 1), 3000);
  };

  checkoutForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(checkoutForm);
    const firstName = String(formData.get("firstName") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const submit = checkoutForm.querySelector("button[type='submit']");
    if (!firstName || !email) return;

    submit.disabled = true;
    checkoutStatus.textContent = "Preparing secure checkout...";
    try {
      const response = await fetch("/api/ai-explorers/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ firstName, email, ctaLocation }),
      });
      const result = await response.json();
      if (!response.ok || !result.accessCode || !result.reference) {
        throw new Error(result.message || "We could not prepare checkout. Please try again.");
      }
      if (typeof window.Paystack !== "function") {
        throw new Error("Secure checkout did not load. Please refresh the page and try again.");
      }
      track("begin_checkout_ai_explorers", { cta_location: ctaLocation, transaction_id: result.reference });
      checkoutStatus.textContent = "Opening Paystack secure checkout...";
      const popup = new window.Paystack();
      popup.resumeTransaction(result.accessCode);
      pollForVerification(result.reference);
    } catch (error) {
      track("payment_failed_ai_explorers", { cta_location: ctaLocation, error_message: error.message });
      showCheckoutError(error.message || "We could not start checkout. Please try again.");
    }
  });
})();
