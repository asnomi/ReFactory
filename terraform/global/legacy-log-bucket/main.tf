# 旧ディストリビューションのログ出力先として指定されているバケット名を、自アカウントで確保する。
# ログの収集は目的としない（ACL無効のためレガシーログは配信されない。念のため1日で自動削除する）。
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "asnomi-terraform-state-566759952246"
    key            = "global/legacy-log-bucket.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "asnomi-terraform-state-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

resource "aws_s3_bucket" "legacy_log" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "legacy_log" {
  bucket                  = aws_s3_bucket.legacy_log.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "legacy_log" {
  bucket = aws_s3_bucket.legacy_log.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "legacy_log" {
  bucket = aws_s3_bucket.legacy_log.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "legacy_log" {
  bucket = aws_s3_bucket.legacy_log.id

  rule {
    id     = "expire-all-objects"
    status = "Enabled"

    filter {}

    expiration {
      days = 1
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}
