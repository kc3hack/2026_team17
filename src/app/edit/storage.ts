import type { PlacementStore } from "./types";

const KEY = "pref-map-editor:v1";

export function loadStore(): PlacementStore {
  const raw = localStorage.getItem(KEY);
  if (!raw) return { version: 1, placementsByPref: {} };
  try {
    return JSON.parse(raw);
  } catch {
    return { version: 1, placementsByPref: {} };
  }
}

export function saveStore(store: PlacementStore) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function clearStore() {
  localStorage.removeItem(KEY);
}