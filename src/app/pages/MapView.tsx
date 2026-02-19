import { useSearchParams, useNavigate } from "react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Star,
  Hotel as HotelIcon,
  Navigation,
  ChevronDown,
  ChevronUp,
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
  regions: Region[];
};

const foodData = generatedFoodData as FoodItem[];

/** region param が "味噌ラーメン-札幌市" みたいでも、市区町村部分だけ抽出 */
function extractCityFromRegionParam(regionParam: string) {
  if (!regionParam) return "";
  const parts = regionParam.split("-");
  return parts.length >= 2 ? parts[parts.length - 1] : regionParam;
}

// --- 距離(km)（haversine） ---
function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
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

function mapsUrlFromPlaceId(placeId?: string, fallbackQuery?: string) {
  if (placeId && placeId.trim()) {
    return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(
      placeId
    )}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    fallbackQuery ?? ""
  )}`;
}

export default function MapView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const foodId = searchParams.get("food") || "";
  const regionParam = searchParams.get("region") || "";
  const cityName = extractCityFromRegionParam(regionParam);

  const food = foodData.find((f) => f.id === foodId);
  const region =
    food?.regions.find((r) => r.name === cityName) ?? food?.regions[0];

  const [restaurants, setRestaurants] = useState<PlaceItem[]>([]);
  const [lodgings, setLodgings] = useState<PlaceItem[]>([]);

  const [selected, setSelected] = useState<
  { id: string; lat: number; lng: number; title?: string; kind?: "restaurant" | "lodging" } | null
>(null);


  // ✅ 近くの料理：展開状態
  const [openedNearbyFoodIds, setOpenedNearbyFoodIds] = useState<string[]>([]);

  // ✅ 近くの料理：料理ごとの店舗結果（メイン店舗とは別）
  const [nearbyRestaurantsByFood, setNearbyRestaurantsByFood] = useState<
    Record<string, PlaceItem[]>
  >({});

  // ✅ AreaMap に「この料理で店舗検索して」を依頼するための state
  const [fetchFoodId, setFetchFoodId] = useState<string | null>(null);

  const fetchFoodKeyword = useMemo(() => {
    if (!fetchFoodId) return "";
    return foodData.find((x) => x.id === fetchFoodId)?.name ?? "";
  }, [fetchFoodId]);

  if (!food || !region) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">データが見つかりません</h2>
          <Button onClick={() => navigate("/")}>ホームに戻る</Button>
        </div>
      </div>
    );
  }

  const regionSafe = region;

  // ✅ 近くの料理候補（例：同じ都道府県 + 50km以内）
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
            ) <= 50;
          return samePref && near;
        })
      )
      .slice(0, 8);
  }, [foodId, regionSafe.lat, regionSafe.lng, regionSafe.prefecture]);

  // ✅ 黄色ピンにする店舗（「展開中の料理」の店舗だけ）
  const yellowPinStores: PlaceItem[] = useMemo(() => {
    const pins: PlaceItem[] = [];
    for (const id of openedNearbyFoodIds) {
      const items = nearbyRestaurantsByFood[id];
      if (items && items.length > 0) pins.push(...items);
    }
    // 同じplace_idが重複する可能性があるので一応ユニーク化
    const seen = new Set<string>();
    return pins.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [openedNearbyFoodIds, nearbyRestaurantsByFood]);

  // ✅ lodgings の中身を確認したい（必要ならコメント外してOK）
  // console.log("lodgings sample", lodgings[0]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
              <ArrowLeft size={20} />
              戻る
            </Button>

            <div className="text-center flex-1">
              <h1 className="font-bold text-lg">
                {food.name} × {regionSafe.name}
              </h1>
              <p className="text-sm text-gray-600">{regionSafe.prefecture}</p>
            </div>

            <div className="w-20" />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* 左：地図＋店舗＋近くの料理 */}
          <div className="lg:sticky lg:top-24 h-fit">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Google Maps 検索結果</h2>

              <AreaMap
                center={{ lat: regionSafe.lat, lng: regionSafe.lng }}
                foodKeyword={food.name}
                radiusKm={10}
                onRestaurants={setRestaurants}
                onLodgings={setLodgings}
                selected={selected ?? undefined}
                nearbyStorePins={yellowPinStores}
                fetchFoodId={fetchFoodId}
                fetchFoodKeyword={fetchFoodKeyword}
                onNearbyFoodRestaurants={(id, items) => {
                  setNearbyRestaurantsByFood((prev) => ({ ...prev, [id]: items }));
                  setFetchFoodId((cur) => (cur === id ? null : cur));
                }}
              />

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Navigation className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-bold mb-1">取得状況</h3>
                    <p className="text-sm text-gray-700">
                      {restaurants.length}件の{food.name}店舗が密集するエリアを検出しました。
                      半径約1km圏内に{lodgings.length}件の宿泊施設があります。
                    </p>
                  </div>
                </div>
              </div>

              {/* 周辺の（メイン）店舗リスト */}
              <div className="mt-6">
                <h3 className="font-bold mb-3">周辺の{food.name}店舗</h3>
                <div className="space-y-2">
                  {restaurants.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() =>
                        setSelected({ id: r.id, lat: r.lat, lng: r.lng, title: r.name, kind: "restaurant" })                  
                      }
                      className="w-full text-left flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                    >
                      <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                        店
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{r.name}</p>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Star size={14} className="fill-yellow-400 text-yellow-400" />
                          <span>{r.rating}</span>
                        </div>
                      </div>
                    </button>
                  ))}
                  {restaurants.length === 0 && (
                    <p className="text-sm text-gray-500">店舗が見つかりませんでした。</p>
                  )}
                </div>
              </div>

              {/* ✅ 近くの料理 */}
              <div className="mt-8">
                <h3 className="font-bold mb-3">近くにはこんな料理もあります</h3>

                <div className="space-y-3">
                  {nearbyFoods.map((f) => {
                    const isOpen = openedNearbyFoodIds.includes(f.id);
                    const hasFetched = nearbyRestaurantsByFood[f.id] !== undefined;
                    const items = nearbyRestaurantsByFood[f.id] ?? [];

                    return (
                      <Card key={f.id} className="p-4">
                        <button
                          type="button"
                          className="w-full flex items-center justify-between gap-3 text-left"
                          onClick={() => {
                            setOpenedNearbyFoodIds((prev) => {
                              const open = prev.includes(f.id);
                              const next = open ? prev.filter((id) => id !== f.id) : [...prev, f.id];

                              if (!open && nearbyRestaurantsByFood[f.id] === undefined) {
                                setFetchFoodId(f.id);
                              }
                              return next;
                            });
                          }}
                        >
                          <div>
                            <div className="font-bold text-base">{f.name}</div>
                            <div className="text-sm text-gray-600">
                              {regionSafe.prefecture} / {regionSafe.name}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-gray-600">
                            <span className="text-sm">{isOpen ? "閉じる" : "店舗を見る"}</span>
                            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </button>

                        {isOpen && (
                          <div className="mt-4 space-y-2">
                            {!hasFetched && <p className="text-sm text-gray-500">店舗を検索中...</p>}

                            {hasFetched && items.length === 0 && (
                              <p className="text-sm text-gray-500">店舗が見つかりませんでした。</p>
                            )}

                            {items.map((r) => (
                              <button
                                key={r.id}
                                type="button"
                                onClick={() =>
                                  setSelected({ id: r.id, lat: r.lat, lng: r.lng, title: r.name, kind: "restaurant" })
                                  }
                                className="w-full text-left flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                              >
                                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
                                  近
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium">{r.name}</p>
                                  <div className="flex items-center gap-1 text-sm text-gray-600">
                                    <Star size={14} className="fill-yellow-400 text-yellow-400" />
                                    <span>{r.rating}</span>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </Card>
                    );
                  })}

                  {nearbyFoods.length === 0 && (
                    <p className="text-sm text-gray-500">
                      この地域で他の料理候補が見つかりませんでした。
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* 右：宿泊施設リスト */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">おすすめの宿泊施設</h2>
              <Badge variant="secondary" className="text-sm">
                {lodgings.length}件
              </Badge>
            </div>

            <div className="space-y-6">
              {lodgings.map((h, index) => {
                const url = mapsUrlFromPlaceId(h.id, `${h.name} ${h.address ?? ""}`);

                return (
                  <Card
                    key={h.id}
                    className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                    onClick={() => {
                      console.log("[CARD CLICK] move map to:", h.name, h.id);
                    setSelected({ id: h.id, lat: h.lat, lng: h.lng, title: h.name, kind: "lodging" })
                    }}
                  >
                    <div className="grid md:grid-cols-5 gap-4">
                      <div className="md:col-span-2 h-48 md:h-auto bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <HotelIcon size={48} className="text-gray-400" />
                      </div>

                      <div className="md:col-span-3 p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-bold mb-1">{h.name}</h3>

                            {typeof h.rating === "number" && (
                              <div className="flex items-center gap-2 mb-2">
                                <div className="flex items-center gap-1">
                                  <Star size={16} className="fill-yellow-400 text-yellow-400" />
                                  <span className="font-medium">{h.rating}</span>
                                </div>
                                <span className="text-gray-400">•</span>
                                <span className="text-sm text-gray-600">
                                  中心から徒歩{5 + index * 2}分（仮）
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-3 text-gray-600">
                          <MapPin size={16} />
                          <span className="text-sm">{h.address ?? "住所情報なし"}</span>
                        </div>

                        <div className="pt-4 border-t flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log("[MAP BUTTON] move map to:", h.name, h.id);
                              setSelected({ id: h.id, lat: h.lat, lng: h.lng, title: h.name, kind: "lodging" })
                            }}
                          >
                            地図で見る
                          </Button>

                          <a
                            href={`https://www.google.com/maps/place/?q=place_id:${encodeURIComponent(h.id)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => {
                              e.stopPropagation();

                              const url = `https://www.google.com/maps/place/?q=place_id:${h.id}`;
                              console.log("🔍 詳細リンクURL:", url);
                              console.log("🔍 place_id:", h.id);
                            }}
                          >
                            <Button size="lg">詳細を見る</Button>
                          </a>


                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}

              {lodgings.length === 0 && (
                <p className="text-sm text-gray-500">宿泊施設が見つかりませんでした。</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
