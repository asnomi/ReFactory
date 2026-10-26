// 同期対象の列定義（設計書 1章）。Notion側の列名を変えたときは、ここだけ直す。
// types は許容するNotionの列の型。required の列が無い・型違いの場合は致命エラーにする。

const common = {
  title: { name: 'タイトル', types: ['title'], required: true },
  slug: { name: 'スラッグ', types: ['rich_text'], required: true },
  published: { name: '公開', types: ['checkbox'], required: true },
};

export const WORKS = {
  id: 'works',
  label: '作品',
  dbEnv: 'NOTION_WORKS_DB_ID',
  contentDir: 'content/works',
  imageDir: 'assets/images/works',
  imageRef: 'images/works',
  columns: {
    ...common,
    date: { name: '頒布日', types: ['date'], required: true },
    category: { name: '種別', types: ['select'], required: false },
    description: { name: '説明文', types: ['rich_text'], required: false },
    image: { name: 'カバー画像', types: ['files', 'url'], required: false },
  },
};

export const NEWS = {
  id: 'news',
  label: 'ニュース',
  dbEnv: 'NOTION_NEWS_DB_ID',
  contentDir: 'content/news',
  imageDir: 'assets/images/news',
  imageRef: 'images/news',
  columns: {
    ...common,
    date: { name: '掲載日', types: ['date'], required: true },
    description: { name: '要約', types: ['rich_text'], required: false },
    image: { name: 'サムネイルURL', types: ['url', 'files'], required: false },
  },
};
