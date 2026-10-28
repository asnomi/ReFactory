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
  value = local.certificate_arn
}

output "deploy_role_arn" {
  description = "GitHub ActionsのSecrets（AWS_DEPLOY_ROLE_ARN）に設定するIAMロールARN（create_deploy_role = false の場合はnull）"
  value       = one(aws_iam_role.github_actions_deploy[*].arn)
}
