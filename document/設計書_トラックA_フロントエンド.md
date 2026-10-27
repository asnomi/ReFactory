# 設計書：トラックA（フロントエンド / Hugoテーマ）

**対象タスク:** T0-2（Hugoテーマ選定・PoC）／T2-0（モック作成）／T2-1（Hugo環境構築）／T2-2（スタイリング調整）／T2-3（ヒーローエリア）／T2-4（ギャラリー）／T2-5（ニュース・近況エリア）

**参照元:** [task.md](../task.md)（WBS） / [要件定義書.md](./要件定義書.md)（Version 1.0） / [Kross_モック検証メモ.md](./Kross_モック検証メモ.md)（本書のベースとなった検証記録）

**対応要件:** F-301, F-302, F-303, F-304

**Document Version:** 1.13（トップの作品欄の4列化・販売先ボタンの色を反映）

**Date:** 2026-08-25（初版）／2026-08-26改訂（トラックBの[設計書_Notionデータ連携.md](./設計書_Notionデータ連携.md)に合わせ、コンテンツ出力パスを`content/works/`・`content/news/`に統一。詳細は7.5節）／2026-10-23改訂（404.html出力不具合の修正、検証環境のnoindex/robots.txt対応。詳細は7.6節）

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
- 気付き: `/works/`ページ下部に`components/client-slider.html`という無条件表示のクライアントロゴスライダー区画が存在（ホーム側の`clients_logo_slider.enable=false`とは独立した別区画）。個人ポートフォリオサイトには不要なため、**2026-10-26に削除済み**（`layouts/works/list.html`の該当区画と、`params.toml`のKrossサンプルロゴ一覧`[[logo_slider]]`を削除）。

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

### 7.6 404ページの出力と検証環境のindex除外（2026-10-23）

MVPデプロイ（`dev.asnomi.com`）後に判明した2点への対応。いずれもプロジェクト側`layouts/`の追加のみで、テーマ本体（サブモジュール）は変更していない。

**① 404.htmlが出力されない不具合**

- 症状: 存在しないURLで404ページではなく403が返る（CloudFrontは`/404.html`を返す設定済みだが、成果物に`404.html`が無かった）。
- 原因: サブモジュールで固定しているKross本体の`layouts/404.html`が**0バイトの空ファイル**（上流の`Update file by Sitepins`コミットで空になっている）。Hugoは空テンプレートからは`404.html`を出力しない。
- 対応: `layouts/404.html`をプロジェクト側に新規作成（日本語の404ページ。トップ・作品一覧への導線付き）。どの階層のURLでも表示されるため、リンクは`relURL`によるルート相対で記述。
- 備考: テーマ側が将来修正されても、プロジェクト側が優先されるため影響しない。

**② 検証環境を検索エンジンに載せない**

| 項目 | 内容 |
| --- | --- |
| 判定方法 | `baseURL`のホスト名が`params.indexableHosts`（`config/_default/params.toml`、初期値`asnomi.com`・`www.asnomi.com`）に含まれる場合のみインデックス許可。それ以外（`dev.asnomi.com`、`localhost`等）は除外 |
| 判定の実装 | `layouts/partials/is-indexable.html`（true/falseを返す） |
| 除外時の出力 | `robots.txt`が`Disallow: /`、全ページの`<head>`に`<meta name="robots" content="noindex, nofollow">` |
| 許可時の出力 | `robots.txt`が`Allow: /`＋`Sitemap:`、noindexメタなし |
| 関連ファイル | `layouts/robots.txt`、`layouts/partials/essentials/head.html`（テーマ版をコピーしnoindex出力を追加）、`config/_default/hugo.toml`（`enableRobotsTXT = true`） |

- Hugoの`environment`ではなくbaseURLで切り替える理由: 現行ワークフローは検証環境・本番ともに`HUGO_ENVIRONMENT=production`（PostCSS/PurgeCSS分岐を通すため）であり、environmentでは区別できない。baseURLは既にワークフローで`--baseURL https://dev.asnomi.com/`と指定されているため、**ワークフロー側の変更は不要**（トラックCとの調整事項なし）。
- **注意（本番公開時）:** 本番のbaseURLが`indexableHosts`に無いと、本番が意図せずnoindexになる。本番デプロイ用ワークフローを作る際（トラックC）は、`--baseURL`のホスト名が`indexableHosts`に含まれることを必ず確認する。
- 補足: `robots.txt`のDisallowとnoindexメタは併用している。Googleは「robots.txtでブロックされたページのnoindexは読めない」ため、外部リンクで発見された場合のURL単体インデックスまでは完全には防げない。検証環境は外部リンクが無い前提で実害は小さいが、より確実にしたい場合はCloudFront側で`X-Robots-Tag: noindex`レスポンスヘッダを付与する案がある（トラックD領域、必要になれば相談）。

**検証結果（ローカル、`hugo --baseURL`切替）:** `https://dev.asnomi.com/`ではrobots.txtが全拒否・全ページにnoindexメタ・`404.html`出力あり。`https://asnomi.com/`ではrobots.txtが`Allow`＋Sitemap・noindexメタなし・`404.html`出力あり。デプロイ後の`curl -I https://dev.asnomi.com/not-exist/`による404応答確認は、マージ後のdev自動デプロイで実施する。

### 7.7 実コンテンツへの差し替え（2026-10-23）

ダミーだったヒーロー・テキスト・SNS・メタ情報を実素材に差し替えた。作品・ニュースは素材待ちのためダミーのまま（Notion連携までは本リポジトリのファイルで管理）。

| 項目 | 内容 | 管理場所 |
| --- | --- | --- |
| ヒーロー画像 | `assets/images/hero/hero.jpg`（2400×1350）。ビルド時に768/1280/1920pxのWebPへ変換（4.2MB→79〜451KB）し`srcset`で出し分け。キャッチコピー・サブテキストは未使用（空） | `content/_index.md`の`banner` |
| トップのabout文 | 「趣味でイラストレーター/シンガーソングライターしてる…」 | `content/_index.md`の`about.content` |
| プロフィール | 公式プロフィール文（2026/3/28版）とモノクロのアイコン画像（`assets/images/profile/icon.jpg`、350×350）。画像は任意項目 | `content/about.md` |
| ファビコン | 現行サイトのもの（48×48 PNG）を`assets/images/favicon.png`に配置（Hugoが48/96/144pxに変換）。元が小さいためPWA用の大きいアイコンはぼやける | `params.toml`の`favicon` |
| SNS | X / Instagram / YouTube / SoundCloud / はてなブログ / Pixiv / TuneCore Japan / Tumblr / GitHub（表示順どおり。Tumblr・GitHubは2026-10-27追加）。ヒーロー（アイコン）とお問い合わせページ（アイコン+名称）で共通 | `config/_default/params.toml`の`[[social]]` |
| サイト名・メタ | サイト名`asnomi studio`、description/keywords/author、`lang="ja"`、OGP既定画像（現行サイトの720×420を流用） | `config/_default/hugo.toml`・`params.toml`の`[metadata]`、`static/images/ogp.jpg` |
| フッター | お問い合わせフォーム（名前・メールアドレス・内容）＋`©2012-{ビルド年} asnomi studio`（終了年はビルド時に自動更新）。Kross標準から電話・住所欄のみ除外。フォームの送信先は`contact_form_action`で指定（未設定の`"#"`のままだと送信されない） | `layouts/partials/essentials/footer.html`、`params.toml`の`contact_form_action`/`copyright_since`/`copyright_holder` |

**テンプレート側の変更点（プロジェクト側`layouts/`のオーバーライド）:**
- `layouts/index.html`: ヒーローを`assets/`画像のレスポンシブ`<img>`化。コピー無しでも`<h1>`（視覚的には非表示）を出力。
- `layouts/partials/social-links.html`（新規）: SNS一覧の共通部品。テーマにアイコンが無いサービスは`badge`（丸囲み文字）で代用。※テーマ標準のお問い合わせページは`.URL`を参照しておりリンクが空になる不具合があったため、本部品に置き換えた。
- `layouts/_default/about.html`（新規）: プロフィール画像を任意化し、個人サイトに不要なWork Process/Team/Clients区画を除去。
- `layouts/partials/components/page-title.html`（新規）: 下層ページ見出しのカラフルな装飾イラストを撤去。
- `layouts/partials/essentials/header.html`（新規）: 「Home」→「ホーム」。
- `layouts/partials/essentials/head.html`: `<title>`の二重出力（テーマ標準で`basic-seo`と重複）を解消。

**表示確認:** PC幅・スマホ幅（390px）でヒーロー・SNS・プロフィール・お問い合わせを目視確認。スマホ幅では`fixed`ヘッダーがヒーロー上部に被るため、991px以下ではヒーローをヘッダー高（114px）だけ下げている。

**本番ビルドの検証結果（Track C設計書8章「未検証」項目への回答）:** Node.js導入環境で`npm ci`＋`HUGO_ENVIRONMENT=production hugo --gc --minify --baseURL https://dev.asnomi.com/`を実行し、**ビルドは成功**した。一方で、**PurgeCSSが実質無効**であることが判明した。テーマの`postcss.config.js`のsafelistに`/[aria-expanded=true]/`と書かれているが、正規表現では文字クラス（`a-e`・`r`・`i`・`t`等の任意の1文字）になり、ほぼ全てのセレクタがsafelist扱いとなって削除されない。インラインCSSは約260KB（ページHTMLは約500KB）のまま。`\[aria-expanded=true\]`とエスケープすると約56KB（HTML約300KB）になり、`hugo_stats.json`が無いCI同様のコールドスタートでも同じ結果だった。ただし実際に削除されるクラスの影響（JSが付け外しするクラス等）の目視確認が必要なため、**本PRでは`postcss.config.js`を変更せず、別PRで対応する**（8章バックログ）。

---

### 7.8 作品・ニュースのサンプル差し替え（2026-10-26）

ダミーだった作品6点・ニュース3件を、実際の作品3点・ニュース3件に差し替えた（Notion連携までは本リポジトリのファイルで管理）。

| 種別 | ファイル | front matter（Notion連携時のプロパティとの対応） |
| --- | --- | --- |
| 作品 | `content/works/{slug}.md`（3点） | `title`（タイトル）／`date`（制作日）／`image`（`assets/images/works/`配下）／`categories`（ジャンル。`楽曲`・`同人誌`）／`description`（説明文） |
| ニュース | `content/news/{日付-スラッグ}.md`（3件） | `title`／`date`（公開日）／`description`＋本文（Markdown）。画像は任意（今回は未使用） |

- 作品画像は、現行サイトの各作品ページのジャケット画像（400〜800px）をそのまま使用。
- **作品詳細ページ**は、制作日・ジャンルに加えて**説明文（`description`）をリード文として表示**するようにした（`layouts/works/single.html`）。詳細本文・追加画像が必要な場合は、同じmdファイルのfront matter以下にMarkdownで追記すれば表示される（今回は省略）。
- **ギャラリー**: 作品タイトルをホバー時のオーバーレイに表示し、`alt`にもタイトルを設定（`layouts/works/list.html`、`layouts/index.html`）。
- **ニュース**: カードと記事ページを画像任意に変更し、日付を日本語表記（`2026年10月14日`）で表示。記事ページの英語表記（Published on … by …）を撤去（`layouts/_default/post.html`、`layouts/_default/single.html`）。
- **画像の縦伸びの全体修正**: 画像パーツ（`image.html`）が`<img>`に付ける`height`属性が、`w-100`等の幅指定と併用すると縦に引き伸ばされていた（ギャラリー・ニュースカードも同様）。`assets/scss/custom.scss`に`img.img { height: auto; }`を追加し、サイト全体で縦横比を維持するようにした。
- **未来日付の記事は出力されない（Hugoの仕様）**: ニュース「ポートフォリオサイトをリニューアルしました」は日付が`2026-10-30`のため、それ以前のビルドでは出力されない（ビルド時点の日付が`date`以降になって初めて公開される）。デプロイは`dev`へのpushでのみ走るため、10/30以降に反映するには何らかのpushが必要（将来のNotion連携でのcron実行では自動で公開される）。

---

### 7.9 PurgeCSS（未使用CSS削除）の修正（2026-10-26）

7.7節で判明した「PurgeCSSが実質無効」の問題を修正した（`asnomi-kross-mock/postcss.config.js`）。

**原因と対応:**

| # | 問題 | 対応 |
| --- | --- | --- |
| 1 | safelistの`/[aria-expanded=true]/`が正規表現の文字クラスとして、ほぼ全セレクタに一致していた（＝何も削除されない） | safelistを`standard`（クラス名等の一致）と`greedy`（セレクタの部品のどれかが一致すれば残す）に整理し、正しい正規表現に修正 |
| 2 | 抽出処理（`defaultExtractor`）がタグ・クラス・IDの配列だけを返していたため、`[class^=ti-]`のような属性セレクタが常に「未使用」と判定されていた（Themifyアイコンのフォント指定が消えてアイコンが崩れる） | 抽出結果に`class`/`id`属性とその値も含めて返すように変更。`[class^=ti-]`は「ti-で始まるクラスが実際にあるか」で正しく判定される |
| 3 | HTMLには無くJSが後から付け外しするもの・Bootstrapの基本定義が消える | safelistに追加: `nav-bg`（スクロール時のヘッダー背景、テーマのscript.js）、`aria-expanded`（モバイルメニューのアイコン切替）、`:root`（BootstrapのCSS変数`--bs-*`の定義）、`[hidden]` |

※ 対象の洗い出しは、①PurgeCSS前後のCSSのクラス差分のうちJS内に名前が出てくるもの、②属性セレクタを含むルールの前後比較、で機械的に行った。

**効果（本番ビルド、トップページ）:**

| 項目 | 修正前 | 修正後 |
| --- | --- | --- |
| インラインCSS | 約260KB | 約59KB |
| HTML全体 | 約500KB | 約300KB |

残りのHTMLの大半（約230KB）はインラインのJavaScript（Swiper・Shuffle.js・Bootstrap等）。

**検証:**
- 未純化（開発ビルド）と純化後（本番ビルド）を並べて起動し、各ページの全要素の計算済みスタイル（表示・色・フォント・余白・サイズ・`::before`/`::after`等）をブラウザ上で比較。トップ・作品一覧・作品詳細・プロフィール・ニュース一覧・ニュース記事・お問い合わせ・404の全ページで、PC幅（1280px）・スマホ幅（390px）とも差分なし。
- JSによる動的な状態は本番相当サーバーで個別に確認: スクロール時のヘッダー背景、モバイルメニューの開閉とアイコン切替、作品ホバー表示、カテゴリ絞り込み。
- `hugo_stats.json`が無い状態（CIと同じ）からのビルドでも同じ結果になることを確認。
- **今後の注意**: テンプレートやJSで「HTMLに最初は無いクラス・属性」を新たに使う場合、本番だけスタイルが消える可能性がある。その場合は`postcss.config.js`のsafelistに追加する（開発サーバーではPurgeCSSが動かないため気付きにくい）。

---

### 7.10 絞り込みボタンの選択状態の修正・タイムゾーンの変更（2026-10-26）

**① 作品ギャラリーの絞り込みボタンの選択状態**
- 症状: 押したボタンが選択中の色にならず「すべて」のまま（絞り込み自体は正常）。
- 原因: テーマ標準の`data-bs-toggle="buttons"`はBootstrap 4の機能で、Bootstrap 5では廃止されており、選択状態（`.active`）を付け替える処理がどこにも無かった。
- 対応: `layouts/works/list.html`に、選ばれたボタンへ`.active`を付け替える短いスクリプトを追加。あわせて、テーマ標準の選択中の色（`#4a5667`）は通常時（`#353d49`）との差が小さく見分けにくいため、選択中のボタンをアクセント色（`#879094`）にした（`assets/scss/custom.scss`。テーマ側が`!important`で色を指定しているため、こちらも`!important`で上書き）。

**② タイムゾーンを`Asia/Tokyo`に変更**
- `config/_default/hugo.toml`の`timeZone`を`UTC`→`Asia/Tokyo`に変更。
- 影響: front matterの日付に時刻帯（`+09:00`等）を書かなかった場合の解釈が変わる。例: `date: 2025-01-01`は、これまで「UTCの0時（日本時間の9時）」だったが、今後は「日本時間の0時」。未来日付の記事の公開タイミング（7.8節）や、サイトマップの更新日時の表記も日本時間基準になる。
- 現在のコンテンツは日付がすべて`+09:00`付きのため、変更前後でビルド結果に差が無いことを確認済み（一時ファイルで、日付のみの記事の解釈が変わることも確認）。Notion連携（トラックB）で生成する日付も、この設定で日本時間として扱われる。

---

### 7.11 サイト内容の更新手順書（2026-10-26）

Notion連携までの暫定運用として、[運用_サイト内容の更新手順.md](./運用_サイト内容の更新手順.md) を作成した。ヒーロー・テキスト・SNS・作品・ニュースの更新箇所、画像の置き場所とパスの書き方、反映の流れ（ブランチ→PR→devマージ→自動デプロイ→確認）、ローカル確認方法を記載。

- 公開リポジトリのため、更新できるのは書き込み権限を持つ人のみであること、外部からのPRをむやみにマージしないこと、秘密情報・個人情報・写真の位置情報をコミットしないことを冒頭に明記。
- `dev`/`main` のブランチ保護（PR経由のみ・force push/削除の禁止）が未設定のため、推奨設定として記載（設定自体は未実施）。
- 本文（Markdown）中の画像は、`assets/` に置いても公開されない（front matterから参照したときだけ公開される）ことを確認したため、本文用の画像は `static/images/` に置く手順とした。

---

### 7.12 Swiper（スライダー）の削除（2026-10-26）

どのページでも使っていないスライダー部品（Swiper）を削除し、各ページに埋め込まれるJS・CSSを削減した。

| 対象 | 変更内容 |
| --- | --- |
| `hugo.toml` | Swiper の JS（`swiper-bundle.js`）・CSS（`swiper-bundle.css`）の読み込みを削除 |
| `assets/js/script.js`（新規） | テーマの`script.js`をコピーし、Swiperの初期化（お客様の声・取引先ロゴのスライダー）を削除。**残すとSwiper未定義のエラーで処理が止まり、後ろにある作品ギャラリーの絞り込み（Shuffle.js）が動かなくなる**ため |
| `layouts/index.html`・`content/_index.md` | 無効化済みだったSwiper依存の区画（お客様の声・取引先ロゴ）と、その設定項目を削除 |
| `postcss.config.js` | 不要になった`/^swiper-/`のsafelistを削除 |

**効果（本番ビルド、トップページ）:** ページ全体 約304KB → 約144KB（プラグイン＋テーマのJS 約180KB → 約38KB、CSS 約59KB → 約40KB）。

**検証:** 本番相当サーバーで、JSエラーが出ないこと（Swiper未定義エラーなし）、作品ギャラリーの絞り込みと選択色、スクロール時のヘッダー背景、モバイルメニューの開閉とアイコン表示を確認。

---

### 7.13 現行サイトの雰囲気への寄せ込み（2026-10-26）

| # | 内容 | 主な変更箇所 |
| --- | --- | --- |
| 1 | **ページ表示時のディゾルブ**: 現行サイトと同じCSSアニメーション（2秒、最初の1割は透明のまま）を`body`に適用。OSで「視差効果を減らす」等を設定している人には動きを付けない。効果が重なるKross標準の読み込み中アニメーション（preloader）は無効化 | `custom.scss`、`params.toml`の`[preloader]` |
| 2 | **余白を約3pt(4px)に**: 作品ギャラリー（トップ・一覧）とお知らせ（トップ・一覧）の隙間を24px→4pxに詰め（`.grid-tight`）、これらの区画だけ表示幅の上限を1140px→1600pxに広げて画像・カードを大きく表示（`.container-wide`）。文章ページは標準幅のまま。お知らせカードの高さそろえは7.14で取り消し | `custom.scss`、`layouts/index.html`、`layouts/works/list.html`、`layouts/_default/list.html`（新規）、`layouts/_default/post.html` |
| 3 | **お問い合わせフォームの削除**: フッターはお問い合わせの案内（お問い合わせページへのリンク）とコピーライトのみ。お問い合わせページに案内文とメールアドレス、SNS一覧を表示。`contact_form_action`は削除 | `footer.html`、`layouts/_default/contact.html`、`content/contact.md`、`params.toml` |
| 5 | **配色をグレー・ターコイズ・ピンクの淡い色合いに**: 主色=淡いターコイズ`#9fd8d1`、差し色=淡いピンク`#f3a7b8`、本文`#5d6468`／見出し`#3b4246`、フッター背景`#f2f4f4`。淡い背景の上は白文字だと読めないため濃いグレーの文字にし、トップの写真の上（ヘッダーが透明な状態）だけ白文字。リンク色は濃いめのターコイズ`#3c9a92` | `hugo.toml`の`params.variables`、`custom.scss`の「配色」、`header.html`、`page-title.html` |

- 色の微調整は原則`hugo.toml`の`params.variables`だけで行える（リンク色のみ`custom.scss`の`$link-hover`）。
- 依頼4（Adobe Fontsの埋め込み）は別途対応予定。
- 検証: 開発サーバーでPC幅（1440px）・スマホ幅（390px）を目視確認、PurgeCSS有効の本番ビルドで追加したスタイルが残ることを確認。

---

### 7.14 フォントの変更（Adobe Fonts）・お知らせカードの高さそろえの取り消し（2026-10-26）

- **フォント**: 現行サイトと同じAdobe Fontsのキット`plc5kmg`を、現行と同じJavaScript埋め込みコードで読み込む（`layouts/partials/essentials/head.html`）。日本語フォントは必要な文字だけを読み込む方式（動的サブセット）のため、JS埋め込みが必要。キットIDは公開されたHTMLに出る値のため、公開リポジトリに含めて問題ない。
- **割り当て**（現行と同じ）: 本文・小見出し（h2〜h6）・メニュー・ボタン＝`vdl-yotag`（`hugo.toml`の`font_primary`/`font_secondary`）、大見出し（h1）とヘッダー左上のサイト名＝`ab-anzu`（`custom.scss`。サイト名は2026-10-26追加）。テーマの`.font-secondary`クラスは`!important`でフォントを固定するため、h1には付けない。※2026-10-27にh1は`vdl-yotag`へ変更（7.15）。
- キットに含まれる太さは`vdl-yotag`が500、`ab-anzu`が400のみのため、太字の見出し等はブラウザが疑似的に太くして表示する（現行サイトと同じ挙動）。
- テーマ同梱の`webfont-loader`（Googleフォント等の読み込み部品）は読み込み指示が無く使われていなかったため外した。それまで設定していた`Work Sans`は実際には読み込まれておらず、端末の標準フォントで表示されていた。
- 手元（localhost）でキットのフォントが読み込まれること（`wf-active`）を確認済み。
- お知らせカードの高さそろえ（7.13の2）は、確認の結果不要となったため取り消した。

### 7.15 見出しフォントの変更・ページ表示時のディゾルブの廃止（2026-10-27）

- **見出しフォント**: 下層ページ上部の大見出し（h1。「作品ギャラリー」「プロフィール」等）を`ab-anzu`から`vdl-yotag`に変更（`custom.scss`のh1指定を削除）。`ab-anzu`はヘッダー左上のサイト名だけに使う。
- **ディゾルブの廃止**: 7.13の1で入れたページ表示時のフェードイン（2秒）を削除。表示の速さを活かすため。読み込み中アニメーション（preloader）は引き続き無効（読み込み完了まで画面が覆われ、同じく表示が遅く見えるため）。
### 7.16 作品ページの価格・仕様・販売先、YouTubeの軽い埋め込み（2026-10-27）

Notion同期で追加された作品の項目（`price` `spec` `shops` `sale_status`、[設計書_Notionデータ連携.md](./設計書_Notionデータ連携.md) 1.2・3.2節）を作品ページに表示する。

| # | 内容 | 主な変更箇所 |
| --- | --- | --- |
| 1 | **価格**: 数値を3桁区切りで「1,500円」と表示。0円は「無料」。税込・税抜の表記は付けない。項目が無ければ欄ごと出さない（0を「値なし」と扱わないよう `isset` で判定） | `layouts/works/single.html` |
| 2 | **仕様**: 改行を含む場合は改行して表示 | 同上 |
| 3 | **販売**: 販売終了→「販売終了」（ボタンは出さない）／販売先URLあり→BOOTH・メロンブックス・配信サイトのボタン／販売中でURLなし→「イベント・直販のみ」／販売状況もURLもなし→出さない | `layouts/partials/works/shops.html`、`custom.scss`（`.shop-links`） |
| 4 | **YouTube**: 同期が出力するHugo組み込みの `{{< youtube ID >}}` を上書きし、最初はサムネイルだけ表示、押したときに動画を読み込む方式にした（テーマ同梱の `youtube-lite` の部品を利用）。再生時は `youtube-nocookie.com` を使う。ページを開いただけではYouTubeと通信しない | `layouts/_shortcodes/youtube.html` |
| 5 | 日付の見出しを「制作日」から「頒布日」に変更（Notionの列名に合わせる） | `layouts/works/single.html` |
| 6 | 本文の画像キャプションの文字色を、サイトの文字色に合わせた | `custom.scss` |

### 7.17 トップの作品欄を4列に・ボタンのピンク化・カバー画像なしの表示（2026-10-27）

- トップページの作品欄を、作品ギャラリーと同じPC4列（スマホ等は2列）に変更。表示件数を6件→8件（4の倍数）に変更（content/_index.mdのportfolio.item_show）。
- 作品ページの販売先ボタンと、お知らせの「続きを読む」ボタンを、アクセント色のピンク（color_secondary）地に濃いグレーの文字に変更。専用クラス.btn-accentで指定し、他のボタン（.btn-primary: 作品ギャラリーの絞り込み・404の戻るボタン）の色は変えない。
- カバー画像が無い作品は、作品一覧・トップの作品欄で壊れた画像の代わりに作品名を正方形の枠で表示（layouts/partials/works/thumb.html）。作品ページでは画像の欄を出さない。原則カバー画像ありで掲載するため、最低限の表示とする。

---

## 8. 未対応・今後の課題（バックログ）

- **作品・ニュースの追加**: 作品3点・ニュース3件のサンプルは差し替え済み（7.8節）。以降の追加・作品詳細本文は、素材が揃い次第対応（Notion連携後はNotion側で管理）。
- **SNS共有画像・ファビコンの高解像度化**: OGP既定画像は現行サイトの720×420（推奨1200×630より小さい）を流用中。ファビコンも元が48×48のため、必要になれば大きい版を用意する。

- **F-303: ギャラリーの年別ソート/グルーピング機能**（2026-08-25申し送り決定、5章参照）: MVP稼働後に改めて検討
- **ダークモード対応**: 現行サイトにはあるが、Kross標準にはない。追加SCSS実装が必要
- **自前フォント（`OpenSauceOne`）の`@font-face`読み込み**: パラメータ指定だけでは対応できないため、SCSS側の追加カスタマイズが必要
- **画像保存先（`assets/` vs `static/`）の最終決定**: T1-4（Notionデータ連携、トラックB）側との連携待ち。KrossのImage Processing活用方法（本書でのHugo標準機能利用）に合わせて最終決定する
