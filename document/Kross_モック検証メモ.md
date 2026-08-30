# Krossモック検証メモ（トラックA: T2-0〜T2-5）

**関連:** [task.md](../task.md) Phase 2 / [要件定義書.md](./要件定義書.md)
**作成:** 2026-08-25
**モック配置場所:** `asnomi-kross-mock/`（既存の`asnomi-newgallery/`はQuintテーマの旧検証物のため触れていない）

> **注（2026-08-26）:** 本メモは初回モック検証時点（`content/english/portfolio/`・`content/english/blog/`構成）の記録であり、その後トラックBとのパス整合により`content/works/`・`content/news/`へ変更されている。最新の正式仕様は[設計書_トラックA_フロントエンド.md](./設計書_トラックA_フロントエンド.md)（特に7.5節）を参照のこと。本メモ内の`/portfolio/`・`/blog/`表記は歴史的記録として残す。

---

## T2-0. モック作成 / T2-1. Hugo環境構築

- テーマ本体: [themefisher/kross-hugo](https://github.com/themefisher/kross-hugo) を `asnomi-kross-mock/themes/kross` にclone
- Hugo: v0.152.2 extended（ローカル環境に導入済みのものを使用。テーマの最低要件は v0.64.0+、実際には**Hugo Modules**を使うため `hugo mod` サブコマンドが必須）
- **重要な環境事項:** Krossは素朴なテーマ単体ではなく、Bootstrap/アイコン/ショートコード等をすべて **Hugo Modules**（`go.mod` + `hugo mod tidy` でGitHubから取得）で構成している。ローカルに **Go 1.19+** が必要（本機には導入済み・確認済み）。`hugo mod tidy` 実行時に初回のみ外部ダウンロードが発生する（GitHub Actions等CI環境でも同様にネットワークアクセスが必要になる点に注意。T3-1のワークフロー設計に影響）。
- **Node.js/npmは未導入環境だったが、モック検証には不要だった。** 理由: CSSの本番用PostCSS/PurgeCSS処理は `layouts/partials/essentials/style.html` 内で `{{ if and hugo.IsProduction site.Params.purge_css }}` の条件下でのみ実行される。`hugo --environment development` （＝`hugo server`のデフォルト環境）ではこの分岐を通らないため、Node無しでビルド・プレビューが可能。**本番ビルド（`hugo --gc --minify`、環境=production）ではNode.js + postcss-cli + @fullhuman/postcss-purgecss のインストールが別途必要**になる点はT3-1（GitHub Actionsワークフロー設計）に引き継ぐ。
- 起動確認: `hugo server --environment development` でホーム/ギャラリー/ニュース一覧/個別ページとも正常表示・ビルドエラーなしを確認。

## T2-2. スタイリング調整の仕様整理

現行サイト（`asnomi-newgallery/static/css/styles.css`より抽出）のトンマナ:

| 項目 | 現行サイト | Kross標準 | モックでの対応 |
| --- | --- | --- | --- |
| 基調色 | ほぼモノクロ（白地+濃灰 `#353d49`/`#252627`） | 紫系プライマリ `#41228e` + シアン `#2bfdff` | `hugo.toml`の`[params.variables]`を現行の配色値に変更（色変数を差し替えるだけで反映される設計になっており、テーマ改造は不要） |
| リンク・アクセント色 | ミュートな青灰 `#879094` | 派手なシアン | `color_secondary`/`text_light`をこの値に変更 |
| ダークモード | `prefers-color-scheme`対応あり | **標準では非対応** | 未対応。対応する場合はSCSS側への追加実装が必要（今回はモック外・要検討事項として保留） |
| フォント | 自前ホスティングの`OpenSauceOne`（Google Fonts非掲載） | Google Fonts経由で`font_primary`/`font_secondary`パラメータ指定 | 暫定でGoogle Fontsの近似書体（Work Sans）に置換。**本実装時は`OpenSauceOne`を`@font-face`で読み込む形にSCSS側の一部カスタマイズが必要**（パラメータ指定だけでは自前フォントを扱えないため） |

**追加の気付き（対応済み）:**
- ポートフォリオ一覧ページのフィルターボタン「All」、詳細リンク「view project」、ニュースカードの「Read More」「Details」、お問い合わせフォーム一式、フッターの連絡先ラベルはテーマ内で**英語ハードコード**（i18n未使用）だった。
- **2026-08-25追記:** 本サイトは単一言語（日本語）運用と決定したため、Hugoの多言語i18n機構（`i18n/ja.yaml`等）は導入せず、**プロジェクト側`layouts/`へのテンプレート直接オーバーライド**で該当箇所（`layouts/index.html`、`layouts/portfolio/list.html`、`layouts/portfolio/single.html`、`layouts/_default/post.html`、`layouts/_default/contact.html`、`layouts/partials/essentials/footer.html`）を日本語化し、モック上で表示確認済み。

## T2-3. ヒーローエリア実装設計

- Kross標準の`params.banner`セクションは、**パララックス演出のアジェンシー風ヒーロー**（`bg-primary`の単色背景＋葉っぱ/ドットのSVG装飾レイヤーを複数枚重ねる構成、`layouts/index.html`の`hero-area`ブロック）であることを確認。**背景に画像を敷く機能は標準では存在しない。**
- 現行サイトの「大胆な画像+コピー」路線とは方向性が異なるため、モックでは以下の最小カスタマイズを実施し、実現性を確認:
  - `layouts/index.html`をプロジェクト側にオーバーライドし、装飾SVGレイヤーを撤去。`params.banner.image`（新規追加フィールド）を背景画像として敷き、上に半透明の暗幕（`.hero-overlay`）＋白文字コピーを重ねる構成に変更
  - `assets/scss/custom.scss`を新設し`style.scss`末尾から`@import`、`.hero-area-photo`/`.hero-overlay`のスタイルを追加
  - `params.banner.subtitle`（新規追加フィールド）でキャッチコピー下のサブテキストにも対応
- **結論:** 標準機能のみでは要件（F-302）を満たせず、軽微なレイアウト上書きが必要。ただし変更範囲は「ホームの1セクションのみ」で影響範囲は限定的。実装コストは小〜中程度と評価。

## T2-4. ギャラリー（作品一覧）設計

- `/portfolio/`一覧ページ（`layouts/portfolio/list.html`）は、**全作品の`categories`フロントマターの値を`.RegularPages`から動的収集し、重複除去した値でフィルターボタンを自動生成**する実装。Shuffle.js（`plugins/shuffle/shuffle.min.js`）と`data-groups`属性のみで絞り込みが完結し、**独自のフィルターロジック実装は不要**であることをモックで実証（ダミーカテゴリ「イラスト」「グラフィック」「漫画」「らくがき」で正常にボタン生成を確認）。
- ホーム側の「作品ギャラリー」セクションは`item_show`件数のグリッド表示のみで、フィルターUIは無し（一覧ページのみの機能）。
- **年別ソートは標準機能に無いことを再確認。** 現状の一覧は`.RegularPages`のデフォルト順（front matterの`date`降順）で表示されるため、「新しい順」は自然に満たせる。年ごとのグルーピング表示が必須でなければ追加実装は不要と判断（task.md記載の通り「見送り」を推奨）。
- 気付き: `/portfolio/`ページ下部に`components/client-slider.html`という無条件表示のクライアントロゴスライダー区画が存在（ホーム側の`clients_logo_slider.enable=false`とは独立した別区画）。作品ポートフォリオサイトには不要なため、正式実装時に削除対象として明記。

## T2-5. ニュース・近況エリア設計

- ホームの「お知らせ・近況」セクションは`layouts/index.html`内で `{{ range first 3 (where .Site.RegularPages "Section" "blog")}}` と**件数(3)がテンプレート内にハードコード**されていることを確認（task.md記載どおり、設定ファイルではなくテンプレート編集で変更する方式）。
- 件数N: モックはデフォルトの3件のまま確認。要件上、N件数を変える必要があるかは未確定 → **要決定事項**として残す（現状3件で問題なければテンプレート変更不要）。
- 一覧ページ（`/blog/`）はページネーション付きの通常のセクション一覧テンプレートで、追加実装不要。

---

## T0-2（テーマ採用）への提言

- 配色・フォントは変数差し替えのみで現行トンマナに寄せられることを確認（ダークモード非対応・自前フォント対応は個別の追加実装が必要な既知の課題として整理済み）。
- ヒーローのみ軽微なレイアウト上書きが必要だが、実現性は確認済みで影響範囲も限定的。
- ギャラリーのカテゴリ絞り込みは標準機能で完全にまかなえることを実機で確認。
- 上記を踏まえ、**Kross採用の正式決定を進めて問題ない**と判断。あとはモック（`asnomi-kross-mock/`を`hugo server`で起動）を実際に目視確認いただき、最終GOをお願いします。

### モックの起動方法

```bash
cd asnomi-kross-mock
hugo server --environment development
```

`http://localhost:1414/`（または既定の1313）でホーム、`/portfolio/`でギャラリー（カテゴリ絞り込み込み）、`/blog/`でニュース一覧を確認できます。
