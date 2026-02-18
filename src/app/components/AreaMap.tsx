import { useEffect, useRef } from "react";

type LatLng = { lat: number; lng: number };

export type PlaceItem = {
  id: string; // place_id
  name: string;
  rating?: number;
  address?: string; // vicinity
  lat: number;
  lng: number;
};

type Props = {
  center: LatLng;          // 地域の基準点（初期表示用）
  foodKeyword: string;
  radiusKm?: number;       // 店を広く拾う半径（例: 20km）

  onRestaurants?: (items: PlaceItem[]) => void;
  onLodgings?: (items: PlaceItem[]) => void;

  // 一覧クリックで地図移動（MapView から渡される）
  selected?: { lat: number; lng: number; title?: string; kind?: "restaurant" | "lodging" };
};

declare global {
  interface Window {
    google: any;
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-maps="true"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google Maps load error")));
      return;
    }

    const script = document.createElement("script");
    script.dataset.googleMaps = "true";
    // ★geometry が必要
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps load error"));
    document.head.appendChild(script);
  });
}

export default function AreaMap({
  center,
  foodKeyword,
  radiusKm = 10, // ←これは「店を広く拾う半径」に使う
  onRestaurants,
  onLodgings,
  selected,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObjRef = useRef<any | null>(null);

  // 一覧クリック時の移動（これは「上書き移動」なので残す）
  useEffect(() => {
    const map = mapObjRef.current;
    if (!map || !selected) return;
    map.panTo({ lat: selected.lat, lng: selected.lng });
    map.setZoom(15);
  }, [selected?.lat, selected?.lng]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey) {
      console.error("VITE_GOOGLE_MAPS_API_KEY が未設定です");
      return;
    }
    if (!mapRef.current) return;

    let cancelled = false;

    let markers: any[] = [];
    let circle: any | null = null;
    let centerMarker: any | null = null; // 密集中心（クラスタ中心）を示す用

    const ICON_SHOP = "https://maps.google.com/mapfiles/ms/icons/blue-dot.png";
    const ICON_HOTEL = "https://maps.google.com/mapfiles/ms/icons/green-dot.png";
    const ICON_CENTER = "https://maps.google.com/mapfiles/ms/icons/red-dot.png";

    const clearMarkers = () => {
      markers.forEach((m) => m.setMap(null));
      markers = [];
      if (centerMarker) {
        centerMarker.setMap(null);
        centerMarker = null;
      }
    };

    // PlaceResult -> PlaceItem（一覧用）
    const toItem = (p: any): PlaceItem | null => {
      const loc = p.geometry?.location;
      if (!loc) return null;
      const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
      const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
      return {
        id: String(p.place_id),
        name: String(p.name),
        rating: typeof p.rating === "number" ? p.rating : undefined,
        address: typeof p.vicinity === "string" ? p.vicinity : undefined,
        lat,
        lng,
      };
    };

    // 2点間距離（m）
    const distMeters = (a: LatLng, b: LatLng) => {
      return window.google.maps.geometry.spherical.computeDistanceBetween(
        new window.google.maps.LatLng(a.lat, a.lng),
        new window.google.maps.LatLng(b.lat, b.lng)
      );
    };

    // nearbySearch 最大60件（3ページ）取得
    const fetchNearbyAll = (service: any, req: any, maxPages = 3): Promise<any[]> => {
      return new Promise((resolve) => {
        const all: any[] = [];
        let pages = 0;

        service.nearbySearch(req, (results: any[] | null, status: string, pagination: any) => {
          if (cancelled) return;
          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results) {
            resolve(all);
            return;
          }

          all.push(...results);
          pages += 1;

          if (pagination?.hasNextPage && pages < maxPages) {
            // nextPage は少し待たないと有効にならない仕様
            setTimeout(() => pagination.nextPage(), 1200);
          } else {
            resolve(all);
          }
        });
      });
    };

    // -------------------------
    // クラスタリング（k-means 簡易）
    // - k=3 を基本
    // - 反復10回
    // - 最大クラスタの重心を採用
    // -------------------------
    const clusterCenterByKMeans = (pts: LatLng[], k = 3): LatLng => {
      if (pts.length === 0) return center;
      if (pts.length === 1) return pts[0];

      const kk = Math.min(k, pts.length);

      // 初期中心：先頭から kk 個（簡易）
      let centers = pts.slice(0, kk).map((p) => ({ ...p }));

      for (let iter = 0; iter < 10; iter++) {
        const groups: LatLng[][] = Array.from({ length: kk }, () => []);

        // 割当
        for (const p of pts) {
          let best = 0;
          let bestD = Infinity;
          for (let i = 0; i < kk; i++) {
            const d = (p.lat - centers[i].lat) ** 2 + (p.lng - centers[i].lng) ** 2;
            if (d < bestD) {
              bestD = d;
              best = i;
            }
          }
          groups[best].push(p);
        }

        // 更新
        centers = centers.map((c, i) => {
          const g = groups[i];
          if (g.length === 0) return c;
          const lat = g.reduce((s, p) => s + p.lat, 0) / g.length;
          const lng = g.reduce((s, p) => s + p.lng, 0) / g.length;
          return { lat, lng };
        });
      }

      // 最終割当で最大クラスタを選ぶ
      const finalGroups: LatLng[][] = Array.from({ length: kk }, () => []);
      for (const p of pts) {
        let best = 0;
        let bestD = Infinity;
        for (let i = 0; i < kk; i++) {
          const d = (p.lat - centers[i].lat) ** 2 + (p.lng - centers[i].lng) ** 2;
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
        finalGroups[best].push(p);
      }

      let bestIdx = 0;
      for (let i = 1; i < kk; i++) {
        if (finalGroups[i].length > finalGroups[bestIdx].length) bestIdx = i;
      }

      // 最大クラスタの重心
      const g = finalGroups[bestIdx];
      const lat = g.reduce((s, p) => s + p.lat, 0) / g.length;
      const lng = g.reduce((s, p) => s + p.lng, 0) / g.length;
      return { lat, lng };
    };

    (async () => {
      await loadGoogleMaps(apiKey);
      if (cancelled) return;

      const map = new window.google.maps.Map(mapRef.current!, {
        center,
        zoom: 12,
      });
      mapObjRef.current = map;

      // 初期中心マーカー（地域基準点）
      new window.google.maps.Marker({
        map,
        position: center,
        title: "地域中心（初期）",
      });

      const service = new window.google.maps.places.PlacesService(map);

      const addMarker = (place: any, label: "店" | "宿") => {
        const loc = place.geometry?.location;
        if (!loc) return;

        const icon = label === "宿" ? ICON_HOTEL : ICON_SHOP;

        const m = new window.google.maps.Marker({
          map,
          position: loc,
          title: `${label}:${place.name}`,
          icon,
        });
        markers.push(m);
      };

      // -------------------------
      // ① 店を広く最大60件取得（radiusKm）
      // -------------------------
      const restaurantResults = await fetchNearbyAll(
        service,
        {
          location: center,
          radius: radiusKm * 1000,
          keyword: foodKeyword,
          type: "restaurant",
        },
        3
      );
      if (cancelled) return;

      const restaurantItems: PlaceItem[] = restaurantResults
        .map(toItem)
        .filter((x): x is PlaceItem => x !== null);

      // 一覧へ
      onRestaurants?.(restaurantItems);

      // 店マーカー（店は広く拾うので全部打つ）
      clearMarkers();
      restaurantResults.forEach((p) => addMarker(p, "店"));

      // -------------------------
      // ② 店の密集中心（クラスタ中心）算出
      // -------------------------
      const pts: LatLng[] = restaurantItems.map((r) => ({ lat: r.lat, lng: r.lng }));
      const denseCenter = clusterCenterByKMeans(pts, 3);

      // 密集中心マーカー
      centerMarker = new window.google.maps.Marker({
        map,
        position: denseCenter,
        title: "密集中心（クラスタ中心）",
        icon: ICON_CENTER,
      });

      // 地図も密集中心へ寄せる
      map.panTo(denseCenter);
      map.setZoom(13);

      // -------------------------
      // ③ 円を密集中心へ移動（宿は半径5km固定）
      // -------------------------
      const lodgingRadiusKm = 5;

      if (circle) circle.setMap(null);
      circle = new window.google.maps.Circle({
        map,
        center: denseCenter,
        radius: lodgingRadiusKm * 1000,
        fillOpacity: 0.05,
        strokeOpacity: 0.6,
        strokeWeight: 2,
      });

      // -------------------------
      // ④ 宿を「密集中心から5km」で取得
      // -------------------------
      const lodgingResults = await fetchNearbyAll(
        service,
        {
          location: denseCenter,
          radius: lodgingRadiusKm * 1000,
          type: "lodging",
        },
        3
      );
      if (cancelled) return;

      // 念のため円内フィルタ（見た目のズレ・誤差対策）
      const lodgingsFiltered = (lodgingResults || []).filter((p: any) => {
        const loc = p.geometry?.location;
        if (!loc) return false;
        const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
        const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
        return distMeters(denseCenter, { lat, lng }) <= lodgingRadiusKm * 1000;
      });

      // 宿マーカー追加（店マーカーは残して宿も足す）
      lodgingsFiltered.forEach((p: any) => addMarker(p, "宿"));

      const lodgingItems: PlaceItem[] = lodgingsFiltered
        .map(toItem)
        .filter((x): x is PlaceItem => x !== null);

      onLodgings?.(lodgingItems);
    })();

    return () => {
      cancelled = true;
      clearMarkers();
      if (circle) circle.setMap(null);
      mapObjRef.current = null;
    };
  }, [center.lat, center.lng, foodKeyword, radiusKm, onRestaurants, onLodgings]);

  return <div ref={mapRef} className="rounded-lg h-96 w-full" />;
}
