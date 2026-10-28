# ドメインの付け替え（attach_domain = true）時に、既存の asnomi.com のAレコードを state に取り込み、
# 新しいディストリビューションへ向け直す（作成ではなく変更としてplanに出し、変更前後の向き先を確認できるようにする）。
# AAAAレコードは既存のものが無いため新規作成になる。
# 取り込み済みの場合、このブロックは何もしない。切り戻し手順は非公開資料を参照。
import {
  for_each = var.attach_domain ? toset(["A"]) : toset([])
  to       = module.prod_site.aws_route53_record.site_a[0]
  id       = "${var.hosted_zone_id}_${var.domain_name}_${each.key}"
}
