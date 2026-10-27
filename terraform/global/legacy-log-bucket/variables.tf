variable "aws_region" {
  description = "バケットを作成するAWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "bucket_name" {
  description = "旧ディストリビューションのログ出力先として指定されているバケット名"
  type        = string
  default     = "asnomi-general-log"
}
