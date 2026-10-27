// Notionのプロパティ値をプレーンな値に変換する（設計書 2.3節）。

export function plainText(richText = []) {
  return richText.map((t) => t.plain_text ?? '').join('');
}

export function readText(prop) {
  if (!prop) return '';
  if (prop.type === 'title') return plainText(prop.title).trim();
  if (prop.type === 'rich_text') return plainText(prop.rich_text).trim();
  return '';
}

export function readCheckbox(prop) {
  return prop?.type === 'checkbox' && prop.checkbox === true;
}

export function readSelect(prop) {
  return prop?.type === 'select' ? (prop.select?.name ?? '') : '';
}

// 日付は日付部分(YYYY-MM-DD)だけを使う。時刻・タイムゾーンは採用しない。
export function readDate(prop) {
  if (prop?.type !== 'date') return null;
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(prop.date?.start ?? '');
  return m ? m[1] : null;
}

export function toHugoDate(ymd) {
  return `${ymd}T00:00:00+09:00`;
}

// 画像列（ファイル型またはURL型）から、先頭の1点のURLを返す。無ければnull。
export function readImageUrl(prop) {
  if (!prop) return null;
  if (prop.type === 'url') return prop.url || null;
  if (prop.type === 'files') {
    const f = prop.files?.[0];
    if (!f) return null;
    return (f.type === 'external' ? f.external?.url : f.file?.url) || null;
  }
  return null;
}

// 数値列の値。空・数値以外はnull。
export function readNumber(prop) {
  return prop?.type === 'number' && Number.isFinite(prop.number) ? prop.number : null;
}

// URL列の値。https:// で始まるものだけ返す。空ならnull、https以外なら { invalid: 値 }。
export function readHttpsUrl(prop) {
  const url = (prop?.type === 'url' ? prop.url : '')?.trim();
  if (!url) return null;
  return /^https:\/\/\S+$/.test(url) ? url : { invalid: url };
}
