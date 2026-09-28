# 反馈图标统一检查

范围：全部 ComfyUI 节点、自定义/共享 selector、Run 失败状态；额外扫描全应用的 display 图标及警告图标。

现有 `components/ui/design-system/primitives.tsx` 增加 StateIcon，复用 Lucide 和 iconStroke，默认 20 点、muted。调用方保留 danger/onMedia 等语义颜色。没有替换 Gluestack creators 或引入新框架。

| 入口 | 处理 | 状态 |
| --- | --- | --- |
| LoadImage 缺图 | 20 点、danger、8 点间距，沿用前轮结果并接入共享组合 | 已实现 |
| LoadImage 未选图 | 40→20 点、比例描边、12→8 点间距 | 已实现 |
| LoadImage 上传中 | 40→20 点、去掉图标额外 margin；遮罩圆角跟预览保持 6 点 | 已实现 |
| LoadImage 清除/取消 | 补无障碍按钮名称与 44 点以上 hit area | 已实现 |
| ServerImagePicker 空态/断连 | 40→20 点、12→8 点间距；加载状态相同 8 点间距 | 已实现 |
| 普通模型/可选模型缩略图 | 保持 16 点，统一比例描边；可选模型补图片请求失败占位 | 已实现 |
| ServerImagePicker 缩略图 | 补图片失败时的 16 点 ImageOff 占位 | 已实现 |
| Run 服务器不存在 | 40→24 点，移除额外圆形背景包裹 | 已实现 |
| AI 工具消息状态 | 原 14 点行内图标符合角色，没有大图标空态问题 | 已检查 |
| UnknownNode Compat | 原 12 点徽标图标没有过大问题，保留 | 已检查 |
| 普通/模型 selector 空态 | 文字反馈没有大图标，保留；搜索无匹配统一显示 No matching options | 已实现 |
| 可选模型弹层生命周期 | 去掉父组件多余 present；由共享 sheet 独立管理打开/关闭 | 已实现 |
| Gallery / 媒体 Play | 已审核的全屏插图和视频播放叠层属于独立角色，保留 | 已检查 |

## 验证

- 最终生产 E2E：node-controls、template-editor、workflow-redesign 共 21/21 通过。新用例检查搜索无匹配、错误→空列表→刷新恢复→清除→重选，并断言原输入在失败/空列表期间不被修改。
- 深浅主题截图：`.expo/state-icons-{offline,empty,upload}-{dark,light}.png`；另保留前轮缺图截图和重开用例。实际查看深浅空列表、断连和未选图效果。
- TypeScript、改动生产文件 ESLint（0 errors / 0 warnings）、字体 inventory 和 diff check 通过。标准 npm run lint 0 errors / 79 既有 warnings；该命令默认检查 app/components，另外显式检查本轮 features 文件。
- 新空态回归发现 FlatList 向自定义空组件注入 RN style 数组，而 Gluestack web VStack 是 DOM 容器，导致 CSSStyleDeclaration 报错。共享 sheet 使用 RN View 接受注入样式并包住空内容；修正后新场景及整组通过。
- 修正 ServerImagePicker 原有异步更新/手动 memo lint 问题及 OptionalModelSelector 的 trigger 依赖遗漏。保持真实请求和状态语义。
- 首次业务布局用例在 30 秒默认限时内加载多条路由超时；最终整组使用 60 秒测试限时，布局断言不变，实际 36.4 秒完成。
- 上传中外观和失败缩略图的处理已逐代码检查；本轮没有自动化触发原生照片上传，也没有重新运行原生 iOS 检查。

Figma 使用现有 LoadImage 2022:603 / ModelSheet 2021:192，manifest 已记录同步事项；本环境没有 Figma 编辑能力，画稿未同步。
