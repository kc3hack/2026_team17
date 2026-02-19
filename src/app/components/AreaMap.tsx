import { useEffect, useMemo, useRef, useState } from "react";

type LatLng = { lat: number; lng: number };

export type PlaceItem = {
  id: string; // place_id
  name: string;
  rating?: number;
  address?: string;
  lat: number;
  lng: number;
};

type Props = {
  center: LatLng;
  foodKeyword: string;
  radiusKm?: number;

  onRestaurants?: (items: PlaceItem[]) => void;
  onLodgings?: (items: PlaceItem[]) => void;

  selected?: {
    id?: string;
    lat: number;
    lng: number;
    title?: string;
    kind?: "restaurant" | "lodging";
  };

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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps load error"));
    document.head.appendChild(script);
  });
}

/**
 * ✅ Maps読み込み後に OverlayView クラスを作る（読み込み前に window.google を触らない）
 */
function createTextLabelOverlayClass() {
  class TextLabelOverlay extends window.google.maps.OverlayView {
    private div: HTMLDivElement | null = null;
    private position: any = null;
    private text = "";
    private offsetX = 14;
    private offsetY = -32;

    constructor(opts: {
      position: { lat: number; lng: number };
      text: string;
      offsetX?: number;
      offsetY?: number;
    }) {
      super();
      this.position = new window.google.maps.LatLng(opts.position.lat, opts.position.lng);
      this.text = opts.text;
      if (typeof opts.offsetX === "number") this.offsetX = opts.offsetX;
      if (typeof opts.offsetY === "number") this.offsetY = opts.offsetY;
    }

    onAdd() {
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.transform = "translate(0, 0)";
      div.style.pointerEvents = "none";

      // ✅ 白枠なし（四角い背景なし）
      div.style.background = "transparent";
      div.style.border = "none";
      div.style.padding = "0";
      div.style.margin = "0";

      // ✅ オレンジ文字
      div.style.color = "#ff7a00";
      div.style.fontWeight = "800";
      div.style.fontSize = "14px";
      div.style.lineHeight = "1.2";
      div.style.whiteSpace = "nowrap";

      // ✅ 白い縁取り（アウトライン風）：text-shadow を8方向に重ねる
      // これなら「白枠（四角）」ではなく「文字の縁が白」になる
      div.style.textShadow = [
        "1px 0 0 #fff",
        "-1px 0 0 #fff",
        "0 1px 0 #fff",
        "0 -1px 0 #fff",
        "1px 1px 0 #fff",
        "-1px 1px 0 #fff",
        "1px -1px 0 #fff",
        "-1px -1px 0 #fff",
        "0 2px 3px rgba(255,255,255,0.85)", // ちょい補助
      ].join(",");

      div.innerText = this.text;
      this.div = div;

      const panes = this.getPanes();
      panes?.floatPane?.appendChild(div);
    }

    draw() {
      if (!this.div) return;
      const projection = this.getProjection();
      if (!projection) return;

      const point = projection.fromLatLngToDivPixel(this.position);
      if (!point) return;

      this.div.style.left = `${point.x + this.offsetX}px`;
      this.div.style.top = `${point.y + this.offsetY}px`;
    }

    onRemove() {
      if (this.div?.parentNode) this.div.parentNode.removeChild(this.div);
      this.div = null;
    }

    setText(text: string) {
      this.text = text;
      if (this.div) this.div.innerText = text;
    }

    setPosition(pos: { lat: number; lng: number }) {
      this.position = new window.google.maps.LatLng(pos.lat, pos.lng);
      this.draw();
    }

    setOffsets(offsetX: number, offsetY: number) {
      this.offsetX = offsetX;
      this.offsetY = offsetY;
      this.draw();
    }
  }

  return TextLabelOverlay;
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
  const nearStoreMarkersRef = useRef<any[]>([]);

  const markerByPlaceIdRef = useRef<Map<string, any>>(new Map());
  const activePlaceIdRef = useRef<string | null>(null);

  // ✅ ホバー吹き出し（維持）
  const hoverInfoRef = useRef<any | null>(null);

  // ✅ クリック選択時の「文字だけ」Overlay（白枠なし）
  const selectedLabelRef = useRef<any | null>(null);

  // ✅ OverlayView クラス（Mapsロード後に作成して保持）
  const TextLabelOverlayRef = useRef<any | null>(null);

  const ICON_SHOP = "https://maps.google.com/mapfiles/ms/icons/blue-dot.png";
  const ICON_HOTEL = "https://maps.google.com/mapfiles/ms/icons/green-dot.png";
  const ICON_CENTER = "https://maps.google.com/mapfiles/ms/icons/red-dot.png";
  const ICON_NEAR_SHOP = "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png";

  const clearAllMarkers = () => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    markerByPlaceIdRef.current.clear();

    if (centerMarkerRef.current) {
      centerMarkerRef.current.setMap(null);
      centerMarkerRef.current = null;
    }

    activePlaceIdRef.current = null;
  };

  const clearNearStoreMarkers = () => {
    nearStoreMarkersRef.current.forEach((m) => m.setMap(null));
    nearStoreMarkersRef.current = [];
  };

  const removeSelectedLabel = () => {
    if (selectedLabelRef.current) {
      selectedLabelRef.current.setMap(null);
      selectedLabelRef.current = null;
    }
  };

  const toItem = (p: any): PlaceItem | null => {
    const loc = p.geometry?.location;
    if (!loc) return null;

    const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
    const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;

    if (!p.place_id) return null;

    return {
      id: p.place_id,
      name: p.name ?? "",
      rating: typeof p.rating === "number" ? p.rating : undefined,
      address: p.vicinity ?? p.formatted_address ?? "",
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

  const clearHighlight = (placeId: string) => {
    const m = markerByPlaceIdRef.current.get(placeId);
    if (!m) return;

    m.setIcon(m.__baseIcon ?? null);
    if (typeof m.setZIndex === "function") m.setZIndex(m.__baseZIndex ?? 1);
    if (typeof m.setAnimation === "function") m.setAnimation(null);
  };

  // ✅ クリック時：オレンジ丸 + 文字Overlay（白縁取り）
  const setHighlightWithTextOverlay = (placeId: string, labelText?: string) => {
    const map = mapObjRef.current;
    const m = markerByPlaceIdRef.current.get(placeId);
    if (!map || !m) return;

    // 前の強調解除
    if (activePlaceIdRef.current && activePlaceIdRef.current !== placeId) {
      clearHighlight(activePlaceIdRef.current);
    }

    if (!m.__baseIcon) m.__baseIcon = m.getIcon();
    if (!m.__baseZIndex) m.__baseZIndex = m.getZIndex?.() ?? 1;

    // オレンジ丸
    m.setZIndex(9999);
    m.setIcon({
      path: window.google.maps.SymbolPath.CIRCLE,
      fillColor: "#ff7a00",
      fillOpacity: 1,
      strokeColor: "#ffffff",
      strokeWeight: 2,
      scale: 10,
    });

    if (typeof m.setAnimation === "function") {
      m.setAnimation(window.google.maps.Animation.BOUNCE);
      setTimeout(() => m.setAnimation(null), 650);
    }

    activePlaceIdRef.current = placeId;

    const text = (labelText ?? "").trim();
    if (!text) return;

    const pos = m.getPosition?.();
    if (!pos) return;

    // 常に1個だけ
    removeSelectedLabel();

    const OverlayClass = TextLabelOverlayRef.current;
    if (!OverlayClass) return;

    // ✅ ピンと被らない位置（ここを調整）
    const overlay = new OverlayClass({
      position: { lat: pos.lat(), lng: pos.lng() },
      text,
      offsetX: 16,
      offsetY: -36,
    });

    overlay.setMap(map);
    selectedLabelRef.current = overlay;
  };

  // 一覧クリックで移動＋強調＋文字だけ表示
  useEffect(() => {
    const map = mapObjRef.current;
    if (!map || !selected) return;

    map.panTo({ lat: selected.lat, lng: selected.lng });
    map.setZoom(15);

    if (selected.id) {
      setHighlightWithTextOverlay(selected.id, selected.title);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.lat, selected?.lng, selected?.id, selected?.title]);

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

      // ✅ Mapsロード後に Overlay クラスを作る
      TextLabelOverlayRef.current = createTextLabelOverlayClass();

      setMapReady(false);

      const map = new window.google.maps.Map(mapRef.current!, {
        center,
        zoom: 12,
      });
      mapObjRef.current = map;

      const service = new window.google.maps.places.PlacesService(map);
      serviceRef.current = service;

      hoverInfoRef.current = new window.google.maps.InfoWindow({
        disableAutoPan: true,
      });

      map.addListener("click", () => {
        removeSelectedLabel();
      });

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

        if (place.place_id) {
          m.__baseIcon = icon;
          m.__baseZIndex = 1;
          markerByPlaceIdRef.current.set(place.place_id, m);
        }

        // ホバー吹き出し（維持）
        m.addListener("mouseover", () => {
          const iw = hoverInfoRef.current;
          if (!iw) return;
          iw.setContent(
            `<div style="font-weight:700;font-size:13px;line-height:1.2;">${place.name ?? ""}</div>`
          );
          iw.open({ map, anchor: m, shouldFocus: false });
        });

        m.addListener("mouseout", () => {
          hoverInfoRef.current?.close?.();
        });

        markersRef.current.push(m);
      };

      // 店
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

      hoverInfoRef.current?.close?.();
      hoverInfoRef.current = null;

      removeSelectedLabel();

      mapObjRef.current = null;
      serviceRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center.lat, center.lng, foodKeyword, radiusKm]);

  // 近くの料理の「店舗取得だけ」追加
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

  // 黄色ピン：nearbyStorePins に打つ（ホバー吹き出し + 強調登録も）
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

      if (p.id) {
        m.__baseIcon = ICON_NEAR_SHOP;
        m.__baseZIndex = 999;
        markerByPlaceIdRef.current.set(p.id, m);
      }

      m.addListener("mouseover", () => {
        const iw = hoverInfoRef.current;
        if (!iw) return;
        iw.setContent(
          `<div style="font-weight:700;font-size:13px;line-height:1.2;">${p.name}</div>`
        );
        iw.open({ map, anchor: m, shouldFocus: false });
      });

      m.addListener("mouseout", () => {
        hoverInfoRef.current?.close?.();
      });

      nearStoreMarkersRef.current.push(m);
    });
  }, [mapReady, JSON.stringify(nearbyStorePins ?? [])]);

  return <div ref={mapRef} className="rounded-lg h-96 w-full" />;
}