import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Search, BarChart3, Hotel } from 'lucide-react';
import { SearchBar } from '../components/SearchBar';
import { StepCard } from '../components/StepCard';
import { foodData } from '../data/foodData';
import { Button } from '../components/ui/button';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handlePopularSearch = (food: string) => {
    setSearchQuery(food);
    navigate(`/search?q=${encodeURIComponent(food)}`);
  };

  const popularFoods = ['かき', 'りんご', 'うに'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* ヘッダー */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
            <Hotel className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-xl font-bold">特産品から探す宿泊プラン</h1>
            <p className="text-sm text-gray-600">食べたい特産品から最適な宿を提案します</p>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-12">
        {/* ヒーローセクション */}
        <section className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">食べたい特産品を検索</h2>
          <p className="text-xl text-gray-600 mb-12">
            お店が多く集まるエリアの宿を、クラスタリング分析で提案
          </p>
          
          <div className="flex justify-center mb-8">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              onSearch={handleSearch}
            />
          </div>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <span className="text-gray-600">人気の検索：</span>
            {popularFoods.map((food) => (
              <Button
                key={food}
                variant="outline"
                onClick={() => handlePopularSearch(food)}
                className="rounded-full"
              >
                {food}
              </Button>
            ))}
          </div>
        </section>

        {/* 3ステップ */}
        <section className="mb-16">
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              icon={<Search size={40} className="text-blue-600" />}
              step={1}
              title="特産品を検索"
              description="食べたい特産品を入力して検索"
            />
            <StepCard
              icon={<BarChart3 size={40} className="text-green-600" />}
              step={2}
              title="クラスタリング分析"
              description="飲食店が密集するエリアを自動分析"
            />
            <StepCard
              icon={<Hotel size={40} className="text-red-600" />}
              step={3}
              title="最適な宿を提案"
              description="アクセス情報や周辺施設も確認"
            />
          </div>
        </section>

        {/* 特産品一覧 */}
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">人気の特産品</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {foodData.slice(0, 6).map((food) => (
              <div
                key={food.id}
                className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1"
                onClick={() => handlePopularSearch(food.name)}
              >
                <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                  <span className="text-6xl">{getEmoji(food.id)}</span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1">{food.name}</h3>
                  <p className="text-sm text-gray-600">{food.regions.length}つの地域</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* フッター */}
      <footer className="border-t mt-20 py-8 bg-gray-50">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2026 特産品から探す宿泊プラン</p>
          <p className="text-sm mt-2">
            ※ Google Maps APIを使用した実際のクラスタリング機能の実装が必要です
          </p>
        </div>
      </footer>
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
