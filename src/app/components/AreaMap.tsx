import { useEffect, useRef, useState } from "react";

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
  center: LatLng;
  foodKeyword: string;
  radiusKm?: number;

  onRestaurants?: (items: PlaceItem[]) => void;
  onLodgings?: (items: PlaceItem[]) => void;

  selected?: { lat: number; lng: number; title?: string; kind?: "restaurant" | "lodging" };

  // ✅ 黄色ピンにする「近くの料理の店舗（Places結果）」
  nearbyStorePins?: PlaceItem[];

  fetchFoodId?: string | null;
  fetchFoodKeyword?: string;
  onNearbyFoodRestaurants?: (foodId: string, items: PlaceItem[]) => void;
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

    const existing = document.querySelector<HTMLScriptElement>('script[data-google-maps="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Google Maps load error")));
      return;
    }

    const script = document.createElement("script");
    script.dataset.googleMaps = "true";
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
  radiusKm = 10,
  onRestaurants,
  onLodgings,
  selected,
  nearbyStorePins,
  fetchFoodId,
  fetchFoodKeyword,
  onNearbyFoodRestaurants,
}: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObjRef = useRef<any | null>(null);
  const serviceRef = useRef<any | null>(null);

  const [mapReady, setMapReady] = useState(false);

  const markersRef = useRef<any[]>([]);
  const circleRef = useRef<any | null>(null);
  const centerMarkerRef = useRef<any | null>(null);

  // ✅ 黄色ピン専用
  const nearStoreMarkersRef = useRef<any[]>([]);

  const ICON_SHOP = "https://maps.google.com/mapfiles/ms/icons/blue-dot.png";
  const ICON_HOTEL = "https://maps.google.com/mapfiles/ms/icons/green-dot.png";
  const ICON_CENTER = "https://maps.google.com/mapfiles/ms/icons/red-dot.png";
  const ICON_NEAR_SHOP = "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png";

  const clearAllMarkers = () => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (centerMarkerRef.current) {
      centerMarkerRef.current.setMap(null);
      centerMarkerRef.current = null;
    }
  };

  const clearNearStoreMarkers = () => {
    nearStoreMarkersRef.current.forEach((m) => m.setMap(null));
    nearStoreMarkersRef.current = [];
  };

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

  const distMeters = (a: LatLng, b: LatLng) => {
    return window.google.maps.geometry.spherical.computeDistanceBetween(
      new window.google.maps.LatLng(a.lat, a.lng),
      new window.google.maps.LatLng(b.lat, b.lng)
    );
  };

  const fetchNearbyAll = (service: any, req: any, maxPages = 3): Promise<any[]> => {
    return new Promise((resolve) => {
      const all: any[] = [];
      let pages = 0;

      service.nearbySearch(req, (results: any[] | null, status: string, pagination: any) => {
        if (status !== window.google.maps.places.PlacesServiceStatus.OK || !results) {
          resolve(all);
          return;
        }

        all.push(...results);
        pages += 1;

        if (pagination?.hasNextPage && pages < maxPages) {
          setTimeout(() => pagination.nextPage(), 1200);
        } else {
          resolve(all);
        }
      });
    });
  };

  const clusterCenterByKMeans = (pts: LatLng[], k = 3): LatLng => {
    if (pts.length === 0) return center;
    if (pts.length === 1) return pts[0];

    const kk = Math.min(k, pts.length);
    let centers = pts.slice(0, kk).map((p) => ({ ...p }));

    for (let iter = 0; iter < 10; iter++) {
      const groups: LatLng[][] = Array.from({ length: kk }, () => []);

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

      centers = centers.map((c, i) => {
        const g = groups[i];
        if (g.length === 0) return c;
        const lat = g.reduce((s, p) => s + p.lat, 0) / g.length;
        const lng = g.reduce((s, p) => s + p.lng, 0) / g.length;
        return { lat, lng };
      });
    }

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

    const g = finalGroups[bestIdx];
    const lat = g.reduce((s, p) => s + p.lat, 0) / g.length;
    const lng = g.reduce((s, p) => s + p.lng, 0) / g.length;
    return { lat, lng };
  };

  // 一覧クリックで移動
  useEffect(() => {
    const map = mapObjRef.current;
    if (!map || !selected) return;
    map.panTo({ lat: selected.lat, lng: selected.lng });
    map.setZoom(15);
  }, [selected?.lat, selected?.lng]);

  // 地図初期化＋メイン検索（店＋宿）
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey) {
      console.error("VITE_GOOGLE_MAPS_API_KEY が未設定です");
      return;
    }
    if (!mapRef.current) return;

    let cancelled = false;

    (async () => {
      await loadGoogleMaps(apiKey);
      if (cancelled) return;

      setMapReady(false);

      const map = new window.google.maps.Map(mapRef.current!, {
        center,
        zoom: 12,
      });
      mapObjRef.current = map;

      const service = new window.google.maps.places.PlacesService(map);
      serviceRef.current = service;

      setMapReady(true);

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
        markersRef.current.push(m);
      };

      // 店を取得
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

      onRestaurants?.(restaurantItems);

      clearAllMarkers();

      restaurantResults.forEach((p) => addMarker(p, "店"));

      // 密集中心
      const pts: LatLng[] = restaurantItems.map((r) => ({ lat: r.lat, lng: r.lng }));
      const denseCenter = clusterCenterByKMeans(pts, 3);

      centerMarkerRef.current = new window.google.maps.Marker({
        map,
        position: denseCenter,
        title: "密集中心（クラスタ中心）",
        icon: ICON_CENTER,
      });

      map.panTo(denseCenter);
      map.setZoom(13);

      // 宿
      const lodgingRadiusKm = 5;

      if (circleRef.current) circleRef.current.setMap(null);
      circleRef.current = new window.google.maps.Circle({
        map,
        center: denseCenter,
        radius: lodgingRadiusKm * 1000,
        fillOpacity: 0.05,
        strokeOpacity: 0.6,
        strokeWeight: 2,
      });

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

      const lodgingsFiltered = (lodgingResults || []).filter((p: any) => {
        const loc = p.geometry?.location;
        if (!loc) return false;
        const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
        const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
        return distMeters(denseCenter, { lat, lng }) <= lodgingRadiusKm * 1000;
      });

      lodgingsFiltered.forEach((p: any) => addMarker(p, "宿"));

      const lodgingItems: PlaceItem[] = lodgingsFiltered
        .map(toItem)
        .filter((x): x is PlaceItem => x !== null);

      onLodgings?.(lodgingItems);
    })().catch((e) => console.error(e));

    return () => {
      cancelled = true;

      clearAllMarkers();
      clearNearStoreMarkers();

      if (circleRef.current) circleRef.current.setMap(null);
      circleRef.current = null;

      mapObjRef.current = null;
      serviceRef.current = null;
      setMapReady(false);
    };
  }, [center.lat, center.lng, foodKeyword, radiusKm, onRestaurants, onLodgings]);

  // ✅ 近くの料理の「店舗取得だけ」追加で実行
  useEffect(() => {
    const service = serviceRef.current;
    if (!service) return;
    if (!fetchFoodId) return;
    if (!fetchFoodKeyword) return;

    let cancelled = false;

    (async () => {
      const results = await fetchNearbyAll(
        service,
        {
          location: center,
          radius: radiusKm * 1000,
          keyword: fetchFoodKeyword,
          type: "restaurant",
        },
        2
      );

      if (cancelled) return;

      const items: PlaceItem[] = results
        .map(toItem)
        .filter((x): x is PlaceItem => x !== null);

      onNearbyFoodRestaurants?.(fetchFoodId, items);
    })().catch((e) => console.error(e));

    return () => {
      cancelled = true;
    };
  }, [fetchFoodId, fetchFoodKeyword, center.lat, center.lng, radiusKm, onNearbyFoodRestaurants]);

  // ✅ 黄色ピン：nearbyStorePins（=近くの料理の店舗）に打つ
  useEffect(() => {
    if (!mapReady) return;
    const map = mapObjRef.current;
    if (!map) return;

    clearNearStoreMarkers();

    const pins = nearbyStorePins ?? [];
    if (pins.length === 0) return;

    pins.forEach((p) => {
      const m = new window.google.maps.Marker({
        map,
        position: { lat: p.lat, lng: p.lng },
        title: `近くの料理の店:${p.name}`,
        icon: ICON_NEAR_SHOP,
        zIndex: 999,
      });
      nearStoreMarkersRef.current.push(m);
    });
  }, [mapReady, JSON.stringify(nearbyStorePins ?? [])]);

  return <div ref={mapRef} className="rounded-lg h-96 w-full" />;
}

