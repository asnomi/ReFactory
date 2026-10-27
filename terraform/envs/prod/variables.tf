variable "aws_region" {
  description = "デプロイ先AWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "domain_name" {
  description = "本番の独自ドメイン名"
  type        = string
  default     = "asnomi.com"
}

variable "bucket_name" {
  description = "本番のS3バケット名（新規作成。グローバルに一意な名前にするためアカウントIDを含める）"
  type        = string
  default     = "asnomi-prod-site-566759952246"
}

variable "hosted_zone_id" {
  description = "asnomi.comのRoute53ホストゾーンID"
  type        = string
  default     = "Z13MX47JV7ZFKX"
}

variable "attach_domain" {
  description = "asnomi.comを新しいディストリビューションに付け、A/AAAAレコードを向けるか。ドメインの付け替え作業でtrueにする（手順は非公開資料）"
  type        = bool
  default     = false
}

variable "legacy_bucket_name" {
  description = "旧サイトのファイルが置かれている既存のバケット名"
  type        = string
  default     = "asnomi.com"
}

variable "legacy_oai_comment" {
  description = "既存のバケットの読み取りに使うOAIのコメント（OAIの特定に使う）"
  type        = string
  default     = "s3host-20190303"
}

variable "legacy_path_patterns" {
  description = "既存のバケットから配信する旧サイトのパス。新サイトに対応するページができたものから順に外し、リダイレクトに置き換える"
  type        = list(string)
  default = [
    "/contents/*",
    "/img/*",
    "/hyouhon1422/*",
    "/discography.html",
    "/biography.html",
    "/style/*",
    "/favicon.ico",
  ]
}

variable "github_repo_subject" {
  description = "OIDCトークンのsubに現れるリポジトリ表記（<owner>@<owner_id>/<repo>@<repo_id>。設計書トラックD 6.5節）"
  type        = string
  default     = "asnomi@81574932/ReFactory@1346288783"
}
