// 生成物の書き出しと管理リスト(.sync-manifest.json)（設計書 3.1節・4.7節・6章）。
// 管理リストにあるファイルだけを上書き・削除する。リストに無い既存ファイル(_index.md・サンプル等)には触れない。

import fs from 'node:fs';
import path from 'node:path';

export const MANIFEST_NAME = '.sync-manifest.json';

export class OutputWriter {
  constructor(siteDir, { dryRun = false } = {}) {
    this.siteDir = siteDir;
    this.dryRun = dryRun;
    this.manifestPath = path.join(siteDir, MANIFEST_NAME);
    this.previous = this.#loadManifest();
    this.current = new Set();
  }

  #loadManifest() {
    try {
      const json = JSON.parse(fs.readFileSync(this.manifestPath, 'utf8'));
      return new Set(Array.isArray(json.files) ? json.files : []);
    } catch {
      return new Set();
    }
  }

  #abs(rel) {
    return path.join(this.siteDir, ...rel.split('/'));
  }

  /** このファイルを書いてよいか。理由があれば文字列、問題なければnull。 */
  conflict(rel) {
    if (this.current.has(rel)) return `${rel} は今回すでに別の出力が使っています`;
    if (fs.existsSync(this.#abs(rel)) && !this.previous.has(rel)) {
      return `${rel} は同期以外で作られた既存ファイルのため上書きしません`;
    }
    return null;
  }

  write(rel, data) {
    this.current.add(rel);
    if (this.dryRun) return;
    const file = this.#abs(rel);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, data);
  }

  /** 前回作って今回は出力しなかったファイル(公開OFF・削除された行など)を消し、管理リストを保存する。 */
  finalize() {
    const stale = [...this.previous].filter((rel) => !this.current.has(rel));
    if (!this.dryRun) {
      for (const rel of stale) fs.rmSync(this.#abs(rel), { force: true });
      fs.mkdirSync(this.siteDir, { recursive: true });
      fs.writeFileSync(
        this.manifestPath,
        `${JSON.stringify({ version: 1, files: [...this.current].sort() }, null, 2)}\n`,
      );
    }
    return stale;
  }
}
