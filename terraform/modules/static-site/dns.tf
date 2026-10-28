# attach_domain = false の間はレコードを作らない（ドメインの付け替え時にtrueにして作成する）
resource "aws_route53_record" "site_a" {
  count   = var.attach_domain ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "site_aaaa" {
  count   = var.attach_domain ? 1 : 0
  zone_id = var.hosted_zone_id
  name    = var.domain_name
  type    = "AAAA"

  alias {
    name                   = aws_cloudfront_distribution.site.domain_name
    zone_id                = aws_cloudfront_distribution.site.hosted_zone_id
    evaluate_target_health = false
  }
}

moved {
  from = aws_route53_record.site_a
  to   = aws_route53_record.site_a[0]
}

moved {
  from = aws_route53_record.site_aaaa
  to   = aws_route53_record.site_aaaa[0]
}
