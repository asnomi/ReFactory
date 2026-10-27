resource "aws_cloudfront_origin_access_control" "site" {
  name                              = coalesce(var.oac_name, "${var.domain_name}-oac")
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_function" "index_rewrite" {
  name    = "${var.environment}-index-rewrite"
  runtime = "cloudfront-js-2.0"
  comment = "Resolve directory URIs to index.html (${var.environment})"
  publish = true
  code    = file("${path.module}/functions/index-rewrite.js")
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = var.attach_domain ? [var.domain_name] : []
  price_class         = var.price_class
  comment             = "asnomi.com portfolio site - ${var.environment}"

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-${var.domain_name}"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  # 旧サイトのファイルは既存バケットから配信する（既存バケット側の設定は変更しない）
  dynamic "origin" {
    for_each = var.legacy_origin == null ? [] : [var.legacy_origin]
    content {
      domain_name = origin.value.domain_name
      origin_id   = "s3-legacy"

      s3_origin_config {
        origin_access_identity = origin.value.origin_access_identity
      }
    }
  }

  default_cache_behavior {
    target_origin_id       = "s3-${var.domain_name}"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.index_rewrite.arn
    }
  }

  # 旧サイトのパスは書き換えずにそのまま既存バケットへ渡す（index-rewriteは付けない）
  dynamic "ordered_cache_behavior" {
    for_each = var.legacy_origin == null ? [] : var.legacy_origin.path_patterns
    content {
      path_pattern           = ordered_cache_behavior.value
      target_origin_id       = "s3-legacy"
      viewer_protocol_policy = "redirect-to-https"
      allowed_methods        = ["GET", "HEAD"]
      cached_methods         = ["GET", "HEAD"]
      compress               = true
      cache_policy_id        = data.aws_cloudfront_cache_policy.caching_optimized.id
    }
  }

  # Hugoが生成する404.htmlをそのままCloudFrontのカスタムエラーページとして使う
  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # 代替ドメインを付けない間はCloudFrontの既定証明書を使う
  viewer_certificate {
    cloudfront_default_certificate = !var.attach_domain
    acm_certificate_arn            = var.attach_domain ? local.certificate_arn : null
    ssl_support_method             = var.attach_domain ? "sni-only" : null
    minimum_protocol_version       = var.attach_domain ? "TLSv1.2_2021" : "TLSv1"
  }
}
