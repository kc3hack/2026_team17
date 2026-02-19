'use client';

import { useState } from 'react';
import { useNavigate } from 'react-router';

import { Search, BarChart3, Hotel } from 'lucide-react';

import { SearchBar } from '../components/SearchBar';
import { StepCard } from '../components/StepCard';

import generatedFoodData from '../data/foodData.generated.json';
import { Button } from '../components/ui/button';

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
  kana?: string;
  imageQuery: string;
  regions: Region[];
};

export const foodData = generatedFoodData as FoodItem[];

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

  // ★ 人気カテゴリ（ローカル画像）
  const popularFoods = [
    {
      name: 'ラーメン',
      image: '/images/ramen.jpg',
    },
    {
      name: '海鮮',
      image: '/images/kaisen.jpg',
    },
    {
      name: '寿司',
      image: '/images/sushi.jpg',
    },
    {
      name: '牛料理',
      image: '/images/beef.jpg',
    },
    {
      name: '鍋',
      image: '/images/nabe.jpg',
    },
    {
      name: 'うどん',
      image: '/images/udon.jpg',
    },
  ];

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
            <p className="text-sm text-gray-600">
              食べたい特産品から最適な宿を提案します
            </p>
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
                key={food.name}
                variant="outline"
                onClick={() => handlePopularSearch(food.name)}
                className="rounded-full"
              >
                {food.name}
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

        {/* 人気の特産品 */}
        <section>
          <h2 className="text-3xl font-bold text-center mb-8">
            人気の特産品
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularFoods.map((food) => {
              const regionCount =
                foodData.find(f => f.name === food.name)?.regions.length ?? 0;

              return (
                <div
                  key={food.name}
                  className="bg-white rounded-xl shadow-md overflow-hidden cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1"
                  onClick={() => handlePopularSearch(food.name)}
                >
                  <div className="h-48 overflow-hidden">
                    <img
                      src={food.image}
                      alt={food.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-4">
                    <h3 className="font-bold text-lg mb-1">
                      {food.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {regionCount}つの地域
                    </p>
                  </div>
                </div>
              );
            })}
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
