import pandas as pd
from pathlib import Path

EXCEL = Path("src/app/dataset/データセットふりがな県名緯度経度.xlsx")
OUT = Path("src/app/data/prefSlots.ts")
PAD = 8  # %（端に寄りすぎないための余白）

df = pd.read_excel(EXCEL, header=None)
df.columns = ["food", "kana", "city", "prefecture", "specialty", "lat", "lng"]

df["city"] = df["city"].astype(str).str.strip()
df["prefecture"] = df["prefecture"].astype(str).str.strip()
df["lat"] = pd.to_numeric(df["lat"], errors="coerce")
df["lng"] = pd.to_numeric(df["lng"], errors="coerce")
df = df.dropna(subset=["lat", "lng", "city", "prefecture"])

Max_SLOTS = 30
def compute_slots(df_pref):
    counts = df_pref.groupby("city").size().sort_values(ascending=False)
    city_coords = df_pref.groupby("city")[["lat", "lng"]].mean()
    top_cities = list(counts.index[:Max_SLOTS])
    pts = city_coords.loc[top_cities].reset_index()

    minlng, maxlng = df_pref["lng"].min(), df_pref["lng"].max()
    minlat, maxlat = df_pref["lat"].min(), df_pref["lat"].max()
    dx = (maxlng - minlng) or 1e-9
    dy = (maxlat - minlat) or 1e-9

    slots = []
    for i, row in enumerate(pts.itertuples(index=False), start=1):
        x = (row.lng - minlng) / dx * (100 - 2 * PAD) + PAD
        y = (maxlat - row.lat) / dy * (100 - 2 * PAD) + PAD
        slots.append((i, round(float(x), 2), round(float(y), 2), row.city))

   

    return slots

lines = []
lines.append('export type Slot = { id: number; leftPct: number; topPct: number };')
lines.append('')
lines.append('export const PREF_SLOTS: Record<string, Slot[]> = {')

for pref in sorted(df["prefecture"].unique()):
    s = compute_slots(df[df["prefecture"] == pref])
    lines.append(f'  "{pref}": [')
    for (i, x, y, city) in s:
        comment = f" // {city}" if city else ""
        lines.append(f"    {{ id: {i}, leftPct: {x}, topPct: {y} }},{comment}")
    lines.append("  ],")

lines.append("};")
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text("\n".join(lines), encoding="utf-8")

print("Wrote:", OUT)