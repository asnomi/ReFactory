# 本番のドメイン付け替え手順をdev.asnomi.comでリハーサルするための一時環境。
# envs/devのディストリビューションを「旧」、ここで作るディストリビューションを「新」に見立てる。
# リハーサル完了後に terraform destroy で削除する（設計書トラックD 9.3節）。
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
    key            = "envs/rehearsal.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "asnomi-terraform-state-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# envs/devで発行済みのdev.asnomi.comの証明書を使う（本番と同じく既存の証明書を使う形にそろえる）
data "aws_acm_certificate" "site" {
  provider    = aws.us_east_1
  domain      = var.domain_name
  statuses    = ["ISSUED"]
  most_recent = true
}

module "rehearsal_site" {
  source = "../../modules/static-site"
  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  environment         = "rehearsal"
  domain_name         = var.domain_name
  bucket_name         = var.bucket_name
  hosted_zone_id      = var.hosted_zone_id
  price_class         = "PriceClass_100"
  enable_versioning   = false
  attach_domain       = var.attach_domain
  acm_certificate_arn = data.aws_acm_certificate.site.arn
  oac_name            = "rehearsal-${var.domain_name}-oac"
  create_deploy_role  = false
}
