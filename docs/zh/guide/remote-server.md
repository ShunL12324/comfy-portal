---
title: 远程服务器设置
lang: zh
---

# 远程服务器设置指南

本指南将帮助您在远程服务器上设置 ComfyUI，使其可以通过互联网访问。这对于想要随时随地使用 Comfy Portal 的用户来说是理想的选择。

## 前提条件

- 一台运行 Linux 的远程服务器（推荐 Ubuntu 20.04 或更高版本）
- SSH 访问权限
- NVIDIA GPU（推荐）
- 至少 16GB RAM
- 足够的存储空间（建议 50GB+）
- 基本的 Linux 命令行知识

## 安装步骤

### 1. 服务器准备

1. 更新系统：
```bash
sudo apt update && sudo apt upgrade -y
```

2. 安装必要的依赖：
```bash
sudo apt install -y python3-pip python3-venv git nginx
```

### 2. 安装 NVIDIA 驱动和 CUDA（如果使用 GPU）

1. 添加 NVIDIA 仓库：
```bash
sudo add-apt-repository ppa:graphics-drivers/ppa
sudo apt update
```

2. 安装 NVIDIA 驱动和 CUDA：
```bash
sudo apt install -y nvidia-driver-535 nvidia-cuda-toolkit
```

3. 重启服务器：
```bash
sudo reboot
```

### 3. 安装 ComfyUI

1. 克隆仓库：
```bash
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
```

2. 创建虚拟环境：
```bash
python3 -m venv venv
source venv/bin/activate
```

3. 安装依赖：
```bash
pip install torch torchvision torchaudio
pip install -r requirements.txt
```

### 4. 配置 Nginx 反向代理

1. 创建 Nginx 配置文件：
```bash
sudo nano /etc/nginx/sites-available/comfyui
```

2. 添加以下配置：
```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://127.0.0.1:8188;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. 启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/comfyui /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. 设置 SSL（推荐）

1. 安装 Certbot：
```bash
sudo apt install -y certbot python3-certbot-nginx
```

2. 获取 SSL 证书：
```bash
sudo certbot --nginx -d your_domain.com
```

### 6. 运行 ComfyUI

1. 创建系统服务：
```bash
sudo nano /etc/systemd/system/comfyui.service
```

2. 添加以下内容：
```ini
[Unit]
Description=ComfyUI Server
After=network.target

[Service]
Type=simple
User=your_username
WorkingDirectory=/path/to/ComfyUI
Environment="PATH=/path/to/ComfyUI/venv/bin"
ExecStart=/path/to/ComfyUI/venv/bin/python main.py --listen 0.0.0.0
Restart=always

[Install]
WantedBy=multi-user.target
```

3. 启动服务：
```bash
sudo systemctl enable comfyui
sudo systemctl start comfyui
```

### 7. 配置 Comfy Portal

1. 打开 Comfy Portal iOS 应用
2. 点击"添加服务器"
3. 选择"远程服务器"
4. 输入您的域名和端口（如果使用 SSL，选择 HTTPS）
5. 点击"连接"测试连接

## 安全建议

- 始终使用 HTTPS
- 设置强密码
- 配置防火墙
- 定期更新系统和软件
- 考虑使用 VPN 或 IP 白名单

## 故障排除

### 常见问题

1. **连接超时**
   - 检查防火墙设置
   - 验证 Nginx 配置
   - 确认 ComfyUI 服务正在运行

2. **SSL 证书问题**
   - 确保证书未过期
   - 检查 SSL 配置
   - 验证域名 DNS 设置

3. **性能问题**
   - 监控服务器资源使用情况
   - 检查网络带宽
   - 优化 Nginx 配置

### 获取帮助

如果您遇到问题：

- 查看服务器日志：`sudo journalctl -u comfyui`
- 检查 Nginx 日志：`sudo tail -f /var/log/nginx/error.log`
- 在我们的 [GitHub 仓库](https://github.com/ShunL12324/issues) 提交问题
- 发送邮件至 liushun0574@gmail.com

[返回文档首页](/zh/) 