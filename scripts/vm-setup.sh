#!/bin/bash
# ============================================================
# 实验室管理平台 - 虚拟机环境一键配置脚本
# 适用：Ubuntu Server 22.04 + VMware Workstation
# ============================================================
set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  实验室管理平台 - 虚拟机环境配置${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ---- 1. 系统更新 ----
echo -e "${GREEN}[1/7] 更新系统...${NC}"
sudo apt update && sudo apt upgrade -y

# ---- 2. 安装基础工具 ----
echo -e "${GREEN}[2/7] 安装基础工具...${NC}"
sudo apt install -y curl wget git vim net-tools openssh-server ca-certificates gnupg lsb-release

# ---- 3. 安装 Docker ----
echo -e "${GREEN}[3/7] 安装 Docker Engine...${NC}"
if ! command -v docker &> /dev/null; then
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
        sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo systemctl enable docker --now
fi

# 把当前用户加入 docker 组（免 sudo）
sudo usermod -aG docker $USER
echo -e "${YELLOW}注意: 已加入 docker 组，重新登录后生效${NC}"

# ---- 4. 配置 Docker Compose standalone (备用) ----
echo -e "${GREEN}[4/7] 确认 Docker Compose 可用...${NC}"
if ! docker compose version &> /dev/null; then
    echo "Docker Compose 插件未找到，安装 standalone 版本..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi
docker compose version

# ---- 5. 克隆项目 ----
echo -e "${GREEN}[5/7] 克隆项目代码...${NC}"
PROJECT_DIR="$HOME/lab-management-platform"
if [ -d "$PROJECT_DIR" ]; then
    echo "项目目录已存在，跳过克隆"
    cd "$PROJECT_DIR"
    git pull 2>/dev/null || echo "警告: git pull 失败（可能无 git 仓库）"
else
    # 修改为你们的实际 git 地址
    read -p "输入项目的 git clone 地址: " GIT_URL
    git clone "$GIT_URL" "$PROJECT_DIR"
    cd "$PROJECT_DIR"
fi

# ---- 6. 配置环境 ----
echo -e "${GREEN}[6/7] 配置环境变量...${NC}"
cd "$PROJECT_DIR"
if [ ! -f .env ]; then
    cp .env.example .env
    # 生成随机密钥
    NEW_SECRET=$(openssl rand -hex 32)
    sed -i "s/change-me-in-production/$NEW_SECRET/" .env
    echo -e "${YELLOW}已生成 .env 文件，JWT_SECRET 已随机化${NC}"
fi

# 确保种子账号开启
if grep -q "LAB_SEED_DEMO_ACCOUNTS" .env; then
    sed -i 's/LAB_SEED_DEMO_ACCOUNTS=.*/LAB_SEED_DEMO_ACCOUNTS=true/' .env
else
    echo "LAB_SEED_DEMO_ACCOUNTS=true" >> .env
fi

# ---- 7. 配置防火墙 ----
echo -e "${GREEN}[7/7] 配置防火墙...${NC}"
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 5173/tcp  # Web 前端
sudo ufw allow 3000/tcp  # API（可选，前端内部调用）
sudo ufw --force enable
sudo ufw status verbose

# ---- 完成 ----
IP=$(hostname -I | awk '{print $1}')
echo ""
echo -e "${BLUE}============================================${NC}"
echo -e "${GREEN}  环境配置完成！${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""
echo -e "项目目录: ${YELLOW}$PROJECT_DIR${NC}"
echo -e "虚拟机 IP: ${YELLOW}$IP${NC}"
echo ""
echo -e "接下来执行:"
echo -e "  ${GREEN}cd $PROJECT_DIR${NC}"
echo -e "  ${GREEN}docker compose up -d${NC}"
echo ""
echo -e "启动后访问:"
echo -e "  前端: ${BLUE}http://$IP:5173${NC}"
echo -e "  API:  ${BLUE}http://$IP:3000${NC}"
echo ""
echo -e "默认账号:"
echo -e "  管理员: ${YELLOW}admin / Admin@123456${NC}"
echo -e "  成员:   ${YELLOW}student001 / Student@123456${NC}"
echo ""
echo -e "${YELLOW}⚠  请重新登录终端（使 docker 组生效），然后:${NC}"
echo -e "  cd $PROJECT_DIR && bash scripts/vm-manage.sh start"
