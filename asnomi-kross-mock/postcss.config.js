// 本番ビルド（HUGO_ENVIRONMENT=production）でのみ、未使用CSSを削除する（PurgeCSS）。
// 使用中かどうかは、Hugoがビルド時に書き出す hugo_stats.json（HTMLに出てくるタグ・クラス・ID）で判定する。
// そのため「HTMLには無く、JavaScriptが後から付け外しするクラス・属性」は safelist に入れないと消えてしまう。
// ※テーマ標準の設定は safelist に /[aria-expanded=true]/ と書かれており、正規表現の「文字クラス」として
//   ほぼ全てのセレクタに一致してしまい、PurgeCSSが実質無効になっていた（2026-10修正）。
const purgecss = require("@fullhuman/postcss-purgecss")({
  content: ["./hugo_stats.json"],
  defaultExtractor: (content) => {
    const els = JSON.parse(content).htmlElements;
    const tags = els.tags || [];
    const classes = els.classes || [];
    const ids = els.ids || [];
    return {
      tags,
      classes,
      ids,
      // class/id属性とその値も渡す。これが無いと [class^=ti-] のような属性セレクタが
      // 常に「未使用」と判定され、Themifyアイコンのフォント指定などが消えてしまう。
      attributes: { names: ["class", "id"], values: [...classes, ...ids] },
      undetermined: [],
    };
  },
  safelist: {
    // クラス名・ID・タグ名が一致すれば残す
    standard: [
      /^nav-bg$/, // スクロール時にヘッダーへ付く（テーマのscript.js）
      /dark/,
      /collapsing/, // モバイルメニュー開閉中（Bootstrap Collapse）
      /show/, // モバイルメニュー展開時（Bootstrap Collapse）
      /^lb-/,
      /^gl/,
      /^go/,
      /^gc/,
      /^gs/,
      /^gi/,
      /^desc/,
      /^zoom/,
      /dragging/,
      /fullscreen/,
      /loaded/,
      /visible/,
      /current/,
      /active/,
    ],
    // セレクタの部品（クラス名・属性名・疑似クラス等）のどれかが一致すれば、そのセレクタ全体を残す
    greedy: [
      /^aria-expanded$/, // モバイルメニューのアイコン切替（.navbar-toggler[aria-expanded=true]）。JSが付け外しする属性
      /^:root$/, // Bootstrapの CSS変数（--bs-*）の定義（:root,[data-bs-theme=light]）。消えるとリンク色・枠線色などが崩れる
      /^hidden$/, // hidden属性の要素を非表示にする基本ルール（[hidden]）
    ],
  },
});

module.exports = {
  plugins: [
    ...(process.env.HUGO_ENVIRONMENT === "production" ? [purgecss] : []),
  ],
};
