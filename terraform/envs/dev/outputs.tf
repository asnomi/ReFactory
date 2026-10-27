output "bucket_name" {
  description = "トラックC(GitHub Actions)へ払い出す: S3バケット名"
  value       = module.dev_site.bucket_name
}

output "distribution_id" {
  description = "トラックC(GitHub Actions)へ払い出す: CloudFrontディストリビューションID"
  value       = module.dev_site.distribution_id
}

output "distribution_domain_name" {
  value = module.dev_site.distribution_domain_name
}

output "deploy_role_arn" {
  description = "トラックC(GitHub Actions)へ払い出す: IAMロールARN（GitHub Secrets: AWS_DEPLOY_ROLE_ARN）"
  value       = module.dev_site.deploy_role_arn
}

output "acm_certificate_arn" {
  value = module.dev_site.acm_certificate_arn
}
