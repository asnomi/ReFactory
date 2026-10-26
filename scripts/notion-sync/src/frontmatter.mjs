// フロントマター(YAML)付きMarkdownの生成（設計書 3.2節）。
// fields は [キー, 値] の配列で、出力順を保つ。値が undefined / null / '' / 空配列のものは出力しない。
//   string → ダブルクォート(JSON互換のエスケープ) / boolean → true,false
//   配列 → [ "a", "b" ] / { raw: '...' } → そのまま出力

function renderValue(value) {
  if (typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.map((v) => JSON.stringify(v)).join(', ')}]`;
  if (value && typeof value === 'object' && 'raw' in value) return value.raw;
  return JSON.stringify(String(value));
}

function isEmpty(value) {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function renderDocument(fields, body = '') {
  const lines = fields
    .filter(([, v]) => !isEmpty(v))
    .map(([k, v]) => `${k}: ${renderValue(v)}`);
  const head = `---\n${lines.join('\n')}\n---\n`;
  const text = body.trim();
  return text ? `${head}\n${text}\n` : head;
}
