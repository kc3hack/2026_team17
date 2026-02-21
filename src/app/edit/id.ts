export function normalizeForId(s: string) {
  // 表記ゆれ最小限（NFKC、トリム、連続空白→1つ）
  const t = s.normalize("NFKC").trim().replace(/\s+/g, " ");
  // 記号をなるべく揃える（IDとして扱いやすく）
  // ここは「消し過ぎない」がポイント。日本語は残す。
  return t
    .replace(/[\/\\]/g, " ")         // / \ を空白へ
    .replace(/[・･]/g, " ")          // 中点ゆれ
    .replace(/\s+/g, " ");           // 再度
}

export function makeFoodId(prefCode: string, foodName: string) {
  return `${prefCode}__${normalizeForId(foodName)}`;
}