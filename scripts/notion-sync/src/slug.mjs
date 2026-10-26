// スラッグの検証（設計書 1.1節）。英小文字・数字・ハイフンのみ。先頭末尾のハイフン・連続ハイフンは不可。
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validateSlug(slug) {
  if (!slug) return 'スラッグが空です';
  if (!SLUG_RE.test(slug)) {
    return `スラッグ「${slug}」は形式違反です(使えるのは英小文字・数字・ハイフンのみ)`;
  }
  return null;
}

// 同一DB内で重複しているスラッグの集合を返す。
export function findDuplicates(slugs) {
  const seen = new Set();
  const dup = new Set();
  for (const s of slugs) {
    if (seen.has(s)) dup.add(s);
    seen.add(s);
  }
  return dup;
}
