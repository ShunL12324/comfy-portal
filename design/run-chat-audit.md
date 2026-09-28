# Run Agent Chat 梳理

| 项目 | 状态 | 实现 |
| --- | --- | --- |
| 左右边界 | 已完成 | 旧透明 Chat 透出 PersistentSheet 描边，Nodes 有不透明背景；统一 paper 根容器，不新增 Chat 边框 |
| 消息层级 | 已完成 | 11/16 角色标签、13/20 Inter 消息；用户 well 气泡，助手正文不套卡片；Markdown 标题 14/20 Medium，保留语义粗体/斜体/代码 |
| 工具反馈 | 已完成 | 按原 parts 顺序展示；well/line、6 点圆角，12/18 标题及 11/16 说明；14 点状态图标，保留 pending/done/error |
| 内容关系 | 已完成 | 左右 16，消息组之间 16，角色到内容 8；紧凑空态和配置说明，移除装饰头像 |
| 输入区 | 已完成 | well、4 点圆角、单一 focus 边框，13/20；最大四行随字体放大；Send/Stop 可见 28、点击 44 |
| 输入区定位 | 已完成 | 手机通过原 Gorhom footer 测量/定位，底部 safe-area 由输入区一次负责；滚动内容预留实际 footer 高度；切回 Nodes 清理测量；iPad split 仍 inline |
| 清空与配置错误 | 已完成 | 有消息才显示清空，生成中禁用；传输序列化前识别配置错误，用安全文案及设置入口，不展示原始 provider 响应/凭证 |
| 生产验证 | 已完成 | 两种主题消息顺序、paper/边界、输入区在当前 detent 内可见、跨 tab 持久化/清空；模拟 SSE 发送/回到 idle；停止、配置错误及未配置入口，6 个 Chat 用例全部通过。相关首次滚动用例通过 |
| iOS 效果 | 已检查，覆盖有限 | iPhone 17 Pro 检查 Chat 未配置布局/边界和设置入口；输入原生键盘验证未完成，见下方限制 |
| Figma | 待同步 | Manifest 关联现有 Run 2126:1548 / Field 2020:11；无 Figma 编辑能力，不宣称画稿已改 |

验证中修正了测试的两个假设：React Native Web editable=false 渲染 readonly 而非 disabled；Canvas Batch Size 上限为4，9→10 的 slider 验证改用真实 Sampler Steps。另发现 DirectChatTransport 会把原始错误转换为普通 Error，旧 typed 配置判断失效，已在序列化前保留分类并验证设置入口。

截图：`.expo/agent-chat-transcript-dark.png` / `.expo/agent-chat-transcript-light.png`、`.expo/agent-chat-composer-dark.png` / `.expo/agent-chat-composer-light.png`。Slider 深浅主题参数提交/宽度稳定/双轴居中 2/2 通过，截图 `.expo/slider-readout-dark.png` / `.expo/slider-readout-light.png`。

最终静态检查：TypeScript、改动生产文件 ESLint、字体 inventory、git diff --check 全部通过。标准 lint 为 0 errors / 79 个既有 warnings。最终 footer 集成后 Chat 六项及 Run 首次滑动/切换/重进共 7/7 通过；Web 输入 focus 外描边归零后两主题发送 2/2 再通过。完整关联批次 26 个独立场景都有通过结果，未影响的节点选择器/真实生成保留其通过记录。

iOS iPhone 17 Pro 截图 `.expo/run-chat-native.png` 确认未配置 Chat、共享边缘、compact 配置提示；Open settings 正常进入 AI Assistant。温度滑块的读数容器见 `.expo/slider-readout-native.png`。原生 secure field 输入时 XCTest runner invalidated，重新 snapshot 恢复；没有保存虚拟凭证，也没有发起真实 provider 请求。原生配置后消息/键盘定位不在此次已验证范围，发送/停止和 footer 定位由生产 Web E2E 的模拟 SSE 覆盖。
