# notion-sync

NotionのDB(作品・ニュース)から、Hugoの `content/` と `assets/images/` を生成する同期スクリプト。
仕様は [設計書_Notionデータ連携.md](../../document/設計書_Notionデータ連携.md) を参照。

## 使い方(ローカル)

Node.js 20.12以上(CIは24)が必要。

```bash
cd scripts/notion-sync
npm ci
cp .env.example .env   # NOTION_API_KEY / NOTION_WORKS_DB_ID / NOTION_NEWS_DB_ID を設定する
npm run sync
```

- `npm run sync -- --dry-run` : ファイルを書かず、取得・検証・警告だけを表示する(画像もダウンロードしない)
- `npm run sync -- --site-dir=<パス>` : 出力先のサイトルートを変える(既定は `asnomi-kross-mock/`)
- `npm test` : 単体テスト(Notionには接続しない)

実行後は `asnomi-kross-mock/` で `hugo server` を起動して確認する。

## 環境変数

| 変数名 | 内容 | CI |
| --- | --- | --- |
| `NOTION_API_KEY` | Internal Integration Secret | GitHub Secrets |
| `NOTION_WORKS_DB_ID` | 作品DBのID | Secrets または Variables |
| `NOTION_NEWS_DB_ID` | ニュースDBのID | Secrets または Variables |

IntegrationのCapabilitiesは **Read content** のみ。共有する範囲は作品DBとニュースDBの2つだけにする。

## 出力

| 種類 | 出力先(`asnomi-kross-mock/` 配下) |
| --- | --- |
| 作品 | `content/works/<スラッグ>.md`、`assets/images/works/<スラッグ>.<拡張子>` |
| ニュース | `content/news/<スラッグ>.md`、`assets/images/news/<スラッグ>.<拡張子>` |
| 管理リスト | `.sync-manifest.json`(同期が作ったファイルの一覧。コミットしない) |

- `_index.md` や、同期以外で作られたファイル(サンプル等)は上書き・削除しない。同じ名前の既存ファイルがある行は、警告して出力しない。
- 前回の同期で作って、今回は出力しなかったファイル(公開OFFにした行など)は削除する。

## 終了コード

- 警告(スラッグ不正・重複・日付なし・未対応ブロック・画像取得失敗など)があっても `0`。ビルドは止めない。
- 環境変数の未設定、認証エラー、DBに接続できない、必須の列が無い場合は `1`。

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| `src/schema.mjs` | 同期する列の定義(列名・型)。Notion側の列名を変えたらここを直す |
| `src/sync.mjs` | DBの取得、検証、書き出しの流れ |
| `src/props.mjs` | Notionのプロパティ値の読み取り |
| `src/markdown.mjs` | 本文ブロック → Markdown |
| `src/images.mjs` | 画像のダウンロードと拡張子の判定 |
| `src/frontmatter.mjs` | フロントマター付きMarkdownの生成 |
| `src/slug.mjs` | スラッグの検証 |
| `src/writer.mjs` | 書き出しと管理リスト |
