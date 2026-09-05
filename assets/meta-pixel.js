(() => {
  const pixelId = "1101896092165449";
  const path = window.location.pathname.replace(/\/+$/, "/");
  if (!window.fbq) {
    const fbq = function () {
      if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
      else fbq.queue.push(arguments);
    };
    window.fbq = fbq;
    if (!window._fbq) window._fbq = fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    const loadTransport = () => {
      if (!document.querySelector(`script[src="${script.src}"]`)) document.head.appendChild(script);
    };
    if (path === "/whatsapp-ai-guides/") {
      if (document.readyState === "complete") setTimeout(loadTransport, 0);
      else window.addEventListener("load", () => setTimeout(loadTransport, 0), { once: true });
    } else {
      loadTransport();
    }
  }

  if (!window.__wtbMetaPixelInitialised) {
    window.__wtbMetaPixelInitialised = true;
    window.fbq("init", pixelId);
  }

  if (!window.__wtbMetaPageViewTracked) {
    window.__wtbMetaPageViewTracked = true;
    window.fbq("track", "PageView");
  }

  if (path === "/ai-explorers/" && !window.__wtbMetaAiExplorersViewed) {
    window.__wtbMetaAiExplorersViewed = true;
    window.fbq("track", "ViewContent", {
      content_ids: ["ai-explorers-workbook", "ai-explorers-family-library"],
      content_name: "AI Explorers",
      content_type: "product",
      currency: "NGN",
      value: 4500,
    });
  }
})();
