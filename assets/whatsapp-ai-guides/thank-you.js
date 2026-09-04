(() => {
  const params = new URLSearchParams(location.search);
  const reference = params.get("reference") || params.get("trxref") || "";
  const title = document.querySelector("#deliveryTitle");
  const message = document.querySelector("#deliveryMessage");
  const download = document.querySelector("#downloadButton");
  const retry = document.querySelector("#retryButton");
  const action = document.querySelector("#firstAction");
  const actionText = document.querySelector("#firstActionText");
  const share = document.querySelector("#shareButton");
  let tries = 0;

  const productActions = {
    launchpad: "Open the access check first. Confirm what your account supports, then collect your current prices, delivery rules and business information before teaching the agent.",
    "growth-engine": "Begin with the operating foundations. Adapt the master instruction to approved prices, policies, qualification questions and human-handoff rules before a live launch.",
  };
  const fbq = (...args) => { if (typeof window.fbq === "function") window.fbq(...args); };

  async function verify() {
    retry.hidden = true;
    if (!reference) return fail("We could not find the secure delivery details on this page.");
    try {
      const response = await fetch(`/api/whatsapp-ai-guides/verify?reference=${encodeURIComponent(reference)}`, { cache: "no-store", credentials: "same-origin" });
      const data = await response.json();
      if (data.verified) return ready(data);
      if (tries < 8) {
        tries += 1;
        message.textContent = "Paystack is still confirming the transaction. This normally takes only a few seconds.";
        return setTimeout(verify, 1600 + tries * 250);
      }
      fail(data.message || "Payment is still pending.");
    } catch {
      fail("The payment check could not connect. Your payment is safe; please try the check again.");
    }
  }

  function ready(data) {
    const product = data.product;
    title.textContent = "Payment confirmed. Your guide is ready.";
    message.textContent = `${product.name} is ready as a private PDF. Your download should begin now.`;
    download.href = data.downloadUrl;
    download.hidden = false;
    download.textContent = `Download ${product.name}`;
    action.hidden = false;
    actionText.textContent = productActions[product.id];
    const pageUrl = "https://wtbaimarketing.com/whatsapp-ai-guides/";
    share.href = `https://wa.me/?text=${encodeURIComponent(`I found practical WhatsApp AI guides for Nigerian businesses that need faster replies and cleaner handoffs: ${pageUrl}`)}`;
    fbq("track", "Purchase", { content_ids: [product.id], content_type: "product", content_name: product.name, value: product.amount / 100, currency: "NGN" }, { eventID: data.eventId });
    setTimeout(() => location.assign(data.downloadUrl), 800);
  }

  function fail(copy) {
    title.textContent = "Your payment is not lost.";
    message.textContent = copy;
    retry.hidden = false;
  }
  retry.addEventListener("click", () => { tries = 0; title.textContent = "Checking Paystack again…"; verify(); });
  verify();
})();
