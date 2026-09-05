import test from "node:test";
import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const root = path.resolve("assets/whatsapp-ai-guides");
const files = await readdir(root, { recursive: true });
const size = async (name) => (await stat(path.join(root, name))).size;

test("public assets contain no paid PDF or working folders", () => {
  assert.equal(files.some((file) => file.toLowerCase().endsWith(".pdf")), false);
  assert.equal(files.some((file) => /tmp|external-ui|contact-sheet/i.test(file)), false);
});

test("hero and thumbnail assets stay within their budgets", async () => {
  assert.ok(await size("launchpad-cover-360.webp") <= 150000);
  assert.ok(await size("growth-engine-cover-360.webp") <= 150000);
  for (const file of files.filter((name) => /preview-.+-480\.webp$/.test(name))) assert.ok(await size(file) <= 90000, `${file} exceeds 90 KB`);
  assert.ok(await size("social-card.jpg") <= 150000);
});

test("all six approved preview thumbnails and full previews exist", () => {
  assert.equal(files.filter((name) => /preview-.+-480\.webp$/.test(name)).length, 6);
  assert.equal(files.filter((name) => /preview-.+-900\.webp$/.test(name)).length, 6);
});

test("WhatsApp mark is the untouched official Meta digital glyph", async () => {
  const glyph = await readFile(path.join(root, "icon-whatsapp.svg"));
  assert.equal(createHash("sha256").update(glyph).digest("hex"), "f7b1311db718533e671645f57cd94b92f0e006e61d7e6581a80675fc5a478fc4");
});
