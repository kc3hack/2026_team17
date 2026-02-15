import { useSearchParams, useNavigate } from 'react-router';
import { ArrowLeft, MapPin } from 'lucide-react';
import { foodData } from '../data/foodData';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export default function SearchResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const query = searchParams.get('q') || '';

  // 検索クエリに一致する食べ物を検索
  const matchedFoods = foodData.filter((food) =>
    food.name.toLowerCase().includes(query.toLowerCase())
  );

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
          <h2 className="text-2xl font-bold mb-4">「{query}」の検索結果が見つかりませんでした</h2>
          <p className="text-gray-600 mb-8">別の特産品で検索してみてください</p>
          <Button onClick={() => navigate('/')}>ホームに戻る</Button>
        </div>
      </div>
    );
  }

  const food = matchedFoods[0];

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
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-8xl mb-6">{getEmoji(food.id)}</div>
            <h1 className="text-4xl font-bold mb-4">{food.name}</h1>
            <p className="text-xl text-gray-600">
              {food.name}の名産地を選択してください
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {food.regions.map((region) => (
              <Card
                key={region.id}
                className="p-6 cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1"
                onClick={() => navigate(`/map?food=${food.id}&region=${region.id}`)}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="text-blue-600" size={24} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{region.name}</h3>
                    <p className="text-gray-600 mb-3">{region.prefecture}</p>
                    <p className="text-sm text-gray-500">{region.description}</p>
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
        </div>
      </main>
    </div>
  );
}

function getEmoji(foodId: string): string {
  const emojiMap: Record<string, string> = {
    oyster: '🦪',
    apple: '🍎',
    uni: '🦐',
    wagyu: '🥩',
    crab: '🦀',
  };
  return emojiMap[foodId] || '🍽️';
}
