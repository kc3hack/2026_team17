import fs from "fs";
import path from "path";

const iconsDir = path.resolve("public/icons/food");
const outPath = path.resolve("src/app/edit/iconManifest.ts");

const files = fs.readdirSync(iconsDir).filter(f => /\.(png|svg|webp|jpg|jpeg)$/i.test(f));

const manifest = {};
for (const f of files) {
  const key = path.parse(f).name; // ramen.png -> ramen
  manifest[key] = { label: key, src: `/icons/food/${f}` };
}

const content =
`// AUTO-GENERATED. DO NOT EDIT.
export const iconManifest: Record<string, { label: string; src: string }> = ${JSON.stringify(manifest, null, 2)} as const;
`;

fs.writeFileSync(outPath, content, "utf-8");
console.log("Wrote:", outPath);