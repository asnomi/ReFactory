// Notion APIを模したクライアントと、ネットワークを使わないfetchで、同期全体を一時ディレクトリに出力して確認する。

import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { NEWS, WORKS } from '../src/schema.mjs';
import { FatalError, Log, syncDatabase } from '../src/sync.mjs';
import { OutputWriter } from '../src/writer.mjs';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const rt = (t) => [{ plain_text: t, annotations: {} }];

const worksProps = {
  タイトル: { type: 'title' }, スラッグ: { type: 'rich_text' }, 公開: { type: 'checkbox' }, 頒布日: { type: 'date' },
  種別: { type: 'select' }, 説明文: { type: 'rich_text' }, カバー画像: { type: 'files' },
  価格: { type: 'rich_text' }, 仕様: { type: 'rich_text' }, BOOTH: { type: 'url' }, メロンブックス: { type: 'url' }, 配信URL: { type: 'url' }, 販売状況: { type: 'select' },
};
const newsProps = {
  タイトル: { type: 'title' }, スラッグ: { type: 'rich_text' }, 公開: { type: 'checkbox' }, 掲載日: { type: 'date' },
  要約: { type: 'rich_text' }, サムネイルURL: { type: 'url' },
};

function workPage(id, { title, slug, date = '2023-08-13', kind = '同人誌', cover = 'https://files.example/cover.png?sig=SECRET', extra = {} }) {
  return {
    object: 'page', id,
    properties: {
      タイトル: { type: 'title', title: rt(title) },
      スラッグ: { type: 'rich_text', rich_text: rt(slug) },
      公開: { type: 'checkbox', checkbox: true },
      頒布日: { type: 'date', date: date ? { start: date } : null },
      種別: { type: 'select', select: kind ? { name: kind } : null },
      説明文: { type: 'rich_text', rich_text: rt('説明') },
      カバー画像: { type: 'files', files: cover ? [{ type: 'file', file: { url: cover } }] : [] },
      ...extra,
    },
  };
}

function fakeClient({ props, pages, blocks = {}, failRetrieve = false }) {
  return {
    databases: {
      retrieve: async () => {
        if (failRetrieve) throw Object.assign(new Error('x'), { code: 'object_not_found' });
        return { data_sources: [{ id: 'ds' }] };
      },
    },
    dataSources: {
      retrieve: async () => ({ properties: props }),
      query: async () => ({ results: pages, has_more: false }),
    },
    blocks: { children: { list: async ({ block_id }) => ({ results: blocks[block_id] ?? [], has_more: false }) } },
  };
}

const okFetch = async () => new Response(PNG, { status: 200, headers: { 'content-type': 'image/png' } });

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'notion-sync-'));
  const log = new Log();
  const quiet = console.warn;
  console.warn = () => {};
  return { dir, log, restore: () => { console.warn = quiet; fs.rmSync(dir, { recursive: true, force: true }); } };
}

test('作品: 正常な行はMD+画像を出力、スラッグ空・形式違反・重複・日付なしは警告して出力しない', async () => {
  const { dir, log, restore } = setup();
  try {
    const pages = [
      workPage('1', { title: '正常', slug: 'ok-work' }),
      workPage('2', { title: '空', slug: '' }),
      workPage('3', { title: '大文字', slug: 'Bad_Slug' }),
      workPage('4', { title: '重複A', slug: 'dup' }),
      workPage('5', { title: '重複B', slug: 'dup' }),
      workPage('6', { title: '日付なし', slug: 'no-date', date: null }),
      workPage('7', { title: '画像なし', slug: 'no-cover', cover: null, kind: null }),
    ];
    const writer = new OutputWriter(dir);
    const res = await syncDatabase({ client: fakeClient({ props: worksProps, pages }), def: WORKS, dbId: 'db', writer, log, fetchImpl: okFetch });
    writer.finalize();

    assert.equal(res.written, 2);
    assert.equal(
      fs.readFileSync(path.join(dir, 'content/works/ok-work.md'), 'utf8'),
      '---\ntitle: "正常"\ndate: 2023-08-13T00:00:00+09:00\nimage: "images/works/ok-work.png"\ncategories: ["同人誌"]\ndescription: "説明"\ndraft: false\n---\n',
    );
    assert.deepEqual(fs.readFileSync(path.join(dir, 'assets/images/works/ok-work.png')), PNG);
    const noCover = fs.readFileSync(path.join(dir, 'content/works/no-cover.md'), 'utf8');
    assert.doesNotMatch(noCover, /image:|categories:/);
    for (const slug of ['dup', 'no-date', 'Bad_Slug', '']) {
      assert.equal(fs.existsSync(path.join(dir, `content/works/${slug}.md`)), false, slug);
    }
    const msgs = log.warnings.map((w) => `${w.scope} ${w.message}`).join('\n');
    assert.match(msgs, /空.*スラッグが空/);
    assert.match(msgs, /大文字.*形式違反/);
    assert.match(msgs, /重複A.*重複/);
    assert.match(msgs, /重複B.*重複/);
    assert.match(msgs, /日付なし.*頒布日/);
    assert.match(msgs, /画像なし.*種別が空/);
    assert.doesNotMatch(msgs, /SECRET/, '署名付きURLをログに出さない');
  } finally {
    restore();
  }
});

test('ニュース: 本文の画像をダウンロードして参照を書き換える。画像取得に失敗しても記事は出力する', async () => {
  const { dir, log, restore } = setup();
  try {
    const page = {
      object: 'page', id: 'n1',
      properties: {
        タイトル: { type: 'title', title: rt('お知らせ') }, スラッグ: { type: 'rich_text', rich_text: rt('2026-10-news') },
        公開: { type: 'checkbox', checkbox: true }, 掲載日: { type: 'date', date: { start: '2026-10-14' } },
        要約: { type: 'rich_text', rich_text: rt('要約です') }, サムネイルURL: { type: 'url', url: 'https://s3.example/broken.png' },
      },
    };
    const blocks = {
      n1: [
        { id: 'b1', type: 'paragraph', has_children: false, paragraph: { rich_text: rt('本文です') } },
        { id: 'b2', type: 'image', has_children: false, image: { type: 'file', file: { url: 'https://files.example/body.png' }, caption: [] } },
      ],
    };
    const fetchImpl = async (url) =>
      url.includes('broken') ? new Response('', { status: 403 }) : okFetch();
    const writer = new OutputWriter(dir);
    await syncDatabase({ client: fakeClient({ props: newsProps, pages: [page], blocks }), def: NEWS, dbId: 'db', writer, log, fetchImpl });
    writer.finalize();

    assert.equal(
      fs.readFileSync(path.join(dir, 'content/news/2026-10-news.md'), 'utf8'),
      '---\ntitle: "お知らせ"\ndate: 2026-10-14T00:00:00+09:00\ndescription: "要約です"\ndraft: false\n---\n\n本文です\n\n![](images/news/2026-10-news-1.png)\n',
    );
    assert.equal(fs.existsSync(path.join(dir, 'assets/images/news/2026-10-news-1.png')), true);
    assert.match(log.warnings.map((w) => w.message).join('\n'), /画像を取得できませんでした\(HTTP 403\)/);
  } finally {
    restore();
  }
});

test('既存ファイルの扱い: 管理外のファイルは上書きせず、前回の出力で不要になったものだけ消す', async () => {
  const { dir, log, restore } = setup();
  try {
    const works = path.join(dir, 'content/works');
    fs.mkdirSync(works, { recursive: true });
    fs.writeFileSync(path.join(works, '_index.md'), 'index');
    fs.writeFileSync(path.join(works, 'sample.md'), 'サンプル');

    // 1回目: sample は管理外なので上書きしない。fresh は出力する
    let writer = new OutputWriter(dir);
    await syncDatabase({
      client: fakeClient({ props: worksProps, pages: [workPage('1', { title: 'S', slug: 'sample', cover: null }), workPage('2', { title: 'F', slug: 'fresh', cover: null })] }),
      def: WORKS, dbId: 'db', writer, log, fetchImpl: okFetch,
    });
    writer.finalize();
    assert.equal(fs.readFileSync(path.join(works, 'sample.md'), 'utf8'), 'サンプル');
    assert.equal(fs.existsSync(path.join(works, 'fresh.md')), true);
    assert.match(log.warnings[0].message, /既存ファイル/);

    // 2回目: fresh が非公開になった(結果に出ない) → fresh だけ削除。_index.md と sample.md は残る
    writer = new OutputWriter(dir);
    await syncDatabase({ client: fakeClient({ props: worksProps, pages: [] }), def: WORKS, dbId: 'db', writer, log, fetchImpl: okFetch });
    const removed = writer.finalize();
    assert.deepEqual(removed, ['content/works/fresh.md']);
    assert.equal(fs.existsSync(path.join(works, 'fresh.md')), false);
    assert.equal(fs.readFileSync(path.join(works, '_index.md'), 'utf8'), 'index');
    assert.equal(fs.readFileSync(path.join(works, 'sample.md'), 'utf8'), 'サンプル');
  } finally {
    restore();
  }
});

test('致命エラー: DBに接続できない・必須列がない場合は FatalError', async () => {
  const { dir, log, restore } = setup();
  try {
    const writer = new OutputWriter(dir);
    await assert.rejects(
      syncDatabase({ client: fakeClient({ props: worksProps, pages: [], failRetrieve: true }), def: WORKS, dbId: 'db', writer, log }),
      (e) => e instanceof FatalError && /接続できません/.test(e.message),
    );
    const { スラッグ, ...withoutSlug } = worksProps;
    await assert.rejects(
      syncDatabase({ client: fakeClient({ props: withoutSlug, pages: [] }), def: WORKS, dbId: 'db', writer, log }),
      (e) => e instanceof FatalError && /スラッグ/.test(e.message),
    );
  } finally {
    restore();
  }
});

test('dry-run: ファイルを書かない', async () => {
  const { dir, log, restore } = setup();
  try {
    const writer = new OutputWriter(dir, { dryRun: true });
    const res = await syncDatabase({
      client: fakeClient({ props: worksProps, pages: [workPage('1', { title: 'A', slug: 'a' })] }),
      def: WORKS, dbId: 'db', writer, log, dryRun: true,
    });
    writer.finalize();
    assert.equal(res.written, 1);
    assert.deepEqual(fs.readdirSync(dir), []);
  } finally {
    restore();
  }
});

test('作品: 価格・仕様・販売先・販売状況を出力、不正な値はその項目だけ警告して出さない', async () => {
  const { dir, log, restore } = setup();
  try {
    const url = (u) => ({ type: 'url', url: u });
    const pages = [
      workPage('1', {
        title: '全部', slug: 'full', cover: null,
        extra: {
          価格: { type: 'rich_text', rich_text: rt('800円') },
          仕様: { type: 'rich_text', rich_text: rt('A5 フルカラー\n28ページ') },
          BOOTH: url('https://x.booth.pm/items/1'),
          メロンブックス: url('http://melon.example/1'),
          配信URL: url(null),
          販売状況: { type: 'select', select: { name: '販売中' } },
        },
      }),
      workPage('2', { title: '対象外', slug: 'other', cover: null, extra: { 販売状況: { type: 'select', select: { name: '停止中' } } } }),
    ];
    const writer = new OutputWriter(dir);
    await syncDatabase({ client: fakeClient({ props: worksProps, pages }), def: WORKS, dbId: 'db', writer, log, fetchImpl: okFetch });
    const full = fs.readFileSync(path.join(dir, 'content/works/full.md'), 'utf8');
    assert.ok(
      full.includes(
        'description: "説明"\nprice: "800円"\nspec: "A5 フルカラー\\n28ページ"\nshops:\n  booth: "https://x.booth.pm/items/1"\nsale_status: "販売中"\ndraft: false\n',
      ),
      full,
    );
    assert.doesNotMatch(full, /melonbooks|streaming/);
    const other = fs.readFileSync(path.join(dir, 'content/works/other.md'), 'utf8');
    assert.doesNotMatch(other, /sale_status|shops|price|spec/);
    const msgs = log.warnings.map((w) => w.message);
    assert.ok(msgs.some((m) => /メロンブックス.*https/.test(m)));
    assert.ok(msgs.some((m) => /販売状況「停止中」/.test(m)));
  } finally {
    restore();
  }
});
