---
# banner（トップ最上部のヒーロー）
#   image    : assets/ 配下の画像パス。ビルド時にリサイズ+WebP化される
#   title    : キャッチコピー（任意。改行は <br>）。空ならコピーなしの画像のみ
#   subtitle : サブテキスト（任意）
banner:
  image : "images/hero/hero.jpg"
  title : ""
  subtitle : ""

# about
about:
  enable : true
  content : "趣味でイラストレーター/シンガーソングライターしてる「あすのみ」の公式Webサイトです。制作物や近況はこちらで発信します。"
  button:
    enable : true
    label : "プロフィールを見る"
    URL : "about"

# skill（本サイトのスコープ外のためモックでは非表示）
skill:
  enable : false

# experience（スコープ外のため非表示）
experience:
  enable : false

# education（スコープ外のため非表示）
education:
  enable : false

# service（スコープ外のため非表示）
service:
  enable : false

# portfolio (T2-4: ギャラリー)
portfolio:
  enable : true
  title : "作品ギャラリー"
  item_show : 8 # PCは4列のため、4の倍数にすると最後の行が欠けない
  # portfolio item comes from 'content/english/portfolio' folder
  # 欄の下のボタン（作品ギャラリーへのリンク）。enable: false で非表示
  button:
    enable : true
    label : "もっと作品を見る"
    URL : "works/"

# blog -> news (T2-5: ニュース・近況エリア、ホームには最新3件)
blog:
  enable : true
  title : "お知らせ・近況"
  # blog post comes from "content/english/blog" folder
  # 欄の下のボタン（お知らせ一覧へのリンク）。enable: false で非表示
  button:
    enable : true
    label : "お知らせ一覧"
    URL : "news/"
---
