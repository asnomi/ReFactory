variable "aws_region" {
  description = "トレイルのホームリージョン・S3の転送ルールを置くリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "notification_email" {
  description = "通知先のメールアドレス。公開リポジトリに書かないため既定値は持たず、ローカルの terraform.tfvars（.gitignore対象）で渡す"
  type        = string
}

variable "trail_bucket_name" {
  description = "CloudTrailの記録を保存するS3バケット名"
  type        = string
  default     = "asnomi-cloudtrail-566759952246"
}

variable "trail_log_retention_days" {
  description = "CloudTrailの記録をS3に保存する日数（通知はEventBridgeで即時に行うため、記録は事後の確認用）"
  type        = number
  default     = 90
}
