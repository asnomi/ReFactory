import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { countOutputs, evaluate, readManifestFiles } from './check-sync-result.mjs';

test('countOutputs: _index.md・画像・他セクションは数えない', () => {
  const counts = countOutputs([
    'content/works/a.md',
    'content/works/b.md',
    'content/works/_index.md',
    'content/news/x.md',
    'assets/images/works/a.webp',
    'content/works/sub/c.md',
  ]);
  assert.deepEqual(counts, { works: 2, news: 1 });
});

test('evaluate: 作品0件は失敗', () => {
  const r = evaluate({ works: 0, news: 3 });
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 1);
});

test('evaluate: 作品があればOK、ニュース0件は警告のみ', () => {
  const r = evaluate({ works: 5, news: 0 });
  assert.equal(r.ok, true);
  assert.equal(r.warnings.length, 1);
});

test('evaluate: MIN_NEWSを指定するとニュース0件も失敗', () => {
  assert.equal(evaluate({ works: 5, news: 0 }, { minNews: 1 }).ok, false);
});

test('readManifestFiles: 管理リストが無い・壊れていると例外', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-guard-'));
  try {
    assert.throws(() => readManifestFiles(dir), /読めません/);
    fs.writeFileSync(path.join(dir, '.sync-manifest.json'), '{"files": "x"}');
    assert.throws(() => readManifestFiles(dir), /形式が不正/);
    fs.writeFileSync(path.join(dir, '.sync-manifest.json'), '{"version":1,"files":["content/works/a.md"]}');
    assert.deepEqual(readManifestFiles(dir), ['content/works/a.md']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
