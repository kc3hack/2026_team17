import { useSearchParams, useNavigate, useLocation } from "react-router";
import { useMemo, useState, useEffect } from "react";
import { AppHeader } from "../components/AppHeader";
import {
  MapPin,
  Star,
  ChevronDown,
  ChevronUp, 
  ArrowLeft,
} from "lucide-react";
import generatedFoodData from "../data/foodData.generated.json";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import AreaMap, { PlaceItem } from "../components/AreaMap";


type Region = {
  id: string;
  name: string;
  prefecture: string;
  description: string;
  lat: number;
  lng: number;
};

type FoodItem = {
  id: string;
  name: string;
  kana?: string;
  imageQuery: string;
  tags?: string[];
  regions: Region[];
};

const foodData = generatedFoodData as FoodItem[];


// ▼ 件数設定
const MAX_RESTAURANTS = 20;
const MAX_LODGINGS = 20;
const MAX_NEARBY_FOODS = 2;

// ▼ 店舗検索半径（地図用）
const SEARCH_RADIUS_KM = 10;


function extractCityFromRegionParam(regionParam: string) {
  if (!regionParam) return "";
  const parts = regionParam.split("-");
  return parts.length >= 2 ? parts[parts.length - 1] : regionParam;
}

function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(x));
}

export default function MapView() {
  const [searchParams] = useSearchParams();
  const location = useLocation() as { state?: { from?: string } };
const navigate = useNavigate();

const handleBack = () => {
  const from = location.state?.from;
  if (from) navigate(from);
  else navigate(-1);
};

  // ✅ 新旧どっちのクエリにも対応
const foodId =
  searchParams.get("foodId") || searchParams.get("food") || "";

const regionId =
  searchParams.get("regionId") || searchParams.get("region") || "";

// ✅ food は id で引く
const food = foodData.find((f) => f.id === foodId);

// ✅ region は基本 id で引く（これが一番壊れない）
let region = food?.regions.find((r) => r.id === regionId);

// 旧仕様（region=xxx-市名 の名残）にも一応対応
if (!region && food && regionId) {
  const cityName = extractCityFromRegionParam(regionId);
  region = food.regions.find((r) => r.name === cityName);
}

// それでも無いなら先頭
region = region ?? food?.regions[0];

  const [restaurants, setRestaurants] = useState<PlaceItem[]>([]);
  const [lodgings, setLodgings] = useState<PlaceItem[]>([]);

  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [loadingLodgings, setLoadingLodgings] = useState(false);

  const [selected, setSelected] = useState<{
    id: string;
    lat: number;
    lng: number;
    title?: string;
    kind?: "restaurant" | "lodging";
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>(
    () => food?.name ?? ""
  );

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const [openedNearbyFoodIds, setOpenedNearbyFoodIds] = useState<string[]>([]);
  const [nearbyRestaurantsByFood, setNearbyRestaurantsByFood] = useState<
    Record<string, PlaceItem[]>
  >({});

  const [fetchFoodId, setFetchFoodId] = useState<string | null>(null);

  const fetchFoodKeyword = useMemo(() => {
    if (!fetchFoodId) return "";
    return foodData.find((x) => x.id === fetchFoodId)?.name ?? "";
  }, [fetchFoodId]);

  if (!food || !region) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">データが見つかりません</h2>
          <Button onClick={() => navigate("/")}>ホームに戻る</Button>
        </div>
      </div>
    );
  }

    const regionSafe = region;

  // ▼ 検索条件が変わったら即ローディング表示にする
  useEffect(() => {
    setLoadingRestaurants(true);
    setLoadingLodgings(true);
    setRestaurants([]);
    setLodgings([]);
  }, [foodId, regionSafe.lat, regionSafe.lng]);

  const nearbyFoods = useMemo(() => {
    return foodData
      .filter((f) => f.id !== foodId)
      .filter((f) =>
        f.regions.some((rr) => {
          const samePref = rr.prefecture === regionSafe.prefecture;
          const near =
            distanceKm(
              { lat: regionSafe.lat, lng: regionSafe.lng },
              { lat: rr.lat, lng: rr.lng }
            ) <= 5; // ← 近くの料理の検索範囲：5km
          return samePref && near;
        })
      )
      .slice(0, MAX_NEARBY_FOODS);
  }, [
    foodId,
    regionSafe.lat,
    regionSafe.lng,
    regionSafe.prefecture,
  ]);

  const yellowPinStores: PlaceItem[] = useMemo(() => {
    const pins: PlaceItem[] = [];
    for (const id of openedNearbyFoodIds) {
      const items = nearbyRestaurantsByFood[id];
      if (items) pins.push(...items);
    }

    const seen = new Set<string>();
    return pins.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [openedNearbyFoodIds, nearbyRestaurantsByFood]);

  return (
    <div className="min-h-screen bg-red-50">
    <AppHeader value={searchQuery} onChange={setSearchQuery} onSearch={handleSearch} />

      {/* サブバー */}
      <div className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={handleBack} className="gap-2">
              <ArrowLeft size={20} />
              戻る
            </Button>
            <div className="w-20" />
          </div>
        </div>
      </div>
  

      <main className="container mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1.4fr_1.05fr_1.0fr] gap-4">

          {/* ---------- 左：地図＋近くの料理 ---------- */}
          <div className="flex flex-col gap-4 h-[calc(100vh-120px)]">

            {/* ---------- 地図 ---------- */}
            <Card className="p-3 flex flex-col flex-[7] min-h-0 border border-black bg-white rounded-xl">
              <h2 className="text-sm font-bold mb-2 text-red-900">
                周辺マップ
              </h2>

              <div className="flex-1 min-h-0 overflow-hidden rounded-lg border">
                <AreaMap
                  center={{
                    lat: regionSafe.lat,
                    lng: regionSafe.lng,
                  }}
                  foodKeyword={food.name}
                  radiusKm={SEARCH_RADIUS_KM}
                  onRestaurants={(items) => {
                    setRestaurants(items.slice(0, MAX_RESTAURANTS));
                    setLoadingRestaurants(false);
                  }}
                  onLodgings={(items) => {
                    setLodgings(items.slice(0, MAX_LODGINGS));
                    setLoadingLodgings(false);
                  }}
                  selected={selected ?? undefined}
                  nearbyStorePins={yellowPinStores}
                  fetchFoodId={fetchFoodId}
                  fetchFoodKeyword={fetchFoodKeyword}
                  onNearbyFoodRestaurants={(id, items) => {
                    setNearbyRestaurantsByFood((prev) => ({
                      ...prev,
                      [id]: items,
                    }));
                    setFetchFoodId((cur) => (cur === id ? null : cur));
                  }}
                />
              </div>
            </Card>

            {/* ---------- 近くの料理 ---------- */}
            <Card className="p-3 flex flex-col flex-[3] min-h-0 border border-black bg-white rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-sm text-red-900">
                  近くの料理
                </h4>
                <Badge variant="secondary">
                  {nearbyFoods.length}件
                </Badge>
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2">
                {nearbyFoods.map((f) => {
                  const isOpen = openedNearbyFoodIds.includes(f.id);
                  const items = nearbyRestaurantsByFood[f.id] ?? [];

                  return (
                    <Card
                      key={f.id}
                      className="p-2 border border-black/10"
                    >
                      <button
                        type="button"
                        className="w-full flex items-center justify-between text-left"
                        onClick={() => {
                          setOpenedNearbyFoodIds((prev) => {
                            const open = prev.includes(f.id);
                            const next = open
                              ? prev.filter((id) => id !== f.id)
                              : [...prev, f.id];

                            if (
                              !open &&
                              nearbyRestaurantsByFood[f.id] === undefined
                            ) {
                              setFetchFoodId(f.id);
                            }

                            return next;
                          });
                        }}
                      >
                        <span className="text-sm font-medium">
                          {f.name}
                        </span>
                        {isOpen ? (
                          <ChevronUp size={16} />
                        ) : (
                          <ChevronDown size={16} />
                        )}
                      </button>

                      {isOpen && (
                        <div className="mt-2 space-y-1">
                          {items.map((r) => (
                            <button
                              key={r.id}
                              className="w-full text-left text-xs p-2 bg-red-50 rounded hover:bg-red-100"
                              onClick={() =>
                                setSelected({
                                  id: r.id,
                                  lat: r.lat,
                                  lng: r.lng,
                                  title: r.name,
                                  kind: "restaurant",
                                })
                              }
                            >
                              {r.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* ---------- 周辺の店舗 ---------- */}
          <Card className="p-3 flex flex-col h-[calc(100vh-120px)] border border-black bg-white rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-red-900">
                周辺の{food.name}店舗
              </h3>
              <Badge variant="secondary">
                {restaurants.length}件
              </Badge>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2">
              {loadingRestaurants && (
                <div className="text-sm text-gray-500 p-2">
                  検索中…
                </div>
              )}

              {!loadingRestaurants &&
                restaurants.map((r) => (
                  <Card
                    key={r.id}
                    className="p-2 cursor-pointer hover:shadow border border-black/20 rounded-xl bg-white"
                    onClick={() =>
                      setSelected({
                        id: r.id,
                        lat: r.lat,
                        lng: r.lng,
                        title: r.name,
                        kind: "restaurant",
                      })
                    }
                  >
                    {/* 1行目：店名（左）＋レビュー（右） */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium leading-snug line-clamp-2">
                        {r.name}
                      </div>

                      {typeof r.rating === "number" && (
                        <div className="flex items-center gap-1 text-xs text-gray-700 shrink-0">
                          <Star size={12} className="fill-yellow-400 text-yellow-400" />
                          <span>{r.rating}</span>
                        </div>
                      )}
                    </div>

                    {/* 2行目：住所（詰める） */}
                    <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.25">
                      <MapPin size={12} />
                      <span className="line-clamp-1 leading-snug">
                        {r.address ?? "住所情報なし"}
                      </span>
                    </div>

                    {/* ボタン：上の余白を小さく */}
                    <a
                      href={`https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(
                        r.id
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="block mt-0.25"
                    >
                      <Button size="sm" className="w-full h-8">
                        Googleマップで開く
                      </Button>
                    </a>
                  </Card>
                ))}
            </div>
          </Card>

          {/* ---------- 宿泊施設 ---------- */}
          <Card className="p-3 flex flex-col h-[calc(100vh-120px)] border border-black bg-white rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-sm text-red-900">おすすめの宿泊施設</h3>
              <Badge variant="secondary">{lodgings.length}件</Badge>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2">
              {loadingLodgings && (
                <div className="text-sm text-gray-500 p-2">検索中…</div>
              )}

              {!loadingLodgings &&
                lodgings.map((h) => (
                  <Card
                    key={h.id}
                    className="p-2 cursor-pointer hover:shadow border border-black/20 rounded-xl bg-white"
                    onClick={() =>
                      setSelected({
                        id: h.id,
                        lat: h.lat,
                        lng: h.lng,
                        title: h.name,
                        kind: "lodging",
                      })
                    }
                  >
                    {/* 1行目：宿名（左）＋レビュー（右） ※店舗と同じ感じに */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-medium leading-snug line-clamp-2">
                        {h.name}
                      </div>

                      {typeof h.rating === "number" && (
                        <div className="flex items-center gap-1 text-xs text-gray-700 shrink-0">
                          <Star size={12} className="fill-yellow-400 text-yellow-400" />
                          <span>{h.rating}</span>
                        </div>
                      )}
                    </div>

                    {/* 2行目：住所（詰める） */}
                    <div className="flex items-center gap-1 text-xs text-gray-600 mt-0.25">
                      <MapPin size={12} />
                      <span className="line-clamp-1 leading-snug">
                        {h.address ?? "住所情報なし"}
                      </span>
                    </div>

                    {/* ボタン：店舗と同じ高さに固定 */}
                    <a
                      href={`https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(
                        h.id
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="block mt-0.25"
                    >
                      <Button size="sm" className="w-full h-8">
                        Googleマップで開く
                      </Button>
                    </a>
                  </Card>
                ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}