// 1つのDB(作品またはニュース)を取得して、Markdownと画像を書き出す（設計書 2〜4章）。

import { downloadImage } from './images.mjs';
import { renderDocument } from './frontmatter.mjs';
import { blocksToMarkdown } from './markdown.mjs';
import { readCheckbox, readDate, readImageUrl, readSelect, readText, toHugoDate } from './props.mjs';
import { findDuplicates, validateSlug } from './slug.mjs';

/** 同期全体を止めるべきエラー(認証・接続・列の欠落など)。 */
export class FatalError extends Error {}

export class Log {
  constructor() {
    this.warnings = [];
  }
  info(message) {
    console.log(message);
  }
  warn(scope, message) {
    this.warnings.push({ scope, message });
    const line = `[警告] ${scope}: ${message}`;
    console.warn(line);
    if (process.env.GITHUB_ACTIONS) console.log(`::warning::${line}`);
  }
}

async function resolveDataSource(client, dbId, def, log) {
  let dsId;
  try {
    const db = await client.databases.retrieve({ database_id: dbId });
    dsId = db.data_sources?.[0]?.id;
    if (!dsId) throw new Error('データソースがありません');
    const ds = await client.dataSources.retrieve({ data_source_id: dsId });
    return { dsId, properties: ds.properties };
  } catch (err) {
    // メッセージにDB IDやトークンは含めない
    throw new FatalError(
      `${def.label}DBに接続できません(${err.code ?? err.message})。DB IDと、IntegrationがこのDBに共有されているかを確認してください`,
      { cause: err },
    );
  }
}

/** 列の有無と型を確認する。必須列の問題は致命エラー、任意列の問題は警告してその列を使わない。 */
function checkColumns(properties, def, log) {
  const usable = new Set();
  for (const [key, col] of Object.entries(def.columns)) {
    const prop = properties[col.name];
    const problem = !prop
      ? `列「${col.name}」が見つかりません`
      : !col.types.includes(prop.type)
        ? `列「${col.name}」の型が想定(${col.types.join('/')})と違います(${prop.type})`
        : null;
    if (!problem) usable.add(key);
    else if (col.required) throw new FatalError(`${def.label}DB: ${problem}`);
    else log.warn(`${def.label}DB`, `${problem}。この列は出力しません`);
  }
  return usable;
}

async function queryPublished(client, dsId, def) {
  const rows = [];
  let cursor;
  try {
    do {
      const res = await client.dataSources.query({
        data_source_id: dsId,
        filter: { property: def.columns.published.name, checkbox: { equals: true } },
        sorts: [{ timestamp: 'created_time', direction: 'ascending' }],
        start_cursor: cursor,
        page_size: 100,
      });
      rows.push(...res.results.filter((r) => r.object === 'page'));
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);
  } catch (err) {
    throw new FatalError(`${def.label}DBの取得に失敗しました(${err.code ?? err.message})`, { cause: err });
  }
  return rows;
}

async function listAllChildren(client, blockId) {
  const blocks = [];
  let cursor;
  do {
    const res = await client.blocks.children.list({ block_id: blockId, start_cursor: cursor, page_size: 100 });
    blocks.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return blocks;
}

export async function syncDatabase({ client, def, dbId, writer, log, fetchImpl = fetch, dryRun = false }) {
  const { dsId, properties } = await resolveDataSource(client, dbId, def, log);
  const usable = checkColumns(properties, def, log);
  const rows = await queryPublished(client, dsId, def);
  log.info(`${def.label}DB: 公開ONの行 ${rows.length}件`);

  const col = (page, key) => (usable.has(key) ? page.properties[def.columns[key].name] : undefined);

  // 1周目: スラッグ・日付の検証
  const scopeOf = (title) => `${def.label}「${title || '(タイトルなし)'}」`;
  const candidates = [];
  for (const page of rows) {
    const title = readText(col(page, 'title'));
    const slug = readText(col(page, 'slug'));
    const scope = scopeOf(title);
    const slugProblem = validateSlug(slug);
    if (slugProblem) {
      log.warn(scope, `${slugProblem}。出力しません`);
      continue;
    }
    candidates.push({ page, title, slug, scope });
  }
  const dups = findDuplicates(candidates.map((c) => c.slug));
  const entries = [];
  for (const c of candidates) {
    if (dups.has(c.slug)) {
      log.warn(c.scope, `スラッグ「${c.slug}」が他の行と重複しています。出力しません`);
      continue;
    }
    const date = readDate(col(c.page, 'date'));
    if (!date) {
      log.warn(c.scope, `${def.columns.date.name}が空、または日付として読めません。出力しません`);
      continue;
    }
    entries.push({ ...c, date });
  }

  // 2周目: 画像・本文・Markdownの書き出し
  let written = 0;
  for (const entry of entries) {
    const { page, title, slug, scope, date } = entry;
    try {
      const mdRel = `${def.contentDir}/${slug}.md`;
      const conflict = writer.conflict(mdRel);
      if (conflict) {
        log.warn(scope, `${conflict}。出力しません`);
        continue;
      }

      const saveImage = async (url, nameBase) => {
        if (dryRun) return `${def.imageRef}/${nameBase}.<ext>`;
        try {
          const { buffer, ext } = await downloadImage(url, { fetchImpl });
          const rel = `${def.imageDir}/${nameBase}.${ext}`;
          const imgConflict = writer.conflict(rel);
          if (imgConflict) {
            log.warn(scope, `${imgConflict}。この画像は飛ばします`);
            return null;
          }
          writer.write(rel, buffer);
          return `${def.imageRef}/${nameBase}.${ext}`;
        } catch (err) {
          // 署名付きURLは認証情報を含むため、メッセージには出さない
          log.warn(scope, `画像を取得できませんでした(${err.message})。この画像は飛ばします`);
          return null;
        }
      };

      const imageUrl = readImageUrl(col(page, 'image'));
      const image = imageUrl ? await saveImage(imageUrl, slug) : null;

      let imageNo = 0;
      const blocks = await listAllChildren(client, page.id);
      const body = await blocksToMarkdown(blocks, {
        listChildren: (id) => listAllChildren(client, id),
        saveImage: async (block) => {
          const img = block.image;
          const url = img.type === 'external' ? img.external?.url : img.file?.url;
          if (!url) return null;
          imageNo += 1;
          return saveImage(url, `${slug}-${imageNo}`);
        },
        warn: (message) => log.warn(scope, message),
      });

      const category = readSelect(col(page, 'category'));
      if (def.columns.category && usable.has('category') && !category) {
        log.warn(scope, `${def.columns.category.name}が空です(ギャラリーの絞り込みに出ません)`);
      }
      const description = readText(col(page, 'description'));
      const common = [['title', title], ['date', { raw: toHugoDate(date) }]];
      const fields =
        def.id === 'works'
          ? [...common, ['image', image], ['categories', category ? [category] : []], ['description', description], ['draft', false]]
          : [...common, ['description', description], ['image', image], ['draft', false]];

      writer.write(mdRel, renderDocument(fields, body));
      written += 1;
    } catch (err) {
      log.warn(scope, `処理に失敗したため飛ばしました(${err.code ?? err.message})`);
    }
  }
  log.info(`${def.label}DB: ${written}件を出力${dryRun ? '(dry-run: ファイルは書いていません)' : ''}`);
  return { published: rows.length, written };
}
