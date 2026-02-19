import xlsx from "xlsx";
import path from "path";
import fs from "fs";

// xlsx は CommonJS
const { readFile, utils } = xlsx as any;

// --------------------
// Excel 1行の型
// A: category（料理カテゴリ 例：ラーメン）
// B: kana
// C: city
// D: prefecture
// E: foodName（正式料理名 例：味噌ラーメン）
// F: lat
// G: lng
type Row = {
  category: string;
  kana: string;
  city: string;
  prefecture: string;
  foodName: string;
  lat: number;
  lng: number;
};

// --------------------
export type Region = {
  id: string;
  name: string;
  prefecture: string;
  description: string;
  lat: number;
  lng: number;
};

export type FoodItem = {
  id: string;
  name: string;
  kana: string;
  imageQuery: string;
  regions: Region[];
};

// --------------------
// Excel のパス
const excelPath = path.join(
  process.cwd(),
  "src",
  "app",
  "dataset",
  "データセットふりがな県名緯度経度.xlsx"
);

if (!fs.existsSync(excelPath)) {
  console.error("Excelファイルが存在しません:", excelPath);
  process.exit(1);
}

// --------------------
// Excel 読み込み
export function loadFoodExcel(): Row[] {
  const workbook = readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = utils.sheet_to_json(sheet, {
    header: ["category", "kana", "city", "prefecture", "foodName", "lat", "lng"],
    range: 1,
  }) as Row[];

  return rows
    .filter(r => r.category && r.city)
    .map(r => ({
      category: String(r.category).trim(),
      kana: String(r.kana ?? "").trim(),
      city: String(r.city).trim(),
      prefecture: String(r.prefecture ?? "").trim(),
      foodName: String(r.foodName ?? "").trim(),
      lat: Number(r.lat),
      lng: Number(r.lng),
    }));
}

// --------------------
// ★ A列（カテゴリ）単位でまとめる
export function buildFoodDataFromExcel(): FoodItem[] {
  const rows = loadFoodExcel();

  const grouped = rows.reduce((acc, row) => {
    if (!acc[row.category]) acc[row.category] = [];
    acc[row.category].push(row);
    return acc;
  }, {} as Record<string, Row[]>);

  return Object.entries(grouped).map(([category, items]) => {
    const first = items[0];

    return {
      id: category,
      name: category,
      kana: first.kana,        // 代表の読み
      imageQuery: category,   // 画像検索や画像対応用
      regions: items.map(item => ({
        id: `${category}-${item.city}`,
        name: item.city,
        prefecture: item.prefecture,

        // ★ ここに E列（正式料理名）を入れる
        description: item.foodName,

        lat: item.lat,
        lng: item.lng,
      })),
    };
  });
}

// --------------------
export const foodData: FoodItem[] = buildFoodDataFromExcel();

const outputPath = path.join(
  process.cwd(),
  "src",
  "app",
  "data",
  "foodData.generated.json"
);

fs.writeFileSync(
  outputPath,
  JSON.stringify(foodData, null, 2),
  "utf-8"
);

console.log("foodData.generated.json を作成しました");
console.log("件数:", foodData.length);
console.log("保存先:", outputPath);
