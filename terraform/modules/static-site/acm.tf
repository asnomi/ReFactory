# CloudFrontで使うACM証明書は必ずus-east-1リージョンで発行する必要がある（AWS仕様）。
# 呼び出し側でaws.us_east_1エイリアスのproviderを渡すこと。
# acm_certificate_arnで既存の証明書を指定した場合は、ここでは何も作らない。
locals {
  create_certificate = var.acm_certificate_arn == null
  certificate_arn    = local.create_certificate ? aws_acm_certificate_validation.site[0].certificate_arn : var.acm_certificate_arn
}

resource "aws_acm_certificate" "site" {
  count             = local.create_certificate ? 1 : 0
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = local.create_certificate ? {
    for dvo in aws_acm_certificate.site[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      type   = dvo.resource_record_type
      record = dvo.resource_record_value
    }
  } : {}

  zone_id         = var.hosted_zone_id
  name            = each.value.name
  type            = each.value.type
  records         = [each.value.record]
  ttl             = 60
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "site" {
  count                   = local.create_certificate ? 1 : 0
  provider                = aws.us_east_1
  certificate_arn         = aws_acm_certificate.site[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]
}

# countの追加に伴うアドレス変更（既存環境のリソースを作り直さないため）
moved {
  from = aws_acm_certificate.site
  to   = aws_acm_certificate.site[0]
}

moved {
  from = aws_acm_certificate_validation.site
  to   = aws_acm_certificate_validation.site[0]
}
