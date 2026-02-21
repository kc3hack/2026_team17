import { useMemo } from "react";
import { iconManifest } from "../edit/iconManifest.generated";

type Placement = {
  prefCode: string;
  foodId: string;
  foodName: string;
  iconKey: string;
  x: number;
  y: number;
  updatedAt: number;
};

export type PlacementsByPref = Record<string, Placement[]>;

function norm(s: string) {
  return (s ?? "").trim().toLowerCase();
}

export function PrefMapWithIcons({
  prefCode,
  placementsByPref,
  activeFoodName,              // ★追加（検索クエリ等）
  onIconClick,                 // ★追加（クリックで名産名を返す）
  className,
}: {
  prefCode: string;
  placementsByPref: PlacementsByPref;
  activeFoodName?: string;
  onIconClick?: (foodName: string) => void;
  className?: string;
}) {
  const BASE = import.meta.env.BASE_URL || "/";

  const withBase = (p: string) => {
    const base = BASE.replace(/\/+$/, "/");
    const rel = p.replace(/^\/+/, "");
    return base + rel;
  };

  const placements = placementsByPref[prefCode] ?? [];

  const pins = useMemo(() => {
    return placements
      .map((pl) => {
        const icon = (iconManifest as any)[pl.iconKey] as { src: string } | undefined;
        if (!icon) return null;
        return { ...pl, iconSrc: withBase(icon.src) };
      })
      .filter(Boolean) as Array<Placement & { iconSrc: string }>;
  }, [prefCode, placementsByPref]);

  const activeN = norm(activeFoodName ?? "");

  return (
    <div
      className={className}
      style={{
        position: "relative",
        width: "100%",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(0,0,0,0.1)",
        background: "#fff",
      }}
    >
      <img
        src={withBase(`maps/prefectures/${prefCode}.png`)}
        alt={prefCode}
        style={{ width: "100%", height: "auto", display: "block", userSelect: "none" }}
        draggable={false}
      />

      {/* overlay */}
      {pins.map((pl) => {
        const isActive = activeN.length > 0 && norm(pl.foodName) === activeN;

        return (
          <button
            key={pl.foodId}
            type="button"
            title={pl.foodName}
            onClick={() => onIconClick?.(pl.foodName)}
            style={{
              position: "absolute",
              left: `${pl.x * 100}%`,
              top: `${pl.y * 100}%`,
              transform: "translate(-50%, -50%)",

              border: "none",
              background: "transparent",
              padding: 0,
              cursor: onIconClick ? "pointer" : "default",
              borderRadius: 999,

              boxShadow: isActive ? "0 0 0 3px #111, 0 6px 14px rgba(0,0,0,0.25)" : "none",
            }}
          >
            <div
              style={{
                borderRadius: 999,
                padding: isActive ? 4 : 0,
                background: isActive ? "rgba(255,255,255,0.9)" : "transparent",
                transition: "all 0.15s ease",
              }}
            >
              <img
                src={pl.iconSrc}
                alt={pl.iconKey}
                style={{
                  width: isActive ? 40 : 36,
                  height: isActive ? 40 : 36,
                  display: "block",
                  objectFit: "contain",
                  filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.25))",
                }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}