// Notionのブロック → Markdown（設計書 3.4節）。
// 対応: 段落・見出し・箇条書き・番号付きリスト・画像・YouTube動画（Hugoのyoutubeショートコード）・リンクと文字装飾。未対応のブロックは警告して飛ばす。
//
// ctx:
//   listChildren(blockId) → 子ブロックの配列
//   saveImage(block)      → 保存したローカル参照パス(例 images/news/foo-1.png)。失敗時はnull
//   warn(message)         → 警告の出力

const HEADING_LEVEL = { heading_1: '##', heading_2: '###', heading_3: '####', heading_4: '#####' };

function escapeText(text) {
  return text
    .replace(/[\\`*[\]<~]/g, '\\$&')
    // 英数字に挟まれた _ は強調にならないので、そのまま(URLなどを壊さない)
    .replace(/_/g, (m, offset, s) =>
      /[A-Za-z0-9]/.test(s[offset - 1] ?? '') && /[A-Za-z0-9]/.test(s[offset + 1] ?? '') ? m : '\\_',
    );
}

// 行頭がMarkdownの記法に見える場合に、記号をエスケープする。
function escapeLineStarts(text) {
  return text
    .split('\n')
    .map((line) =>
      line
        .replace(/^(\s*)(#{1,6})(?=\s)/, '$1\\$2')
        .replace(/^(\s*)([-+>])(?=\s|$)/, '$1\\$2')
        .replace(/^(\s*\d+)([.)])(?=\s)/, '$1\\$2'),
    )
    .join('\n');
}

function renderItem(item) {
  const a = item.annotations ?? {};
  const raw = item.plain_text ?? '';
  if (!raw) return '';
  // 装飾の記号は前後の空白の外側に付ける(`** foo**` は強調にならないため)
  const [, lead, inner, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(raw);
  if (!inner) return raw;

  let body;
  if (a.code) {
    const fence = inner.includes('`') ? '``' : '`';
    body = inner.includes('`') ? `${fence} ${inner} ${fence}` : `${fence}${inner}${fence}`;
  } else {
    body = escapeText(inner);
  }
  if (a.strikethrough) body = `~~${body}~~`;
  if (a.italic) body = `*${body}*`;
  if (a.bold) body = `**${body}**`;

  const href = item.href ?? item.text?.link?.url;
  if (href) {
    const url = href.replace(/ /g, '%20').replace(/\(/g, '%28').replace(/\)/g, '%29');
    body = `[${body}](${url})`;
  }
  return `${lead}${body}${trail}`;
}

export function richTextToMarkdown(richText = []) {
  return richText.map(renderItem).join('');
}

function paragraphText(richText) {
  // 段落内の改行は、行末に空白2つを付けてMarkdownの改行にする
  return escapeLineStarts(richTextToMarkdown(richText)).replace(/\n/g, '  \n');
}

function indent(text, width) {
  const pad = ' '.repeat(width);
  return text
    .split('\n')
    .map((l) => (l ? pad + l : l))
    .join('\n');
}

// YouTubeのURL(watch・短縮・embed・shorts)から動画IDを取り出す。YouTubeでなければnull。
export function youtubeId(url) {
  let u;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m)\./, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1);
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const m = /^\/(?:embed|shorts|live)\/([^/]+)/.exec(u.pathname);
    id = m ? m[1] : u.pathname === '/watch' ? u.searchParams.get('v') : null;
  }
  return id && /^[A-Za-z0-9_-]{6,20}$/.test(id) ? id : null;
}

async function renderBlock(block, ctx) {
  const { type } = block;
  const data = block[type];

  if (type === 'paragraph') {
    const text = paragraphText(data.rich_text);
    return text.trim() ? { text, list: false } : null;
  }
  if (HEADING_LEVEL[type]) {
    const text = richTextToMarkdown(data.rich_text).replace(/\n/g, ' ').trim();
    return text ? { text: `${HEADING_LEVEL[type]} ${text}`, list: false } : null;
  }
  if (type === 'bulleted_list_item' || type === 'numbered_list_item') {
    const marker = type === 'bulleted_list_item' ? '- ' : '1. ';
    let text = marker + richTextToMarkdown(data.rich_text).replace(/\n/g, ' ').trim();
    if (block.has_children) {
      const children = await ctx.listChildren(block.id);
      const nested = await blocksToMarkdown(children, ctx);
      if (nested) text += `\n${indent(nested, marker.length)}`;
    }
    return { text, list: true };
  }
  if (type === 'image') {
    const ref = await ctx.saveImage(block);
    if (!ref) return null;
    const alt = richTextToMarkdown(data.caption).replace(/[[\]]/g, '').replace(/\n/g, ' ').trim();
    return { text: `![${alt}](${ref})`, list: false };
  }

  if (type === 'video' || type === 'embed') {
    const url = data.type === 'external' ? data.external?.url : data.url;
    const id = youtubeId(url);
    if (id) return { text: `{{< youtube ${id} >}}`, list: false };
    ctx.warn(`YouTube以外の${type}ブロックを飛ばしました`);
    return null;
  }

  ctx.warn(`未対応のブロック(${type})を飛ばしました`);
  return null;
}

export async function blocksToMarkdown(blocks, ctx) {
  const parts = [];
  for (const block of blocks) {
    const part = await renderBlock(block, ctx);
    if (part) parts.push(part);
  }
  let out = '';
  parts.forEach((part, i) => {
    if (i > 0) out += parts[i - 1].list && part.list ? '\n' : '\n\n';
    out += part.text;
  });
  return out;
}
