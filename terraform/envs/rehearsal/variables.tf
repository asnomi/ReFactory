variable "aws_region" {
  description = "デプロイ先AWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "domain_name" {
  description = "リハーサルで付け替えるドメイン名（envs/devと同じ）"
  type        = string
  default     = "dev.asnomi.com"
}

variable "bucket_name" {
  description = "リハーサル用の一時バケット名"
  type        = string
  default     = "asnomi-rehearsal-site-566759952246"
}

variable "hosted_zone_id" {
  description = "asnomi.comのRoute53ホストゾーンID"
  type        = string
  default     = "Z13MX47JV7ZFKX"
}

variable "attach_domain" {
  description = "dev.asnomi.comをこのディストリビューションに付け、A/AAAAレコードを向けるか（リハーサル中に切り替える）"
  type        = bool
  default     = false
}
