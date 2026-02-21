// src/app/pages/SearchResults.tsx
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




function norm(s: string) {
  return (s ?? "").trim().toLowerCase();
}

// 「自由軒カレー」みたいな文字列を、foodDataに存在する検索キーへ寄せる
function resolveFoodQuery(raw: string, foods: FoodItem[]): string {
  const src = norm(raw);
  if (!src) return raw;

  // raw の中に含まれる food.name を探して「一番長い一致」を採用
  // 例: "自由軒カレー" の中に "カレー" が含まれる → "カレー"
  let best: string | null = null;

  for (const f of foods) {
    const name = (f.name ?? "").trim();
    if (!name) continue;

    const nameLower = norm(name);
    if (src.includes(nameLower)) {
      if (best === null || name.length > best.length) best = name;
    }
  }

  return best ?? raw;
}

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get("q") || "";
  const prefParam = searchParams.get("pref") || "";

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

  const [lockedPrefCode, setLockedPrefCode] = useState<string | null>(null);

  // 左の地図の表示県（hover/focus で切替）
  const [hoverPrefCode, setHoverPrefCode] = useState<string>("tokyo");

  const effectivePrefCode = lockedPrefCode ?? hoverPrefCode;

  // placements 読み込み（public/placements.json）
  const [placementsByPref, setPlacementsByPref] = useState<PlacementsByPref>({});

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL || "/"}placements.json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json || !json.placementsByPref) return;
        setPlacementsByPref(json.placementsByPref);
      })
      .catch(() => {});
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

        if (matchByPrefecture) return true; // 県名検索ならその県だけ
        if (matchByFood) return true; // 料理名検索なら全部
        return false;
      });

      map.set(food.id, regionsToShow);
    });

    return map;
  }, [matchedFoods, query]);

  // ★「3) クリックした県を最初に表示」対応
  useEffect(() => {
    // ① アイコンクリックで渡された県(pref=tokyo等)を最優先
    if (prefParam) {
      setHoverPrefCode(prefParam);
      return;
    }

    // ② それ以外は従来通り：データセット先頭の地域に合わせる
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
  }, [prefParam, matchedFoods, regionsToShowByFoodId]);

  // ★「1) 丸い円」「2) 検索用の名前」対応のキー（queryそのままではなく丸めたキー）
  const activeKey = useMemo(() => resolveFoodQuery(query, foodData), [query]);

  return (
    // ✅ Home と同じ背景色
    <div className="min-h-screen bg-red-50"
    onClick={() => setLockedPrefCode(null)}>
      <AppHeader
  value={searchQuery}
  onChange={setSearchQuery}
  onSearch={handleSearch}
  
/>

      {/* サブバー（戻る＋件数） */}
      <div className="border-b border-black/10 bg-white/80 backdrop-blur-sm">
        <div className="w-full px-2 sm:px-3 md:px-4 py-3">
          <div className="flex items-center justify-between gap-3">

            <div className="text-center flex-1">
              <h1 className="font-bold text-lg text-red-900">「{query}」の検索結果</h1>
              <p className="text-sm text-gray-600">{matchedFoods.length}件見つかりました</p>
            </div>

            <div className="w-20" />
          </div>
        </div>
      </div>

      {/* メイン（Homeに合わせて py-8 / 余白広め） */}
      <main className="w-full px-2 sm:px-3 md:px-4 py-6">
        {matchedFoods.length === 0 ? (
          <div className="py-20 text-center">
            <h2 className="text-2xl font-bold mb-4 text-red-900">
              「{query}」の検索結果が見つかりませんでした
            </h2>
            <p className="text-gray-600 mb-8">別の料理名や県名で検索してみてください</p>
            <Button onClick={() => navigate("/")}>ホームに戻る</Button>
          </div>
        ) : (
          // ✅ 地図を大きく（左カラム幅を増やす）
          <div className="grid grid-cols-1 lg:grid-cols-[720px_1fr] gap-6 items-start">
            {/* 左：県地図（hoverで切替） */}
            <div className="lg:sticky lg:top-[140px]">
              <div className="text-sm font-bold text-gray-800 mb-2">
  地図
  <span className="ml-2 text-gray-500 font-normal">
    （地域にカーソルで県切替）
  </span>
</div>

              <PrefMapWithIcons
                prefCode={hoverPrefCode}
                placementsByPref={placementsByPref}
                activeFoodKey={activeKey} // ★円の判定に使う（検索用キー）
                onIconClick={(clickedName: string, clickedPrefCode: string) => {
                  // ★正式名称を検索キーへ丸める
                  const q = resolveFoodQuery(clickedName, foodData);
                  // ★クリックした県を pref= で渡して初期表示県にする
                  navigate(
                    `/search?q=${encodeURIComponent(q)}&pref=${encodeURIComponent(clickedPrefCode)}`
                  );
                }}
                className="rounded-xl border border-black/10 bg-white overflow-hidden"
              />
            </div>

            {/* 右：検索結果 */}
            <div
  className="space-y-10"
  onClick={() => {
    setLockedPrefCode(null);
  }}
>
              {matchedFoods.map((food) => {
                const regionsToShow = regionsToShowByFoodId.get(food.id) ?? [];
                if (regionsToShow.length === 0) return null;

                return (
                  <section key={food.id} className="rounded-2xl border border-black/10 bg-white p-5">
                    <div className="flex items-end justify-between gap-4">
                      <div>
                        <h2 className="text-5xl font-extrabold text-red-900 leading-tight">{food.name}</h2>
                        <p className="text-sm text-gray-600 mt-1">
                          名産地にカーソルを合わせると地図が切り替わります
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                          カードをクリックすることで名産地を固定できます</p>
                        
                      </div>

                      {/* 写真 */}
<div className="w-[40vw] max-w-[720px] h-[260px] rounded-2xl border border-black/10 bg-gray-50 overflow-hidden shrink-0">
  <img
    src={getFoodImage(food)}
    alt={food.name}
    className="w-full h-full object-cover"
    onError={(e) => {
      e.currentTarget.style.display = "none";
    }}
  />
  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
    料理写真（未設定）
  </div>
</div>
                    </div>

                    <div className="mt-5 grid md:grid-cols-2 gap-4">
                      {regionsToShow.map((region) => {
                        const code = prefToCode(region.prefecture);
                        const isLocked = !!lockedPrefCode && code === lockedPrefCode;

                        return (
                          <Card
  key={region.id}
  className={[
    "p-4 cursor-pointer transition",
    isLocked ? "ring-4 ring-black shadow-xl" : "hover:shadow-md",
  ].join(" ")}
  onMouseEnter={() => {
    if (lockedPrefCode) return;
    if (code) setHoverPrefCode(code);
  }}
  onFocus={() => {
    if (lockedPrefCode) return;
    if (code) setHoverPrefCode(code);
  }}
  onClick={(e) => {
    e.stopPropagation();
    if (!code) return;
    setLockedPrefCode((prev) => (prev === code ? null : code));
  }}
  tabIndex={0}
>
  {/* 1段目 */}
  <div className="text-2xl font-black text-red-700">
    {region.description && region.description.trim() !== ""
      ? region.description
      : food.name}
  </div>

  {/* 2段目 */}
  <div className="mt-1 text-lg font-semibold text-gray-900">
    {region.name}
    <span className="text-gray-500 text-sm ml-2">
      | {region.prefecture}
    </span>
  </div>

  <div className="mt-4">
   <Button
  type="button"
  className="
    w-full h-10
    bg-gray-900 text-white
    border border-transparent
    transition-all duration-200
    hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-lg
    active:translate-y-0 active:shadow-md active:bg-gray-900
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2
  "
  onClick={(e) => {
    e.stopPropagation();
    navigate(
      `/map?foodId=${encodeURIComponent(food.id)}&regionId=${encodeURIComponent(region.id)}`
    );
  }}
>
  <span className="inline-flex items-center justify-center gap-2">
    この地域の宿を探す
    <span className="transition-transform duration-200 group-hover:translate-x-0.5">→</span>
  </span>
</Button>
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