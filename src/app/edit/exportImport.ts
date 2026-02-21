import type { PlacementStore } from "./types";

export function downloadJson(data: PlacementStore) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "placements.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function readJsonFile(file: File): Promise<PlacementStore> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      try {
        resolve(JSON.parse(String(fr.result)));
      } catch (e) {
        reject(e);
      }
    };
    fr.onerror = reject;
    fr.readAsText(file);
  });
}