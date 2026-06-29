# 虚拟机测试环境配置指南

## 环境概述

| 项目       | 说明                                          |
| ---------- | --------------------------------------------- |
| 虚拟机软件 | VMware Workstation                            |
| 操作系统   | Ubuntu Server 22.04 LTS                       |
| 数据库     | PostgreSQL 16 (Docker)                        |
| 后端       | Fastify API (Node.js 22, Docker)              |
| 前端       | Vite + React (Docker)                         |
| 测试账号   | admin/Admin@123456, student001/Student@123456 |

---

## 第一步：安装 Ubuntu Server 22.04

### VMware 配置

1. 打开 VMware → **创建新的虚拟机**
2. 选「典型」→ 选 Ubuntu Server 22.04 ISO 镜像
3. 虚拟机名称: `lab-test-server`
4. 磁盘: 40 GB，存为单个文件
5. **关键 → 自定义硬件**:
   - 内存: 4 GB (4096 MB)
   - CPU: 2 核
   - 网络适配器: **桥接模式**（这样同组同学能访问）

### Ubuntu 安装过程

1. 语言: English
2. **网络**: 确认有 IP 地址（记录下，后面要用）
3. 镜像源: 默认即可
4. 磁盘: 使用整个磁盘
5. 用户名: 建议用 `labadmin`（好记）
6. **安装 OpenSSH Server**: 选上！用空格勾选
7. 等待安装完成 → Reboot

### 获取虚拟机 IP

```bash
ip addr show | grep inet
# 找 ens33 或 eth0 的 inet 地址
# 例如: inet 192.168.1.100
```

---

## 第二步：从宿主机 SSH 连接

### Windows 宿主机

```powershell
# PowerShell 或 CMD（Windows 10/11 自带 ssh）
ssh labadmin@虚拟机IP

# 示例
ssh labadmin@192.168.1.100
```

### VS Code 远程（推荐）

1. 安装插件: **Remote - SSH**
2. `Ctrl+Shift+P` → `Remote-SSH: Connect to Host`
3. 输入: `labadmin@192.168.1.100`
4. 输入密码
5. 打开文件夹: `/home/labadmin/lab-management-platform`
6. 直接在 VS Code 里开发！

---

## 第三步：运行一键配置脚本

SSH 连上虚拟机后：

```bash
# 上传项目（从宿主机）
# 方式1: git clone（如果项目在 GitHub 上）
git clone https://github.com/你的仓库/lab-management-platform.git ~/lab-management-platform

# 方式2: 从宿主机用 scp 上传
# 在 Windows 宿主机执行:
# scp -r F:\program\managenment-platform\lab-management-platform labadmin@192.168.1.100:~/lab-management-platform

# 运行一键配置
cd ~/lab-management-platform
chmod +x scripts/*.sh
bash scripts/vm-setup.sh

# 重新登录（使 docker 组生效）
exit
ssh labadmin@虚拟机IP

# 启动项目
cd ~/lab-management-platform
bash scripts/vm-manage.sh start
```

脚本会自动完成：

- ✅ 系统更新
- ✅ 安装 Docker + Docker Compose
- ✅ 配置防火墙（开放 5173 / 3000 / 22）
- ✅ 生成随机 JWT_SECRET
- ✅ 配置种子账号

---

## 第四步：访问测试

### 本机访问

在宿主机浏览器打开: `http://虚拟机IP:5173`

### 同学访问

同局域网的同学浏览器打开: `http://虚拟机IP:5173`

### 演示模式

```bash
# 重置环境（清空数据，适合每次演示前）
bash scripts/vm-manage.sh reset

# 查看状态
bash scripts/vm-manage.sh status

# 创建额外测试账号
bash scripts/vm-manage.sh create-user
```

---

## 日常管理命令

```bash
# 启动项目
bash scripts/vm-manage.sh start

# 停止项目
bash scripts/vm-manage.sh stop

# 重启
bash scripts/vm-manage.sh restart

# 查看状态（容器 + API + 数据库）
bash scripts/vm-manage.sh status

# 查看 API 日志
bash scripts/vm-manage.sh logs api

# 查看前端日志
bash scripts/vm-manage.sh logs web

# 重置环境（清空数据重建）
bash scripts/vm-manage.sh reset
```

---

## 更新代码

```bash
# 拉取最新代码
cd ~/lab-management-platform
git pull

# 如果 .env 或依赖有变化，建议重置
bash scripts/vm-manage.sh reset
```

---

## 固定 IP（可选，方便同学访问）

如果虚拟机 IP 经常变：

```bash
# 编辑 netplan 配置
sudo vim /etc/netplan/00-installer-config.yaml
```

改为：

```yaml
network:
  ethernets:
    ens33:
      dhcp4: no
      addresses: [192.168.1.200/24] # 固定 IP
      routes:
        - to: default
          via: 192.168.1.1 # 网关地址
      nameservers:
        addresses: [8.8.8.8, 114.114.114.114]
  version: 2
```

```bash
sudo netplan apply  # 立即生效
```

---

## 端口说明

| 端口 | 服务       | 说明       |
| ---- | ---------- | ---------- |
| 22   | SSH        | 远程连接   |
| 5173 | Web 前端   | 浏览器访问 |
| 3000 | API        | 后端接口   |
| 5432 | PostgreSQL | 数据库     |

局域网内都可以通过 `虚拟机IP:5173` 访问。
