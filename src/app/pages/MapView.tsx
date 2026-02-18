import { useSearchParams, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Star, DollarSign, Hotel as HotelIcon, Navigation } from 'lucide-react';
import generatedFoodData from '../data/foodData.generated.json';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import AreaMap,{ PlaceItem } from '../components/AreaMap';

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
  imageQuery: string;
  regions: Region[];
};

const foodData = generatedFoodData as FoodItem[];

export default function MapView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const foodId = searchParams.get('food') || '';
  const regionId = searchParams.get('region') || '';


  const food = foodData.find((f) => f.id === foodId);
  const region = food?.regions.find((r) => r.id === regionId);

  const [restaurants, setRestaurants] = useState<PlaceItem[]>([]);
  const [lodgings, setLodgings] = useState<PlaceItem[]>([]);

  const [selected, setSelected] = useState<
  { lat: number; lng: number; title?: string; kind?: "restaurant" | "lodging" } | null
>(null);


  if (!food || !region) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">データが見つかりません</h2>
          <Button onClick={() => navigate('/')}>ホームに戻る</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="border-b bg-white sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft size={20} />
              戻る
            </Button>
            <div className="text-center flex-1">
              <h1 className="font-bold text-lg">{food.name} × {region.name}</h1>
              <p className="text-sm text-gray-600">{region.prefecture}</p>
            </div>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* 地図エリア */}
          <div className="lg:sticky lg:top-24 h-fit">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">Google Maps 検索結果</h2>
              
              {/* Google Map（店＋宿） */} 
              <AreaMap center={{ lat: region.lat, lng: region.lng }}
              foodKeyword={food.name} 
              radiusKm={10} 
              onRestaurants={setRestaurants}
              onLodgings={setLodgings}
              selected={selected ?? undefined}/>

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

              {/* 店舗リスト */}
              <div className="mt-6">
                <h3 className="font-bold mb-3">周辺の{food.name}店舗</h3>
                <div className="space-y-2">
                  {restaurants.map((r) => (
                    <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelected({ lat: r.lat, lng: r.lng, title: r.name, kind: "restaurant" })}
                    className="w-full text-left flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">

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
            </Card>
          </div>

          {/* 宿泊施設リスト */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">おすすめの宿泊施設</h2>
              <Badge variant="secondary" className="text-sm">
                {lodgings.length}件
              </Badge>
            </div>

            <div className="space-y-6">
             {lodgings.map((h, index) => (
                <Card
                key={h.id}
                className="overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setSelected({ lat: h.lat, lng: h.lng, title: h.name, kind: "lodging" })}>

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

                      <div className="pt-4 border-t">
                        <Button size="lg">詳細を見る</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
              {lodgings.length === 0 && (
                <p className="text-sm text-gray-500">宿泊施設が見つかりませんでした。</p>
              )}
            </div>

            {/* 注意事項 */}
            <Card className="mt-8 p-6 bg-yellow-50 border-yellow-200">
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <span className="text-yellow-600">⚠️</span>
                実装に関する注意
              </h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>• 店舗/宿泊施設は Google Places API の検索結果を表示しています</li>
                <li>• 名産地候補（地域一覧）のみデータセットに基づきます</li>

              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
