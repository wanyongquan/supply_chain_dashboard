"""供应商画像指标服务。这里集中处理指标，不把业务计算散落在 Vue 页面。"""
from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any, Dict, List

from model import SupplierModel


class DashboardService:
    def __init__(self, provider):
        self.data = provider.load()
        self.supplier_model = SupplierModel(self.data)
        self.suppliers = self.supplier_model.suppliers
        self.materials = {item["material_id"]: item for item in self.data["materials"]}

    def _supplier(self, supplier_id):
        return self.supplier_model.get_supplier_by_id(supplier_id)

    def _material(self, material_id):
        return self.materials.get(material_id, {"material_id": material_id, "material_name": material_id})

    def _supplier_name(self, supplier_id):
        supplier = self._supplier(supplier_id)
        return supplier["supplier_name"] if supplier else supplier_id

    def list_suppliers(self, name=None):
        return self.supplier_model.list_suppliers(name)

    def supplier(self, supplier_id=None, name=None):
        if supplier_id:
            return self._supplier(supplier_id)
        return self.supplier_model.get_supplier_by_name(name or "")

    def list_materials(self):
        return list(self.materials.values())

    def list_orders(self, supplier_id=None, material_id=None, status=None):
        return [
            order for order in self.data["orders"]
            if (not supplier_id or order["supplier_id"] == supplier_id)
            and (not material_id or order["material_id"] == material_id)
            and (not status or order["status"] == status)
        ]

    def list_inventory(self, supplier_id=None, material_id=None):
        return [
            item for item in self.data["inventory"]
            if (not supplier_id or item["supplier_id"] == supplier_id)
            and (not material_id or item["material_id"] == material_id)
        ]

    def list_quality(self, supplier_id=None, material_id=None):
        return [
            item for item in self.data["quality"]
            if (not supplier_id or item["supplier_id"] == supplier_id)
            and (not material_id or item["material_id"] == material_id)
        ]

    def list_prices(self, supplier_id=None, material_id=None):
        return [
            item for item in self.data["prices"]
            if (not supplier_id or item["supplier_id"] == supplier_id)
            and (not material_id or item["material_id"] == material_id)
        ]

    def overview(self):
        profile = self.supplier_model.get_profile_overview()
        risk_rows = [item for item in self.suppliers if item["risk_level"] in ("高", "中")]
        key = [item for item in self.suppliers if item["supply_role"] in ("关键", "核心", "独家")]
        material_suppliers = defaultdict(set)
        spend_by_supplier = Counter()
        for row in (*self.data["orders"], *self.data["prices"]):
            material_suppliers[row["material_id"]].add(row["supplier_id"])
        for row in self.data["prices"]:
            spend_by_supplier[row["supplier_id"]] += row["unit_price"] * row["purchase_qty"]
        total_spend = sum(spend_by_supplier.values())
        top_spend = sum(value for _, value in spend_by_supplier.most_common(10))
        material_count = len(material_suppliers)
        alternative_materials = sum(len(ids) > 1 for ids in material_suppliers.values())
        return {
            "kpis": [
                {"label": "供应商总数", "value": profile["supplier_count"], "note": "供应商主数据记录数"},
                {"label": "关键 / 核心 / 独家", "value": f'{sum(x["supply_role"] == "关键" for x in self.suppliers)} / {sum(x["supply_role"] == "核心" for x in self.suppliers)} / {sum(x["supply_role"] == "独家" for x in self.suppliers)}', "note": "按供应商与物料关系去重"},
                {"label": "高风险供应商数", "value": sum(x["risk_level"] == "高" for x in self.suppliers), "note": "跨主题风险来源去重"},
                {"label": "中高风险供应商数", "value": profile["risk_supplier_count"], "note": "风险等级为中或高"},
            ],
            "rating_distribution": profile["rating_distribution"],
            "risk_sources": [{"name": name, "count": sum(name in x["risk_sources"] for x in risk_rows)} for name in ["质量风险", "交付风险", "保供风险", "存续/资质", "价格风险"]],
            "focus_suppliers": [self._summary(x) for x in key],
            "abnormal_suppliers": [self._summary(x) for x in risk_rows],
            "concentration": {
                "top10_share": round(100 * top_spend / total_spend, 1) if total_spend else None,
                "single_source_materials": sum(len(ids) == 1 for ids in material_suppliers.values()),
                "alternative_rate": round(100 * alternative_materials / material_count, 1) if material_count else None,
            },
        }

    def _summary(self, item):
        return {"supplier_id": item["supplier_id"], "supplier_name": item["supplier_name"], "rating": item["rating"], "supply_role": item["supply_role"], "risk_level": item["risk_level"], "main_risk": item["risk_sources"][0] if item["risk_sources"] else "-"}

    def lifecycle(self):
        profile = self.supplier_model.get_profile_overview()
        event_count = sum(len(item.get("lifecycle_events", [])) for item in self.suppliers)
        risk_count = sum(bool(item["lifecycle_risk"]) for item in self.suppliers)
        return {
            "kpis": [
                {"label": "在供供应商", "value": profile["active_supplier_count"], "note": "有效供货关系"},
                {"label": "准入/评估中", "value": sum(x["lifecycle_status"] == "准入/评估中" for x in self.suppliers), "note": "按生命周期状态统计"},
                {"label": "生命周期事件", "value": event_count, "note": "供应商档案事件条数"},
                {"label": "生命周期风险", "value": risk_count, "note": "存在 lifecycle_risk 的供应商"},
            ],
            "lifecycle_structure": profile["lifecycle_distribution"],
            "qualification_risks": [{"supplier_id": x["supplier_id"], "supplier_name": x["supplier_name"], "risk_basis": x["lifecycle_risk"], "material": self._material(x["primary_material_id"])["material_name"], "level": x["risk_level"]} for x in self.suppliers if x["lifecycle_risk"]],
            "relationship_risks": [self._relation_risk(x) for x in self.suppliers if x["lifecycle_risk"] and x["supply_role"] in ("关键", "核心", "独家")],
        }

    def _relation_risk(self, item):
        return {"supplier_id": item["supplier_id"], "supplier_name": item["supplier_name"], "basis": item["lifecycle_risk"] + " + " + item["supply_role"], "material": self._material(item["primary_material_id"])["material_name"], "level": item["risk_level"]}

    def rating(self):
        scores = [item.get("evaluation_score", 0) for item in self.suppliers]
        dimensions = ["质量", "交付", "技术", "成本", "廉洁合作"]
        full_scores = [45, 30, 16, 7, 2]
        return {
            "kpis": [
                {"label": "已评级供应商", "value": len(self.suppliers), "note": "供应商主数据中的评级记录"},
                {"label": "A级", "value": sum(x["rating"] == "A" for x in self.suppliers), "note": "按供应商评级字段统计"},
                {"label": "C/D级", "value": sum(x["rating"] in ("C", "D") for x in self.suppliers), "note": "按供应商评级字段统计"},
                {"label": "平均得分", "value": round(sum(scores) / len(scores), 1) if scores else None, "note": "评价得分算术平均"},
            ],
            "dimensions": [
                {"name": name, "score": round(sum(x.get("rating_dimensions", [0] * 5)[index] for x in self.suppliers) / len(self.suppliers), 1) if self.suppliers else 0, "full": full_scores[index]}
                for index, name in enumerate(dimensions)
            ],
            "items": [{"supplier_id": x["supplier_id"], "supplier_name": x["supplier_name"], "rating": x["rating"], "score": x.get("evaluation_score"), "score_status": "来源于供应商评价记录"} for x in self.suppliers],
        }

    def delivery(self):
        rows = self.data["orders"]
        known_statuses = ["已完成", "部分交付", "逾期未完", "待确认"]
        statuses = known_statuses + sorted({item["status"] for item in rows} - set(known_statuses))
        delivered = [x for x in rows if x.get("actual_delivery_date")]
        on_time = [x for x in delivered if x["actual_delivery_date"] <= x["expected_delivery_date"]]
        ratios = [float(x["delivery_ratio"].rstrip("%")) for x in rows if x.get("delivery_ratio") not in (None, "-")]
        return {
            "kpis": [
                {"label": "订单确认平均时长（天）", "value": round(sum(x.get("confirmation_days", 0) for x in rows) / len(rows), 1) if rows else None, "note": "订单记录平均值"},
                {"label": "准时交付率", "value": round(100 * len(on_time) / len(delivered), 1) if delivered else None, "note": "仅统计含实际交付日期的订单"},
                {"label": "平均交付比例", "value": round(sum(ratios) / len(ratios), 1) if ratios else None, "note": "订单交付比例算术平均"},
                {"label": "高风险订单数", "value": sum(x["risk_level"] == "高" for x in rows), "note": "按订单风险等级统计"},
            ],
            "gap_materials": rows,
            "status": [{"name": key, "count": sum(x["status"] == key for x in rows)} for key in statuses],
            "deviations": [{"supplier_id": x["supplier_id"], "supplier_name": self._supplier_name(x["supplier_id"]), "material": self._material(x["material_id"])["material_name"], "deviation": x["deviation"], "impact": x["impact"], "level": x["risk_level"]} for x in rows if x["deviation"] != "-"],
        }

    def supply(self):
        inventory = self.data["inventory"]
        total_amount = sum(x.get("stock_amount", 0) for x in inventory)
        low = [x for x in inventory if x["days_of_supply"] < 5]
        return {
            "kpis": [
                {"label": "库存金额", "value": total_amount, "note": "库存明细金额合计"},
                {"label": "低于安全库存物料数", "value": len(low), "note": "按供货天数小于 5 天统计"},
                {"label": "呆滞库存金额", "value": None, "note": "原始库存数据没有库龄字段"},
                {"label": "安全库存达标率", "value": round(100 * (len(inventory) - len(low)) / len(inventory), 1) if inventory else None, "note": "按库存行统计"},
            ],
            "health": inventory,
            "shortage_impact": low,
            "key_materials": [{"material_id": x["material_id"], "material_name": self._material(x["material_id"])["material_name"], "supplier_id": x["supplier_id"], "supplier_name": self._supplier_name(x["supplier_id"]), "days_of_supply": x["days_of_supply"], "basis": x["risk_basis"], "level": x["risk_level"]} for x in inventory if x["risk_level"] in ("高", "中")],
        }

    def quality(self):
        quality = self.data["quality"]
        inspected = sum(x.get("inspected_quantity", 0) for x in quality)
        defects = sum(x.get("defect_quantity", 0) for x in quality)
        return {
            "kpis": [
                {"label": "来料批次合格率", "value": round(100 * (1 - defects / inspected), 1) if inspected else None, "note": "按检验数量和缺陷数量计算"},
                {"label": "来料 PPM", "value": round(1_000_000 * defects / inspected) if inspected else None, "note": "缺陷数量 / 检验数量 × 1,000,000"},
                {"label": "退货批次率", "value": round(100 * sum(x["conclusion"] == "退货" for x in quality) / len(quality), 1) if quality else None, "note": "退货批次 / 检验批次"},
                {"label": "8D 关闭率", "value": round(100 * sum(x.get("eight_d_status") == "已关闭" for x in quality) / len(quality), 1) if quality else None, "note": "已关闭记录 / 有质检记录"},
            ],
            "issue_types": quality,
            "traceability": [{"batch_id": x["batch_id"], "material_name": self._material(x["material_id"])["material_name"], "supplier_id": x["supplier_id"], "supplier_name": self._supplier_name(x["supplier_id"]), "conclusion": x["conclusion"], "impact": x["impact"]} for x in quality],
        }

    def price(self, material_id=None):
        rows = [x for x in self.data["prices"] if not material_id or x["material_id"] == material_id]
        selected = material_id or self.data["prices"][0]["material_id"]
        gaps = [float(x["benchmark_gap"].rstrip("%")) for x in rows]
        impact = sum((x["unit_price"] - x["unit_price"] / (1 + float(x["benchmark_gap"].rstrip("%")) / 100)) * x["purchase_qty"] for x in rows)
        materials = sorted({x["material_id"] for x in self.data["prices"]})
        return {
            "kpis": [
                {"label": "偏差超 5% 的记录数", "value": sum(abs(x) > 5 for x in gaps), "note": "按价格记录基准价偏差"},
                {"label": "平均基准价偏差", "value": round(sum(gaps) / len(gaps), 1) if gaps else None, "note": "所选价格记录的偏差算术平均"},
                {"label": "估算价差金额", "value": round(impact, 2), "note": "单价差 × 采购数量"},
                {"label": "价格记录数", "value": len(rows), "note": "当前筛选条件下的价格明细数"},
            ],
            "materials": [{"material_id": key, "material_name": self._material(key)["material_name"]} for key in materials],
            "selected_material_id": selected,
            "comparisons": [{**x, "supplier_name": self._supplier_name(x["supplier_id"])} for x in rows],
            "cost_components": {"采购价差估算": round(impact, 2), "其他成本项": None},
        }

    def supplier_detail(self, supplier_id):
        return self.supplier_model.get_supplier_detail(supplier_id)

    def supplier_profile(self, supplier_id):
        return self.supplier_model.get_supplier_profile(supplier_id)

    def profile_overview(self, lifecycle_status=None, rating=None):
        return self.supplier_model.get_profile_overview(lifecycle_status, rating)

    def profile(self):
        """供应商画像聚合视图：将原总览、生命周期和质量看板按供应商主体合并。"""
        overview = self.overview()
        lifecycle = self.lifecycle()
        quality = self.quality()
        return {**overview, "lifecycle_structure": lifecycle["lifecycle_structure"], "qualification_risks": lifecycle["qualification_risks"], "quality_kpis": quality["kpis"], "quality_traceability": quality["traceability"]}

    def delivery_overview(self):
        """采购交付聚合视图：串联订单履约、在途状态与库存保供风险。"""
        delivery = self.delivery()
        supply = self.supply()
        return {**delivery, "inventory_kpis": supply["kpis"], "inventory_health": supply["health"], "key_materials": supply["key_materials"]}

    def dashboard(self, board, material_id=None):
        return {"profile": self.profile, "rating": self.rating, "delivery": self.delivery_overview, "price": lambda: self.price(material_id)}[board]()
