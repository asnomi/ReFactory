variable "environment" {
  description = "環境識別子（例: dev, prod）。リソース名のsuffixに使用"
  type        = string
}

variable "domain_name" {
  description = "このサイトの独自ドメイン名（例: dev.asnomi.com）"
  type        = string
}

variable "bucket_name" {
  description = "サイト配信用S3バケット名。S3バケット名はAWS全体でグローバルに一意である必要があるため、domain_nameとは別にアカウントID等を含めた一意な値を指定する"
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

variable "attach_domain" {
  description = "domain_nameをディストリビューションの代替ドメインに付け、A/AAAAレコードを作成するか。falseの場合はCloudFrontの既定ドメイン（*.cloudfront.net）・既定証明書のみで構築する（ドメインの付け替え前の並行稼働用）"
  type        = bool
  default     = true
}

variable "acm_certificate_arn" {
  description = "既存のACM証明書（us-east-1）を使う場合のARN。指定した場合は証明書を新規発行しない。未指定（null）の場合はdomain_nameの証明書を発行する"
  type        = string
  default     = null
}

variable "oac_name" {
  description = "Origin Access Controlの名前（アカウント内で一意）。未指定の場合は<domain_name>-oac"
  type        = string
  default     = null
}

variable "legacy_origin" {
  description = <<-EOT
    旧サイトのファイルを既存バケットから配信するための2つ目のオリジン（未指定の場合は作らない）。
    - domain_name: 既存バケットのドメイン名
    - origin_access_identity: 既存のOAIのパス（origin-access-identity/cloudfront/<ID>）
    - path_patterns: このオリジンへ振り分けるパス（CloudFrontのビヘイビアのパスパターン）
  EOT
  type = object({
    domain_name            = string
    origin_access_identity = string
    path_patterns          = list(string)
  })
  default = null
}

variable "create_deploy_role" {
  description = "GitHub Actions用のデプロイロールを作成するか（一時的な検証用ディストリビューション等ではfalse）"
  type        = bool
  default     = true
}

variable "github_oidc_subjects" {
  description = "ロールの引き受けを許可するOIDCトークンのsub（完全一致）。例: repo:<owner>@<owner_id>/<repo>@<repo_id>:environment:dev。create_deploy_role = true の場合は1件以上必須"
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for s in var.github_oidc_subjects : startswith(s, "repo:") && !strcontains(s, "*")])
    error_message = "subはrepo:で始まり、ワイルドカード(*)を含まない完全な値で指定すること。"
  }
}

variable "oidc_provider_arn" {
  description = "GitHub Actions用IAM OIDCプロバイダのARN（terraform/global/github-oidcの出力）。create_deploy_role = true の場合は必須"
  type        = string
  default     = null
}
