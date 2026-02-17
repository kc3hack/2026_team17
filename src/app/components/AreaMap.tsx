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
  center: LatLng;
  foodKeyword: string;
  radiusKm?: number;

  onRestaurants?: (items: PlaceItem[]) => void;
  onLodgings?: (items: PlaceItem[]) => void;
};

declare global {
  interface Window {
    google: any;
  }
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // すでに読み込み済みなら終了
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Maps load error"));
    document.head.appendChild(script);
  });
}

export default function AreaMap({ center, foodKeyword, radiusKm = 10 }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey) {
      console.error("VITE_GOOGLE_MAPS_API_KEY が未設定です");
      return;
    }
    if (!mapRef.current) return;

    let markers: any[] = [];
    let circle: any | null = null;

    (async () => {
      await loadGoogleMaps(apiKey);

      const map = new window.google.maps.Map(mapRef.current!, {
        center,
        zoom: 12,
      });

      // 中心マーカー
      new window.google.maps.Marker({
        map,
        position: center,
        title: "中心",
      });

      // 半径円（10km）
      circle = new window.google.maps.Circle({
        map,
        center,
        radius: radiusKm * 1000,
        fillOpacity: 0.05,
        strokeOpacity: 0.6,
        strokeWeight: 2,
      });

      const service = new window.google.maps.places.PlacesService(map);

      const addMarker = (place: any, label: string) => {
        if (!place.geometry?.location) return;
        const m = new window.google.maps.Marker({
          map,
          position: place.geometry.location,
          title: `${label}:${place.name}`,
        });
        markers.push(m);
      };

      // 店（restaurant）
      service.nearbySearch(
        {
          location: center,
          radius: radiusKm * 1000,
          keyword: foodKeyword,
          type: "restaurant",
        },
        (results: any[], status: string) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            results.forEach((p) => addMarker(p, "店"));
          } else {
            console.warn("restaurant search:", status);
          }
        }
      );

      // 宿（lodging）
      service.nearbySearch(
        {
          location: center,
          radius: radiusKm * 1000,
          type: "lodging",
        },
        (results: any[], status: string) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK) {
            results.forEach((p) => addMarker(p, "宿"));
          } else {
            console.warn("lodging search:", status);
          }
        }
      );
    })();

    return () => {
      // cleanup
      markers.forEach((m) => m.setMap(null));
      if (circle) circle.setMap(null);
    };
  }, [center.lat, center.lng, foodKeyword, radiusKm]);

  return <div ref={mapRef} className="rounded-lg h-96 w-full" />;
}
