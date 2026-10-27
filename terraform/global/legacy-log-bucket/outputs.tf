output "bucket_name" {
  value = aws_s3_bucket.legacy_log.bucket
}

output "bucket_arn" {
  value = aws_s3_bucket.legacy_log.arn
}
