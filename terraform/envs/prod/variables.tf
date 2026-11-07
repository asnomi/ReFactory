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
  description = "asnomi.comを新しいディストリビューションに付け、A/AAAAレコードを向けるか（2026-11-01に付け替え済みのためtrue。falseにすると代替ドメインが外れ、A/AAAAが削除される）"
  type        = bool
  default     = true
}

variable "github_repo_subject" {
  description = "OIDCトークンのsubに現れるリポジトリ表記（<owner>@<owner_id>/<repo>@<repo_id>。設計書トラックD 6.5節）"
  type        = string
  default     = "asnomi@81574932/ReFactory@1346288783"
}
