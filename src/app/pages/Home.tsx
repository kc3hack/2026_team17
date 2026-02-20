import { useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { JapanDotMap } from "../components/JapanDotMap";
import { SideFoodSlider } from "../components/SideFoodSlider";
import { AppHeader } from "../components/AppHeader";
import foodItems from "../data/foodData.generated.json";
import imageItems from "../../data/images.generated.json";
import Joyride, { Step, CallBackProps, STATUS, EVENTS } from "react-joyride";

// use client 削除　コード内容'use client'

type SliderItem = { label: string; src: string };

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const [tourRun, setTourRun] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);

  const [logoX, setLogoX] = useState(0);
  const [tourNonce, setTourNonce] = useState(0);

  const BASE = import.meta.env.BASE_URL;

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  // ✅ 写真クリック時：検索ページへ自動遷移（名産一覧クリックと同じ挙動）
  const handleImageSearch = (label: string) => {
    const v = label.trim();
    if (!v) return;
    setSearchQuery(v); // 検索窓にも反映（任意）
    navigate(`/search?q=${encodeURIComponent(v)}`);
  };

  // ✅ 配列シャッフル関数（Fisher-Yates）
  const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  // ✅ public/images から自動生成した JSON をスライダー用に変換（BASE対応）＋ランダム化
  const ALL_SLIDER_ITEMS: SliderItem[] = useMemo(() => {
    const arr = imageItems as Array<{ label?: string; src: string }>;

    const formatted: SliderItem[] = arr
      .filter((x) => typeof x?.src === "string" && x.src.length > 0)
      .map((x) => ({
        label:
          (x.label ?? "").trim() ||
          x.src.split("/").pop()?.replace(/\.\w+$/, "") ||
          "image",
        src: `${BASE}${x.src.replace(/^\//, "")}`, // "/images/xxx.jpg" → "${BASE}images/xxx.jpg"
      }));

    return shuffleArray(formatted);
  }, [BASE]);

  // ✅ 左右に分ける（半分ずつ）
  const { LEFT_ITEMS, RIGHT_ITEMS } = useMemo(() => {
    const mid = Math.ceil(ALL_SLIDER_ITEMS.length / 2);
    return {
      LEFT_ITEMS: ALL_SLIDER_ITEMS.slice(0, mid),
      RIGHT_ITEMS: ALL_SLIDER_ITEMS.slice(mid),
    };
  }, [ALL_SLIDER_ITEMS]);

  const foods = useMemo(() => {
    const arr = foodItems as Array<{ name: string }>;
    return arr
      .map((x) => x?.name)
      .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      .map((v) => v.trim())
      .sort((a, b) => a.localeCompare(b, "ja"));
  }, []);

  // ★ 人気カテゴリ（カードで表示する固定リスト）
  const popularFoods = [
    { name: "ラーメン", image: `${BASE}images/ramen.jpg` },
    { name: "海鮮", image: `${BASE}images/kaisen.jpg` },
    { name: "寿司", image: `${BASE}images/sushi.jpg` },
    { name: "牛料理", image: `${BASE}images/beef.jpg` },
    { name: "鍋", image: `${BASE}images/nabe.jpg` },
    { name: "うどん", image: `${BASE}images/udon.jpg` },
  ];

  const handlePopularSearch = (food: string) => {
    setSearchQuery(food);
    navigate(`/search?q=${encodeURIComponent(food)}`);
  };

  const getRegionCount = (foodName: string) => {
    const arr = foodItems as Array<{ name: string; regions?: unknown[] }>;
    return arr.find((f) => f?.name === foodName)?.regions?.length ?? 0;
  };

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ★ 使い方：必ず最初から（内部状態も捨てる）
  const startTour = () => {
    setTourRun(false);
    setTourStepIndex(0);
    setTourNonce((n) => n + 1);

    setTimeout(() => {
      setTourRun(true);
    }, 0);
  };

  const tourSteps: Step[] = [
    {
      target: '[data-tour="search"]',
      content: "まずは食べたい名産を検索してみよう！",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: '[data-tour="map"]',
      content: "地図をクリックして都道府県から探すこともできます。",
      placement: "top",
    },
    {
      target: '[data-tour="list"]',
      content: "名産一覧から選ぶと、その名産で検索できます。",
      placement: "top",
    },
    {
      target: '[data-tour="photo"]',
      content: "写真から選ぶこともできます（気分で選べる）。",
      placement: "top",
    },
    {
      target: '[data-tour="popular"]',
      content: "人気の名産品カードからもすぐ検索できます。",
      placement: "top",
    },
  ];

  const onTourCallback = (data: CallBackProps) => {
    const { status, index, type, action } = data;

    if (type === EVENTS.STEP_AFTER) {
      const next =
        action === "prev"
          ? Math.max(0, index - 1)
          : Math.min(tourSteps.length - 1, index + 1);
      setTourStepIndex(next);
    }

    if (type === EVENTS.TARGET_NOT_FOUND) {
      setTourRun(false);
      setTourStepIndex(0);
      return;
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setTourRun(false);
      setTourStepIndex(0);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Joyride
        key={tourNonce}
        steps={tourSteps}
        run={tourRun}
        stepIndex={tourStepIndex}
        callback={onTourCallback}
        continuous
        showSkipButton
        showProgress
        disableOverlayClose
        scrollToFirstStep
        scrollOffset={140}
        styles={{
          options: {
            primaryColor: "#111827",
            zIndex: 10000,
            overlayColor: "rgba(0,0,0,0.45)",
          },
        }}
      />

      {/* ヘッダー */}
      <AppHeader
      value={searchQuery}
      onChange={setSearchQuery}
      onSearch={handleSearch}
      onStartTour={startTour}
      logoX={logoX}
      enableTourTarget
    />
      {/* ===== メイン ===== */}
      <main className="container mx-auto px-4 py-8">
        <section id="map" className="mb-12">
          <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen">
            <div className="px-6 2xl:px-10">
              <div className="mb-3 hidden xl:grid grid-cols-[1fr_300px_360px] gap-4 items-end">
                <div className="text-2xl font-bold text-center">地図から探す</div>
                <div className="text-2xl font-bold text-center">名産一覧</div>
                <div className="text-2xl font-bold text-center">写真から選ぶ</div>
              </div>

              <div className="flex gap-4 items-stretch h-[71vh]">
                <div data-tour="map" className="flex-1 min-w-0">
                  <JapanDotMap
                    svgPath={`${BASE}maps/geolonia/map-full.svg`}
                    onPickPrefecture={(pref) => setSearchQuery(pref)}
                  />
                </div>

                <aside
                  data-tour="list"
                  className="hidden xl:block w-[300px] min-w-[300px] h-full"
                >
                  <div className="rounded-2xl border bg-white p-3 h-full flex flex-col min-h-0">
                    <div className="text-sm font-semibold mb-2"></div>

                    <div className="flex-1 min-h-0 overflow-auto pr-1">
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        {foods.map((name) => (
                          <button
                            key={name}
                            type="button"
                            className="w-full text-left rounded-lg px-2 py-1.5 text-sm hover:bg-gray-100 transition"
                            onClick={() => {
                              setSearchQuery(name);
                              navigate(`/search?q=${encodeURIComponent(name)}`);
                            }}
                            title={`${name}で検索`}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </aside>

                <aside
                  data-tour="photo"
                  className="hidden xl:block w-[360px] min-w-[360px] h-full"
                >
                  <SideFoodSlider
                    side="right"
                    items={RIGHT_ITEMS}
                    // ✅ クリックで検索ページへ自動遷移
                    onPick={(label) => handleImageSearch(label)}
                    intervalMs={9000}
                    fadeMs={1200}
                    clickable={true}
                    className="h-full"
                  />
                </aside>
              </div>
            </div>
          </div>
        </section>

        <section
          data-tour="popular"
          id="popular"
          className="max-w-6xl mx-auto mb-12"
        >
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <div className="text-2xl font-bold">人気の名産品</div>
              <div className="text-sm text-gray-600 mt-1">
                クリックするとその名産で検索します
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {popularFoods.map((food) => {
              const regionCount = getRegionCount(food.name);

              return (
                <button
                  key={food.name}
                  type="button"
                  onClick={() => handlePopularSearch(food.name)}
                  className="group text-left rounded-2xl border bg-white overflow-hidden hover:shadow-lg transition hover:-translate-y-0.5"
                  title={`${food.name}で検索`}
                >
                  <div className="h-28 sm:h-32 overflow-hidden">
                    <img
                      src={food.image}
                      alt={food.name}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition"
                      loading="lazy"
                    />
                  </div>

                  <div className="p-3">
                    <div className="font-semibold">{food.name}</div>
                    <div className="text-xs text-gray-600 mt-1">
                      {regionCount}つの地域
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section id="howto" className="max-w-5xl mx-auto pb-12">
          <div className="text-lg font-semibold mb-3">使い方</div>
          <ol className="list-decimal pl-5 text-sm text-gray-700 space-y-2">
            <li>検索欄に食べたい名産を入力する</li>
            <li>または地図で都道府県を選ぶ</li>
            <li>検索ボタンで宿候補を表示（予定）</li>
          </ol>
        </section>
      </main>
    </div>
  );
}