from __future__ import annotations

import json
import mimetypes
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from data_provider import build_provider
from services import DashboardService

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend"
SERVICE = DashboardService(build_provider())


class Handler(BaseHTTPRequestHandler):
    def _send(self, body, status=200, content_type="application/json; charset=utf-8"):
        if isinstance(body, bytes):
            payload = body
        elif isinstance(body, str):
            payload = body.encode("utf-8")
        else:
            payload = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)
        parts = [part for part in parsed.path.split("/") if part]
        filters = {key: values[0] for key, values in query.items() if values and values[0]}
        try:
            if parts[:2] == ["api", "health"]:
                return self._send({"status": "ok", "data_source": "mock"})
            if parts[:2] == ["api", "suppliers"]:
                if len(parts) == 2:
                    return self._send({"items": SERVICE.list_suppliers(filters.get("name"))})
                if parts[2] == "by-name" and len(parts) == 3:
                    result = SERVICE.supplier(name=filters.get("name"))
                    detail = SERVICE.supplier_detail(result["supplier_id"]) if result else None
                    return self._send(detail or {"error": "supplier not found"}, 200 if detail else 404)
                if len(parts) == 3:
                    result = SERVICE.supplier_detail(parts[2])
                    return self._send(result or {"error": "supplier not found"}, 200 if result else 404)
                return self._send({"error": "invalid supplier request"}, 400)
            if parts[:2] == ["api", "materials"] and len(parts) == 2:
                return self._send({"items": SERVICE.list_materials()})
            if parts[:2] == ["api", "orders"] and len(parts) == 2:
                return self._send({"items": SERVICE.list_orders(**{key: filters[key] for key in ("supplier_id", "material_id", "status") if key in filters})})
            if parts[:2] == ["api", "inventory"] and len(parts) == 2:
                return self._send({"items": SERVICE.list_inventory(**{key: filters[key] for key in ("supplier_id", "material_id") if key in filters})})
            if parts[:2] == ["api", "quality"] and len(parts) == 2:
                return self._send({"items": SERVICE.list_quality(**{key: filters[key] for key in ("supplier_id", "material_id") if key in filters})})
            if parts[:2] == ["api", "prices"] and len(parts) == 2:
                return self._send({"items": SERVICE.list_prices(**{key: filters[key] for key in ("supplier_id", "material_id") if key in filters})})
            if parts[:2] == ["api", "dashboard"] and len(parts) >= 3:
                board = parts[2]
                if board not in {"profile", "rating", "delivery", "price"}:
                    return self._send({"error": "unknown board"}, 404)
                return self._send(SERVICE.dashboard(board, query.get("material_id", [None])[0]))
            if parsed.path.startswith("/api/"):
                return self._send({"error": "not found"}, 404)
            path = FRONTEND / ("index.html" if parsed.path in ("", "/") else parsed.path.lstrip("/"))
            if not path.is_file() or FRONTEND not in path.resolve().parents:
                return self._send("Not found", 404, "text/plain; charset=utf-8")
            content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
            self._send(path.read_bytes(), 200, content_type)
        except Exception as exc:
            self._send({"error": str(exc)}, 500)

    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args))


if __name__ == "__main__":
    host = os.environ.get("SUPPLIER_DASHBOARD_HOST", "127.0.0.1")
    port = int(os.environ.get("SUPPLIER_DASHBOARD_PORT", "5181"))
    server = ThreadingHTTPServer((host, port), Handler)
    display_host = "127.0.0.1" if host == "0.0.0.0" else host
    print("供应商画像中心: http://%s:%s/" % (display_host, port))
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n服务已停止")
    finally:
        server.server_close()
