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
    key            = "envs/dev.tfstate"
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

module "dev_site" {
  source = "../../modules/static-site"
  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  environment       = "dev"
  domain_name       = var.domain_name
  hosted_zone_id    = var.hosted_zone_id
  price_class       = "PriceClass_100"
  enable_versioning = true
  github_repo       = var.github_repo
  github_ref        = "refs/heads/dev"
  oidc_provider_arn = data.terraform_remote_state.global_oidc.outputs.oidc_provider_arn
}
