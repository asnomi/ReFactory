// Notion → Hugo 同期のエントリポイント。使い方は README.md を参照。

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from '@notionhq/client';
import { NEWS, WORKS } from './schema.mjs';
import { FatalError, Log, syncDatabase } from './sync.mjs';
import { OutputWriter } from './writer.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const defaultSiteDir = path.resolve(here, '../../../asnomi-kross-mock');

function parseArgs(argv) {
  const args = { dryRun: false, siteDir: defaultSiteDir };
  for (const a of argv) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a.startsWith('--site-dir=')) args.siteDir = path.resolve(a.slice('--site-dir='.length));
    else throw new FatalError(`不明なオプション: ${a}`);
  }
  return args;
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new FatalError(`環境変数 ${name} が設定されていません`);
  return value;
}

async function main() {
  const envFile = path.resolve(here, '../.env');
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

  const args = parseArgs(process.argv.slice(2));
  const apiKey = requireEnv('NOTION_API_KEY');
  const dbIds = { works: requireEnv(WORKS.dbEnv), news: requireEnv(NEWS.dbEnv) };

  // 429・5xx は SDK が Retry-After に従って最大5回までリトライする
  const client = new Client({
    auth: apiKey,
    timeoutMs: 60000,
    retry: { maxRetries: 5, initialRetryDelayMs: 1000, maxRetryDelayMs: 60000 },
  });

  const log = new Log();
  const writer = new OutputWriter(args.siteDir, { dryRun: args.dryRun });
  if (args.dryRun) log.info('dry-run: ファイルは書き込みません(画像のダウンロードも行いません)');

  const results = {};
  for (const def of [WORKS, NEWS]) {
    results[def.id] = await syncDatabase({ client, def, dbId: dbIds[def.id], writer, log, dryRun: args.dryRun });
  }
  const removed = writer.finalize();

  log.info('');
  log.info('--- 結果 ---');
  for (const def of [WORKS, NEWS]) {
    log.info(`${def.label}: 公開ON ${results[def.id].published}件 → 出力 ${results[def.id].written}件`);
  }
  if (removed.length) log.info(`前回の出力のうち不要になったファイル ${removed.length}件を${args.dryRun ? '削除予定' : '削除'}しました`);
  log.info(`警告: ${log.warnings.length}件`);
}

main().catch((err) => {
  if (err instanceof FatalError) console.error(`[エラー] ${err.message}`);
  else console.error(`[エラー] 予期しないエラー: ${err.code ?? err.message}`);
  process.exit(1);
});
