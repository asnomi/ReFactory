output "bucket_name" {
  value = aws_s3_bucket.site.bucket
}

output "bucket_arn" {
  value = aws_s3_bucket.site.arn
}

output "distribution_id" {
  value = aws_cloudfront_distribution.site.id
}

output "distribution_arn" {
  value = aws_cloudfront_distribution.site.arn
}

output "distribution_domain_name" {
  value = aws_cloudfront_distribution.site.domain_name
}

output "acm_certificate_arn" {
  value = aws_acm_certificate_validation.site.certificate_arn
}

output "deploy_role_arn" {
  description = "GitHub ActionsのSecrets（AWS_DEPLOY_ROLE_ARN）に設定するIAMロールARN"
  value       = aws_iam_role.github_actions_deploy.arn
}
