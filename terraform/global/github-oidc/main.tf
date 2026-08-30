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
  # AWSは現在thumbprintを検証しないが、リソース定義上は必須項目のため、
  # token.actions.githubusercontent.comの実際のTLS証明書チェーン（中間CA）から取得した値を設定する
  # （2026-08-30、openssl s_clientで実測。GitHubの証明書発行元変更時は再取得が必要）。
  thumbprint_list = [
    "2d74d6dfd96eea55ad7baafa0d3c6552b2dadc37",
  ]
}
