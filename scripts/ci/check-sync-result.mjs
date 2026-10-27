// Notion同期結果の0件ガード。同期の直後・ビルドの前にCIから実行する。
//
// 空の同期結果（Notionの共有解除・公開フラグの全OFF・取得の不具合など）のままビルド・デプロイすると、
// `aws s3 sync --delete` で公開中のコンテンツが消える。作品が0件ならジョブを失敗させ、デプロイに進ませない。
//
// 件数は同期スクリプトの管理リスト（.sync-manifest.json）から数える。管理リストは「同期が作ったファイル」だけを
// 持つため、コミット済みのサンプル（content/works/*.md 等）があっても件数に混ざらない。
//
// 使い方: node scripts/ci/check-sync-result.mjs [--site-dir=<パス>]
// 環境変数: MIN_WORKS（既定1。これ未満なら失敗）、MIN_NEWS（既定0。これ未満なら警告のみ）

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MANIFEST_NAME = '.sync-manifest.json';

/** 管理リストのファイル一覧から、作品・ニュースのMarkdown件数を数える（_index.md は除く）。 */
export function countOutputs(files) {
  const count = (section) =>
    files.filter((rel) => {
      const m = new RegExp(`^content/${section}/([^/]+)\\.md$`).exec(rel);
      return m && m[1] !== '_index';
    }).length;
  return { works: count('works'), news: count('news') };
}

/** 管理リストを読む。無い・壊れている場合は例外（同期が正常に終わっていない）。 */
export function readManifestFiles(siteDir) {
  const file = path.join(siteDir, MANIFEST_NAME);
  let json;
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new Error(`${MANIFEST_NAME} を読めません（同期が実行されていない、または失敗しています）: ${err.code ?? err.message}`);
  }
  if (!Array.isArray(json.files)) throw new Error(`${MANIFEST_NAME} の形式が不正です（files 配列がありません）`);
  return json.files;
}

/** 判定。{ ok, errors, warnings, counts } を返す。 */
export function evaluate(counts, { minWorks = 1, minNews = 0 } = {}) {
  const errors = [];
  const warnings = [];
  if (counts.works < minWorks) {
    errors.push(`同期結果の作品が ${counts.works} 件です（最低 ${minWorks} 件）。空のサイトをデプロイしないよう中止します`);
  }
  if (counts.news < minNews) {
    errors.push(`同期結果のニュースが ${counts.news} 件です（最低 ${minNews} 件）`);
  } else if (counts.news === 0) {
    warnings.push('同期結果のニュースが 0 件です（意図した状態か確認してください）');
  }
  return { ok: errors.length === 0, errors, warnings, counts };
}

function intEnv(name, fallback) {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0) throw new Error(`環境変数 ${name} は0以上の整数で指定してください: ${raw}`);
  return n;
}

function main() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  let siteDir = path.resolve(here, '../../asnomi-kross-mock');
  for (const a of process.argv.slice(2)) {
    if (a.startsWith('--site-dir=')) siteDir = path.resolve(a.slice('--site-dir='.length));
    else throw new Error(`不明なオプション: ${a}`);
  }

  const counts = countOutputs(readManifestFiles(siteDir));
  const result = evaluate(counts, { minWorks: intEnv('MIN_WORKS', 1), minNews: intEnv('MIN_NEWS', 0) });

  console.log(`同期結果: 作品 ${counts.works} 件 / ニュース ${counts.news} 件`);
  for (const w of result.warnings) console.log(`::warning::${w}`);
  for (const e of result.errors) console.log(`::error::${e}`);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = ['### Notion同期結果', '', '| 種類 | 件数 |', '| --- | --- |', `| 作品 | ${counts.works} |`, `| ニュース | ${counts.news} |`, ''];
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
  }
  if (!result.ok) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (err) {
    console.error(`::error::${err.message}`);
    process.exit(1);
  }
}
