// デプロイ時の照合（改ざん検知）。deployジョブから呼び出す。Issue #45。
//
//   verify : デプロイの前に、バケットの今の状態を前回の記録と照合する。差分（追加・変更・削除）があれば一覧を出し、
//            GITHUB_OUTPUT に drift=true を書く。デプロイは止めない（直後のデプロイで正しい中身に戻し、最後にジョブを失敗させる）。
//            前回の記録が無い場合は照合を飛ばして警告だけ出す（skipped=true）。
//   record : デプロイの後に、バケットのファイル一覧とハッシュ値（S3のETag）を記録ファイルに書く。
//            --local-dir を渡すと、デプロイしたファイルのMD5とETagが一致するかも確認する（一致しなければ失敗）。
//
// ETag は、暗号化が SSE-S3（AES256）で、マルチパートアップロードでないオブジェクトならMD5と一致する。
// 一覧には s3:ListBucket だけが要る（デプロイ用ロールが持っている）。
//
// 使い方:
//   node scripts/ci/bucket-manifest.mjs verify --bucket=<名前> --previous=<前回の記録.json>
//   node scripts/ci/bucket-manifest.mjs record --bucket=<名前> --out=<記録.json> [--local-dir=<public>] [--meta=キー=値 ...]

import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MANIFEST_VERSION = 1;

/** `aws s3api list-objects-v2 --output json` の結果を { キー: { etag, size } } にする。空のバケットは出力が空になる。 */
export function parseListing(text) {
  const objects = {};
  if (!text.trim()) return objects;
  const json = JSON.parse(text);
  for (const item of json.Contents ?? []) {
    objects[item.Key] = { etag: String(item.ETag).replaceAll('"', ''), size: item.Size };
  }
  return objects;
}

/** 前回の記録と今の一覧の差分。 */
export function diffObjects(previous, current) {
  const added = Object.keys(current).filter((k) => !(k in previous)).sort();
  const removed = Object.keys(previous).filter((k) => !(k in current)).sort();
  const changed = Object.keys(current)
    .filter((k) => k in previous && (previous[k].etag !== current[k].etag || previous[k].size !== current[k].size))
    .sort();
  return { added, changed, removed, drift: added.length + changed.length + removed.length > 0 };
}

/** デプロイしたファイル（localDir）のMD5と、バケットのETagを突き合わせる。マルチパートのETag（`-` を含む）は比較できないので数えるだけ。 */
export function verifyLocal(objects, localDir) {
  const mismatched = [];
  const missing = [];
  let multipart = 0;
  for (const [key, { etag }] of Object.entries(objects)) {
    const file = path.join(localDir, ...key.split('/'));
    if (!fs.existsSync(file)) {
      missing.push(key); // バケットにあるが、今回デプロイしたファイルには無い
      continue;
    }
    if (etag.includes('-')) {
      multipart++;
      continue;
    }
    const md5 = crypto.createHash('md5').update(fs.readFileSync(file)).digest('hex');
    if (md5 !== etag) mismatched.push(key);
  }
  const keys = new Set(Object.keys(objects));
  const notUploaded = walk(localDir).filter((rel) => !keys.has(rel)); // デプロイしたはずが、バケットに無い
  return { mismatched: mismatched.sort(), missing: missing.sort(), notUploaded: notUploaded.sort(), multipart };
}

function walk(dir, base = '') {
  const out = [];
  for (const entry of fs.readdirSync(path.join(dir, base), { withFileTypes: true })) {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...walk(dir, rel));
    else out.push(rel);
  }
  return out;
}

function listBucket(bucket) {
  const text = execFileSync('aws', ['s3api', 'list-objects-v2', '--bucket', bucket, '--output', 'json'], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
  });
  return parseListing(text);
}

function formatList(title, keys, limit = 50) {
  if (!keys.length) return [];
  const shown = keys.slice(0, limit).map((k) => `    ${k}`);
  if (keys.length > limit) shown.push(`    …ほか ${keys.length - limit} 件`);
  return [`  ${title}（${keys.length}件）`, ...shown];
}

function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
}

function summary(lines) {
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${lines.join('\n')}\n`);
}

function parseArgs(argv) {
  const args = { meta: {} };
  for (const a of argv) {
    const m = /^--([a-z-]+)=(.*)$/.exec(a);
    if (!m) throw new Error(`不明な引数: ${a}`);
    if (m[1] === 'meta') {
      const [k, ...rest] = m[2].split('=');
      args.meta[k] = rest.join('=');
    } else args[m[1]] = m[2];
  }
  return args;
}

function runVerify(args) {
  if (!args.bucket || !args.previous) throw new Error('--bucket と --previous が必要です');
  setOutput('drift', 'false');
  setOutput('skipped', 'false');

  if (!fs.existsSync(args.previous)) {
    console.log('::warning::前回のデプロイの記録が見つかりません（初回、または保持期間切れ）。照合を飛ばします');
    summary(['### デプロイ時の照合', '', '前回の記録が無いため、照合を飛ばしました。']);
    setOutput('skipped', 'true');
    return;
  }

  const previous = JSON.parse(fs.readFileSync(args.previous, 'utf8'));
  if (previous.version !== MANIFEST_VERSION || typeof previous.objects !== 'object') {
    console.log('::warning::前回の記録の形式が想定と違います。照合を飛ばします');
    setOutput('skipped', 'true');
    return;
  }

  const current = listBucket(args.bucket);
  const diff = diffObjects(previous.objects, current);
  const from = `${previous.run?.id ?? '不明'}（${previous.createdAt ?? '時刻不明'}）`;
  console.log(`照合: 前回の記録 run ${from} と比べて、バケットの現在のファイルは ${Object.keys(current).length} 件（前回 ${Object.keys(previous.objects).length} 件）`);

  if (!diff.drift) {
    console.log('照合: 差分なし');
    summary(['### デプロイ時の照合', '', '差分なし（前回のデプロイ以降、バケットは変更されていません）。']);
    return;
  }

  const lines = [
    ...formatList('追加されたファイル', diff.added),
    ...formatList('変更されたファイル', diff.changed),
    ...formatList('削除されたファイル', diff.removed),
  ];
  console.log(`::error::前回のデプロイ以降、デプロイ以外の変更がバケットにあります（追加 ${diff.added.length} / 変更 ${diff.changed.length} / 削除 ${diff.removed.length}）`);
  console.log(lines.join('\n'));
  console.log('このデプロイで正しい内容に戻し、最後にジョブを失敗させます。');
  summary(['### デプロイ時の照合: **差分あり**', '', '```', ...lines, '```', '', 'このデプロイで正しい内容に戻し、最後にジョブを失敗させます。']);
  setOutput('drift', 'true');
}

function runRecord(args) {
  if (!args.bucket || !args.out) throw new Error('--bucket と --out が必要です');
  const objects = listBucket(args.bucket);
  const manifest = {
    version: MANIFEST_VERSION,
    bucket: args.bucket,
    createdAt: new Date().toISOString(),
    run: { id: args['run-id'] ?? process.env.GITHUB_RUN_ID ?? null, sha: process.env.GITHUB_SHA ?? null },
    meta: args.meta,
    objects,
  };
  fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
  fs.writeFileSync(args.out, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`記録: バケットのファイル ${Object.keys(objects).length} 件を ${args.out} に保存しました`);

  if (!args['local-dir']) return;
  const result = verifyLocal(objects, args['local-dir']);
  const problems = [
    ...formatList('内容がデプロイしたファイルと一致しない', result.mismatched),
    ...formatList('バケットにあるが、デプロイしたファイルに無い', result.missing),
    ...formatList('デプロイしたはずが、バケットに無い', result.notUploaded),
  ];
  console.log(`確認: デプロイしたファイルとバケットのハッシュ値を突き合わせました（マルチパートで比較できない ${result.multipart} 件）`);
  if (problems.length) {
    console.log('::error::デプロイ後のバケットの内容が、デプロイしたファイルと一致しません');
    console.log(problems.join('\n'));
    summary(['### デプロイ後の確認: **不一致**', '', '```', ...problems, '```']);
    process.exit(1);
  }
  console.log('確認: 一致');
}

function main() {
  const [command, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  if (command === 'verify') runVerify(args);
  else if (command === 'record') runRecord(args);
  else throw new Error('使い方: bucket-manifest.mjs <verify|record> --bucket=…');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (err) {
    console.error(`::error::${err.message}`);
    process.exit(1);
  }
}
