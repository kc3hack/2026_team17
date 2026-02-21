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

  // ✅ 煽り表示用
  const [roastOpen, setRoastOpen] = useState(false);

  const BASE = import.meta.env.BASE_URL;

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;

    // ✅ 「彼女が欲しい」系は煽り表示（検索遷移させない）
    const roastRegex = /彼女.*欲しい|彼女が欲しい/;
    if (roastRegex.test(q)) {
      setRoastOpen(true);
      return;
    }

    navigate(`/search?q=${encodeURIComponent(q)}`);
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
    <div className="min-h-screen bg-red-50">
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

      {/* ✅ 煽りオーバーレイ */}
      {roastOpen && (
        <div className="fixed inset-0 z-[11000]">
          {/* 背景 */}
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setRoastOpen(false)}
          />

          {/* 本体 */}
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border p-6 relative">
              <button
                type="button"
                onClick={() => setRoastOpen(false)}
                className="absolute right-3 top-3 rounded-lg px-3 py-1 text-sm hover:bg-gray-100"
                aria-label="閉じる"
              >
                ✕
              </button>

              <div className="text-center">
                <div className="text-3xl font-extrabold tracking-tight">
                  現実を見ろ
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  （検索する前に、まず外出して会話しようね）
                </div>

                <div className="mt-6">
                  <div className="text-6xl leading-none">🤪</div>
                  <pre className="mt-4 text-sm bg-gray-50 border rounded-xl p-4 overflow-auto text-left"></pre>
                </div>

                <div className="mt-6 flex gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setRoastOpen(false);
                      setSearchQuery("");
                    }}
                    className="rounded-xl px-4 py-2 border bg-white hover:bg-gray-50"
                  >
                    検索欄をリセット
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRoastOpen(false);
                    }}
                    className="rounded-xl px-4 py-2 bg-gray-900 text-white hover:bg-gray-800"
                  >
                    了解（閉じる）
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
      <main className="container mx-auto px-4 py-8 space-y-10">
        {/* ================= 地図/一覧/写真 ================= */}
        <section id="map">
          <div className="mb-6 hidden xl:grid grid-cols-[1fr_300px_360px] gap-4 items-end">
            <div className="text-2xl font-bold text-center text-red-900">
              地図から探す
            </div>
            <div className="text-2xl font-bold text-center text-red-900">
              名産一覧
            </div>
            <div className="text-2xl font-bold text-center text-red-900">
              写真から選ぶ
            </div>
          </div>

          <div className="flex gap-4 items-stretch h-[71vh]">
            {/* 地図 */}
            <div data-tour="map" className="flex-1 min-w-0 japanMapWrap">
              <div className="h-full rounded-xl border border-black overflow-hidden bg-white">
                <JapanDotMap
                  svgPath={`${BASE}maps/geolonia/map-full.svg`}
                  onPickPrefecture={(pref) => setSearchQuery(pref)}
                />
              </div>
            </div>

            {/* 名産一覧 */}
            <aside
              data-tour="list"
              className="hidden xl:block w-[300px] min-w-[300px] h-full"
            >
              <div className="h-full rounded-xl border border-black bg-white p-3 overflow-auto">
                <div className="grid grid-cols-2 gap-1">
                  {foods.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-red-200 transition"
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
            </aside>

            {/* 写真 */}
            <aside
              data-tour="photo"
              className="hidden xl:block w-[360px] min-w-[360px] h-full"
            >
              <div className="h-full rounded-xl border border-black overflow-hidden bg-white">
                <SideFoodSlider
                  side="right"
                  items={RIGHT_ITEMS}
                  onPick={(label) => handleImageSearch(label)}
                  intervalMs={9000}
                  fadeMs={1200}
                  clickable={true}
                  className="h-full"
                />
              </div>
            </aside>
          </div>
        </section>

        {/* ================= 人気の名産品（回転ずし・無限） ================= */}
        <section data-tour="popular" id="popular">
          <div className="mb-4">
            <div className="text-2xl font-bold text-red-900">人気の名産品</div>
            <div className="text-sm text-gray-600 mt-1">
              クリックするとその名産で検索します
            </div>
          </div>

          <div className="relative rounded-2xl border border-black/10 bg-white overflow-hidden">
            {/* 端フェード（任意） */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-12 bg-gradient-to-r from-white to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-white to-transparent z-10" />

            {/* レーン（2列つなげて無限に見せる） */}
            <div className="sushi-viewport py-3">
              <div className="sushi-track">
                {[...popularFoods, ...popularFoods].map((food, i) => {
                  const regionCount = getRegionCount(food.name);

                  return (
                    <button
                      key={`${food.name}-${i}`}
                      type="button"
                      onClick={() => handlePopularSearch(food.name)}
                      className="
                        sushi-card group text-left
                        rounded-2xl border border-black/10 bg-white overflow-hidden
                        hover:shadow-xl transition duration-300 hover:-translate-y-1
                      "
                      style={{
                        width: 250,
                        flex: "0 0 auto",
                      }}
                      title={`${food.name}で検索`}
                    >
                      <div className="h-44 overflow-hidden">
                        <img
                          src={food.image}
                          alt={food.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition duration-500"
                          loading="lazy"
                        />
                      </div>

                      <div className="p-4">
                        <div className="font-semibold text-lg">{food.name}</div>
                        <div className="text-sm text-gray-500 mt-1">
                          {regionCount}つの地域
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ✅ フッター：写真の出典を明記 */}
      <footer className="mt-10 border-t border-black/10 bg-white">
        <div className="container mx-auto px-4 py-6">
          <div className="text-sm text-gray-600">
            <div className="font-semibold text-gray-800">写真の出典</div>
            <ul className="mt-2 list-disc pl-5 space-y-1">
              <li>Adobe Stock</li>
              <li>photo library</li>
              <li>photo AC</li>
            </ul>
            <div className="mt-4 text-xs text-gray-500">
              © {new Date().getFullYear()} R-Hack
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}