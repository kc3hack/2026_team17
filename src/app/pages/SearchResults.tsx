import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import generatedFoodData from "../data/foodData.generated.json";

import { PrefMapWithIcons, type PlacementsByPref } from "../components/PrefMapWithIcons";
import { prefToCode } from "../data/prefNameToCode";

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

  const q = query.trim().toLowerCase();

  const matchedFoods = useMemo(() => {
    return foodData.filter(
      (food) => food.name.toLowerCase().includes(q) || food.kana?.toLowerCase().includes(q)
    );
  }, [q]);

  // 右のカード hover で県切替
  const [hoverPrefCode, setHoverPrefCode] = useState<string>("tokyo");

  // placements 読み込み（public/placements.json）
  const [placementsByPref, setPlacementsByPref] = useState<PlacementsByPref>({});

  useEffect(() => {
    // 最小構成：public/placements.json を読む
    fetch(`${import.meta.env.BASE_URL || "/"}placements.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json || !json.placementsByPref) return;
        setPlacementsByPref(json.placementsByPref);
      })
      .catch(() => {
        // まだファイルがない段階は無視
      });
  }, []);

  // 初期県：最初の検索結果の最初の地域の県に合わせる
  useEffect(() => {
    const first = matchedFoods[0]?.regions?.[0];
    const code = first ? prefToCode(first.prefecture) : null;
    if (code) setHoverPrefCode(code);
  }, [matchedFoods]);

  if (matchedFoods.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-4 py-4">
            <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft size={20} />
              戻る
            </Button>
          </div>
        </header>
        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">「{query}」の検索結果が見つかりませんでした</h2>
          <p className="text-gray-600 mb-8">別の特産品で検索してみてください</p>
          <Button onClick={() => navigate("/")}>ホームに戻る</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* ここは後でHomeのヘッダーに差し替え予定 */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft size={20} />
            戻る
          </Button>
          <div className="font-semibold">「{query}」の検索結果</div>
          <div className="text-sm text-gray-600">{matchedFoods.length}件</div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        {/* 2カラム：左 地図 / 右 結果 */}
        <div className="grid grid-cols-1 lg:grid-cols-[520px_1fr] gap-6 items-start">
          {/* 左：県地図（hoverで切替） */}
          <div className="lg:sticky lg:top-24">
            <div className="text-sm text-gray-600 mb-2">地図（地域にカーソルで県切替）</div>
            <PrefMapWithIcons
  prefCode={hoverPrefCode}
  placementsByPref={placementsByPref}
  activeFoodName={query} // ★ 検索クエリ名と一致したアイコンをハイライト
  onIconClick={(foodName) => {
    navigate(`/search?q=${encodeURIComponent(foodName)}`); // ★ クリックした名産へ検索切り替え
  }}
/>
          </div>

          {/* 右：検索結果（地域 + 料理写真） */}
          <div className="space-y-10">
            {matchedFoods.map((food) => (
              <section key={food.id} className="rounded-2xl border bg-white p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">{food.name}</h2>
                    <p className="text-sm text-gray-600 mt-1">名産地にカーソルを合わせると地図が切り替わります</p>
                  </div>

                  {/* 料理写真（最小：いったんプレースホルダ。後で差し替え） */}
                  <div className="hidden sm:block w-[180px] h-[110px] rounded-xl border bg-gray-50 overflow-hidden">
                    {/* ここを後で food.imageQuery → 写真に差し替え */}
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                      料理写真（後で）
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid md:grid-cols-2 gap-4">
                  {food.regions.map((region) => {
                    const code = prefToCode(region.prefecture);
                    return (
                      <Card
                        key={region.id}
                        className="p-4 cursor-pointer hover:shadow-md transition"
                        onMouseEnter={() => {
                          if (code) setHoverPrefCode(code);
                        }}
                        onFocus={() => {
                          if (code) setHoverPrefCode(code);
                        }}
                        onClick={() => navigate(`/map?food=${food.id}&region=${region.id}`)}
                        tabIndex={0}
                        title={region.prefecture}
                      >
                        <div className="font-bold text-lg">{region.name}</div>
                        <div className="text-sm text-gray-600">{region.prefecture}</div>
                        <div className="text-xs text-gray-500 mt-2 line-clamp-3">{region.description}</div>
                        <div className="mt-4">
                          <Button className="w-full">この地域の宿を探す</Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}