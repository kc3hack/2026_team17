import xlsx from "xlsx";
import path from "path";
import fs from "fs";

// xlsx は CommonJS なので default import から取り出す
const { readFile, utils } = xlsx as any;

// --------------------
// Excel 1行の型
// A: food
// B: kana
// C: city
// D: prefecture
// E: lat
// F: lng
type Row = {
  food: string;
  kana: string;
  city: string;
  prefecture: string;
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
  kana: string; // ★追加
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

  // A: food
  // B: kana
  // C: city
  // D: prefecture
  // E: lat
  // F: lng
  const rows = utils.sheet_to_json(sheet, {
    header: ["food", "kana", "city", "prefecture", "lat", "lng"],
    range: 1,
  }) as Row[];

  return rows
    .filter(r => r.food && r.city)
    .map(r => ({
      food: String(r.food).trim(),
      kana: String(r.kana ?? "").trim(),
      city: String(r.city).trim(),
      prefecture: String(r.prefecture ?? "").trim(),
      lat: Number(r.lat),
      lng: Number(r.lng),
    }));
}

// --------------------
// FoodItem に変換
export function buildFoodDataFromExcel(): FoodItem[] {
  const rows = loadFoodExcel();

  // food 単位でまとめる
  const grouped = rows.reduce((acc, row) => {
    if (!acc[row.food]) acc[row.food] = [];
    acc[row.food].push(row);
    return acc;
  }, {} as Record<string, Row[]>);

  return Object.entries(grouped).map(([food, items]) => {
    const first = items[0];

    return {
      id: food,
      name: food,
      kana: first.kana,   // ★ここで代表の読みを入れる
      imageQuery: food,
      regions: items.map(item => ({
        id: `${food}-${item.city}`,
        name: item.city,
        prefecture: item.prefecture,
        description: "",
        lat: item.lat,
        lng: item.lng,
      })),
    };
  });
}

// --------------------
// ★ 前と同じやり方で JSON を生成

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
