> Current follow-up: the app now uses Newsreader + IBM Plex Sans only. Numeric roles share Plex Sans with tabular digits. The earlier Inter/Space Mono results below are historical; current evidence is in `design/tint-and-cards-audit.md`.

# 字体统一与 Run 滚动修复任务表

范围：当前工作区全部生产页面、共享组件、ComfyUI 节点、原生控件和弹层。保留已确认的布局，只统一排版和修复交互。

| 任务 | 检查范围 | 状态 | 验收证据 |
| --- | --- | --- | --- |
| Node compact 与共享弹层修正 | 42 个类型/辅助、6 个 common、控件、Run 操作和弹层 | 已完成 | 详见 node-compact-audit.md；235 单测与 18 个相关 E2E 均有通过结果；最终受影响模块 10/10 通过 |
| 节点分段控件补充统一 | Seed、Latent/SD3、ImageScale、CLIPVision 与共享 Segments | 已完成 | 36 点轨道、44 点点击区域、4/3 点小圆角；17 项生产回归和 iOS 模拟器视觉/边缘点击验证通过 |
| Node compact 全量梳理与共享弹层修正 | 42 个类型/辅助、6 个 common、控件、Run 操作与弹层 | 已完成 | 详见 node-compact-audit.md；235 单测及 18 个相关 E2E 均有通过结果，最终受影响模块 10/10 通过 |
| 建立完整清单 | 路由、业务组件、共享文字与输入控件 | 已完成 | 297 个源模块；231 个 UI/样式模块记录在 typography-inventory.json |
| 固定字体职责 | Inter、Newsreader、Space Mono 的使用边界；实际字体文件与字重 | 已完成 | 统一解析入口和启动字体注册；11 项字体解析单测、四组渲染矩阵通过 |
| 统一共享文字组件 | Text、Heading、Copy、按钮、输入、选择器、Badge、菜单、提示 | 已完成 | 全部 Gluestack 文字槽接入字体适配；输入适配器设定默认字体；表单、选择器和反馈回归通过 |
| 页面标题与导航 | AppBar、底部导航、侧栏、Sheet 和 Dialog 标题 | 已完成 | 页面/弹层/确认框主标题统一；UIKit 分段控件改用字体 PostScript 名；iOS 界面已检查 |
| Servers 与服务器详情 | 搜索、卡片、读数、编辑连接 | 已完成 | 字体矩阵、创建/编辑/移除、离线 GPU 保留、长文本和布局回归通过 |
| Environments 全流程 | 列表、详情、models/extensions/workflows、创建与编辑 | 已完成 | 字体矩阵、创建/编辑、多行输入、filter 与长文本/固定底部按钮回归通过 |
| Workflows 与 Run | 导入/编辑、节点搜索、全部节点类型与参数、历史 | 已完成 | 全部节点源码无遗漏；节点搜索、模型选择、参数/开关/分段控件、生成提交、导入 Toast 和历史回归通过 |
| Gallery 与生成反馈 | 图像/视频预览、结果、队列、状态和进度 | 已完成 | 字体矩阵与 Gallery filters、生成反馈回归通过；预览/历史源码全部使用共享入口 |
| Cloud 全流程 | 硬件选择、报价、确认、安装日志、实例管理 | 已梳理，验证范围见备注 | 所有控件经共享入口；Setup/日志/反馈/确认框回归通过；Web 不支持租赁的页面验证提示与标题，未进行真实租赁 |
| AI Assistant | 设置、对话、Markdown、代码、输入与选择器 | 已完成 | 四组字体矩阵验证粗体、斜体、组合强调与代码；设置、选择器、Run 面板切换回归通过 |
| Settings / Guide / Legal | 所有设置项、帮助与长文、错误/空态 | 已完成 | 应用文字与导航通过字体矩阵；外部网站内容保留其字体，不计入应用字体声明 |
| 修复首次进入 Run 的滚动 | 默认 60% 高度下，节点列表立即滚动；拖动条调整高度 | 已完成 | 触摸 E2E 验证首次进入、切换面板和重进；iOS 首次内容滑动直接显示 KSampler，拖动条位置未变 |
| 全面验证与手机更新 | 静态清单、类型、lint、必要单测、生产 E2E、原生手势与字体检查 | 代码与验证完成；手机打开受锁屏阻止 | Metro 已刷新；iOS 模拟器已验证；真机自动打开返回 Locked，不伪记为已更新 |

## 统一标准

- Inter：正文、控件、表单、节点和区块标题。400/500/600/700 使用已加载的静态字体，不合成字重。
- Newsreader：页面/弹层/确认框主标题，以及明确批准的空态标题；不进入按钮、字段标签或节点参数。普通主标题 26/30，紧凑主标题 20/24。
- Space Mono Regular：主机地址、标识、seed、独立数值和代码/日志。不合成粗体或斜体。
- 字号/行高来自 `designTokens.type` / `designTokens.leading`，按职责区分，而非所有文字使用同一个大小。
- 每个条目以扫描、改动和实际验证为依据更新；尚未验证的项目不标为完成。
- 原生键盘、系统权限框、系统菜单，以及帮助/法律页面内的外部网站内容保持平台/网站字体。中文、emoji 等字体没有的字符允许正常缺字回退；禁止的是应用控件因漏设字体回退系统字体。

## 已发现的问题

- 节点分段控件补充修正：iOS 额外 backgroundColor 填满 UIView 方形边界，且把点击高度 44 当成绘制高度。全部五处节点入口已统一到其他页面使用的 Gluestack Segments：36 点可见轨道、44 点透明点击区域，外框/选中块为 4/3 点小圆角；禁用状态同步传递。节点枚举不再使用 UIKit 胶囊样式；原生开关保留。已通过节点/工作流/服务器与首次滚动回归（17 个用例）；iOS 模拟器确认形状与透明上边缘点击能切换 Fixed。

- `Copy` 已选择实际 Inter 字重，但底层 Text、Heading、按钮和输入仍各自处理，部分原生控件回退系统字体。
- 原生分段控件把 Expo 注册别名传给 UIFont，UIFont 无法解析该别名，会回退系统字体；已改用 Inter 文件真实的 PostScript 名。
- Prompt 编辑、Custom Prompt、Set Image 和确认框的主标题与共享 Sheet 不一致；已统一到 Title 的紧凑样式。
- Markdown 标题、强调与表头使用合成字重；嵌套粗体/斜体会互相覆盖；现使用实际静态字体与组合字重斜体。
- Run 默认为 60% 高度；Gorhom 在最高档之前锁定内容滚动，导致先拖弹层后才可滚动。

## 验证记录

- 已完成源码全量检查：297 个源模块，231 个 UI/样式模块，113 个直接声明文字/排版；无未管理的 Text/TextInput 或字面字体名。详细清单见 `typography-inventory.json`；`node scripts/audit-typography.cjs --check` 可复查。
- 全部 Jest：29 个测试文件、235 项测试通过；包含新增 11 项字体解析测试。
- 最终 `npm run lint`：0 errors；79 warnings（生成组件的重复 import、既有 hook/unused 和 require 风格警告）。`tsc --noEmit -p .` 通过；`git diff --check` 通过。
- 字体矩阵四组全部通过：Light/Dark × 375/1024 宽度；15 个应用目的地、环境编辑表单、Run 节点和 AI Markdown，以及 Guide/Legal 应用标题。检查实际 computed 字体、加载状态、字重、斜体与字号。
- 相关生产 E2E 首轮 50 项中 49 项通过；GPU 卡片位置测试在刷新动画的不同帧取坐标产生 1.7px 假误差，已改为同一帧取值。该项与 Run 触摸回归复验 2/2 通过，所有 51 个相关用例均有通过结果。修正后未改变生产源码，因此复用其余通过结果。
- iOS iPhone 17 Pro 模拟器：从工作流卡片进入默认 60% 弹层，首次在内容区上滑直接从 Load checkpoint / Positive prompt 显示到 KSampler；抓手和搜索框位置保持不变。随后抓手上拖能到 80% 档，内容滚动仍保留。证据：`.expo/typography-native-screen.png`、`typography-native-after-scroll.png`、`typography-native-handle-expanded.png`。
- 第一批字体 E2E 因旧 Metro 进程 heap OOM 中断，已在原 tmux 会话重启并提高单进程内存；中断批次不计作通过。
- 最后刷新：Metro 收到 reload，iOS bundle 成功；随后对已安装的 iPhone 15 Pro App 执行打开时，CoreDevice 返回 Locked，不能自动唤起。保持开发服务运行；真机解锁后打开 App 检查。没有重新安装原生包，因为本次为 JS/字体资源修改。
- Inter 的补充 Medium/SemiBold/Bold Italic 文件来自官方 Inter v4.1 发布包，与已有文件版本相同（4.001）。保留现有 OFL 许可。
- Figma manifest 已更新字体职责和基础设施覆盖；当前没有 Figma 编辑能力，已存在 specimen 的旧系统字体标签需要后续同步，不能宣称画稿已修改。

## 分段控件补充验证

- 相关生产 E2E：首轮 17 项中 16 项通过；新增边缘点击用例未先滚动到屏内，用坐标点到了屏外。改用目标元素自动滚动后，该项复验通过。生产代码未因这次测试修正发生变化，17 个相关用例均有通过结果。
- TypeScript、字体清单检查、git diff --check 通过；lint 0 errors，79 个既有 warnings。共享 Segments 的可见轨道为 36 点，Gluestack 点击目标实测至少 44 点；上下透明边缘都可以选择选项并写回节点参数。
- iOS iPhone 17 Pro：小圆角外轨道与选中块使用同一共享组件，无矩形背景溢出；点击可见轨道上方透明区域从 Random 切换 Fixed，seed 输入与骰子随之启用。证据：`.expo/segments-native-small-corners.png`、`.expo/segments-native-fixed.png`。
- Figma manifest 记录了更新后的组件约定和待同步 specimen；未宣称 Figma 画稿已更新。
