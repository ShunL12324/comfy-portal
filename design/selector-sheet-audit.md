# Selector sheet audit

## 共享规范

六类入口统一使用 SearchableBottomSheet。Header 始终拥有 16 点底部间距，标题到搜索框 12；Header 与列表各自使用 16 点左右内边距，列表/网格间距 8。搜索框隐藏或没有右侧操作时也保持同样的间距。

普通项和模型行采用透明底，主文字 13/20 Inter Regular、ink；选中时 Medium、well 底、1 点 ink 描边和勾选。描述为 12/18 muted。图片/可选模型网格采用 card 底、6 点圆角，描边始终预留 1 点，选中不改变内容位置；双列和最后单项使用同样的列宽。名称最多两行后裁剪。

列表内边距由共享组件拥有，各自 renderer 不再重复加 mx/mb。SearchHeader 使用 RN View 统一原生和 Web 的 padding 与测试标识；保留 Gluestack 文本、图标和 Pressable。搜索使用单一受控状态，重开清空，不保留延迟回调。Selector 以 push 叠加在父 sheet 上，返回时保留原表单。

## 实现入口

| 入口 | 列表 | 覆盖 |
| --- | --- | --- |
| SamplerSelector | 共享文本项 | KSampler、KSamplerAdvanced、KSamplerSelect |
| SchedulerSelector | 共享文本项 | KSampler、KSamplerAdvanced、BasicScheduler |
| OptionSelector | 共享文本项 | 标准/扩展/未知节点、AI Provider/Model、Env Model type |
| ModelSelector | 模型行 | 所有模型节点，缩略图预览和 LoRA 强度保留 |
| OptionalModelSelector | 模型网格 | MiniMaxH3EasyLoader 的两个可选模型 |
| ServerImagePicker | 图片网格 | LoadImage，服务器目录读取、搜索和刷新保留 |

## 验证

整体回归 19/19 通过：node-controls、template-editor、workflow-redesign。覆盖 Light/Dark 的模型/Sampler/Scheduler/Option/双列网格、选择落库、重开、图片目录选择、AI Provider 搜索重置、Env 嵌套 Model type 和更新参数后生成。补齐缺图/空态内边距后，受影响的 Light/Dark 模型及网格 4/4 再次通过。

iOS iPhone 17 Pro：Sampler/Scheduler 的 16 点间距、主文字色、选中描边/勾选已检查，Sampler 选择与返回正常；测试后恢复原来的 euler。截图 `.expo/selector-redesign-native-sampler.png`、`.expo/selector-redesign-native-scheduler.png`；选择操作 `.expo/selector-redesign-native-select.log`，恢复 `.expo/selector-redesign-native-restore.log`。

TypeScript、完整 lint（0 errors / 79 原有 warnings）、字体 inventory 和 diff check 通过。首次检查暴露 Web DOM 容器不接受 RN padding/testID、父 sheet switch 会导致嵌套 selector 消失；已统一 RN View 的几何并改用 push。几何测试改成同一帧测量，避免弹层进场时分帧量出错误间距。

以下记录 49 处调用，其中包含六类实现的共享 sheet 入口。Figma 的现有 ModelSheet / Menu / Select specimen 同步仍记录在 figma-library.json 的 pending 列表中。

## 调用处清单

| Source | Line | Entry |
| --- | --- | --- |
| `app/settings/ai-assistant/index.tsx` | 167 | OptionSelector |
| `app/settings/ai-assistant/index.tsx` | 235 | OptionSelector |
| `components/common/selectors/scheduler/selector.tsx` | 68 | SearchableBottomSheet |
| `components/common/selectors/model/selector.tsx` | 349 | SearchableBottomSheet |
| `components/common/selectors/sampler/selector.tsx` | 68 | SearchableBottomSheet |
| `app/environments/[id]/[resource].tsx` | 435 | OptionSelector |
| `components/common/selectors/option-selector/selector.tsx` | 74 | SearchableBottomSheet |
| `features/comfy-node/components/node/common/server-image-picker.tsx` | 183 | SearchableBottomSheet |
| `features/comfy-node/components/node/common/unknown-node.tsx` | 73 | OptionSelector |
| `features/comfy-node/components/node/types/base/VAELoader.tsx` | 16 | ModelSelector |
| `features/comfy-node/components/node/types/base/CLIPLoader.tsx` | 39 | ModelSelector |
| `features/comfy-node/components/node/types/base/CLIPLoader.tsx` | 50 | OptionSelector |
| `features/comfy-node/components/node/types/base/CLIPLoader.tsx` | 58 | OptionSelector |
| `features/comfy-node/components/node/types/base/CheckpointLoaderSimple.tsx` | 17 | ModelSelector |
| `features/comfy-node/components/node/types/base/CLIPVisionLoader.tsx` | 16 | ModelSelector |
| `features/comfy-node/components/node/types/base/ImageScale.tsx` | 28 | OptionSelector |
| `features/comfy-node/components/node/types/base/DualCLIPLoader.tsx` | 17 | ModelSelector |
| `features/comfy-node/components/node/types/base/DualCLIPLoader.tsx` | 27 | ModelSelector |
| `features/comfy-node/components/node/types/base/ImageScaleBy.tsx` | 28 | OptionSelector |
| `features/comfy-node/components/node/types/base/KSamplerSelect.tsx` | 18 | SamplerSelector |
| `features/comfy-node/components/node/types/minimax-h3-easy/optional-model-selector.tsx` | 214 | SearchableBottomSheet |
| `features/comfy-node/components/node/types/base/LoraLoader.tsx` | 17 | ModelSelector |
| `features/comfy-node/components/node/types/base/LoraLoaderModelOnly.tsx` | 16 | ModelSelector |
| `features/comfy-node/components/node/types/base/UNETLoader.tsx` | 17 | ModelSelector |
| `features/comfy-node/components/node/types/base/UNETLoader.tsx` | 28 | OptionSelector |
| `features/comfy-node/components/node/types/video-helper-suite/VHS_VideoCombine.tsx` | 72 | OptionSelector |
| `features/comfy-node/components/node/types/video-helper-suite/VHS_VideoCombine.tsx` | 80 | OptionSelector |
| `features/comfy-node/components/node/types/kj-nodes/ImageResizeKJv2.tsx` | 48 | OptionSelector |
| `features/comfy-node/components/node/types/kj-nodes/ImageResizeKJv2.tsx` | 56 | OptionSelector |
| `features/comfy-node/components/node/types/kj-nodes/ImageResizeKJv2.tsx` | 83 | OptionSelector |
| `features/comfy-node/components/node/types/kj-nodes/ImageResizeKJv2.tsx` | 97 | OptionSelector |
| `features/comfy-node/components/node/types/base/KSampler.tsx` | 42 | SamplerSelector |
| `features/comfy-node/components/node/types/base/KSampler.tsx` | 48 | SchedulerSelector |
| `features/comfy-node/components/node/types/minimax-h3-easy/MiniMaxH3Easy.tsx` | 72 | OptionSelector |
| `features/comfy-node/components/node/types/minimax-h3-easy/MiniMaxH3Easy.tsx` | 108 | OptionSelector |
| `features/comfy-node/components/node/types/minimax-h3-easy/MiniMaxH3Easy.tsx` | 118 | OptionSelector |
| `features/comfy-node/components/node/types/minimax-h3-easy/MiniMaxH3Easy.tsx` | 164 | OptionSelector |
| `features/comfy-node/components/node/types/minimax-h3-easy/MiniMaxH3Easy.tsx` | 209 | OptionSelector |
| `features/comfy-node/components/node/types/minimax-h3-easy/MiniMaxH3Easy.tsx` | 221 | OptionSelector |
| `features/comfy-node/components/node/types/minimax-h3-easy/MiniMaxH3Easy.tsx` | 229 | OptionSelector |
| `features/comfy-node/components/node/types/base/BasicScheduler.tsx` | 19 | SchedulerSelector |
| `features/comfy-node/components/node/types/base/KSamplerAdvanced.tsx` | 56 | SamplerSelector |
| `features/comfy-node/components/node/types/base/KSamplerAdvanced.tsx` | 62 | SchedulerSelector |
| `features/comfy-node/components/node/types/base/LoadImage.tsx` | 542 | ServerImagePicker |
| `features/comfy-node/components/node/types/minimax-h3-easy/MiniMaxH3EasyLoader.tsx` | 26 | OptionalModelSelector |
| `features/comfy-node/components/node/types/minimax-h3-easy/MiniMaxH3EasyLoader.tsx` | 37 | OptionalModelSelector |
| `features/comfy-node/components/node/types/minimax-h3-easy/MiniMaxH3EasyLoader.tsx` | 48 | ModelSelector |
| `features/comfy-node/components/node/types/minimax-h3-easy/MiniMaxH3EasyLoader.tsx` | 59 | ModelSelector |
| `features/comfy-node/components/node/types/minimax-h3-easy/MiniMaxH3EasyLoader.tsx` | 70 | ModelSelector |
