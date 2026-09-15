"""供应商画像指标服务。这里集中处理指标，不把业务计算散落在 Vue 页面。"""
from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any, Dict, List


class DashboardService:
    def __init__(self, provider):
        self.data = provider.load()
        self.suppliers = self.data["suppliers"]
        self.materials = {item["material_id"]: item for item in self.data["materials"]}

    def _supplier(self, supplier_id):
        return next((item for item in self.suppliers if item["supplier_id"] == supplier_id), None)

    def _material(self, material_id):
        return self.materials.get(material_id, {"material_id": material_id, "material_name": material_id})

    def _supplier_name(self, supplier_id):
        supplier = self._supplier(supplier_id)
        return supplier["supplier_name"] if supplier else supplier_id

    def list_suppliers(self, name=None):
        suppliers = self.suppliers
        if name:
            keyword = name.casefold()
            suppliers = [item for item in suppliers if keyword in item["supplier_name"].casefold()]
        return suppliers

    def supplier(self, supplier_id=None, name=None):
        if supplier_id:
            return self._supplier(supplier_id)
        matches = self.list_suppliers(name)
        return matches[0] if matches else None

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
        ratings = Counter(item["rating"] for item in self.suppliers if item["lifecycle_status"] == "在供")
        risk_rows = [item for item in self.suppliers if item["risk_level"] in ("高", "中")]
        key = [item for item in self.suppliers if item["supply_role"] in ("关键", "核心", "独家")]
        return {
            "kpis": [
                {"label": "在供供应商数", "value": sum(x["lifecycle_status"] == "在供" for x in self.suppliers), "note": "有效供货关系供应商"},
                {"label": "关键 / 核心 / 独家", "value": f'{sum(x["supply_role"] == "关键" for x in self.suppliers)} / {sum(x["supply_role"] == "核心" for x in self.suppliers)} / {sum(x["supply_role"] == "独家" for x in self.suppliers)}', "note": "按供应商与物料关系去重"},
                {"label": "高风险供应商数", "value": sum(x["risk_level"] == "高" for x in self.suppliers), "note": "跨主题风险来源去重"},
                {"label": "降级及重大质量影响", "value": 3, "note": "示例数据"},
            ],
            "rating_distribution": [{"name": level, "count": ratings.get(level, 0)} for level in ["A", "B", "C", "D"]],
            "risk_sources": [{"name": name, "count": sum(name in x["risk_sources"] for x in risk_rows)} for name in ["质量风险", "交付风险", "保供风险", "存续/资质", "价格风险"]],
            "focus_suppliers": [self._summary(x) for x in key],
            "abnormal_suppliers": [self._summary(x) for x in risk_rows],
            "concentration": {"top10_share": "55.6%", "single_source_materials": 3, "alternative_rate": "82.4%"},
        }

    def _summary(self, item):
        return {"supplier_id": item["supplier_id"], "supplier_name": item["supplier_name"], "rating": item["rating"], "supply_role": item["supply_role"], "risk_level": item["risk_level"], "main_risk": item["risk_sources"][0] if item["risk_sources"] else "-"}

    def lifecycle(self):
        return {
            "kpis": [{"label": "在供供应商", "value": 3, "note": "有效供货关系"}, {"label": "准入/评估中", "value": 1, "note": "示例数据"}, {"label": "资质临期/过期", "value": "2 / 1", "note": "未来 90 天及已过期"}, {"label": "整改逾期供应商数", "value": 1, "note": "到期未关闭或未验证通过"}],
            "lifecycle_structure": [{"name": key, "count": sum(x["lifecycle_status"] == key for x in self.suppliers)} for key in ["在供", "准入/评估中", "暂停", "终止"]],
            "qualification_risks": [{"supplier_id": x["supplier_id"], "supplier_name": x["supplier_name"], "risk_basis": x["lifecycle_risk"], "material": self._material(x["primary_material_id"])["material_name"], "level": x["risk_level"]} for x in self.suppliers if x["lifecycle_risk"]],
            "relationship_risks": [self._relation_risk(x) for x in self.suppliers if x["lifecycle_risk"] and x["supply_role"] in ("关键", "核心", "独家")],
        }

    def _relation_risk(self, item):
        return {"supplier_id": item["supplier_id"], "supplier_name": item["supplier_name"], "basis": item["lifecycle_risk"] + " + " + item["supply_role"], "material": self._material(item["primary_material_id"])["material_name"], "level": item["risk_level"]}

    def rating(self):
        return {"kpis": [{"label": "已完成年度评级", "value": 4, "note": "A/B/C/D 正式结果"}, {"label": "A级", "value": 1, "note": "示例数据"}, {"label": "C/D级", "value": 2, "note": "需关注表现"}, {"label": "总体平均得分", "value": "78.4", "note": "按制度权重"}], "dimensions": [{"name": "质量", "score": 38.2, "full": 45}, {"name": "交付", "score": 23.7, "full": 30}, {"name": "成本", "score": 12.1, "full": 16}, {"name": "技术", "score": 6.1, "full": 7}, {"name": "廉洁合作", "score": 1.7, "full": 2}], "items": [{"supplier_id": x["supplier_id"], "supplier_name": x["supplier_name"], "rating": x["rating"], "score_status": "正式等级；纸质明细待结构化接入"} for x in self.suppliers]}

    def delivery(self):
        rows = self.data["orders"]
        return {"kpis": [{"label": "订单确认及时率", "value": "96.8%", "note": "按订单行"}, {"label": "时间遵守率", "value": "92.4%", "note": "承诺日期与实际收货日期"}, {"label": "数量遵守率", "value": "94.1%", "note": "承诺数量与实际收货数量"}, {"label": "差额最大的物料数", "value": 3, "note": "供货比例与交货比例差额 > 10 个百分点"}], "gap_materials": rows, "status": [{"name": key, "count": sum(x["status"] == key for x in rows)} for key in ["已完成", "部分交付", "逾期未完", "待确认"]], "deviations": [{"supplier_id": x["supplier_id"], "supplier_name": self._supplier_name(x["supplier_id"]), "material": self._material(x["material_id"])["material_name"], "deviation": x["deviation"], "impact": x["impact"], "level": x["risk_level"]} for x in rows if x["deviation"] != "-"]}

    def supply(self):
        inventory = self.data["inventory"]
        return {"kpis": [{"label": "库存金额", "value": "¥4,820 万", "note": "期末可用库存金额"}, {"label": "低于安全库存物料数", "value": 2, "note": "示例数据"}, {"label": "呆滞库存金额", "value": "¥246 万", "note": "超过 180 天未出库"}, {"label": "安全库存达标率", "value": "91.4%", "note": "较上期 -1.8 个百分点"}], "health": inventory, "shortage_impact": [x for x in inventory if x["days_of_supply"] < 5], "key_materials": [{"material_id": x["material_id"], "material_name": self._material(x["material_id"])["material_name"], "supplier_id": x["supplier_id"], "supplier_name": self._supplier_name(x["supplier_id"]), "days_of_supply": x["days_of_supply"], "basis": x["risk_basis"], "level": x["risk_level"]} for x in inventory if x["risk_level"] in ("高", "中")]}

    def quality(self):
        quality = self.data["quality"]
        return {"kpis": [{"label": "来料批次合格率", "value": "98.2%", "note": "较上期 +0.6 个百分点"}, {"label": "来料 PPM", "value": "1,820", "note": "较上期 -240"}, {"label": "退货率", "value": "0.86%", "note": "退货批次 / 来料批次"}, {"label": "8D 按期关闭率", "value": "91.7%", "note": "逾期未关闭 1 项"}], "issue_types": quality, "traceability": [{"batch_id": x["batch_id"], "material_name": self._material(x["material_id"])["material_name"], "supplier_id": x["supplier_id"], "supplier_name": self._supplier_name(x["supplier_id"]), "conclusion": x["conclusion"], "impact": x["impact"]} for x in quality]}

    def price(self, material_id=None):
        rows = [x for x in self.data["prices"] if not material_id or x["material_id"] == material_id]
        selected = material_id or self.data["prices"][0]["material_id"]
        return {"kpis": [{"label": "价格异常物料数", "value": 2, "note": "相对核准价偏差超过阈值"}, {"label": "采购价格变动率", "value": "+3.8%", "note": "较上期加权均价"}, {"label": "相对基准价差金额", "value": "¥68 万", "note": "已识别执行价差"}, {"label": "已识别综合成本金额", "value": "¥92 万", "note": "仅含有依据成本项"}], "materials": [{"material_id": x["material_id"], "material_name": self._material(x["material_id"])["material_name"]} for x in self.data["prices"]], "selected_material_id": selected, "comparisons": [{**x, "supplier_name": self._supplier_name(x["supplier_id"])} for x in rows], "cost_components": {"采购价差": "¥46 万", "质量退货/索赔": "¥18 万", "库存资金占用": "¥9 万", "交付管理负担": "暂无金额化依据"}}

    def supplier_detail(self, supplier_id):
        supplier = self._supplier(supplier_id)
        if not supplier:
            return None
        orders = [x for x in self.data["orders"] if x["supplier_id"] == supplier_id]
        inventory = [x for x in self.data["inventory"] if x["supplier_id"] == supplier_id]
        quality = [x for x in self.data["quality"] if x["supplier_id"] == supplier_id]
        prices = [x for x in self.data["prices"] if x["supplier_id"] == supplier_id]
        return {"supplier": supplier, "materials": [self._material(x["material_id"]) for x in prices or inventory], "orders": orders, "inventory": inventory, "quality": quality, "prices": prices}

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
