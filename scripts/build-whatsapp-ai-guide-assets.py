from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import shutil

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "whatsapp-business-agent-pdf"
OUT = ROOT / "assets" / "whatsapp-ai-guides"
OUT.mkdir(parents=True, exist_ok=True)


def contain(source, name, width, quality=78):
    image = Image.open(source).convert("RGB")
    height = round(image.height * width / image.width)
    image.resize((width, height), Image.Resampling.LANCZOS).save(
        OUT / name, "WEBP", quality=quality, method=6
    )


def preview(source, stem):
    image = Image.open(source).convert("RGB")
    for width, quality in ((480, 70), (900, 80)):
        height = round(image.height * width / image.width)
        resized = image.resize((width, height), Image.Resampling.LANCZOS)
        draw = ImageDraw.Draw(resized, "RGBA")
        label = "WTB PREVIEW PAGE"
        font = ImageFont.load_default(size=max(14, width // 28))
        box = draw.textbbox((0, 0), label, font=font)
        pad = max(10, width // 35)
        x = width - (box[2] - box[0]) - pad * 2
        y = height - (box[3] - box[1]) - pad * 2
        draw.rounded_rectangle((x, y, width - pad // 2, height - pad // 2), radius=5, fill=(13, 16, 24, 205))
        draw.text((x + pad // 2, y + pad // 2), label, fill=(255, 255, 255, 235), font=font)
        resized.save(OUT / f"{stem}-{width}.webp", "WEBP", quality=quality, method=6)


contain(SOURCE / "assets" / "logo-wtb.png", "wtb-logo.webp", 160, 82)
for stem, path in {
    "launchpad-cover": SOURCE / "review" / "basic" / "page-01.png",
    "growth-engine-cover": SOURCE / "review" / "advanced" / "page-01.png",
}.items():
    contain(path, f"{stem}-360.webp", 360, 78)
    contain(path, f"{stem}-640.webp", 640, 82)

for stem, path in {
    "launchpad-preview-setup": SOURCE / "review" / "basic" / "page-06.png",
    "launchpad-preview-control": SOURCE / "review" / "basic" / "page-21.png",
    "launchpad-preview-ready": SOURCE / "review" / "basic" / "page-23.png",
    "growth-preview-operations": SOURCE / "review" / "advanced" / "page-32.png",
    "growth-preview-prompts": SOURCE / "review" / "advanced" / "page-43.png",
    "growth-preview-continuous-learning": SOURCE / "review" / "advanced" / "page-47.png",
}.items():
    preview(path, stem)

for stem, path in {
    "business-handoff": SOURCE / "assets" / "generated" / "human-handoff.png",
    "knowledge-system": SOURCE / "assets" / "generated" / "knowledge-system.png",
}.items():
    contain(path, f"{stem}-640.webp", 640, 75)
    contain(path, f"{stem}-1080.webp", 1080, 78)

shutil.copy2(ROOT / "assets" / "icon-whatsapp.svg", OUT / "icon-whatsapp.svg")
shutil.copy2(SOURCE / "assets" / "icon-instagram.svg", OUT / "icon-instagram.svg")

# A compact, product-first Open Graph image composed only from approved assets.
canvas = Image.new("RGB", (1200, 630), "#0d1018")
draw = ImageDraw.Draw(canvas)
draw.rectangle((0, 0, 1200, 12), fill="#f3b51f")
draw.rectangle((0, 618, 1200, 630), fill="#155dfc")
font_bold = ImageFont.truetype("arialbd.ttf", 56)
font_body = ImageFont.truetype("arial.ttf", 29)
font_small = ImageFont.truetype("arialbd.ttf", 23)
draw.text((64, 70), "Your WhatsApp is busy.", font=font_bold, fill="#fbfaf7")
draw.text((64, 140), "Build the system that answers, qualifies", font=font_body, fill="#dbe7ff")
draw.text((64, 182), "and hands the right chats back to you.", font=font_body, fill="#dbe7ff")
draw.rounded_rectangle((64, 258, 435, 319), radius=8, fill="#155dfc")
draw.text((86, 274), "Launchpad  NGN 5,500", font=font_small, fill="white")
draw.rounded_rectangle((64, 335, 500, 396), radius=8, fill="#f3b51f")
draw.text((86, 351), "Growth Engine  NGN 10,500", font=font_small, fill="#15171c")
draw.text((64, 489), "WTB AI MARKETING AGENCY", font=font_small, fill="#fbfaf7")

for x, source in ((745, SOURCE / "review" / "basic" / "page-01.png"), (930, SOURCE / "review" / "advanced" / "page-01.png")):
    cover = Image.open(source).convert("RGB")
    cover.thumbnail((230, 510), Image.Resampling.LANCZOS)
    canvas.paste(cover, (x, 72))
canvas.save(OUT / "social-card.jpg", "JPEG", quality=84, optimize=True)
