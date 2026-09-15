# 供应链数据中台（Python + Vue）

这是按 Figma 原型改造的供应链四看板可运行 Demo：供应商画像、供应商评级、采购交付、比价分析。后端负责数据读取、指标计算和跨主题聚合，前端只负责筛选、展示和交互。

## 目录

- `backend/data_provider.py`：数据接入抽象。当前使用 `data/mock_data.json`，以后可替换为数据库或平台 API。
- `backend/services.py`：四个看板的指标计算、主题聚合和供应商/物料关联逻辑。
- `backend/server.py`：Python 标准库 HTTP 服务和 JSON API。
- `frontend/`：Vue 3 前端，包含四个看板、管理角色视角和供应商详情抽屉。

## 运行

在本目录执行：

```powershell
python backend/server.py
```

浏览器打开 `http://127.0.0.1:5181/`。

## 数据接口

页面只通过后端 HTTP API 获取数据，当前 API 的实现由 `DataProvider` 读取示例数据；将来接入数据中台时，只需替换 `backend/data_provider.py` 中的 provider，实现以下业务方法，页面和接口路径无需修改。

- `GET /api/suppliers`：供应商列表；支持 `name` 名称关键词筛选
- `GET /api/suppliers/{supplier_id}`：供应商详情及其订单、库存、质量、价格关联数据
- `GET /api/suppliers/by-name?name=...`：按供应商名称查询详情
- `GET /api/materials`：物料主数据列表
- `GET /api/orders`：采购订单列表；支持 `supplier_id`、`material_id`、`status` 筛选
- `GET /api/inventory`：库存与保供风险；支持 `supplier_id`、`material_id` 筛选
- `GET /api/quality`：来料质量记录；支持 `supplier_id`、`material_id` 筛选
- `GET /api/prices`：采购价格记录；支持 `supplier_id`、`material_id` 筛选
- `GET /api/dashboard/{board}`：页面看板聚合数据，`board` 可取 `profile`、`rating`、`delivery`、`price`

前端的 `frontend/api.js` 是接口适配层，只负责请求 API 和转换展示字段，不直接读取 JSON 或内嵌业务 mock 数据。

## 发给其他人查看

### 方式一：发项目文件（最简单）

将整个 `supplier-dashboard-app` 文件夹压缩后发送给对方。对方电脑需要安装 Python 3.7 及以上版本，解压后双击 `start_dashboard.bat`，再打开 `http://127.0.0.1:5181/`。前端当前通过 CDN 加载 Vue 3，因此首次打开需要能够访问网络。

### 方式二：同一局域网临时查看

在你的电脑上启动服务后，查看本机局域网 IPv4 地址，例如 `192.168.1.25`，然后将 `http://192.168.1.25:5181/` 发给同一网络内的同事。临时局域网启动命令：

```powershell
$env:SUPPLIER_DASHBOARD_HOST="0.0.0.0"
python backend/server.py
```

若 Windows 防火墙拦截，需要允许 Python 通过专用网络访问。正式部署不建议直接暴露开发电脑。

### 方式三：部署到公司服务器（正式评审推荐）

将项目部署到公司内网服务器，由服务器运行 Python 服务，再使用服务器域名或内网 IP 访问。后续接入数据平台时，只替换 `backend/data_provider.py`，其他接口和 Vue 页面保持不变。

当前数据均为示例数据。接入平台时，只需要替换 `MockDataProvider`，API 返回结构和前端页面无需调整。前端不包含业务指标计算，确保页面与数据处理分离。

## 数据接入约定

`mock_data.json` 已按需求调研中的核心字段组织：供应商编号/名称/分类、生命周期状态、供货地位、评级、物料编号/名称/大类、订单状态、供货比例、交货比例、库存保障天数、批次质量结论、执行单价和基准价差。服务层用这些原子字段计算看板指标，并通过供应商编号、物料编号建立跨看板关联。

正式接入时，实现 `DataProvider.load()` 并返回相同的数据字典即可。例如数据库读取、平台 REST API 或数据中台数据服务都可以放在该层，前端的七个页面不需要感知来源变化。
