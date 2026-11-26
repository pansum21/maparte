/**
 * Drives the gallery reel in a real browser: one screenshot per part, a check
 * that the prints actually move as a part is scrolled, and a look at anything
 * that spills out of the pinned frame.
 *
 *   node scripts/verify_motion_lab.mjs [baseUrl]
 */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.argv[2] || "http://127.0.0.1:5182";
const OUT = path.join(process.cwd(), "..", "screenshots", "reel");
fs.mkdirSync(OUT, { recursive: true });

const SELECTOR = [
  ".ml-card",
  ".ml-cascade__spread",
  ".ml-viewfinder__face",
  ".ml-elastic__column",
  ".ml-rail__hang",
  ".ml-grid__inner",
  ".ml-grid__cell",
  ".ml-helix__card",
  ".ml-endless__track",
  ".ml-drum__ring",
  ".ml-folder",
  ".ml-collage__tile",
  ".ml-journal__spread",
  ".ml-book__page",
].join(", ");

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});

await page.goto(`${BASE}/?lab=motion`, { waitUntil: "networkidle" });
await page.waitForSelector(".rl-part");

const geometry = await page.evaluate(() => ({
  scrollWidth: document.documentElement.scrollWidth,
  clientWidth: document.documentElement.clientWidth,
  parts: document.querySelectorAll(".rl-part").length,
  photos: document.querySelectorAll(".ml-photo").length,
}));
console.log("page", JSON.stringify(geometry));

const read = (index) =>
  page.evaluate(
    ({ i, selector }) => {
      const part = document.querySelectorAll(".rl-part")[i];
      const pin = part.querySelector(".rl-pin");
      const sig = Array.from(pin.querySelectorAll(selector))
        .map((el) => {
          const style = getComputedStyle(el);
          return `${style.transform}|${style.opacity}`;
        })
        .join("~");
      const spills = Array.from(pin.querySelectorAll(selector))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.right > window.innerWidth + 4 || r.left < -4;
        }).length;
      return { sig, spills, pinTop: Math.round(pin.getBoundingClientRect().top), id: part.id };
    },
    { i: index, selector: SELECTOR },
  );

const report = [];

for (let index = 0; index < geometry.parts; index += 1) {
  await page.evaluate((i) => {
    const node = document.querySelectorAll(".rl-part")[i];
    window.scrollTo({ top: window.scrollY + node.getBoundingClientRect().top, behavior: "instant" });
  }, index);
  await page.waitForTimeout(450);
  const start = await read(index);

  await page.evaluate(() => window.scrollBy({ top: window.innerHeight * 0.5, behavior: "instant" }));
  await page.waitForTimeout(800);
  const after = await read(index);

  const id = start.id.replace("part-", "");
  await page.locator(`#part-${id} .rl-pin`).screenshot({ path: path.join(OUT, `${String(index + 1).padStart(2, "0")}-${id}.png`) });

  report.push({ id, pinned: after.pinTop === 0, moved: start.sig !== after.sig, spills: after.spills });
  console.log(
    `${String(index + 1).padStart(2, "0")} ${id.padEnd(11)} pinned=${String(after.pinTop === 0).padEnd(5)} moved=${String(start.sig !== after.sig).padEnd(5)} spills=${after.spills}`,
  );
}

// The skip button should carry the reader to the next part.
await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
await page.evaluate(() => window.scrollBy({ top: window.innerHeight * 1.4, behavior: "instant" }));
const beforeSkip = await page.evaluate(() => Math.round(window.scrollY));
await page.click(".rl-skip");
await page.waitForTimeout(1400);
const afterSkip = await page.evaluate(() => Math.round(window.scrollY));

console.log("\nskip", beforeSkip, "->", afterSkip);
console.log("errors", errors.length ? errors.slice(0, 5) : "none");
console.log("stuck", report.filter((item) => !item.moved).map((item) => item.id));
console.log("unpinned", report.filter((item) => !item.pinned).map((item) => item.id));
console.log("spilling", report.filter((item) => item.spills > 0).map((item) => `${item.id}:${item.spills}`));

await browser.close();
