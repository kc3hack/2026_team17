import xlsx from "xlsx";
import path from "path";
import fs from "fs";

// xlsx は CommonJS なので default import から取り出す
const { readFile, utils } = xlsx as any;

// --------------------
// Excel 1行の型
// A: food
// B: city
// C: prefecture
// D: lat
// E: lng
type Row = {
  food: string;
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
  regions: Region[];
  imageQuery: string;
};

// --------------------
// Excel のパス
const excelPath = path.join(
  process.cwd(),
  "src",
  "app",
  "dataset",
  "データセット県名緯度経度.xlsx"
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
    header: ["food", "city", "prefecture", "lat", "lng"],
    range: 1,
  }) as Row[];

  return rows
    .filter(r => r.food && r.city)
    .map(r => ({
      food: String(r.food).trim(),
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

  const grouped = rows.reduce((acc, row) => {
    if (!acc[row.food]) acc[row.food] = [];
    acc[row.food].push(row);
    return acc;
  }, {} as Record<string, Row[]>);

  return Object.entries(grouped).map(([food, items]) => ({
    id: food,
    name: food,
    imageQuery: food,
    regions: items.map(item => ({
      id: `${food}-${item.city}`,
      name: item.city,
      prefecture: item.prefecture,
      description: "",
      lat: item.lat,
      lng: item.lng,
    })),
  }));
}

// --------------------
// ★ これが前と同じやり方
// foodData を生成して JSON に保存する

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