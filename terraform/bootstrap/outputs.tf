output "tfstate_bucket_name" {
  value = aws_s3_bucket.tfstate.bucket
}

output "tfstate_lock_table_name" {
  value = aws_dynamodb_table.tfstate_lock.name
}
