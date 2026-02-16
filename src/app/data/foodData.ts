import XLSX from "xlsx";
import path from "path";
import fs from "fs";

// --------------------
// Excel1行の型
type Row = {
  food: string;
  city: string;
};

// --------------------
// もともと使っている型
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
// Excelのパス
const excelPath = path.join(
  process.cwd(),
  "src",
  "app",
  "dataset",
  "データセット.xlsx"
);

// 存在チェック
if (!fs.existsSync(excelPath)) {
  console.error("Excelファイルが存在しません:", excelPath);
  process.exit(1);
}

// --------------------
// Excel読み取り
export function loadFoodExcel(): Row[] {
  const workbook = XLSX.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  const rows = XLSX.utils.sheet_to_json(sheet, {
    header: ["food", "city"],
    range: 1
  }) as Row[];

  // 空行対策
  return rows.filter(r => r.food && r.city);
}

// --------------------
// Excel → FoodItem に変換
export function buildFoodDataFromExcel(): FoodItem[] {
  const rows = loadFoodExcel();

  // ① 食べ物ごとにまとめる
  const grouped = rows.reduce((acc, row) => {
    if (!acc[row.food]) acc[row.food] = [];
    acc[row.food].push(row.city);
    return acc;
  }, {} as Record<string, string[]>);

  // ② FoodItem型へ変換
  const foodItems: FoodItem[] = Object.entries(grouped).map(
    ([food, cities]) => ({
      id: food,
      name: food,
      imageQuery: food,
      regions: cities.map(city => ({
        id: `${food}-${city}`,
        name: city,
        prefecture: "",
        description: "",
        lat: 0,
        lng: 0
      }))
    })
  );

  return foodItems;
}

// --------------------
// 動作確認用（直接実行した時だけ表示）
const data = buildFoodDataFromExcel();
console.log(JSON.stringify(data, null, 2));


