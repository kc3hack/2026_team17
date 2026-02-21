// scripts/genImages.mjs
import fs from "node:fs";
import path from "node:path";

const imagesDir = path.resolve("public/images");
const outFile = path.resolve("src/data/images.generated.json");

// ★ foodData.generated.json の場所に合わせる（今の構成だとここが正）
const foodDataFile = path.resolve("src/app/data/foodData.generated.json");

const exts = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif"]);

function normalizeKey(s) {
  return String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/\.(png|jpe?g|webp|gif)$/i, "")
    .replace(/[-_\s]+/g, ""); // ramen- / ramen_ / ramen も吸収
}

// 1) foodData を読み込み、imageQuery -> name の辞書を作る
let imageQueryToName = {};
if (fs.existsSync(foodDataFile)) {
  const foodData = JSON.parse(fs.readFileSync(foodDataFile, "utf-8"));
  for (const item of foodData) {
    const iq = normalizeKey(item?.imageQuery);
    const name = String(item?.name ?? "").trim();
    if (iq && name) imageQueryToName[iq] = name;
  }
} else {
  console.warn(`⚠️ foodData not found: ${foodDataFile}`);
}

// 2) ファイル名→label（foodDataで照合して日本語に）
//    - ① 完全一致
//    - ② 部分一致（stem に含まれる imageQuery を探し、最長一致を採用）
function toLabel(filename) {
  const stemRaw = path.parse(filename).name;
  const stem = normalizeKey(stemRaw);

  // ① 完全一致
  if (imageQueryToName[stem]) return imageQueryToName[stem];

  // ② 部分一致（最長一致を採用）
  let bestKey = "";
  for (const key of Object.keys(imageQueryToName)) {
    if (!key) continue;
    if (stem.includes(key) && key.length > bestKey.length) {
      bestKey = key;
    }
  }
  if (bestKey) return imageQueryToName[bestKey];

  // ③ それでも無ければ元のファイル名（英字）
  return stemRaw;
}

const files = fs
  .readdirSync(imagesDir, { withFileTypes: true })
  .filter((d) => d.isFile())
  .map((d) => d.name)
  .filter((name) => exts.has(path.extname(name).toLowerCase()))
  .sort((a, b) => a.localeCompare(b));

const json = files.map((name) => ({
  label: toLabel(name),
  src: `/images/${name}`,
}));

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(json, null, 2), "utf-8");

console.log(`✅ wrote ${json.length} images -> ${outFile}`);
console.log(
  `✅ loaded ${Object.keys(imageQueryToName).length} imageQuery keys from ${foodDataFile}`
);