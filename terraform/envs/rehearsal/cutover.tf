# 本番と同じく「既存のレコードが残った状態で付け替える」条件を再現するため、
# attach_domain = true 時に dev.asnomi.com の既存のA/AAAAレコードを state に取り込んでから向け直す。
# これらのレコードは envs/dev でも管理しているため、リハーサルの切り戻しでは destroy せずに
# terraform state rm でこの state から外し、envs/dev のディストリビューションへ向け直す。
import {
  for_each = var.attach_domain ? toset(["A"]) : toset([])
  to       = module.rehearsal_site.aws_route53_record.site_a[0]
  id       = "${var.hosted_zone_id}_${var.domain_name}_${each.key}"
}

import {
  for_each = var.attach_domain ? toset(["AAAA"]) : toset([])
  to       = module.rehearsal_site.aws_route53_record.site_aaaa[0]
  id       = "${var.hosted_zone_id}_${var.domain_name}_${each.key}"
}
