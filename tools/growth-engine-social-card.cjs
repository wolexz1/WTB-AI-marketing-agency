const sharp = require("sharp");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const asset = (name) => path.join(root, "assets", "whatsapp-ai-guides", name);
const background = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#0d1421"/>
  <rect x="0" y="0" width="1200" height="9" fill="#f3b51f"/>
  <rect x="58" y="76" width="5" height="43" fill="#25d366"/>
  <text x="83" y="106" font-family="Arial,sans-serif" font-size="23" font-weight="700" fill="#b7d0ff">WTB AI MARKETING AGENCY</text>
  <text x="60" y="203" font-family="Georgia,serif" font-size="61" font-weight="700" fill="#ffffff">Build your WhatsApp</text>
  <text x="60" y="275" font-family="Georgia,serif" font-size="61" font-weight="700" fill="#ffffff">AI assistant.</text>
  <text x="60" y="333" font-family="Arial,sans-serif" font-size="27" fill="#d9e2f1">Step-by-step setup, buyer qualification</text>
  <text x="60" y="373" font-family="Arial,sans-serif" font-size="27" fill="#d9e2f1">and human handoff for your business.</text>
  <rect x="60" y="437" width="480" height="82" rx="5" fill="#f3b51f"/>
  <text x="84" y="490" font-family="Arial,sans-serif" font-size="31" font-weight="700" fill="#111820">Growth Engine · ₦10,500</text>
  <text x="60" y="582" font-family="Arial,sans-serif" font-size="22" fill="#aebbd0">One-time purchase  ·  Private PDF access</text>
  <rect x="1190" y="0" width="10" height="630" fill="#155dfc"/>
</svg>`);

(async () => {
  const cover = await sharp(asset("growth-engine-cover-640.webp")).resize(322, 455).toBuffer();
  await sharp(background)
    .composite([{ input: cover, left: 764, top: 84 }])
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(asset("social-card.jpg"));
})().catch((error) => { console.error(error); process.exitCode = 1; });
