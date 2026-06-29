#!/bin/bash
# ============================================================
# 实验室管理平台 - 虚拟机管理脚本
# 用法: bash scripts/vm-manage.sh [start|stop|restart|reset|status|logs]
# ============================================================
set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}============================================${NC}"
    echo -e "${BLUE}  实验室管理平台 - 管理工具${NC}"
    echo -e "${BLUE}============================================${NC}"
}

# 启动
do_start() {
    echo -e "${GREEN}正在启动服务...${NC}"
    docker compose up -d --build
    sleep 5

    IP=$(hostname -I | awk '{print $1}')
    echo ""
    echo -e "${GREEN}✅ 服务已启动${NC}"
    echo -e "前端: ${BLUE}http://$IP:5173${NC}"
    echo -e "API:  ${BLUE}http://$IP:3000${NC}"
    echo ""
    echo -e "默认账号: ${YELLOW}admin / Admin@123456${NC}"

    # 检查容器状态
    echo ""
    echo -e "${BLUE}容器状态:${NC}"
    docker compose ps
}

# 停止
do_stop() {
    echo -e "${YELLOW}正在停止服务...${NC}"
    docker compose stop
    echo -e "${GREEN}✅ 服务已停止${NC}"
}

# 重启
do_restart() {
    echo -e "${YELLOW}正在重启服务...${NC}"
    docker compose restart
    sleep 3
    echo -e "${GREEN}✅ 服务已重启${NC}"
    docker compose ps
}

# 重置（清空数据库 + 重建）
do_reset() {
    echo -e "${RED}⚠  此操作将清空所有数据！${NC}"
    read -p "确认重置？(输入 yes 继续): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "已取消"
        exit 0
    fi

    echo -e "${YELLOW}正在停止并删除容器和卷...${NC}"
    docker compose down -v
    echo -e "${YELLOW}正在重建并启动...${NC}"
    docker compose up -d --build
    sleep 5
    echo -e "${GREEN}✅ 环境已重置${NC}"
    echo "种子账号已重新生成"
    do_status
}

# 查看状态
do_status() {
    echo -e "${BLUE}容器状态:${NC}"
    docker compose ps
    echo ""

    # 检查 API 健康状态
    echo -e "${BLUE}API 健康检查:${NC}"
    curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:3000/auth/login -X POST \
        -H "Content-Type: application/json" \
        -d '{"username":"admin","password":"Admin@123456"}' 2>/dev/null || echo " (API 未响应)"
    echo ""

    # 检查数据库连接
    echo -e "${BLUE}数据库:${NC}"
    docker compose exec -T postgres pg_isready -U lab -d lab_management 2>/dev/null || echo "数据库未就绪"
}

# 查看日志
do_logs() {
    SERVICE=${1:-api}
    echo -e "${BLUE}查看 $SERVICE 日志 (Ctrl+C 退出):${NC}"
    docker compose logs -f "$SERVICE"
}

# 创建测试账号
do_create_user() {
    echo -e "${GREEN}创建测试账号${NC}"
    read -p "用户名: " USERNAME
    read -p "密码: " PASSWORD
    read -p "角色 (admin/member): " ROLE
    ROLE=${ROLE:-member}

    docker compose exec -T postgres psql -U lab -d lab_management -c \
        "INSERT INTO core.app_user (id, username, password, display_name, role, identity_provider, active, created_at, updated_at)
         VALUES ('u-$USERNAME', '$USERNAME', encode(sha256('$PASSWORD'::bytea), 'hex'), '$USERNAME', '$ROLE', 'local', true, now(), now())
         ON CONFLICT DO NOTHING;"

    echo -e "${GREEN}✅ 账号已创建 (如有冲突则跳过)${NC}"
    echo "登录: $USERNAME / $PASSWORD  (角色: $ROLE)"
}

# 显示帮助
do_help() {
    echo "用法: bash scripts/vm-manage.sh [命令]"
    echo ""
    echo "命令:"
    echo "  start        启动所有服务"
    echo "  stop         停止所有服务"
    echo "  restart      重启所有服务"
    echo "  reset        清空数据并重置环境"
    echo "  status       查看容器和 API 状态"
    echo "  logs [服务]   查看日志 (默认 api)"
    echo "  create-user  创建测试账号"
    echo "  help         显示此帮助"
}

# ---- 主流程 ----
print_header
case "${1:-start}" in
    start)       do_start ;;
    stop)        do_stop ;;
    restart)     do_restart ;;
    reset)       do_reset ;;
    status)      do_status ;;
    logs)        do_logs "${2:-api}" ;;
    create-user) do_create_user ;;
    help|*)      do_help ;;
esac
