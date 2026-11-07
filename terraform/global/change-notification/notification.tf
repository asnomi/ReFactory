# 通知先（us-east-1）。メールの購読はAWSから届く確認メールでユーザーが承認するまで有効にならない。
resource "aws_sns_topic" "change_notification" {
  provider = aws.us_east_1
  name     = "asnomi-change-notification"
}

data "aws_iam_policy_document" "change_notification_topic" {
  statement {
    sid       = "AllowEventBridgePublish"
    actions   = ["sns:Publish"]
    resources = [aws_sns_topic.change_notification.arn]

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }

    condition {
      test     = "ArnEquals"
      variable = "aws:SourceArn"
      values   = [aws_cloudwatch_event_rule.config_change.arn]
    }
  }
}

resource "aws_sns_topic_policy" "change_notification" {
  provider = aws.us_east_1
  arn      = aws_sns_topic.change_notification.arn
  policy   = data.aws_iam_policy_document.change_notification_topic.json
}

resource "aws_sns_topic_subscription" "email" {
  provider  = aws.us_east_1
  topic_arn = aws_sns_topic.change_notification.arn
  protocol  = "email"
  endpoint  = var.notification_email
}

# us-east-1: CloudFront・Route53・IAM、および ap-northeast-1 から転送されたS3の変更を通知する
resource "aws_cloudwatch_event_rule" "config_change" {
  provider      = aws.us_east_1
  name          = "asnomi-config-change"
  description   = "CloudFront / Route53 / IAM / S3 の設定変更をSNSで通知する"
  event_pattern = local.event_pattern_all
}

resource "aws_cloudwatch_event_target" "config_change_sns" {
  provider = aws.us_east_1
  rule     = aws_cloudwatch_event_rule.config_change.name
  arn      = aws_sns_topic.change_notification.arn

  input_transformer {
    input_paths = {
      eventName = "$.detail.eventName"
      source    = "$.detail.eventSource"
      region    = "$.detail.awsRegion"
      time      = "$.detail.eventTime"
      user      = "$.detail.userIdentity.arn"
      ip        = "$.detail.sourceIPAddress"
      error     = "$.detail.errorCode"
      params    = "$.detail.requestParameters"
    }
    input_template = "\"[asnomi AWS設定変更] <eventName> (<source> / <region>)\\n日時(UTC): <time>\\n実行者: <user>\\n接続元: <ip>\\nエラー（失敗した操作のみ）: <error>\\nリクエスト: <params>\""
  }
}

# ap-northeast-1: S3のバケット設定の変更を us-east-1 のイベントバスへ転送する
resource "aws_cloudwatch_event_rule" "s3_change_forward" {
  name          = "asnomi-s3-config-change-forward"
  description   = "S3のバケット設定の変更を us-east-1 へ転送して通知する"
  event_pattern = local.event_pattern_s3
}

data "aws_iam_policy_document" "events_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["events.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.account_id]
    }
  }
}

resource "aws_iam_role" "events_forward" {
  name               = "asnomi-events-forward-to-us-east-1"
  assume_role_policy = data.aws_iam_policy_document.events_assume_role.json
}

data "aws_iam_policy_document" "events_forward" {
  statement {
    actions   = ["events:PutEvents"]
    resources = ["arn:aws:events:us-east-1:${local.account_id}:event-bus/default"]
  }
}

resource "aws_iam_role_policy" "events_forward" {
  name   = "put-events-us-east-1-default-bus"
  role   = aws_iam_role.events_forward.id
  policy = data.aws_iam_policy_document.events_forward.json
}

resource "aws_cloudwatch_event_target" "s3_change_forward" {
  rule     = aws_cloudwatch_event_rule.s3_change_forward.name
  arn      = "arn:aws:events:us-east-1:${local.account_id}:event-bus/default"
  role_arn = aws_iam_role.events_forward.arn
}
