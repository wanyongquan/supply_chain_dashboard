@echo off
chcp 65001 >nul
cd /d "%~dp0"

set "SUPPLIER_DASHBOARD_HOST=127.0.0.1"
set "SUPPLIER_DASHBOARD_PORT=5181"

where py >nul 2>&1
if not errorlevel 1 (
	set "PYTHON_CMD=py -3"
) else (
	where python >nul 2>&1
	if errorlevel 1 (
		echo 未找到 Python 3。请先安装 Python 3.7 或更高版本，并勾选 Add Python to PATH。
		pause
		exit /b 1
	)
	set "PYTHON_CMD=python"
)

echo 正在启动供应商画像看板...
echo 浏览器访问：http://127.0.0.1:5181/
echo 关闭本窗口即可停止服务。
%PYTHON_CMD% -u backend\server.py
pause
