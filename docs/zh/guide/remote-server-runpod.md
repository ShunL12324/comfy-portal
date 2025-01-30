---
layout: guide
title: RunPod 服务器设置
lang: zh
---

# RunPod 服务器设置指南

本指南将帮助您在 RunPod 上设置 ComfyUI 服务器。RunPod 提供了一个简单的方式来部署和管理 GPU 实例，非常适合运行 ComfyUI。

## 前提条件

- RunPod 账户
- 有效的支付方式
- 基本的 Docker 和 Linux 知识（可选）

## 设置步骤

### 1. 创建 RunPod 账户

1. 访问 [RunPod 官网](https://runpod.io)
2. 点击 "Sign Up" 注册账户
3. 完成账户验证和支付方式设置

### 2. 部署 ComfyUI 容器

1. 在 RunPod 控制台中，点击 "Deploy"
2. 选择 "GPU Pod"
3. 在模板选择中，搜索并选择 "ComfyUI"
4. 选择合适的 GPU 类型（推荐 RTX 4090 或更高）
5. 选择存储大小（推荐至少 50GB）
6. 点击 "Deploy" 启动实例

### 3. 访问 ComfyUI

1. 等待实例启动完成
2. 在 Pod 详情页面找到 "Connect" 部分
3. 记录下 HTTP 端口的 URL（通常格式为 `https://xxxxxx-xxxx.proxy.runpod.net`）

### 4. 配置 Comfy Portal

1. 打开 Comfy Portal iOS 应用
2. 点击"添加服务器"
3. 选择"远程服务器"
4. 输入 RunPod 提供的 URL
5. 点击"连接"测试连接

## 管理您的 RunPod 实例

### 成本控制

- 不使用时关闭实例以节省费用
- 使用自动关机功能
- 监控使用时间和费用

### 数据管理

- 使用持久化存储保存模型和输出
- 定期备份重要数据
- 使用版本控制管理工作流

### 性能优化

- 选择合适的 GPU 类型
- 监控资源使用情况
- 根据需求调整实例规格

## 故障排除

### 常见问题

1. **实例无法启动**
   - 检查账户余额
   - 验证 GPU 可用性
   - 确认地区设置

2. **连接问题**
   - 等待实例完全启动
   - 检查 URL 是否正确
   - 验证网络连接

3. **性能问题**
   - 检查 GPU 利用率
   - 监控内存使用
   - 考虑升级实例规格

### 获取帮助

如果您遇到问题：

- 查看 [RunPod 文档](https://docs.runpod.io)
- 联系 RunPod 支持
- 在我们的 [GitHub 仓库](https://github.com/ShunL12324/comfy-portal/issues) 提交问题
- 发送邮件至 liushun0574@gmail.com

## 最佳实践

### 安全性

- 使用强密码
- 定期更新容器
- 不要分享实例 URL

### 效率

- 使用模型缓存
- 优化工作流
- 合理规划使用时间

### 成本

- 使用按需实例
- 设置预算提醒
- 监控使用情况

## 进阶配置

### 自定义 Docker 镜像

如果您需要自定义 ComfyUI 环境：

1. 创建自定义 Dockerfile
2. 构建并推送到 Docker Hub
3. 在 RunPod 中使用自定义镜像

### 持久化存储

1. 创建持久化卷
2. 挂载到重要目录
3. 定期备份数据

### 自动化部署

使用 RunPod API 实现：

- 自动启动/关闭
- 状态监控
- 资源管理

[返回文档首页](/comfy-portal/zh/) 