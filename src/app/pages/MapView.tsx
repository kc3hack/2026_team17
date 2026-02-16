import { useSearchParams, useNavigate } from 'react-router';
import { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Star, DollarSign, Hotel as HotelIcon, Navigation } from 'lucide-react';
import { foodData, mockRestaurants, mockHotels, Hotel } from '../data/foodData';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import AreaMap from '../components/AreaMap';


export default function MapView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const foodId = searchParams.get('food') || '';
  const regionId = searchParams.get('region') || '';

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);

  const food = foodData.find((f) => f.id === foodId);
  const region = food?.regions.find((r) => r.id === regionId);

  useEffect(() => {
    // クラスタリング分析をシミュレート
    setLoading(true);
    setTimeout(() => {
      setHotels(mockHotels);
      setLoading(false);
    }, 1500);
  }, [foodId, regionId]);

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
              <h2 className="text-xl font-bold mb-4">クラスタリング分析結果</h2>
              
              {/* Google Map（店＋宿） */} 
              <AreaMap center={{ lat: region.lat, lng: region.lng }}
              foodKeyword={food.name} 
              radiusKm={20} />

              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <Navigation className="text-blue-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <h3 className="font-bold mb-1">分析完了</h3>
                    <p className="text-sm text-gray-700">
                      {mockRestaurants.length}件の{food.name}店舗が密集するエリアを検出しました。
                      半径約1km圏内に{hotels.length}件の宿泊施設があります。
                    </p>
                  </div>
                </div>
              </div>

              {/* 店舗リスト */}
              <div className="mt-6">
                <h3 className="font-bold mb-3">周辺の{food.name}店舗</h3>
                <div className="space-y-2">
                  {mockRestaurants.map((restaurant) => (
                    <div key={restaurant.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                        店
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{restaurant.name}</p>
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Star size={14} className="fill-yellow-400 text-yellow-400" />
                          <span>{restaurant.rating}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>

          {/* 宿泊施設リスト */}
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">おすすめの宿泊施設</h2>
              <Badge variant="secondary" className="text-sm">
                {hotels.length}件
              </Badge>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="p-6 animate-pulse">
                    <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded mb-2 w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {hotels.map((hotel, index) => (
                  <Card key={hotel.id} className="overflow-hidden hover:shadow-xl transition-shadow">
                    <div className="grid md:grid-cols-5 gap-4">
                      <div className="md:col-span-2 h-48 md:h-auto bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                        <HotelIcon size={48} className="text-gray-400" />
                      </div>
                      <div className="md:col-span-3 p-6">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-xl font-bold mb-1">{hotel.name}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center gap-1">
                                <Star size={16} className="fill-yellow-400 text-yellow-400" />
                                <span className="font-medium">{hotel.rating}</span>
                              </div>
                              <span className="text-gray-400">•</span>
                              <span className="text-sm text-gray-600">
                                密集エリアから徒歩{5 + index * 2}分
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 mb-3 text-gray-600">
                          <MapPin size={16} />
                          <span className="text-sm">{hotel.address}</span>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t">
                          <div>
                            <div className="text-sm text-gray-600">1泊あたり</div>
                            <div className="text-2xl font-bold text-blue-600">
                              ¥{hotel.price.toLocaleString()}
                            </div>
                          </div>
                          <Button size="lg">
                            詳細を見る
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* 注意事項 */}
            <Card className="mt-8 p-6 bg-yellow-50 border-yellow-200">
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <span className="text-yellow-600">⚠️</span>
                実装に関する注意
              </h3>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>• 実際の地図表示にはGoogle Maps APIの統合が必要です</li>
                <li>• クラスタリング分析には実際の店舗データとアルゴリズムが必要です</li>
                <li>• 宿泊施設の予約には外部APIとの連携が必要です</li>
                <li>• 現在はモックデータを使用しています</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
