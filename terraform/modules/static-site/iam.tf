# GitHub ActionsがOIDCで一時的に引き受けるデプロイ用ロール。
# 信頼ポリシーはリポジトリ・ref（ブランチ）単位で絞り込み、意図しないブランチ／フォークからの利用を防ぐ。
data "aws_iam_policy_document" "github_actions_assume_role" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [var.oidc_provider_arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringLike"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_repo}:ref:${var.github_ref}"]
    }
  }
}

resource "aws_iam_role" "github_actions_deploy" {
  name               = "github-actions-${var.environment}-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume_role.json
}

# 最小権限：対象バケットへのデプロイ・対象ディストリビューションのInvalidationのみ許可
data "aws_iam_policy_document" "github_actions_deploy" {
  statement {
    sid    = "S3Deploy"
    effect = "Allow"
    actions = [
      "s3:PutObject",
      "s3:DeleteObject",
      "s3:ListBucket",
    ]
    resources = [
      aws_s3_bucket.site.arn,
      "${aws_s3_bucket.site.arn}/*",
    ]
  }

  statement {
    sid       = "CloudFrontInvalidate"
    effect    = "Allow"
    actions   = ["cloudfront:CreateInvalidation"]
    resources = [aws_cloudfront_distribution.site.arn]
  }
}

resource "aws_iam_role_policy" "github_actions_deploy" {
  name   = "deploy-${var.environment}"
  role   = aws_iam_role.github_actions_deploy.id
  policy = data.aws_iam_policy_document.github_actions_deploy.json
}
