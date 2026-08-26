# 設計書：トラックA（フロントエンド / Hugoテーマ）

**対象タスク:** T0-2（Hugoテーマ選定・PoC）／T2-0（モック作成）／T2-1（Hugo環境構築）／T2-2（スタイリング調整）／T2-3（ヒーローエリア）／T2-4（ギャラリー）／T2-5（ニュース・近況エリア）

**参照元:** [task.md](./task.md)（WBS） / [要件定義書.md](./要件定義書.md)（Version 1.0） / [Kross_モック検証メモ.md](./Kross_モック検証メモ.md)（本書のベースとなった検証記録）

**対応要件:** F-301, F-302, F-303, F-304

**Document Version:** 1.1（トラックB(Notionデータ連携)とのコンテンツ出力パス整合を反映）

**Date:** 2026-08-25（初版）／2026-08-26改訂（トラックBの[設計書_Notionデータ連携.md](./設計書_Notionデータ連携.md)に合わせ、コンテンツ出力パスを`content/works/`・`content/news/`に統一。詳細は7.5節）

---

## 0. 前提・スコープ

- 本書は Kross_モック検証メモ.md（トラックA・モック検証セッション）で得た実証結果を正式な設計として整理し、加えてトラックC（[設計書_トラックC_インフラCICD.md](./設計書_トラックC_インフラCICD.md)）から調整待ちとして挙げられていた4項目（package.json配置場所／purge_css設定値／Hugo Modules依存の公開性／Hugoバージョン）を確定させたものである。
- 実装コード（本番用テンプレート、Notion変換スクリプト等）そのものは対象外。設計・仕様整理のみを扱う。
- モック実体は `asnomi-kross-mock/` に存在する（`hugo server --environment development` で起動可能）。

---

## 1. T0-2. Hugoテーマ選定：正式決定

**✅ 「Kross」（themefisher/kross-hugo）の採用を正式決定する。**

モック作成前の仮採用理由（フロントマター構造の単純さ、Shuffle.jsによるカテゴリ絞り込みの標準搭載、ホームのポートフォリオ／ブログ専用セクション）に加え、モックでの実機検証により以下が裏付けられた。

| 検証観点 | 結果 |
| --- | --- |
| 配色・フォントの現行サイトへの寄せやすさ | `[params.variables]`の値変更のみで反映可能。テーマ改造不要 |
| ヒーローの「大胆な画像+コピー」対応 | 標準機能では不可（パララックス演出のアジェンシー風のみ）だが、`layouts/index.html`の軽微なオーバーライドで対応可能なことを実証 |
| ギャラリーのカテゴリ絞り込み（F-303） | 独自実装不要。`categories`フロントマターのみでShuffle.jsフィルターが自動生成されることを実証 |
| ニュース最新N件表示（F-304） | ホーム内ブログセクションで対応可能（件数はテンプレートへの直書き） |

以上より、当初の懸念点はいずれも「軽微なテンプレート調整」の範囲に収まることが確認できたため、再検討（Blowfish等への変更）は不要と判断する。

---

## 2. T2-0 / T2-1. モック作成・Hugo環境構築

### 2.1 モックの構成

- 配置場所: `asnomi-kross-mock/`（既存の`asnomi-newgallery/`はQuintテーマの旧検証物のため区別・保持）
- テーマ本体: [themefisher/kross-hugo](https://github.com/themefisher/kross-hugo) を `asnomi-kross-mock/themes/kross` にclone
- コンテンツ構成: 当初は`exampleSite/`の構造（`content/english/`配下に`portfolio/`・`blog/`・`about.md`等）をそのままサイトルートへ展開していたが、**2026-08-26にトラックB([設計書_Notionデータ連携.md](./設計書_Notionデータ連携.md))とのパス整合を行い、`content/works/`・`content/news/`・`content/about.md`・`content/contact.md`（言語ディレクトリ層なし）へ変更済み**（詳細は7.5節）。ダミーコンテンツ（作品6点・お知らせ3件）は日本語のまま維持。
  - 現行サイトは単一言語（日本語）運用のため、Kross標準の多言語ディレクトリ構成（`content/english/`等）はそもそも不要と判断し、多言語設定自体を撤去した（7.5節参照）。

### 2.2 環境構築上の重要事項

- **Hugo Modules方式であることに注意。** Kross本体はBootstrap／アイコン／ショートコード等を`go.mod` + `hugo mod tidy`によるHugo Modulesで構成しており、**git submoduleではない**。ローカル/CI双方に**Go 1.19+**が必要（モック検証環境: 実機Go 1.25.4、CI推奨: 1.21以上のLTS相当）。
- **Node.js/npmはローカル開発時には不要。** 本番用PostCSS/PurgeCSS処理は`layouts/partials/essentials/style.html`内の`{{ if and hugo.IsProduction site.Params.purge_css }}`分岐でのみ実行され、`hugo server`（development環境）ではこの分岐を通らないため。**本番ビルド（`hugo`単体実行のデフォルト環境=production）では別途Node.js + `postcss-cli` + `@fullhuman/postcss-purgecss`が必要**（詳細は7章）。
- 起動確認方法:
  ```bash
  cd asnomi-kross-mock
  hugo server --environment development
  ```
  `http://localhost:1313/`（環境により1414等）でホーム、`/works/`でギャラリー、`/news/`でニュース一覧を確認できる（2026-08-26のパス変更後のURL。旧`/portfolio/`・`/blog/`は廃止）。

---

## 3. T2-2. テーマカスタマイズ・スタイリング調整

現行サイト（`asnomi-newgallery/static/css/styles.css`より抽出）と、Kross標準との対比。

| 項目 | 現行サイト | Kross標準 | 対応方針 |
| --- | --- | --- | --- |
| 基調色 | ほぼモノクロ（白地+濃灰 `#353d49` / `#252627`） | 紫系プライマリ `#41228e` + シアン `#2bfdff` | `hugo.toml`の`[params.variables]`（`color_primary`/`color_secondary`/`text_color`等）を現行配色値に変更するのみで反映可能。テーマ改造は不要 |
| リンク・アクセント色 | ミュートな青灰 `#879094` | 派手なシアン | `color_secondary`/`text_light`をこの値に変更 |
| ダークモード | `prefers-color-scheme`対応あり | **標準では非対応** | 未対応。対応する場合はSCSS側への追加実装が必要（MVP範囲外・要検討事項として保留） |
| フォント | 自前ホスティングの`OpenSauceOne`（Google Fonts非掲載） | Google Fonts経由で`font_primary`/`font_secondary`パラメータ指定 | モックでは暫定的にGoogle Fontsの近似書体（Work Sans）に置換。**本実装時は`OpenSauceOne`を`@font-face`で読み込む形にSCSS側の追加カスタマイズが必要**（パラメータ指定だけでは自前フォントを扱えないため） |

**UI文字列の日本語化（対応済み）:**

ポートフォリオ一覧ページのフィルターボタン「All」、詳細リンク「view project」、作品詳細の「Date/Client/Categories/Project Link」、ニュースカードの「Read More/Details」、お問い合わせフォーム、フッターの連絡先ラベルはテーマ内で英語ハードコードされていたが、モックで日本語に置き換え済み。

- 本サイトは単一言語（日本語）運用のため、Hugoの多言語i18n機構（`i18n/ja.yaml`等）は導入せず、**プロジェクト側`layouts/`へのテンプレート直接オーバーライド**で対応する方針とした（該当ファイル: `layouts/index.html`、`layouts/works/list.html`、`layouts/works/single.html`、`layouts/_default/post.html`、`layouts/_default/contact.html`、`layouts/partials/essentials/footer.html`。2026-08-26のパス変更に伴い`layouts/portfolio/`→`layouts/works/`にリネーム済み）。
- 実装フェーズでは本番コンテンツ（プロフィール文・お問い合わせ先等）の反映と併せて、上記オーバーライド一式をそのまま本実装に引き継ぐ想定。

**未対応・保留事項:**
- ダークモード対応（現行サイトにはあるが、Kross標準にはない。追加SCSS実装が必要）
- 自前フォント（`OpenSauceOne`）の`@font-face`読み込み実装

関連要件: F-301

---

## 4. T2-3. ヒーローエリア実装設計

- Kross標準の`params.banner`セクションは、**パララックス演出のアジェンシー風ヒーロー**（`bg-primary`の単色背景＋葉っぱ/ドットのSVG装飾レイヤーを複数枚重ねる構成、`layouts/index.html`の`hero-area`ブロック）である。**背景に画像を敷く機能は標準では存在しない。**
- 現行サイトの「大胆な画像+コピー」路線とは方向性が異なるため、以下の軽微なカスタマイズで対応する（モックで実装・動作確認済み）。
  - `layouts/index.html`をプロジェクト側にオーバーライドし、装飾SVGレイヤーを撤去
  - `params.banner.image`（新規追加フィールド）を背景画像として敷き、上に半透明の暗幕（`.hero-overlay`）＋白文字コピーを重ねる構成に変更
  - `assets/scss/custom.scss`を新設し`style.scss`末尾から`@import`、`.hero-area-photo`/`.hero-overlay`のスタイルを追加
  - `params.banner.subtitle`（新規追加フィールド）でキャッチコピー下のサブテキストにも対応
- **結論:** 標準機能のみでは要件（F-302）を満たせず、軽微なレイアウト上書きが必要。ただし変更範囲は「ホームの1セクションのみ」で影響範囲は限定的。実装コストは小〜中程度と評価。

関連要件: F-302

---

## 5. T2-4. ギャラリー（作品一覧）設計

- `/works/`一覧ページ（`layouts/works/list.html`。2026-08-26に`layouts/portfolio/`からリネーム）は、全作品の`categories`フロントマターの値を`.RegularPages`から動的収集し、重複除去した値でフィルターボタンを自動生成する実装。Shuffle.js（`plugins/shuffle/shuffle.min.js`）と`data-groups`属性のみで絞り込みが完結し、**独自のフィルターロジック実装は不要**であることをモックで実証（ダミーカテゴリ「イラスト」「グラフィック」「漫画」「らくがき」で正常にボタン生成・絞り込み表示を確認）。
- ホーム側の「作品ギャラリー」セクションは`item_show`件数のグリッド表示のみで、フィルターUIは無し（一覧ページのみの機能）。
- **年別ソート/グルーピング機能（F-303）は、MVP範囲では実装せず、申し送り事項としてバックログ化することを決定**（2026-08-25、ユーザー判断）。現状は`.RegularPages`のデフォルト順（`date`降順）で表示されるため、「新しい順」の表示は初期スコープで満たされる。年ごとのグルーピング表示の要否・実装方法は、MVP稼働後に改めて検討する。
- 気付き: `/works/`ページ下部に`components/client-slider.html`という無条件表示のクライアントロゴスライダー区画が存在（ホーム側の`clients_logo_slider.enable=false`とは独立した別区画）。個人ポートフォリオサイトには不要なため、正式実装時に削除対象とする。

関連要件: F-303

---

## 6. T2-5. ニュース・近況エリア設計

- ホームの「お知らせ・近況」セクションは`layouts/index.html`内で`{{ range first 3 (where .Site.RegularPages "Section" "blog")}}`と**件数(3)がテンプレート内にハードコード**されている（設定ファイルではなく、テンプレート編集で変更する方式）。
- **表示件数 N=3（Kross標準のまま）で決定**（2026-08-25、ユーザー判断）。現行asnomi.comサイトも同様の件数のため据え置き、追加実装不要。
- 一覧ページ（`/news/`。2026-08-26に`/blog/`からURL変更）はページネーション付きの通常のセクション一覧テンプレートで、追加実装不要。

関連要件: F-304

---

## 7. トラックC（CI/CD）との調整事項の確定

[設計書_トラックC_インフラCICD.md](./設計書_トラックC_インフラCICD.md) 8章で「Track A実装確定待ち」とされていた4項目について、モック検証結果をもとに以下の通り確定する。

### 7.1 `package.json`の配置階層 → **サイト本体ルート**

Kross本体のnpmスクリプト（`dev`/`build`。`:example`サフィックスの無い方）は、カレントディレクトリ＝サイトルートを前提に`hugo`コマンドおよびPostCSS関連処理を実行する設計になっている。モックでは`package.json`・`postcss.config.js`を`asnomi-kross-mock/`直下（`hugo.toml`と同階層）に配置し、実機ビルドで問題なく動作することを確認した。

→ **CI側への影響:** `npm ci`・`hugo build`ステップとも、リポジトリのチェックアウト直下（サイトルート）でそのまま実行すればよく、`working-directory`の個別指定は不要。

### 7.2 `site.Params.purge_css`の最終設定値 → **`true`（ON）**

Kross標準ではCSSが外部リンクファイルではなく、各HTMLページに`<style>`タグとして**インライン埋め込み**される構成になっている（`layouts/partials/essentials/style.html`参照）。そのため、未パージのCSS（Bootstrap全量を含む）をそのまま出力すると、全ページで肥大化した`<style>`ブロックを都度読み込むことになり、NF-102（ページロード高速化）への悪影響がむしろ大きいと判断した。

→ **CI側への影響:** いずれにせよ本番ビルドにはNode.js/PostCSS一式の導入が必要（7.4参照）なため、ONにしてもCI追加コストは発生しない。トラックC側のワークフロー骨格（`actions/setup-node` + `npm ci`ステップ）はそのまま維持でよい。

### 7.3 Hugo Modules依存（`go.mod`）の公開性 → **全て公開リポジトリ**

`go.mod`に列挙される依存は`github.com/gohugoio/*`（Hugo公式）、`github.com/gethugothemes/*`（テーマ提供元）、`github.com/twbs/bootstrap`のみで構成されている。モック環境で`hugo mod tidy`を実行した際、認証設定を一切行わずに正常完了したことから、全て公開リポジトリであることを実証済み。

→ **CI側への影響:** `GOPRIVATE`環境変数・SSH鍵/PAT等の追加Git認証設定は**不要**。トラックC側のワークフロー骨格に変更なし。

### 7.4 CI用Hugoバージョンの最終固定値 → **`0.152.2`**

モック検証環境（実機導入済みのHugo v0.152.2 extended）でビルド・サーバー起動とも正常動作を確認済み。Hugo Modules利用時はバージョン差異がビルド結果に影響しうるため、この検証済みバージョンをCI側（`peaceiris/actions-hugo`の`hugo-version`）にもそのまま採用する。

→ トラックCのワークフロー骨格（2.3節）は変更なし、確定版として扱ってよい。

### 7.5 コンテンツ出力パスのトラックB整合（2026-08-26）

トラックB（[設計書_Notionデータ連携.md](./設計書_Notionデータ連携.md) 3章）は出力先を`content/works/{slug}.md`・`content/news/{slug}.md`と設計していたが、トラックAのモックはKrossのexampleSite標準構成をそのまま踏襲していたため`content/english/portfolio/`・`content/english/blog/`となっており、命名・階層とも不一致だった。トラックB側の設計に合わせる方針とし、以下の変更を行った。

**変更内容:**

| 対象 | 変更前 | 変更後 |
| --- | --- | --- |
| 作品コンテンツ | `content/english/portfolio/` | `content/works/` |
| ニュースコンテンツ | `content/english/blog/` | `content/news/` |
| 固定ページ | `content/english/about.md`、`content/english/contact.md`、`content/english/_index.md` | `content/about.md`、`content/contact.md`、`content/_index.md`（言語ディレクトリ層を撤去） |
| プロジェクト側レイアウト | `layouts/portfolio/list.html`、`layouts/portfolio/single.html` | `layouts/works/list.html`、`layouts/works/single.html`（フォルダリネームのみ、中身は無変更） |
| `layouts/index.html` | `(where .Site.RegularPages "Section" "portfolio")`、`"blog"` | `"works"`、`"news"`（文字列2箇所のみ変更） |
| メニュー設定 | `config/_default/menus.en.toml`（`portfolio/`・`blog/`リンク） | `config/_default/menus.toml`（`works/`・`news/`リンクにリネーム＋言語非依存のファイル名に変更） |
| 多言語設定 | `config/_default/languages.toml`（`contentDir = "content/english"`） | 削除（単一言語運用のため多言語設定自体が不要と判断） |

**改修コストの実績:** 事前見積もり通り「フォルダリネーム＋文字列2箇所＋設定ファイル調整」の範囲で完結。Shuffle.jsのカテゴリ絞り込みロジックや`_default/list.html`（ニュース一覧の汎用テンプレート）・`_default/post.html`（ニュースカード）はセクション名に依存しない実装のため無変更で動作した。

**検証結果:** `hugo --environment development`でのビルド成功、`hugo server`で`/`・`/works/`・`/works/project-1/`・`/news/`が全て200応答、ホームの作品ギャラリー・お知らせセクション、`/works/`のカテゴリフィルター（すべて/イラスト/グラフィック/漫画/らくがき）とも表示内容を確認済み。

---

## 8. 未対応・今後の課題（バックログ）

- **F-303: ギャラリーの年別ソート/グルーピング機能**（2026-08-25申し送り決定、5章参照）: MVP稼働後に改めて検討
- **ダークモード対応**: 現行サイトにはあるが、Kross標準にはない。追加SCSS実装が必要
- **自前フォント（`OpenSauceOne`）の`@font-face`読み込み**: パラメータ指定だけでは対応できないため、SCSS側の追加カスタマイズが必要
- **画像保存先（`assets/` vs `static/`）の最終決定**: T1-4（Notionデータ連携、トラックB）側との連携待ち。KrossのImage Processing活用方法（本書でのHugo標準機能利用）に合わせて最終決定する
- `/works/`ページ下部の無条件表示クライアントロゴスライダー区画の削除
