import { useEffect, useRef } from "react";
import {
  loadGoogleMaps,
  searchRestaurantsAndLodgings,
  type LatLng,
  type PlaceItem,
} from "../../services/placeSearch";

type Props = {
  center: LatLng;
  foodKeyword: string;
  radiusKm?: number;
  onRestaurants?: (items: PlaceItem[]) => void;
  onLodgings?: (items: PlaceItem[]) => void;
  selected?: { lat: number; lng: number; title?: string; kind?: "restaurant" | "lodging" };
};

export default function AreaMap({ center, foodKeyword, radiusKm = 10, onRestaurants, onLodgings, selected }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObjRef = useRef<any | null>(null);

  useEffect(() => {
    const map = mapObjRef.current;
    if (!map || !selected) return;
    map.panTo({ lat: selected.lat, lng: selected.lng });
    map.setZoom(15);
  }, [selected?.lat, selected?.lng]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
    if (!apiKey || !mapRef.current) return;

    let cancelled = false;

    let markers: any[] = [];
    let circle: any | null = null;
    let centerMarker: any | null = null;

    const ICON_SHOP = "https://maps.google.com/mapfiles/ms/icons/blue-dot.png";
    const ICON_HOTEL = "https://maps.google.com/mapfiles/ms/icons/green-dot.png";
    const ICON_CENTER = "https://maps.google.com/mapfiles/ms/icons/red-dot.png";

    const clearMarkers = () => {
      markers.forEach((m) => m.setMap(null));
      markers = [];
      if (centerMarker) { centerMarker.setMap(null); centerMarker = null; }
    };

    const addMarker = (place: any, kind: "店" | "宿") => {
      const loc = place.geometry?.location;
      if (!loc) return;
      const icon = kind === "宿" ? ICON_HOTEL : ICON_SHOP;
      const m = new window.google.maps.Marker({ map: mapObjRef.current!, position: loc, title: `${kind}:${place.name}`, icon });
      markers.push(m);
    };

    (async () => {
      await loadGoogleMaps(apiKey);
      if (cancelled) return;

      const map = new window.google.maps.Map(mapRef.current!, { center, zoom: 12 });
      mapObjRef.current = map;

      new window.google.maps.Marker({ map, position: center, title: "地域中心（初期）" });

      const result = await searchRestaurantsAndLodgings({
        map,
        center,
        foodKeyword,
        radiusKm,
        lodgingRadiusKm: 5,
      });
      if (cancelled) return;

      onRestaurants?.(result.restaurants);
      onLodgings?.(result.lodgings);

      clearMarkers();
      result.restaurantResults.forEach((p: any) => addMarker(p, "店"));

      centerMarker = new window.google.maps.Marker({
        map,
        position: result.denseCenter,
        title: "密集中心（クラスタ中心）",
        icon: ICON_CENTER,
      });

      map.panTo(result.denseCenter);
      map.setZoom(13);

      if (circle) circle.setMap(null);
      circle = new window.google.maps.Circle({
        map,
        center: result.denseCenter,
        radius: result.lodgingRadiusKm * 1000,
        fillOpacity: 0.05,
        strokeOpacity: 0.6,
        strokeWeight: 2,
      });

      result.lodgingResults.forEach((p: any) => addMarker(p, "宿"));
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
