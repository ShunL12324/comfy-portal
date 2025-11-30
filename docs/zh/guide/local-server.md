---
title: 本地服务器设置
lang: zh
---

# 本地服务器设置指南

本指南将帮助您在本地计算机上设置 ComfyUI 服务器，以便与 Comfy Portal iOS 应用程序配合使用。

## 前提条件

- Python 3.10 或更高版本
- Git
- NVIDIA GPU（推荐）或 CPU
- 至少 8GB RAM
- 足够的存储空间用于模型（建议 20GB+）

## 安装步骤

### 1. 安装 ComfyUI

1. 克隆 ComfyUI 仓库：
```bash
git clone https://github.com/comfyanonymous/ComfyUI.git
cd ComfyUI
```

2. 创建并激活虚拟环境（推荐）：
```bash
python -m venv venv
# Windows
.\venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

3. 安装依赖：
```bash
pip install torch torchvision torchaudio
pip install -r requirements.txt
```

### 2. 下载模型

1. 创建模型目录：
```bash
mkdir models/checkpoints
```

2. 下载基础模型（如 SD 1.5）并放置在 `models/checkpoints` 目录中

### 3. 启动服务器

1. 运行 ComfyUI：
```bash
python main.py
```

2. 服务器将在 `http://127.0.0.1:8188` 启动

### 4. 配置 Comfy Portal

1. 打开 Comfy Portal iOS 应用
2. 点击"添加服务器"
3. 选择"本地服务器"
4. 输入您计算机的本地 IP 地址和端口（默认 8188）
5. 点击"连接"测试连接

## 注意事项

- 确保您的 iOS 设备和运行 ComfyUI 的计算机在同一个本地网络中
- 如果遇到连接问题，检查防火墙设置
- 建议使用固定的本地 IP 地址

## 故障排除

### 常见问题

1. **无法连接到服务器**
   - 确认计算机和手机在同一网络
   - 检查防火墙设置
   - 验证服务器 IP 地址和端口

2. **模型加载失败**
   - 确认模型文件放置在正确目录
   - 检查模型文件完整性

3. **性能问题**
   - 检查 GPU 驱动是否最新
   - 监控系统资源使用情况

### 获取帮助

如果您遇到其他问题：

- 查看 [ComfyUI GitHub Issues](https://github.com/comfyanonymous/ComfyUI/issues)
- 在我们的 [GitHub 仓库](https://github.com/ShunL12324/issues) 提交问题
- 发送邮件至 liushun0574@gmail.com

[返回文档首页](/zh/) 