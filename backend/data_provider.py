"""数据读取层。

业务服务只依赖 DataProvider 接口，不关心数据来自 JSON、数据库还是平台接口。
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional


class DataProvider:
    def load(self) -> Dict[str, Any]:
        raise NotImplementedError


class MockDataProvider(DataProvider):
    def __init__(self, path: Optional[Path] = None):
        self.path = path or Path(__file__).resolve().parent.parent / "data" / "mock_data.json"

    def load(self) -> Dict[str, Any]:
        with self.path.open("r", encoding="utf-8") as handle:
            return json.load(handle)


def build_provider() -> DataProvider:
    # 平台接入时在这里切换为 DatabaseProvider 或 PlatformApiProvider。
    return MockDataProvider()
