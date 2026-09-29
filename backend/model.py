"""供应商领域查询模型。"""
from __future__ import annotations

from datetime import date
from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional


RATINGS = ("A", "B", "C", "D")
class SupplierModel:
    def __init__(self, data: Dict[str, Any]):
        self.data = data
        self.suppliers = data["suppliers"]
        self.materials = {item["material_id"]: item for item in data["materials"]}

    def list_suppliers(self, name: Optional[str] = None) -> List[Dict[str, Any]]:
        if not name:
            return list(self.suppliers)
        keyword = name.casefold()
        return [item for item in self.suppliers if keyword in item["supplier_name"].casefold()]

    def get_supplier_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        if not name:
            return None
        matches = self.list_suppliers(name)
        exact = next((item for item in matches if item["supplier_name"].casefold() == name.casefold()), None)
        return exact or (matches[0] if len(matches) == 1 else None)

    def get_supplier_by_id(self, supplier_id: str) -> Optional[Dict[str, Any]]:
        return next((item for item in self.suppliers if item["supplier_id"] == supplier_id), None)

    def get_expected_orders(
        self,
        supplier_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        start = date.fromisoformat(start_date) if start_date else None
        end = date.fromisoformat(end_date) if end_date else None
        if start and end and start > end:
            raise ValueError("start_date must not be after end_date")

        result = []
        for order in self.data["orders"]:
            if order["supplier_id"] != supplier_id:
                continue
            expected_date = order.get("expected_delivery_date")
            if not expected_date:
                continue
            order_date = date.fromisoformat(expected_date)
            if start and order_date < start:
                continue
            if end and order_date > end:
                continue
            result.append(order)
        return sorted(result, key=lambda item: item["expected_delivery_date"])

    def get_profile_overview(
        self,
        lifecycle_status: Optional[str] = None,
        rating: Optional[str] = None,
    ) -> Dict[str, Any]:
        suppliers = [
            item for item in self.list_suppliers()
            if (not lifecycle_status or item["lifecycle_status"] == lifecycle_status)
            and (not rating or (item.get("rating") or "未评级") == rating)
        ]
        supplier_ids = {item["supplier_id"] for item in suppliers}
        rating_counts = Counter(item.get("rating") or "未评级" for item in suppliers)
        rating_names = list(RATINGS) + sorted(set(rating_counts) - set(RATINGS) - {"未评级"})
        if "未评级" in rating_counts:
            rating_names.append("未评级")
        lifecycle_names = ["在供", "准入/评估中", "暂停", "终止"]
        lifecycle_names.extend(sorted({item.get("lifecycle_status") or "未知" for item in suppliers} - set(lifecycle_names)))
        province_counts = Counter(item.get("province", "未填写") for item in suppliers)
        orders = [item for item in self.data["orders"] if item["supplier_id"] in supplier_ids]
        delivered = [item for item in orders if item.get("actual_delivery_date")]
        quality = [item for item in self.data["quality"] if item["supplier_id"] in supplier_ids]
        inspected = sum(item.get("inspected_quantity", 0) for item in quality)
        defects = sum(item.get("defect_quantity", 0) for item in quality)
        rating_scores = [item["evaluation_score"] for item in suppliers if isinstance(item.get("evaluation_score"), (int, float))]
        by_month: Dict[str, Dict[str, List[float]]] = defaultdict(lambda: {"on_time": [], "quality": []})
        for order in orders:
            expected = order.get("expected_delivery_date")
            actual = order.get("actual_delivery_date")
            if expected and actual:
                period = expected[:7]
                by_month[period]["on_time"].append(float(actual <= expected))
        for batch in quality:
            period = batch.get("inspection_date", "")[:7]
            quantity = batch.get("inspected_quantity", 0)
            if period and quantity:
                by_month[period]["quality"].append(
                    100 * (1 - batch.get("defect_quantity", 0) / quantity)
                )

        return {
            "supplier_count": len(suppliers),
            "active_supplier_count": sum(item["lifecycle_status"] == "在供" for item in suppliers),
            "risk_supplier_count": sum(item["risk_level"] in ("高", "中") for item in suppliers),
            "average_score": round(sum(rating_scores) / len(rating_scores), 1) if rating_scores else 0,
            "on_time_delivery_rate": round(100 * sum(item.get("actual_delivery_date", "") <= item["expected_delivery_date"] for item in delivered) / len(delivered), 1) if delivered else None,
            "quality_pass_rate": round(100 * (1 - defects / inspected), 1) if inspected else None,
            "rating_distribution": [{"name": rating, "count": rating_counts.get(rating, 0)} for rating in rating_names],
            "province_distribution": [
                {"name": name, "count": count}
                for name, count in sorted(province_counts.items(), key=lambda item: (-item[1], item[0]))
            ],
            "lifecycle_distribution": [
                {"name": name, "count": sum(item["lifecycle_status"] == name for item in suppliers)}
                for name in lifecycle_names
            ],
            "overall_trend": [
                {
                    "month": period,
                    "onTime": round(100 * sum(values["on_time"]) / len(values["on_time"]), 1) if values["on_time"] else 0,
                    "quality": round(sum(values["quality"]) / len(values["quality"]), 1) if values["quality"] else 0,
                }
                for period, values in sorted(by_month.items())
            ],
            "suppliers": suppliers,
        }

    def get_supplier_profile(self, supplier_id: str) -> Optional[Dict[str, Any]]:
        detail = self.get_supplier_detail(supplier_id)
        if not detail:
            return None
        supplier = detail["supplier"]
        orders = detail["orders"]
        delivered = [item for item in orders if item.get("actual_delivery_date")]
        quality = detail["quality"]
        inspected = sum(item.get("inspected_quantity", 0) for item in quality)
        defects = sum(item.get("defect_quantity", 0) for item in quality)
        prices = detail["prices"]
        materials = {}
        for row in (*orders, *detail["inventory"], *quality, *prices):
            material_id = row["material_id"]
            materials[material_id] = dict(self.materials.get(material_id, {"material_id": material_id, "material_name": material_id}))
        for item in self.data.get("supplier_materials", []):
            if item.get("supplier_id") == supplier["supplier_id"]:
                material_id = item["material_id"]
                materials.setdefault(
                    material_id,
                    dict(self.materials.get(material_id, {"material_id": material_id, "material_name": material_id})),
                )
        for material in materials.values():
            material["supplier_status"] = supplier["lifecycle_status"]
            material["last_order_date"] = max(
                (row.get("actual_delivery_date") or row.get("expected_delivery_date", "") for row in orders if row["material_id"] == material["material_id"]),
                default="-",
            )
        completed_orders = sum(item["status"] == "已完成" for item in orders)
        return {
            **detail,
            "materials": sorted(materials.values(), key=lambda item: item["material_id"]),
            "statistics": {
                "purchase_amount": round(sum(item["unit_price"] * item["purchase_qty"] for item in prices), 2),
                "order_completion_rate": round(100 * completed_orders / len(orders), 1) if orders else None,
                "on_time_delivery_rate": round(100 * sum(item["actual_delivery_date"] <= item["expected_delivery_date"] for item in delivered) / len(delivered), 1) if delivered else None,
                "average_confirmation_days": round(sum(values) / len(values), 1) if (values := [item["confirmation_days"] for item in orders if isinstance(item.get("confirmation_days"), (int, float))]) else None,
                "overdue_order_count": sum(item["status"] == "逾期未完" for item in orders),
                "arrival_cycle_days": round(sum(item["receipt_cycle_days"] for item in orders if item.get("receipt_cycle_days") is not None) / sum(item.get("receipt_cycle_days") is not None for item in orders), 1) if any(item.get("receipt_cycle_days") is not None for item in orders) else None,
                "inspected_quantity": inspected,
                "defect_quantity": defects,
                "quality_pass_rate": round(100 * (1 - defects / inspected), 1) if inspected else None,
                "ppm": round(1_000_000 * defects / inspected) if inspected else None,
                "return_batch_rate": round(100 * sum(item["conclusion"] == "退货" for item in quality) / len(quality), 1) if quality else None,
                "eight_d_closure_rate": round(100 * sum(item.get("eight_d_status") == "已关闭" for item in quality) / len(quality), 1) if quality else None,
            },
            "profile_fields": [
                {"label": label, "value": supplier.get("profile", {}).get(key, "-")}
                for key, label in (
                    ("unified_social_credit_code", "统一社会信用代码"),
                    ("registered_address", "注册地址"),
                    ("established_at", "成立时间"),
                    ("registered_capital", "注册资本"),
                    ("main_business", "主营业务"),
                    ("certifications", "认证资质"),
                    ("contact_name", "联系人"),
                    ("contact_phone", "联系电话"),
                    ("admission_date", "准入日期"),
                    ("supplier_type", "供应商类型"),
                    ("payment_terms", "付款周期"),
                    ("contract_valid_until", "合同有效期至"),
                )
            ],
            "credit": supplier.get("credit", {}),
        }

    def get_supplier_detail(self, supplier_id: str) -> Optional[Dict[str, Any]]:
        supplier = self.get_supplier_by_id(supplier_id)
        if not supplier:
            return None
        orders = [item for item in self.data["orders"] if item["supplier_id"] == supplier_id]
        inventory = [item for item in self.data["inventory"] if item["supplier_id"] == supplier_id]
        quality = [item for item in self.data["quality"] if item["supplier_id"] == supplier_id]
        prices = [item for item in self.data["prices"] if item["supplier_id"] == supplier_id]
        material_ids = {item["material_id"] for item in (*prices, *inventory, *orders, *quality)}
        return {
            "supplier": supplier,
            "materials": [self.materials.get(key, {"material_id": key, "material_name": key}) for key in material_ids],
            "orders": orders,
            "inventory": inventory,
            "quality": quality,
            "prices": prices,
        }
