import { useEffect, useMemo, useRef, useState } from "react";

import { PREF_CODES, type PrefCode } from "../edit/prefectures";
import { foodsByPref } from "../edit/foodsByPref.generated";
import { iconManifest } from "../edit/iconManifest.generated";

import { makeFoodId } from "../edit/id";
import { loadStore, saveStore, clearStore } from "../edit/storage";
import { downloadJson, readJsonFile } from "../edit/exportImport";
import type { FoodPlacement, PlacementStore } from "../edit/types";

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

export default function PrefMapEditor() {
  const BASE = import.meta.env.BASE_URL || "/";

  function withBase(p: string) {
    const base = BASE.replace(/\/+$/, "/");
    const rel = p.replace(/^\/+/, "");
    return base + rel;
  }

  const [pref, setPref] = useState<PrefCode>(PREF_CODES[0]);
  const [store, setStore] = useState<PlacementStore>(() => loadStore());

  const foods = foodsByPref[pref] ?? [];

  const foodItems = useMemo(() => {
    return foods.map((f) => {
      const id = makeFoodId(pref, f.name);
      return { ...f, id };
    });
  }, [foods, pref]);

  const placements: FoodPlacement[] = store.placementsByPref[pref] ?? [];
  const placedSet = useMemo(() => new Set(placements.map((p) => p.foodId)), [placements]);

  const [selectedFoodId, setSelectedFoodId] = useState<string>("");
  const [selectedIconKey, setSelectedIconKey] = useState<string>(() => Object.keys(iconManifest)[0] ?? "");

  const [autoNext, setAutoNext] = useState(true);

  const [hoverPx, setHoverPx] = useState<string>("-");
  const [hoverNorm, setHoverNorm] = useState<string>("-");

  // ★追加：アイコン検索
  const [iconQuery, setIconQuery] = useState("");

  const filteredIcons = useMemo(() => {
    const q = iconQuery.trim().toLowerCase();
    const entries = Object.entries(iconManifest);
    if (!q) return entries;
    return entries.filter(([key]) => key.toLowerCase().includes(q));
  }, [iconQuery]);

  const imgRef = useRef<HTMLImageElement | null>(null);

  // 自動保存
  useEffect(() => {
    saveStore(store);
  }, [store]);

  // 県切替時：未配置の先頭を自動選択（なければ先頭）
  useEffect(() => {
    const firstUnplaced = foodItems.find((f) => !placedSet.has(f.id));
    const first = firstUnplaced ?? foodItems[0];
    setSelectedFoodId(first?.id ?? "");
  }, [pref]); // eslint-disable-line react-hooks/exhaustive-deps

  const progress = `${placements.length}/${foodItems.length}`;

  function getPoint(e: React.MouseEvent) {
    const img = imgRef.current;
    if (!img) return null;

    const rect = img.getBoundingClientRect();
    const xPx = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;

    const x = clamp01(xPx / rect.width);
    const y = clamp01(yPx / rect.height);

    return { xPx, yPx, x, y };
  }

  function onMouseMove(e: React.MouseEvent) {
    const p = getPoint(e);
    if (!p) return;
    setHoverPx(`${Math.round(p.xPx)}, ${Math.round(p.yPx)}`);
    setHoverNorm(`${p.x.toFixed(4)}, ${p.y.toFixed(4)}`);
  }

  function selectNextUnplaced(currentId: string) {
    if (!autoNext) return;

    // “未配置だけ”の配列から次へ
    const unplaced = foodItems.filter((f) => !placedSet.has(f.id) || f.id === currentId);
    const idx = unplaced.findIndex((f) => f.id === currentId);
    const next = unplaced[idx + 1] ?? unplaced[0];
    if (next) setSelectedFoodId(next.id);
  }

  function upsertPlacement(foodId: string, x: number, y: number) {
    const food = foodItems.find((f) => f.id === foodId);
    if (!food) return;

    const newPlacement: FoodPlacement = {
      prefCode: pref,
      foodId,
      foodName: food.name,
      iconKey: selectedIconKey,
      x,
      y,
      updatedAt: Date.now(),
    };

    setStore((prev) => {
      const next = structuredClone(prev) as PlacementStore;
      const arr = next.placementsByPref[pref] ?? [];
      const idx = arr.findIndex((a) => a.foodId === foodId);
      if (idx >= 0) arr[idx] = newPlacement;
      else arr.push(newPlacement);
      next.placementsByPref[pref] = arr;
      return next;
    });

    selectNextUnplaced(foodId);
  }

  function onClickMap(e: React.MouseEvent) {
    if (!selectedFoodId) return;
    if (!selectedIconKey) return;

    const p = getPoint(e);
    if (!p) return;

    upsertPlacement(selectedFoodId, p.x, p.y);
  }

  function removePlacement(foodId: string) {
    setStore((prev) => {
      const next = structuredClone(prev) as PlacementStore;
      next.placementsByPref[pref] = (next.placementsByPref[pref] ?? []).filter((p) => p.foodId !== foodId);
      return next;
    });
  }

  function clearPref() {
    setStore((prev) => {
      const next = structuredClone(prev) as PlacementStore;
      next.placementsByPref[pref] = [];
      return next;
    });
  }

  function goNextPref() {
    const i = PREF_CODES.indexOf(pref);
    const n = PREF_CODES[(i + 1) % PREF_CODES.length];
    setPref(n);
  }
  function goPrevPref() {
    const i = PREF_CODES.indexOf(pref);
    const n = PREF_CODES[(i - 1 + PREF_CODES.length) % PREF_CODES.length];
    setPref(n);
  }

  const selectedFood = foodItems.find((f) => f.id === selectedFoodId);
  const selectedPlaced = placements.find((p) => p.foodId === selectedFoodId);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 16, padding: 16 }}>
      {/* 左：地図 */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ fontWeight: 800, fontSize: 18 }}>
            {pref.toUpperCase()} <span style={{ fontWeight: 500 }}>({progress})</span>
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 12 }}>
            px: {hoverPx} / norm: {hoverNorm}
          </div>
        </div>

        <div
          onMouseMove={onMouseMove}
          onClick={onClickMap}
          style={{
            position: "relative",
            border: "1px solid #ddd",
            borderRadius: 12,
            overflow: "hidden",
            background: "#fff",
          }}
        >
          <img
            ref={imgRef}
            src={withBase(`maps/prefectures/${pref}.png`)}
            alt={pref}
            style={{ width: "100%", height: "auto", display: "block", userSelect: "none" }}
            draggable={false}
          />

          {/* 配置済みアイコン */}
          {placements.map((pl) => {
            const icon = iconManifest[pl.iconKey];
            if (!icon) return null;

            return (
              <button
                key={pl.foodId}
                onClick={(ev) => {
                  ev.stopPropagation();
                  setSelectedFoodId(pl.foodId);
                }}
                title={`${pl.foodName} / ${pl.iconKey}`}
                style={{
                  position: "absolute",
                  left: `${pl.x * 100}%`,
                  top: `${pl.y * 100}%`,
                  transform: "translate(-50%, -50%)",
                  border: pl.foodId === selectedFoodId ? "2px solid #000" : "1px solid rgba(0,0,0,0.2)",
                  borderRadius: 10,
                  padding: 2,
                  background: "rgba(255,255,255,0.9)",
                  cursor: "pointer",
                }}
              >
                <img src={withBase(icon.src)} alt={pl.iconKey} style={{ width: 28, height: 28, display: "block" }} />
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: "#444" }}>
          地図クリックで「選択中の名産」に座標＋アイコンを保存（割合保存なのでサイズ変更OK）
        </div>
      </div>

      {/* 右：操作パネル */}
      <div style={{ border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fafafa" }}>
        {/* 県切替 */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={goPrevPref}>Prev</button>
          <select value={pref} onChange={(e) => setPref(e.target.value as PrefCode)} style={{ flex: 1 }}>
            {PREF_CODES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button onClick={goNextPref}>Next</button>
        </div>

        {/* 自動次へ */}
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8 }}>
          <input id="autoNext" type="checkbox" checked={autoNext} onChange={(e) => setAutoNext(e.target.checked)} />
          <label htmlFor="autoNext" style={{ fontSize: 12 }}>
            クリック保存後に「次の未配置名産」へ自動で移動
          </label>
        </div>

        {/* 選択中 */}
        <div style={{ marginTop: 12, padding: 10, borderRadius: 12, background: "#fff", border: "1px solid #e5e5e5" }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>選択中</div>
          <div style={{ fontWeight: 700 }}>{selectedFood?.name ?? "（未選択）"}</div>
          <div style={{ fontSize: 12, color: "#666" }}>{selectedFoodId || "-"}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#444" }}>
            状態: {selectedPlaced ? "配置済み（クリックで上書き）" : "未配置"}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button disabled={!selectedFoodId} onClick={() => removePlacement(selectedFoodId)}>
              配置を削除
            </button>
          </div>
        </div>

        {/* 名産リスト */}
        <div style={{ marginTop: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>名産リスト</div>
          <div style={{ maxHeight: 260, overflow: "auto", border: "1px solid #e5e5e5", borderRadius: 12, background: "#fff" }}>
            {foodItems.map((f) => {
              const placed = placedSet.has(f.id);
              const active = f.id === selectedFoodId;
              return (
                <div
                  key={f.id}
                  onClick={() => setSelectedFoodId(f.id)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    cursor: "pointer",
                    background: active ? "#e9f0ff" : "transparent",
                    borderBottom: "1px solid #f0f0f0",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700 }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: "#666" }}>{f.id}</div>
                  </div>
                  <div style={{ fontSize: 12, color: placed ? "#0a7" : "#999", fontWeight: 700 }}>
                    {placed ? "済" : "未"}
                  </div>
                </div>
              );
            })}
            {foodItems.length === 0 && <div style={{ padding: 10, color: "#666" }}>この県の名産がありません</div>}
          </div>

          
        </div>

        {/* アイコン選択（検索付き） */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>
            アイコン選択（{Object.keys(iconManifest).length}）
          </div>

          {/* ★追加：検索UI */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
            <input
              value={iconQuery}
              onChange={(e) => setIconQuery(e.target.value)}
              placeholder="アイコン検索（例：ramen / かき / うどん）"
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: 12,
                border: "1px solid #ddd",
                outline: "none",
                fontSize: 14,
                background: "#fff",
              }}
            />
            {iconQuery && (
              <button onClick={() => setIconQuery("")} style={{ padding: "8px 10px" }}>
                クリア
              </button>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
            表示中: {filteredIcons.length} 件 / 全 {Object.keys(iconManifest).length} 件
          </div>

          <div style={{ maxHeight: 220, overflow: "auto", borderRadius: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
              {filteredIcons.map(([key, v]) => {
                const active = key === selectedIconKey;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedIconKey(key)}
                    title={key}
                    style={{
                      border: active ? "2px solid #000" : "1px solid rgba(0,0,0,0.15)",
                      borderRadius: 12,
                      background: "#fff",
                      padding: 6,
                      cursor: "pointer",
                    }}
                  >
                    <img
                      src={withBase(v.src)}
                      alt={key}
                      style={{ width: "100%", height: 44, objectFit: "contain", display: "block" }}
                    />
                    <div
                      style={{
                        fontSize: 11,
                        marginTop: 4,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {key}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Export/Import */}
        <div style={{ marginTop: 14, display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => downloadJson(store)}>Export JSON</button>
          <label
            style={{
              border: "1px solid #ddd",
              borderRadius: 12,
              padding: "6px 10px",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Import
            <input
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const imported = await readJsonFile(file);
                  if (!imported || imported.version !== 1 || !imported.placementsByPref) {
                    alert("形式が違います（version=1のplacements.jsonを選んでください）");
                    return;
                  }
                  setStore(imported);
                } catch {
                  alert("JSONの読み込みに失敗しました");
                } finally {
                  e.currentTarget.value = "";
                }
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}