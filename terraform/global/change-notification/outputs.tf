output "sns_topic_arn" {
  value = aws_sns_topic.change_notification.arn
}

output "trail_arn" {
  value = aws_cloudtrail.management.arn
}
