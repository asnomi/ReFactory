// 画像のダウンロード（設計書 4章）。
// Notionの署名付きURLは約1時間で失効するため、取得したらその場でダウンロードする。

const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED = new Set(['jpg', 'png', 'gif', 'webp', 'avif', 'svg']);
const MIME_EXT = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
};

function sniffExtension(buf) {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.subarray(0, 6).toString('latin1'))) return 'gif';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  if (buf.length >= 12 && buf.subarray(4, 8).toString('latin1') === 'ftyp' && /^avi[fs]$/.test(buf.subarray(8, 12).toString('latin1'))) return 'avif';
  if (/^\s*(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)?<svg[\s>]/i.test(buf.subarray(0, 512).toString('utf8'))) return 'svg';
  return null;
}

// 拡張子の判定: ファイルの中身 → Content-Type → URLのパス末尾 の順。
export function pickExtension(buf, contentType, url) {
  const sniffed = sniffExtension(buf);
  if (sniffed) return sniffed;
  const mime = (contentType ?? '').split(';')[0].trim().toLowerCase();
  if (MIME_EXT[mime]) return MIME_EXT[mime];
  try {
    const m = /\.([A-Za-z0-9]+)$/.exec(new URL(url).pathname);
    const ext = m?.[1].toLowerCase().replace('jpeg', 'jpg');
    if (ext && ALLOWED.has(ext)) return ext;
  } catch {
    // URLとして解釈できない場合は判定不能
  }
  return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 画像をダウンロードして { buffer, ext } を返す。失敗時は Error を投げる。
 * タイムアウト30秒、5xx・429・通信エラーは最大3回まで試す。
 */
export async function downloadImage(url, { fetchImpl = fetch, timeoutMs = 30000, attempts = 3, retryDelayMs = 1000 } = {}) {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`);
        err.retryable = res.status === 429 || res.status >= 500;
        throw err;
      }
      const declared = Number(res.headers.get('content-length'));
      if (declared > MAX_BYTES) throw Object.assign(new Error('容量が大きすぎます'), { retryable: false });
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length > MAX_BYTES) throw Object.assign(new Error('容量が大きすぎます'), { retryable: false });
      const ext = pickExtension(buffer, res.headers.get('content-type'), url);
      if (!ext) throw Object.assign(new Error('画像の形式を判定できません'), { retryable: false });
      return { buffer, ext };
    } catch (err) {
      lastError = err;
      if (err.retryable === false || i === attempts) break;
      await sleep(retryDelayMs * i);
    }
  }
  throw lastError;
}
