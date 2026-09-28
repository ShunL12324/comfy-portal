# Node compact 梳理任务表

本轮范围：全部 42 个节点类型/类型辅助模块、6 个 common 模块、共享输入/选择器/数值控件和 Run 列表，以及相关底部弹层。使用现有 Gluestack、NativeWind 和原生开关/滑块，不引入新的 UI 框架。

## 统一的值

| 角色 | 字号 / 行高 | 字重 | 使用位置 |
| --- | --- | --- | --- |
| 节点标题 | 13 / 18 | Inter Medium 500 | 全部显示标题，含 class_type 回退名；不因是否有 _meta.title 改变字体 |
| 参数标签 | 12 / 18 | Inter Regular 400 | 普通标签、宽/高等子标签 |
| 正文与选择值 | 12 / 18 | Inter Regular 400 | Prompt、单行输入、模型名、枚举值 |
| 数值读数 | 12 / 18 | Space Mono Regular 400 | Seed、数值输入、滑块读数 |
| 提示与缺失/链接说明 | 11 / 16 | Inter Regular 400 | 可选说明、只读/不可编辑说明；错误保留语义颜色 |

| 几何角色 | 数值 | 原因 |
| --- | --- | --- |
| 卡片内边距 | 12 | 采用 4 点网格，减少原 16 的空白 |
| 卡片之间 | 8 | 相关节点保持紧凑，但仍有明确边界 |
| 标题到参数区 | 8 | 去掉标题底部加首项顶部的重复间距 |
| 参数组之间 | 12 | 区分组关系；组内更近 |
| 标签到控件 | 4 | 两者属于同一字段 |
| 同组控件之间 | 8 | 横向组合、Seed 组合 |
| 单行控件可见高度 | 36 | 与已确认的 Segments 相同 |
| 点击区域 | 至少 44 | 分段、选择器、stepper 和 seed 操作保留完整目标；输入 Root 点击可聚焦 |
| Prompt 高度 | 88 | 4 行 × 18 + 上下各 8；完整编辑弹层保留原尺寸 |
| 图像预览 | 160 | 图像保持独立可读区域，减少原 192 的占用 |
| 圆角 | 外框 4、选中块 3、卡片 6 | 复用当前 token，不按页面各自定义 |
| Run 左右边距 | 16 | 搜索和卡片的左右边缘统一，原卡片 20 导致每边缩进 4 |

`constants/design-tokens.ts#designTokens.node` 是节点角色来源。`control-density.tsx` 是非视觉作用域基础设施：BaseNode 启用 compact，ThemedBottomSheetModal 恢复 default，避免把内嵌控件的密度传进完整编辑/选择弹层。

## 任务表

| 任务 | 状态 | 说明 |
| --- | --- | --- |
| 全量源文件与控件入口检查 | 已完成 | 下方逐文件清单；自定义和 schema fallback 同样覆盖 |
| 刷新按钮动画 | 已完成 | 保留原图标旋转和固定几何；顺向归位、快速重试不中断角度；减少动态效果静止；两个动效回归用例通过 |
| 全部 Selector sheet 重整 | 已完成 | 六类入口、49 处调用；统一间距/选中/文字/网格，修正嵌套弹层和搜索重开；19 个整体用例及收尾 4 个相关用例通过；见 selector-sheet-audit.md |
| 相似反馈图标全量检查 | 已完成 | 节点/选择器 20 点，缩略图 16 点，Run 服务器错误 24 点；共享 StateIcon 描边；修复空态报错/无匹配文案及重复打开；21/21 生产 E2E，通过记录见 state-icon-audit.md |
| LoadImage 缺图提示 | 已完成 | 图标 40→20 点，iconStroke(20)，间距 8；Light/Dark 缺图恢复及重开两个生产用例通过，清理图片选择弹层的重复 present/dismiss |
| Bottom sheet 去掉关闭按钮 | 已完成 | Selector、Prompt editor、Custom Prompt 移除 X；公共 Sheet 移除仅关闭的 Done；14 个相关用例均有通过结果，保留刷新和保存/确认 |
| BaseNode / SubItem 角色和间距 | 已完成 | 固定标题、标签、内边距与组间距，移除重复 mt/mb |
| Input / Textarea / NumberInput | 已完成 | opt-in compact；默认 UI 不缩小；数字保留 mono；Prompt 统一四行 |
| Model / OptionalModel / Option / Sampler / Scheduler | 已完成 | 相同密度；省去重复 Choose a model 描述；缺失状态仍明确展示 |
| Seed / Width-Height / Image / 只读说明 | 已完成 | 修正单独设置的字重、尺寸和间距；说明回到 hint 角色 |
| Slider 居中读数容器 | 已完成 | 共享 NumberSlider 使用 well/line、4 点圆角、至少 56×36；按范围及精度预留宽度；深浅主题 9→10 的参数提交、宽度稳定及双轴居中用例通过 |
| Run Agent Chat 梳理 | 已完成 | 背景与 Nodes 相同；消息/工具/输入区 compact 重整、统一字体；输入移入 Gorhom measured footer，错误保留设置入口；见 run-chat-audit.md |
| Run 常驻 Sheet 主题 | 已完成 | PersistentSheet 接入共享 useSheetAppearance，去掉页面独立外观代码；共享 paper/muted、6 点圆角和抓手，常驻面板保留 line 细边界；保留原三个 detent、内容滚动/抓手拖动和键盘行为 |
| Run 顶部服务器信息 | 已完成 | 移除服务器名和空闲 Ready 行，无占位空白；保留生成/保存进度。真实生成和首次滑动/切换/重进场景共 2 项通过，TypeScript、改动文件 lint、字体 inventory、diff check 通过；标准 lint 0 errors / 79 既有 warnings。截图 .expo/run-header-clean.png |
| Run 卡片与搜索边缘 | 已完成 | 两边都使用 16 点 inset；边框 1 点 |
| 共享 bottom sheet 抓手与按钮 | 已完成 | 取消 selector 自画的旧色抓手背景；抓手与 sheet 使用 paper，抓手 muted；Refresh tonal，独立于搜索显示；按最新偏好取消 Close |
| 生产 E2E、静态检查、iOS 效果 | 已完成 | 235 单测、18 个相关生产用例均有通过结果；最终受影响模块 10/10 通过 |

## 逐文件覆盖

| 文件 | 覆盖路径 |
| --- | --- |
| `common/base-node.tsx` | Copy |
| `common/immutable-node.tsx` | BaseNode, Copy |
| `common/seed-control.tsx` | SubItem, NativeSegments, InputField, Copy |
| `common/server-image-picker.tsx` | Copy |
| `common/sub-item.tsx` | Copy |
| `common/unknown-node.tsx` | BaseNode, SubItem, OptionSelector, NumberInput, NativeSwitch, InputField, TextareaInput, Copy |
| `index.tsx` | 共用节点类型转发 |
| `types/base/BasicGuider.tsx` | ImmutableNode |
| `types/base/BasicScheduler.tsx` | BaseNode, SubItem, SchedulerSelector, NumberSlider |
| `types/base/CLIPLoader.tsx` | BaseNode, SubItem, ModelSelector, OptionSelector |
| `types/base/CLIPSetLastLayer.tsx` | BaseNode, SubItem, NumberInput |
| `types/base/CLIPTextEncode.tsx` | BaseNode, SubItem, TextareaInput |
| `types/base/CLIPTextEncodeSDXL.tsx` | BaseNode, SubItem, NumberInput, TextareaInput |
| `types/base/CLIPVisionEncode.tsx` | BaseNode, SubItem, NativeSegments |
| `types/base/CLIPVisionLoader.tsx` | BaseNode, ModelSelector |
| `types/base/CheckpointLoaderSimple.tsx` | BaseNode, ModelSelector |
| `types/base/DualCLIPLoader.tsx` | BaseNode, ModelSelector |
| `types/base/EmptyLatentImage.tsx` | BaseNode, SubItem, NumberSlider, NativeSegments, InputField, Copy |
| `types/base/EmptySD3LatentImage.tsx` | BaseNode, SubItem, NativeSegments, InputField, Copy |
| `types/base/FluxGuidance.tsx` | BaseNode, SubItem, NumberInput |
| `types/base/ImagePadForOutpaint.tsx` | BaseNode, SubItem, NumberInput |
| `types/base/ImageScale.tsx` | BaseNode, SubItem, OptionSelector, NumberInput, NativeSegments |
| `types/base/ImageScaleBy.tsx` | BaseNode, SubItem, OptionSelector, NumberSlider |
| `types/base/KSampler.tsx` | BaseNode, SubItem, SeedControl, SamplerSelector, SchedulerSelector, NumberSlider |
| `types/base/KSamplerAdvanced.tsx` | BaseNode, SubItem, SeedControl, SamplerSelector, SchedulerSelector, NumberInput, NumberSlider, NativeSwitch |
| `types/base/KSamplerSelect.tsx` | BaseNode, SubItem, SamplerSelector |
| `types/base/LoadImage.tsx` | BaseNode, SubItem, Copy |
| `types/base/LoraLoader.tsx` | BaseNode, ModelSelector |
| `types/base/LoraLoaderModelOnly.tsx` | BaseNode, ModelSelector |
| `types/base/ModelSamplingFlux.tsx` | BaseNode, SubItem, NumberInput |
| `types/base/ModelSamplingSD3.tsx` | BaseNode, SubItem, NumberSlider |
| `types/base/PreviewImage.tsx` | ImmutableNode |
| `types/base/PrimitiveStringMultiline.tsx` | BaseNode, SubItem, TextareaInput |
| `types/base/RandomNoise.tsx` | BaseNode, SeedControl |
| `types/base/SamplerCustomAdvanced.tsx` | ImmutableNode |
| `types/base/SaveImage.tsx` | BaseNode, SubItem, InputField, Copy |
| `types/base/TextEncodeQwenImageEditPlus.tsx` | BaseNode, SubItem, TextareaInput |
| `types/base/UNETLoader.tsx` | BaseNode, SubItem, ModelSelector, OptionSelector |
| `types/base/VAEDecode.tsx` | ImmutableNode |
| `types/base/VAEEncode.tsx` | ImmutableNode |
| `types/base/VAEEncodeForInpaint.tsx` | BaseNode, SubItem, NumberSlider |
| `types/base/VAELoader.tsx` | BaseNode, ModelSelector |
| `types/base/WanImageToVideo.tsx` | BaseNode, SubItem, NumberSlider, InputField |
| `types/kj-nodes/ImageResizeKJv2.tsx` | BaseNode, SubItem, OptionSelector, InputField |
| `types/minimax-h3-easy/MiniMaxH3Easy.tsx` | BaseNode, SubItem, OptionSelector, NumberInput, NumberSlider, NativeSwitch, TextareaInput |
| `types/minimax-h3-easy/MiniMaxH3EasyLoader.tsx` | BaseNode, SubItem, ModelSelector, OptionalModelSelector |
| `types/minimax-h3-easy/MiniMaxH3EasyMediaBridge.tsx` | BaseNode, SubItem, NumberInput, Copy |
| `types/minimax-h3-easy/optional-model-selector.tsx` | Copy |
| `types/video-helper-suite/VHS_VideoCombine.tsx` | BaseNode, SubItem, OptionSelector, NumberSlider, NativeSwitch, InputField |

## Run 顶部操作补充

- Generate 可见 92 × 28，44 高点击区域，12/18 Medium 文字。
- Bot / Nodes 轨道 88 × 28；每个点击区域 44 × 44；图标 16，选中块 40 × 24。
- Queue 可见 28 点圆形，44 × 44 点击区域；超过 99 显示 99+，无障碍标签仍提供真实数量。

## 验证记录

- 235 项 Jest 全部通过；最终 TypeScript、字体清单检查和 git diff --check 通过；lint 0 errors / 79 个既有 warnings。
- 18 个独立生产用例均有通过结果。最终 node-controls、workflow-redesign、run-scroll 集中验收 10/10 通过：compact 字体/对齐、第三方节点 fallback、44 点边缘点击、顶部操作几何、Light/Dark 弹层和真实参数提交。其余字体矩阵、环境编辑、footer motion 的通过结果按未受改动影响的范围保留。
- 新增布局测试初次使用 DOM 属性选择器得到空元素，改为已解析的 locator；随后误测隐藏 radio input，改为实际 textbox。两次均为测试定位问题，修正后完整场景通过。
- iOS iPhone 17 Pro：检查节点密度、搜索和卡片对齐、内容滚动；模型弹层抓手与面板同色，刷新/关闭有 tonal 背景，关闭返回正常。截图：`.expo/compact-native-nodes.png`、`.expo/compact-native-model-sheet.png`；最终小操作截图：`.expo/compact-native-final.png`。
- Figma manifest 记录现有 node/Run/sheet specimen 待同步项目；没有 Figma 编辑能力，未宣称画稿已更新。

## 去掉关闭按钮的补充验证

- Light/Dark 选择器：确认无 Close 按钮，刷新可用，遮罩点击关闭，无搜索的 Sampler 可以下拉关闭。首次手势测试未等待弹层进场完成且未启用触摸模拟，修正自动化手势后 2/2 通过；生产手势逻辑没有改动。
- Node、工作流、环境编辑以及服务器详情相关回归共 14 个用例均有通过结果。移除公共 Sheet 的 showDone API 后，同时清理 6 个调用处；TypeScript、字体清单、git diff --check 通过，lint 0 errors / 79 个既有 warnings。
- iOS iPhone 17 Pro 模型选择器：标题右侧仅保留刷新，下拉抓手关闭正常；截图 `.expo/dismiss-native-sheet.png`，操作记录 `.expo/dismiss-native-after-drag.log`。

## 刷新动画修正补充

- Selector 刷新使用共享 Action 的 rotate-icon 模式，保留原箭头和固定槽位，不再切换到带缩放/宽度展开的 ring。1000ms 匀速顺时针旋转，完成后最多 200ms 顺向归位；快速重试继续当前角度，关闭弹层取消循环。其他 Action 保留 ring。
- 两个动画 E2E 用例通过：慢请求期间只有一个箭头、槽位稳定、禁止重复提交，完成后恢复原位；减少动态效果时保持静止。新增检查发现 Web busy 属性遗漏及弹层进场测量过早，已补 aria-busy 并等待进场完成。原节点/选择器相关 8 个用例也通过。
- iOS iPhone 17 Pro 录屏 `.expo/refresh-motion-ios.mp4` 和帧图 `.expo/refresh-motion-frames.png` 显示箭头本身旋转，表面大小不变；请求完成后按钮 enabled=true，见 `.expo/refresh-motion-final-attrs.log` 和 `.expo/refresh-motion-final.png`。
- TypeScript、完整 lint（0 errors / 79 existing warnings）、改动文件 lint、字体 inventory 和 diff check 通过。现有 Refresh Figma specimen 的动效同步仍记录为 pending。


## Run Sheet 统一主题补充

- 常驻 Run 面板使用 overlays.tsx 的 PersistentSheet；与 Sheet / ThemedBottomSheetModal 共用 useSheetAppearance。统一 6 点圆角、paper 面板/抓手区域、24 点抓手区及 muted 32×3 指示条。常驻面板用共享 line 细边界区分未遮暗的预览区；弹层仍使用 backdrop。
- Run 页面移除独立 backgroundStyle、handleStyle、handleIndicatorStyle；保留 30/60/80% detent、内容滚动/抓手调高、键盘和原 ref 操作，iPad 横屏仍保留 split panel。
- 更新 design.md 中遗留的旧圆角数值，当前 3/4/6 点与最新 Component Sheet / tokens 一致。Manifest 记录现有 Run / ModelSheet / EditSheet specimen 的主题同步，Figma 画稿仍待同步。
- 23 个相关生产场景都有通过结果。最终受影响的深浅主题/刷新、首次滑动及真实生成 6/6 通过；其余节点控件、环境编辑/嵌套弹层及 footer motion 的通过记录按未受收尾常驻边界改动影响的范围保留。
- 几何检查初次定位到了 Gorhom 的内容容器（相同 Bottom Sheet 标签），而不是实际背景。改为定位无子元素的背景，保持 6 点断言。刷新几何首次因入场动画尚未完成失败；补齐最终位置和连续稳定帧等待，按钮几何断言不变。
- TypeScript、改动生产文件 ESLint、字体 inventory、diff check 通过；标准 npm run lint 0 errors / 79 个既有 warnings。
- 深浅主题截图：.expo/run-sheet-theme-dark.png / .expo/run-sheet-theme-light.png。iOS 首次内容滑动前后：.expo/run-sheet-native.png / .expo/run-sheet-native-scrolled.png，列表已移动而抓手 y 保持不变。

- Run Sheet iOS 最终细边界/6 点圆角截图 `.expo/run-sheet-native-final.png`；拖动抓手后 `.expo/run-sheet-native-expanded.png` 达到 80% detent，保留内容及抓手行为。
