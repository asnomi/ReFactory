# GitHub ActionsがOIDCで一時的に引き受けるデプロイ用ロール。
# 信頼ポリシーはOIDCトークンのsubを完全一致（StringEquals、ワイルドカードなし）で絞り込む。
# subの形はGitHub側の発行形式とワークフローの書き方で変わるため、許可する値は呼び出し側で完全な文字列として渡す
# （設計書トラックD 6.4節参照）。
data "aws_iam_policy_document" "github_actions_assume_role" {
  count = var.create_deploy_role ? 1 : 0

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
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = var.github_oidc_subjects
    }
  }
}

resource "aws_iam_role" "github_actions_deploy" {
  count              = var.create_deploy_role ? 1 : 0
  name               = "github-actions-${var.environment}-deploy"
  assume_role_policy = data.aws_iam_policy_document.github_actions_assume_role[0].json

  lifecycle {
    precondition {
      condition     = length(var.github_oidc_subjects) > 0 && var.oidc_provider_arn != null
      error_message = "デプロイロールを作成する場合は github_oidc_subjects（1件以上）と oidc_provider_arn を指定すること。"
    }
  }
}

# 最小権限：対象バケットへのデプロイ・対象ディストリビューションのInvalidationのみ許可
data "aws_iam_policy_document" "github_actions_deploy" {
  count = var.create_deploy_role ? 1 : 0

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
  count  = var.create_deploy_role ? 1 : 0
  name   = "deploy-${var.environment}"
  role   = aws_iam_role.github_actions_deploy[0].id
  policy = data.aws_iam_policy_document.github_actions_deploy[0].json
}

moved {
  from = aws_iam_role.github_actions_deploy
  to   = aws_iam_role.github_actions_deploy[0]
}

moved {
  from = aws_iam_role_policy.github_actions_deploy
  to   = aws_iam_role_policy.github_actions_deploy[0]
}
