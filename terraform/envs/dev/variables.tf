variable "aws_region" {
  description = "デプロイ先AWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "domain_name" {
  description = "検証環境の独自ドメイン名"
  type        = string
  default     = "dev.asnomi.com"
}

variable "bucket_name" {
  description = "検証環境のS3バケット名（dev.asnomi.comはS3バケット名としては他アカウントに既存のため、グローバルに一意な別名を使用）"
  type        = string
  default     = "asnomi-dev-site-566759952246"
}

variable "hosted_zone_id" {
  description = "asnomi.comのRoute53ホストゾーンID"
  type        = string
  default     = "Z13MX47JV7ZFKX"
}

variable "github_repo_subject" {
  description = "OIDCトークンのsubに現れるリポジトリ表記。GitHubはオーナー名・リポジトリ名に数値IDを付けた形式（<owner>@<owner_id>/<repo>@<repo_id>）で発行するため、その形で指定する（asnomi/ReFactory。IDは2026-10-23にCloudTrailの実トークンで確認）"
  type        = string
  default     = "asnomi@81574932/ReFactory@1346288783"
}
