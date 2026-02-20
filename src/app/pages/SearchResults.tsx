import { useSearchParams, useNavigate } from "react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MapPin } from "lucide-react";
import { AppHeader } from "../components/AppHeader";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import generatedFoodData from "../data/foodData.generated.json";

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

export const foodData = generatedFoodData as FoodItem[];

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get("q") || "";

  // ✅ AppHeader用：検索欄（初期値はURLのq）
  const [searchQuery, setSearchQuery] = useState<string>(() => query);

  // ✅ URLが変わったら検索欄も追従（戻る/進むや別遷移でズレないように）
  useEffect(() => {
    setSearchQuery(query);
  }, [query]);

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const matchedFoods = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return foodData.filter(
      (food) =>
        food.name.toLowerCase().includes(q) ||
        (food.kana ?? "").toLowerCase().includes(q)
    );
  }, [query]);

  // === ここから表示 ===
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* ✅ 共通ヘッダー（しょくたび） */}
      <AppHeader
        value={searchQuery}
        onChange={setSearchQuery}
        onSearch={handleSearch}
      />

      {/* ✅ サブバー（MapViewと同じ：戻る + タイトル） */}
      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft size={20} />
              戻る
            </Button>

            <div className="text-center flex-1">
              <h1 className="font-bold text-lg">「{query}」の検索結果</h1>
              <p className="text-sm text-gray-600">
                {matchedFoods.length}件見つかりました
              </p>
            </div>

            <div className="w-20" />
          </div>
        </div>
      </div>

      {/* ✅ メイン */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          {matchedFoods.length === 0 ? (
            <div className="py-20 text-center">
              <h2 className="text-2xl font-bold mb-4">
                「{query}」の検索結果が見つかりませんでした
              </h2>
              <p className="text-gray-600 mb-8">別の特産品で検索してみてください</p>
              <Button onClick={() => navigate("/")}>ホームに戻る</Button>
            </div>
          ) : (
            <div className="space-y-12">
              {matchedFoods.map((food) => (
                <section
                  key={food.id}
                  className="bg-white/60 rounded-2xl p-6 shadow-sm"
                >
                  <div className="text-center mb-8">
                    {/* 画像 */}
                    <div className="flex justify-center mb-4">
                      <img
                        src={getFoodImage(food)}
                        alt={food.name}
                        className="w-48 h-48 object-cover rounded-xl shadow"
                        onError={(e) => {
                          e.currentTarget.src = "/images/noimage.jpg";
                        }}
                      />
                    </div>

                    <h2 className="text-3xl font-bold mb-2">{food.name}</h2>
                    <p className="text-gray-600">
                      {food.name}の名産地を選択してください
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {food.regions.map((region) => (
                      <Card
                        key={region.id}
                        className="p-8 cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1"
                        onClick={() =>
                          navigate(`/map?food=${food.id}&region=${region.id}`)
                        }
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <MapPin className="text-blue-600" size={24} />
                          </div>

                          <div className="flex-1">
                            <h3 className="text-xl font-bold mb-2">
                              {region.name}
                            </h3>
                            <p className="text-gray-600 mb-3">
                              {region.prefecture}
                            </p>
                            <p className="text-sm text-gray-500">
                              {region.description}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t">
                          <Button className="w-full">この地域の宿を探す</Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function getFoodImage(food: FoodItem): string {
  return `/images/${food.imageQuery}.jpg`;
}