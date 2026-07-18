(() => {
  const token = new URLSearchParams(location.search).get("token");
  const title = document.querySelector("#libraryTitle");
  const message = document.querySelector("#libraryMessage");
  const items = document.querySelector("#libraryItems");
  if (!token) { title.textContent = "Your access link is missing."; message.textContent = "Please return to your purchase email, or contact support with your payment reference."; return; }
  fetch(`/api/ai-explorers/library?token=${encodeURIComponent(token)}`, { cache: "no-store" }).then(async (response) => ({ response, data: await response.json() })).then(({ response, data }) => {
    if (!response.ok) throw new Error(data.message || "We could not open your library.");
    title.textContent = data.product.name;
    message.textContent = `Hello ${data.firstName}, choose the PDF you would like to open or save.`;
    items.innerHTML = data.items.map((item) => `<article><span>${escapeHtml(item.kind)}</span><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description)}</p><a class="button" href="${escapeHtml(item.url)}">Get PDF</a></article>`).join("");
  }).catch((error) => { title.textContent = "We could not open your library."; message.textContent = error.message || "Please contact support with your payment reference."; });
  function escapeHtml(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;"); }
})();
