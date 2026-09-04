export const PRODUCT_CURRENCY = "NGN";
export const REFERENCE_PATTERN = /^wtbwa_[A-Za-z0-9]+$/;

export const PRODUCTS = Object.freeze({
  launchpad: Object.freeze({
    id: "launchpad",
    name: "WhatsApp AI Launchpad",
    amount: 550000,
    asset: "launchpad",
    firstAction: "Start with the access check and business-information checklist before changing any live customer reply.",
  }),
  "growth-engine": Object.freeze({
    id: "growth-engine",
    name: "WhatsApp AI Growth Engine",
    amount: 1050000,
    asset: "growth-engine",
    firstAction: "Begin with the operating foundations, then adapt the master instruction to your approved prices, policies and handoff rules.",
  }),
});

export const ASSETS = Object.freeze({
  launchpad: Object.freeze({
    key: "whatsapp-ai-guides/launchpad/wtb-whatsapp-ai-launchpad.pdf",
    filename: "WTB-WhatsApp-AI-Launchpad.pdf",
  }),
  "growth-engine": Object.freeze({
    key: "whatsapp-ai-guides/growth-engine/wtb-whatsapp-ai-growth-engine.pdf",
    filename: "WTB-WhatsApp-AI-Growth-Engine.pdf",
  }),
});

export function productForId(id) {
  return PRODUCTS[id] || null;
}
