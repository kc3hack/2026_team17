import { useSearchParams, useNavigate } from 'react-router';
import { ArrowLeft, MapPin } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import generatedFoodData from '../data/foodData.generated.json';

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
  const query = searchParams.get('q') || '';

  const q = query.trim().toLowerCase();

  const matchedFoods = foodData.filter((food) => {
    // ① 料理名・かな検索
    const matchByFood =
      food.name.toLowerCase().includes(q) ||
      food.kana?.toLowerCase().includes(q);

    // ② 県名検索（regionsの中を見る）
    const matchByPrefecture = food.regions.some((region) =>
      region.prefecture.toLowerCase().includes(q)
    );

    return matchByFood || matchByPrefecture;
  });

  if (matchedFoods.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <header className="border-b bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <Button
              variant="ghost"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft size={20} />
              戻る
            </Button>
          </div>
        </header>

        <div className="container mx-auto px-4 py-20 text-center">
          <h2 className="text-2xl font-bold mb-4">
            「{query}」の検索結果が見つかりませんでした
          </h2>
          <p className="text-gray-600 mb-8">
            別の特産品や県名で検索してみてください
          </p>
          <Button onClick={() => navigate('/')}>ホームに戻る</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* ヘッダー */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft size={20} />
            戻る
          </Button>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold mb-2">
              「{query}」の検索結果
            </h1>
            <p className="text-gray-600">
              {matchedFoods.length}件見つかりました
            </p>
          </div>

          <div className="space-y-12">
            {matchedFoods.map((food) => {
              const regionsToShow = food.regions.filter((region) => {
                // 県名検索時はその県だけ表示
                if (
                  region.prefecture.toLowerCase().includes(q)
                ) {
                  return true;
                }

                // 料理名検索時は全部表示
                if (
                  food.name.toLowerCase().includes(q) ||
                  food.kana?.toLowerCase().includes(q)
                ) {
                  return true;
                }

                return false;
              });

              return (
                <section
                  key={food.id}
                  className="bg-white/60 rounded-2xl p-6 shadow-sm"
                >
                  <div className="text-center mb-8">
                    <div className="flex justify-center mb-4">
                      <img
                        src={getFoodImage(food)}
                        alt={food.name}
                        className="w-48 h-48 object-cover rounded-xl shadow"
                        onError={(e) => {
                          e.currentTarget.src = '/images/noimage.jpg';
                        }}
                      />
                    </div>

                    <h2 className="text-3xl font-bold mb-2">
                      {food.name}
                    </h2>
                    <p className="text-gray-600">
                      {food.name}の名産地を選択してください
                    </p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {regionsToShow.map((region) => (
                      <Card
                        key={region.id}
                        className="p-8 cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1"
                        onClick={() =>
                          navigate(
                            `/map?food=${food.id}&region=${region.id}`
                          )
                        }
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <MapPin
                              className="text-blue-600"
                              size={24}
                            />
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
                          <Button className="w-full">
                            この地域の宿を探す
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

function getFoodImage(food: FoodItem): string {
  return `/images/${food.imageQuery}.jpg`;
}
