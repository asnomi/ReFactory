variable "environment" {
  description = "環境識別子（例: dev, prod）。リソース名のsuffixに使用"
  type        = string
}

variable "domain_name" {
  description = "このサイトの独自ドメイン名（例: dev.asnomi.com）。S3バケット名にもそのまま使用する"
  type        = string
}

variable "hosted_zone_id" {
  description = "domain_nameを管理するRoute53ホストゾーンID"
  type        = string
}

variable "price_class" {
  description = "CloudFrontのPriceClass（コスト最適化。検証環境は北米/欧州/アジアのみのPriceClass_100を既定）"
  type        = string
  default     = "PriceClass_100"
}

variable "enable_versioning" {
  description = "S3バケットのバージョニングを有効化するか（誤ってs3 sync --deleteで消したファイルの復旧用）"
  type        = bool
  default     = true
}

variable "github_repo" {
  description = "GitHub Actionsからのデプロイを許可するリポジトリ（\"owner/repo\"形式）"
  type        = string
}

variable "github_ref" {
  description = "OIDC信頼ポリシーで許可するref（例: refs/heads/dev）。このref由来のワークフロー実行のみがロールを引き受けられる"
  type        = string
}

variable "oidc_provider_arn" {
  description = "GitHub Actions用IAM OIDCプロバイダのARN（terraform/global/github-oidcの出力）"
  type        = string
}
