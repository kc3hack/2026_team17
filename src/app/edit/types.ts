export type FoodItem = {
  name: string;     // 例: "尾道ラーメン"
  city?: string;    // 任意（あるなら）
};

export type FoodPlacement = {
  prefCode: string; // "aichi"
  foodId: string;   // "aichi__味噌カツ"
  foodName: string;
  iconKey: string;  // "ramen" など
  x: number;        // 0..1
  y: number;        // 0..1
  updatedAt: number;
};

export type PlacementStore = {
  version: 1;
  placementsByPref: Record<string, FoodPlacement[]>;
};