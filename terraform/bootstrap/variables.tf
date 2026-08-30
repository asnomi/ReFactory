variable "aws_region" {
  description = "デプロイ先AWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "tfstate_bucket_name" {
  description = "Terraform state保存用S3バケット名（グローバルで一意である必要があるためアカウントIDを付与）"
  type        = string
  default     = "asnomi-terraform-state-566759952246"
}

variable "tfstate_lock_table_name" {
  description = "Terraform state用ロックテーブル名（DynamoDB）"
  type        = string
  default     = "asnomi-terraform-state-lock"
}
