// src/app/components/placeSearch.ts
export type LatLng = { lat: number; lng: number };

export type PlaceItem = {
  id: string;
  name: string;
  rating?: number;
  address?: string;
  lat: number;
  lng: number;
};

declare global {
  interface Window {
    google: any;
  }
}

export function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) return resolve();

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

export function toItem(p: any): PlaceItem | null {
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
}

export function clusterCenterByKMeans(pts: LatLng[], fallback: LatLng, k = 3): LatLng {
  if (pts.length === 0) return fallback;
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
        if (d < bestD) { bestD = d; best = i; }
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
      if (d < bestD) { bestD = d; best = i; }
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
}

export function distMeters(a: LatLng, b: LatLng): number {
  return window.google.maps.geometry.spherical.computeDistanceBetween(
    new window.google.maps.LatLng(a.lat, a.lng),
    new window.google.maps.LatLng(b.lat, b.lng)
  );
}

export function fetchNearbyAll(service: any, req: any, maxPages = 3): Promise<any[]> {
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
}

export async function searchRestaurantsAndLodgings(opts: {
  map: any;               // PlacesServiceのために必要
  center: LatLng;
  foodKeyword: string;
  radiusKm: number;       // 店
  lodgingRadiusKm?: number; // 宿
}) {
  const { map, center, foodKeyword, radiusKm } = opts;
  const lodgingRadiusKm = opts.lodgingRadiusKm ?? 5;

  const service = new window.google.maps.places.PlacesService(map);

  const restaurantResults = await fetchNearbyAll(service, {
    location: center,
    radius: radiusKm * 1000,
    keyword: foodKeyword,
    type: "restaurant",
  }, 3);

  const restaurants = restaurantResults
    .map(toItem)
    .filter((x): x is PlaceItem => x !== null);

  const pts = restaurants.map(r => ({ lat: r.lat, lng: r.lng }));
  const denseCenter = clusterCenterByKMeans(pts, center, 3);

  const lodgingResults = await fetchNearbyAll(service, {
    location: denseCenter,
    radius: lodgingRadiusKm * 1000,
    type: "lodging",
  }, 3);

  const lodgingsFiltered = lodgingResults.filter((p: any) => {
    const loc = p.geometry?.location;
    if (!loc) return false;
    const lat = typeof loc.lat === "function" ? loc.lat() : loc.lat;
    const lng = typeof loc.lng === "function" ? loc.lng() : loc.lng;
    return distMeters(denseCenter, { lat, lng }) <= lodgingRadiusKm * 1000;
  });

  const lodgings = lodgingsFiltered
    .map(toItem)
    .filter((x): x is PlaceItem => x !== null);

  return {
    restaurantResults,      // 描画用（Marker位置に使える）
    lodgingResults: lodgingsFiltered,
    restaurants,
    lodgings,
    denseCenter,
    lodgingRadiusKm,
  };
}
