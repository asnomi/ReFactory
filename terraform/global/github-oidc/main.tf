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
    key            = "global/github-oidc.tfstate"
    region         = "ap-northeast-1"
    dynamodb_table = "asnomi-terraform-state-lock"
    encrypt        = true
  }
}

provider "aws" {
  region = var.aws_region
}

# GitHub ActionsからAWSへOIDCで一時クレデンシャルを発行してもらうための信頼プロバイダ。
# 1AWSアカウントにつき1つしか作成できない（envs/dev・将来のenvs/prod等から共通利用する）。
resource "aws_iam_openid_connect_provider" "github_actions" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  # AWSは現在thumbprintを検証しないが、リソース定義上は必須項目のためGitHub公式値を設定する。
  thumbprint_list = [
    "6938fd4d98bab03faadb97b34396831e3780aea",
    "1c58a3a8518e8759bd075151268e610e0a1f6ea9",
  ]
}
