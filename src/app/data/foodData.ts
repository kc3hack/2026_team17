// src/app/data/foodData.変更
import XLSX from "xlsx";
import path from "path";
import fs from "fs";

// --------------------
// Excel 1行の型
type Row = {
  food: string;
  city: string;
  lat: number;
  lng: number;
};

// --------------------
// FoodItem 型
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
// Excel ファイルのパス
const excelPath = path.join(
  process.cwd(),
  "src",
  "app",
  "dataset",
  "データセット緯度経度.xlsx"
);

// 存在チェック
if (!fs.existsSync(excelPath)) {
  console.error("Excelファイルが存在しません:", excelPath);
  process.exit(1);
}

// --------------------
// Excel 読み取り
export function loadFoodExcel(): Row[] {
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  // A列: food, B列: city, C列: lat, D列: lng
  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: ["food", "city", "lat", "lng"],
    range: 1,
  }) as Row[];

  // 型変換（緯度経度を数値に）
  return rows
    .filter(r => r.food && r.city)
    .map(r => ({
      food: r.food,
      city: r.city,
      lat: Number(r.lat) || 0,
      lng: Number(r.lng) || 0,
    }));
}

// --------------------
// FoodItem に変換
// --------------------
// Excel → FoodItem に変換する関数はすでに定義済み
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
      prefecture: "",
      description: "",
      lat: item.lat,
      lng: item.lng,
    })),
  }));
}

// --------------------
// ここで foodData を生成して export する
export const foodData: FoodItem[] = buildFoodDataFromExcel();

// --------------------
// 確認用（直接 ts-node で実行したときだけ表示）
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log("読み込んだ FoodItem 数:", foodData.length);
  console.log(JSON.stringify(foodData.slice(0, 3), null, 2));
}
