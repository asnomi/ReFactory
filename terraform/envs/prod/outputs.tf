output "bucket_name" {
  description = "GitHubのprod Environment Variablesへ払い出す: S3バケット名"
  value       = module.prod_site.bucket_name
}

output "distribution_id" {
  description = "GitHubのprod Environment Variablesへ払い出す: CloudFrontディストリビューションID"
  value       = module.prod_site.distribution_id
}

output "distribution_domain_name" {
  description = "付け替え前の確認用URL（https://<この値>/）"
  value       = module.prod_site.distribution_domain_name
}

output "deploy_role_arn" {
  description = "GitHubのprod Environment Variablesへ払い出す: IAMロールARN"
  value       = module.prod_site.deploy_role_arn
}

output "acm_certificate_arn" {
  value = module.prod_site.acm_certificate_arn
}
