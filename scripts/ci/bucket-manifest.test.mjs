import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { diffObjects, parseListing, verifyLocal } from './bucket-manifest.mjs';

const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');

test('parseListing: ETagの引用符を外す。空のバケットは空', () => {
  const text = JSON.stringify({ Contents: [{ Key: 'a.html', ETag: '"abc"', Size: 3 }] });
  assert.deepEqual(parseListing(text), { 'a.html': { etag: 'abc', size: 3 } });
  assert.deepEqual(parseListing(''), {});
  assert.deepEqual(parseListing('{}'), {});
});

test('diffObjects: 追加・変更・削除を検出し、同じなら差分なし', () => {
  const prev = { 'a': { etag: '1', size: 1 }, 'b': { etag: '2', size: 1 }, 'c': { etag: '3', size: 1 } };
  const same = diffObjects(prev, structuredClone(prev));
  assert.equal(same.drift, false);

  const cur = { 'a': { etag: '1', size: 1 }, 'b': { etag: 'X', size: 1 }, 'd': { etag: '4', size: 1 } };
  const d = diffObjects(prev, cur);
  assert.deepEqual(d.added, ['d']);
  assert.deepEqual(d.changed, ['b']);
  assert.deepEqual(d.removed, ['c']);
  assert.equal(d.drift, true);
});

test('diffObjects: ETagが同じでもサイズが違えば変更', () => {
  const d = diffObjects({ a: { etag: '1', size: 1 } }, { a: { etag: '1', size: 2 } });
  assert.deepEqual(d.changed, ['a']);
});

test('verifyLocal: 一致・不一致・欠落・未アップロードを分ける', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-'));
  try {
    fs.mkdirSync(path.join(dir, 'sub'));
    fs.writeFileSync(path.join(dir, 'ok.html'), 'ok');
    fs.writeFileSync(path.join(dir, 'sub', 'bad.html'), 'local');
    fs.writeFileSync(path.join(dir, 'new.html'), 'new');
    const objects = {
      'ok.html': { etag: md5('ok'), size: 2 },
      'sub/bad.html': { etag: md5('tampered'), size: 8 },
      'gone.html': { etag: md5('x'), size: 1 },
      'big.bin': { etag: 'abc-3', size: 99 },
    };
    fs.writeFileSync(path.join(dir, 'big.bin'), 'x');
    const r = verifyLocal(objects, dir);
    assert.deepEqual(r.mismatched, ['sub/bad.html']);
    assert.deepEqual(r.missing, ['gone.html']);
    assert.deepEqual(r.notUploaded, ['new.html']);
    assert.equal(r.multipart, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
