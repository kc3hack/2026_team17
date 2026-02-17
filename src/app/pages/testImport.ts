import { foodData } from "../data/foodData.ts";  // 配列データ
import type { FoodItem } from "../data/foodData.ts";  // 型だけを使う場合

console.log("FoodItem の数:", foodData.length);
console.log("1件目のデータ:", JSON.stringify(foodData[0], null, 2));
