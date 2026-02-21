import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";
import { AppHeader } from "../components/AppHeader";
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

  // 検索欄用（共通ヘッダー）
  const [searchQuery, setSearchQuery] = useState<string>(() => query);

  useEffect(() => {
    setSearchQuery(query);
  }, [query]);

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  // 右のカード hover/focus で県切替
  const [hoverPrefCode, setHoverPrefCode] = useState<string>("tokyo");

  // placements 読み込み（public/placements.json）
  const [placementsByPref, setPlacementsByPref] = useState<PlacementsByPref>({});

  useEffect(() => {
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

  // -----------------------------
  // 料理名 / かな / 県名 すべて対応
  // -----------------------------
  const matchedFoods = useMemo(() => {
    const q = query.trim();
    if (!q) return [];

    const qLower = q.toLowerCase();

    return foodData.filter((food) => {
      const matchByFood =
        food.name.toLowerCase().includes(qLower) ||
        (food.kana ?? "").toLowerCase().includes(qLower);

      const matchByPrefecture = food.regions.some((region) =>
        region.prefecture.toLowerCase().includes(qLower)
      );

      return matchByFood || matchByPrefecture;
    });
  }, [query]);

  // 「県名検索ならその県だけ」「料理名検索なら全部」を、foodごとに計算
  const regionsToShowByFoodId = useMemo(() => {
    const q = query.trim();
    const qLower = q.toLowerCase();

    const map = new Map<string, Region[]>();

    matchedFoods.forEach((food) => {
      const matchByFood =
        food.name.toLowerCase().includes(qLower) ||
        (food.kana ?? "").toLowerCase().includes(qLower);

      const regionsToShow = food.regions.filter((region) => {
        const matchByPrefecture = region.prefecture.toLowerCase().includes(qLower);

        // 県名検索ならその県だけ
        if (matchByPrefecture) return true;

        // 料理名検索なら全部表示
        if (matchByFood) return true;

        return false;
      });

      map.set(food.id, regionsToShow);
    });

    return map;
  }, [matchedFoods, query]);

  // 初期県：最初に「表示対象」になる地域の県に合わせる
  useEffect(() => {
    for (const food of matchedFoods) {
      const regionsToShow = regionsToShowByFoodId.get(food.id) ?? [];
      const first = regionsToShow[0];
      if (!first) continue;

      const code = prefToCode(first.prefecture);
      if (code) {
        setHoverPrefCode(code);
        break;
      }
    }
  }, [matchedFoods, regionsToShowByFoodId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* 共通ヘッダー */}
      <AppHeader value={searchQuery} onChange={setSearchQuery} onSearch={handleSearch} />

      {/* サブバー */}
      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft size={20} />
              戻る
            </Button>

            <div className="text-center flex-1">
              <h1 className="font-bold text-lg">「{query}」の検索結果</h1>
              <p className="text-sm text-gray-600">{matchedFoods.length}件見つかりました</p>
            </div>

            <div className="w-20" />
          </div>
        </div>
      </div>

      {/* メイン */}
      <main className="container mx-auto px-4 py-6">
        {matchedFoods.length === 0 ? (
          <div className="py-20 text-center">
            <h2 className="text-2xl font-bold mb-4">「{query}」の検索結果が見つかりませんでした</h2>
            <p className="text-gray-600 mb-8">別の料理名や県名で検索してみてください</p>
            <Button onClick={() => navigate("/")}>ホームに戻る</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[520px_1fr] gap-6 items-start">
            {/* 左：県地図（hoverで切替） */}
            <div className="lg:sticky lg:top-24">
              <div className="text-sm text-gray-600 mb-2">地図（地域にカーソルで県切替）</div>

              <PrefMapWithIcons
  prefCode={hoverPrefCode}
  placementsByPref={placementsByPref}
  activeFoodName={query}
  onIconClick={(foodName) => {
    navigate(`/search?q=${encodeURIComponent(foodName)}`);
  }}
/>
            </div>

            {/* 右：検索結果 */}
            <div className="space-y-10">
              {matchedFoods.map((food) => {
                const regionsToShow = regionsToShowByFoodId.get(food.id) ?? [];

                // 念のため空になった場合は表示しない
                if (regionsToShow.length === 0) return null;

                return (
                  <section key={food.id} className="rounded-2xl border bg-white p-5">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold">{food.name}</h2>
                        <p className="text-sm text-gray-600 mt-1">
                          名産地にカーソルを合わせると地図が切り替わります
                        </p>
                      </div>

                      {/* 料理写真（相手側の要素も残す：無ければプレースホルダ） */}
                      <div className="hidden sm:block w-[180px] h-[110px] rounded-xl border bg-gray-50 overflow-hidden">
                        <img
                          src={getFoodImage(food)}
                          alt={food.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        {/* 画像が無い時の保険（imgが消えたら見える） */}
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                          料理写真（未設定）
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 grid md:grid-cols-2 gap-4">
                      {regionsToShow.map((region) => {
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
                            <div className="text-xs text-gray-500 mt-2 line-clamp-3">
                              {region.description}
                            </div>
                            <div className="mt-4">
                              <Button className="w-full">この地域の宿を探す</Button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function getFoodImage(food: FoodItem): string {
  // あなたのプロジェクト構成に合わせて調整OK
  // 例: public/images/xxx.jpg を想定
  return `/images/${food.imageQuery}.jpg`;
}