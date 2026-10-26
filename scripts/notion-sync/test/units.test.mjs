import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderDocument } from '../src/frontmatter.mjs';
import { pickExtension } from '../src/images.mjs';
import { blocksToMarkdown, richTextToMarkdown } from '../src/markdown.mjs';
import { readDate, readImageUrl, toHugoDate } from '../src/props.mjs';
import { findDuplicates, validateSlug } from '../src/slug.mjs';

const rt = (text, annotations = {}, href = null) => ({ plain_text: text, annotations, href });

test('スラッグ: 英小文字・数字・ハイフンだけ許可', () => {
  assert.equal(validateSlug('aotaiken'), null);
  assert.equal(validateSlug('dropout-after-2'), null);
  assert.match(validateSlug(''), /空/);
  for (const bad of ['Aotaiken', 'a_b', 'a b', '-a', 'a-', 'a--b', '作品', 'a/b']) {
    assert.match(validateSlug(bad), /形式違反/, bad);
  }
});

test('スラッグ: 重複を検出', () => {
  assert.deepEqual([...findDuplicates(['a', 'b', 'a', 'c', 'b'])].sort(), ['a', 'b']);
  assert.equal(findDuplicates(['a', 'b']).size, 0);
});

test('日付: 日付部分だけ使い、T00:00:00+09:00に揃える', () => {
  assert.equal(readDate({ type: 'date', date: { start: '2023-08-13' } }), '2023-08-13');
  assert.equal(readDate({ type: 'date', date: { start: '2023-08-13T23:30:00.000+09:00' } }), '2023-08-13');
  assert.equal(readDate({ type: 'date', date: null }), null);
  assert.equal(toHugoDate('2023-08-13'), '2023-08-13T00:00:00+09:00');
});

test('画像列: ファイル型・URL型の先頭1点', () => {
  const files = { type: 'files', files: [{ type: 'file', file: { url: 'https://x/a.png' } }, { type: 'file', file: { url: 'https://x/b.png' } }] };
  assert.equal(readImageUrl(files), 'https://x/a.png');
  assert.equal(readImageUrl({ type: 'files', files: [{ type: 'external', external: { url: 'https://e/c.png' } }] }), 'https://e/c.png');
  assert.equal(readImageUrl({ type: 'files', files: [] }), null);
  assert.equal(readImageUrl({ type: 'url', url: 'https://s3/d.jpg' }), 'https://s3/d.jpg');
  assert.equal(readImageUrl({ type: 'url', url: null }), null);
});

test('フロントマター: 空の値は出さず、文字列はエスケープ', () => {
  const doc = renderDocument([
    ['title', 'He said "hi" \\ ok'],
    ['date', { raw: '2023-08-13T00:00:00+09:00' }],
    ['image', null],
    ['categories', ['同人誌']],
    ['description', ''],
    ['draft', false],
  ]);
  assert.equal(
    doc,
    '---\ntitle: "He said \\"hi\\" \\\\ ok"\ndate: 2023-08-13T00:00:00+09:00\ncategories: ["同人誌"]\ndraft: false\n---\n',
  );
  assert.ok(renderDocument([['title', 'a']], '本文').endsWith('---\n\n本文\n'));
});

test('画像の拡張子: 中身 → Content-Type → URL の順で判定', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
  assert.equal(pickExtension(png, 'binary/octet-stream', 'https://x/a'), 'png');
  const unknown = Buffer.from('????????');
  assert.equal(pickExtension(unknown, 'image/webp', 'https://x/a'), 'webp');
  assert.equal(pickExtension(unknown, 'binary/octet-stream', 'https://x/p/a.JPEG?sig=1'), 'jpg');
  assert.equal(pickExtension(unknown, 'text/html', 'https://x/a'), null);
  assert.equal(pickExtension(Buffer.from('<svg xmlns="x"></svg>'), '', 'https://x/a'), 'svg');
});

test('リッチテキスト: 装飾・リンク・エスケープ', () => {
  assert.equal(richTextToMarkdown([rt('太字', { bold: true })]), '**太字**');
  assert.equal(richTextToMarkdown([rt(' 前後 ', { bold: true, italic: true })]), ' ***前後*** ');
  assert.equal(richTextToMarkdown([rt('取消', { strikethrough: true })]), '~~取消~~');
  assert.equal(richTextToMarkdown([rt('コード', { code: true })]), '`コード`');
  assert.equal(richTextToMarkdown([rt('サイト', {}, 'https://e.com/a_(b)')]), '[サイト](https://e.com/a_%28b%29)');
  assert.equal(richTextToMarkdown([rt('a*b [c] `d` snake_case _x_ 10~20')]), 'a\\*b \\[c\\] \\`d\\` snake_case \\_x\\_ 10\\~20');
});

const block = (type, text, extra = {}) => ({ id: `${type}-${text}`, type, has_children: false, [type]: { rich_text: [rt(text)], ...extra } });

function makeCtx(childMap = {}) {
  const warnings = [];
  return {
    warnings,
    listChildren: async (id) => childMap[id] ?? [],
    saveImage: async () => 'images/news/slug-1.png',
    warn: (m) => warnings.push(m),
  };
}

test('本文: 段落・見出し・リスト・画像・未対応ブロック', async () => {
  const parent = { ...block('bulleted_list_item', '親'), has_children: true, id: 'p' };
  const ctx = makeCtx({ p: [block('bulleted_list_item', '子'), block('numbered_list_item', '番号')] });
  const blocks = [
    block('heading_1', '大見出し'),
    block('paragraph', '一行目\n二行目'),
    block('paragraph', ''),
    parent,
    block('bulleted_list_item', '次'),
    block('paragraph', '- 行頭の記号'),
    { id: 'i', type: 'image', has_children: false, image: { type: 'file', file: { url: 'https://x/a.png' }, caption: [rt('図1')] } },
    { id: 'q', type: 'quote', has_children: false, quote: { rich_text: [rt('引用')] } },
  ];
  const md = await blocksToMarkdown(blocks, ctx);
  assert.equal(
    md,
    ['## 大見出し', '', '一行目  \n二行目', '', '- 親\n  - 子\n  1. 番号\n- 次', '', '\\- 行頭の記号', '', '![図1](images/news/slug-1.png)'].join('\n'),
  );
  assert.deepEqual(ctx.warnings, ['未対応のブロック(quote)を飛ばしました']);
});

test('本文: 画像の保存に失敗したブロックは出力しない', async () => {
  const ctx = { ...makeCtx(), saveImage: async () => null };
  const md = await blocksToMarkdown(
    [{ id: 'i', type: 'image', has_children: false, image: { type: 'file', file: { url: 'u' }, caption: [] } }, block('paragraph', '本文')],
    ctx,
  );
  assert.equal(md, '本文');
});
