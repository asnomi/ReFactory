# 設定変更の通知（改ざん検知）。設計書トラックD 10章を参照。
# CloudTrailの記録（管理イベントの書き込み）をEventBridgeのルールで拾い、SNSでメール通知する。
#   - CloudFront・Route53・IAMの記録は us-east-1 のEventBridgeに届くため、通知のルールとSNSは us-east-1 に置く
#   - S3のバケット設定の記録はバケットのリージョン（ap-northeast-1）に届くため、ap-northeast-1 のルールで
#     us-east-1 のイベントバスへ転送し、同じSNSから通知する
#   - デプロイ（S3へのアップロードはデータイベントで記録対象外、キャッシュの無効化は対象のイベント名に含めない）では通知しない
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
    key            = "global/change-notification.tfstate"
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

data "aws_caller_identity" "current" {}

locals {
  account_id = data.aws_caller_identity.current.account_id

  # 通知の対象とするイベント名（書き込み系のみ。CreateInvalidation等のデプロイ操作は含めない）
  watched_events = {
    "aws.cloudfront" = [
      "CreateDistribution", "CreateDistributionWithTags", "UpdateDistribution", "DeleteDistribution", "CopyDistribution",
      "AssociateAlias", "UpdateDomainAssociation",
      "CreateFunction", "UpdateFunction", "PublishFunction", "DeleteFunction",
      "CreateOriginAccessControl", "UpdateOriginAccessControl", "DeleteOriginAccessControl",
      "CreateCloudFrontOriginAccessIdentity", "UpdateCloudFrontOriginAccessIdentity", "DeleteCloudFrontOriginAccessIdentity",
    ]
    "aws.route53" = [
      "ChangeResourceRecordSets", "CreateHostedZone", "DeleteHostedZone",
    ]
    "aws.iam" = [
      "CreateRole", "DeleteRole", "UpdateRole", "UpdateAssumeRolePolicy",
      "PutRolePolicy", "DeleteRolePolicy", "AttachRolePolicy", "DetachRolePolicy",
      "PutRolePermissionsBoundary", "DeleteRolePermissionsBoundary",
      "CreatePolicy", "DeletePolicy", "CreatePolicyVersion", "DeletePolicyVersion", "SetDefaultPolicyVersion",
      "CreateOpenIDConnectProvider", "DeleteOpenIDConnectProvider", "UpdateOpenIDConnectProviderThumbprint",
      "AddClientIDToOpenIDConnectProvider", "RemoveClientIDFromOpenIDConnectProvider",
    ]
    "aws.s3" = [
      "PutBucketPolicy", "DeleteBucketPolicy",
      "PutBucketPublicAccessBlock", "DeleteBucketPublicAccessBlock",
      "PutAccountPublicAccessBlock", "DeleteAccountPublicAccessBlock",
      "PutBucketAcl", "PutBucketOwnershipControls", "DeleteBucketOwnershipControls",
      # 元に戻す手段（バージョン管理・古いバージョンの保持）を無効にする変更も対象にする
      "PutBucketVersioning", "PutBucketLifecycle", "DeleteBucketLifecycle",
    ]
  }

  event_pattern_all = jsonencode({
    source      = keys(local.watched_events)
    detail-type = ["AWS API Call via CloudTrail"]
    detail = {
      eventName = flatten(values(local.watched_events))
    }
  })

  event_pattern_s3 = jsonencode({
    source      = ["aws.s3"]
    detail-type = ["AWS API Call via CloudTrail"]
    detail = {
      eventName = local.watched_events["aws.s3"]
    }
  })
}
