# 本番（asnoni.com）。方針は設計書トラックD 9章を参照。
# 新しいバケット・ディストリビューションを並行して作成し、代替ドメインの付け替えは attach_domain で切り替える。
# 既存のディストリビューション・バケットはこのstateでは管理しない。
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
    key            = "envs/prod.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "asnomi-terraform-state-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

# CloudFront用ACM証明書はus-east-1固定のため専用エイリアスを用意
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# global/github-oidcで作成済みのOIDCプロバイダを参照する（アカウントに1つしか作れないため使い回す）
data "terraform_remote_state" "global_oidc" {
  backend = "s3"
  config = {
    bucket         = "asnomi-terraform-state-566759952246"
    key            = "global/github-oidc.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "asnomi-terraform-state-lock"
  }
}

# asnomi.comの既存の証明書を引き続き使う（新規発行しない）
data "aws_acm_certificate" "site" {
  provider    = aws.us_east_1
  domain      = var.domain_name
  statuses    = ["ISSUED"]
  most_recent = true
}

# 旧サイトのファイルの配信元（既存のバケットとOAIを参照のみ。設定は変更しない）
data "aws_s3_bucket" "legacy" {
  bucket = var.legacy_bucket_name
}

data "aws_cloudfront_origin_access_identities" "legacy" {
  comments = [var.legacy_oai_comment]
}

module "prod_site" {
  source = "../../modules/static-site"
  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  environment         = "prod"
  domain_name         = var.domain_name
  bucket_name         = var.bucket_name
  hosted_zone_id      = var.hosted_zone_id
  price_class         = "PriceClass_All"
  enable_versioning   = true
  attach_domain       = var.attach_domain
  acm_certificate_arn = data.aws_acm_certificate.site.arn

  legacy_origin = {
    domain_name            = data.aws_s3_bucket.legacy.bucket_regional_domain_name
    origin_access_identity = "origin-access-identity/cloudfront/${one(data.aws_cloudfront_origin_access_identities.legacy.ids)}"
    path_patterns          = var.legacy_path_patterns
  }

  oidc_provider_arn = data.terraform_remote_state.global_oidc.outputs.oidc_provider_arn

  # deployジョブに`environment: prod`を付ける前提。ブランチ限定はGitHubのprod Environmentの
  # Deployment branches（mainのみ）で担保する。
  github_oidc_subjects = ["repo:${var.github_repo_subject}:environment:prod"]
}
